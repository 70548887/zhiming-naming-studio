import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  dirty?: boolean;
  closeWarning?: string;
}

interface OpenModal {
  token: symbol;
  order: number;
  backdrop: HTMLDivElement;
  dialog: HTMLElement;
  trigger: HTMLElement | null;
  returnRegion: HTMLElement | null;
  initialFocus: () => void;
}

// A shared stack makes sibling and nested dialogs obey the same keyboard rules.
const openModals: OpenModal[] = [];
let nextModalOrder = 0;
let originalOverflow = '';
let originalTrigger: HTMLElement | null = null;
const focusableSelector = 'a[href],area[href],button,input:not([type="hidden"]),select,textarea,summary,iframe,object,embed,[contenteditable="true"],[tabindex]';

function canFocus(element: HTMLElement): boolean {
  return element.isConnected && !element.closest('[hidden],[inert]') &&
    !element.matches(':disabled') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden';
}

function focus(element: HTMLElement | null): boolean {
  if (!element || !canFocus(element)) return false;
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

/** A removed or disabled opener must not leave focus on the document body.
 * Prefer the same content region, then the current route's main landmark.
 * The original trigger and nested-dialog paths remain the first choices. */
function contentRegion(trigger: HTMLElement | null): HTMLElement | null {
  const region = trigger?.closest<HTMLElement>('section,main,[role="main"]') ?? null;
  return region && !region.closest('.modal-backdrop') ? region : null;
}

function focusLandmark(element: HTMLElement | null): boolean {
  if (!element || !canFocus(element) || element.closest('.modal-backdrop')) return false;
  const previous = element.getAttribute('tabindex');
  const temporary = previous === null;
  if (temporary) element.setAttribute('tabindex', '-1');
  const restored = focus(element);
  if (temporary) {
    const cleanup = () => { if (element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex'); };
    if (restored) element.addEventListener('blur', cleanup, { once: true });
    else cleanup();
  }
  return restored;
}

function restoreContentFocus(region: HTMLElement | null): void {
  const currentMain = document.querySelector<HTMLElement>('main,[role="main"]');
  const regions = [...new Set([region, currentMain])].filter((target): target is HTMLElement =>
    !!target && canFocus(target) && !target.closest('.modal-backdrop'));
  for (const target of regions) {
    const headings = target.querySelectorAll<HTMLElement>('h1,h2,h3,[role="heading"]');
    for (const heading of headings) if (focusLandmark(heading)) return;
    if (focusLandmark(target)) return;
  }
}

function focusables(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => element.tabIndex >= 0 && canFocus(element));
}

function topModal(): OpenModal | undefined {
  return openModals.at(-1);
}

function syncStack(): void {
  // Child effects may run first. Render order keeps their layer above the
  // parent; portals keep an inert parent from disabling its nested dialog.
  openModals.sort((a, b) => a.order - b.order);
  const top = topModal();
  for (const [index, entry] of openModals.entries()) {
    entry.backdrop.style.zIndex = String(1000 + index);
    entry.backdrop.inert = entry !== top;
    if (entry !== top) entry.backdrop.setAttribute('aria-hidden', 'true');
    else entry.backdrop.removeAttribute('aria-hidden');
  }
}

/** Accessible dialog shared by details, comparisons and review history. */
export function Modal({ title, subtitle, onClose, children, wide = false, dirty = false, closeWarning }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [discardOpen, setDiscardOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const tokenRef = useRef(Symbol('modal'));
  const orderRef = useRef(0);
  if (!orderRef.current) orderRef.current = ++nextModalOrder;
  const triggerRef = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null);
  const returnRegionRef = useRef<HTMLElement | null>(contentRegion(triggerRef.current));
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const beforeDiscardRef = useRef<HTMLElement | null>(null);
  const previousDiscardRef = useRef(false);
  const latestRef = useRef({ onClose, dirty, discardOpen });
  latestRef.current = { onClose, dirty, discardOpen };

  const isTop = () => topModal()?.token === tokenRef.current;
  const requestClose = () => {
    if (!isTop()) return;
    const current = latestRef.current;
    if (current.discardOpen) {
      setDiscardOpen(false);
    } else if (current.dirty) {
      beforeDiscardRef.current = document.activeElement as HTMLElement | null;
      setDiscardOpen(true);
    } else {
      current.onClose();
    }
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!backdrop || !dialog) return;
    const initialFocus = () => {
      if (latestRef.current.discardOpen) {
        if (!focus(continueRef.current)) focus(dialog);
        return;
      }
      const autofocus = dialog.querySelector<HTMLElement>('[autofocus],[data-autofocus]');
      // React's autoFocus can focus a child before this effect runs.
      const alreadyFocused = document.activeElement instanceof HTMLElement && dialog.contains(document.activeElement)
        ? document.activeElement : null;
      if (!focus(autofocus) && !focus(alreadyFocused) && !focus(closeRef.current) && !focus(focusables(dialog)[0] ?? null)) focus(dialog);
    };
    const entry: OpenModal = { token: tokenRef.current, order: orderRef.current, backdrop, dialog, trigger: triggerRef.current, returnRegion: returnRegionRef.current, initialFocus };
    if (!openModals.length) {
      originalOverflow = document.body.style.overflow;
      originalTrigger = entry.trigger;
      document.body.style.overflow = 'hidden';
    }
    openModals.push(entry);
    syncStack();
    if (topModal() === entry) initialFocus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (topModal() !== entry || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        // A synchronous close must not pass this same Escape to a parent.
        event.stopImmediatePropagation();
        requestCloseRef.current();
      } else if (event.key === 'Tab') {
        const targets = focusables(dialog);
        const first = targets[0];
        const last = targets.at(-1);
        const active = document.activeElement;
        const outside = !(active instanceof HTMLElement) || !dialog.contains(active) || !targets.includes(active);
        if (!first || !last) {
          event.preventDefault();
          focus(dialog);
        } else if (event.shiftKey && (active === first || outside)) {
          event.preventDefault();
          focus(last);
        } else if (!event.shiftKey && (active === last || outside)) {
          event.preventDefault();
          focus(first);
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (topModal() !== entry) return;
      const target = event.target;
      if (target instanceof HTMLElement && dialog.contains(target) && canFocus(target)) {
        lastFocusedRef.current = target;
      } else if (!focus(lastFocusedRef.current)) {
        initialFocus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      const wasTop = topModal() === entry;
      const index = openModals.indexOf(entry);
      if (index !== -1) openModals.splice(index, 1);
      backdrop.inert = false;
      backdrop.removeAttribute('aria-hidden');
      syncStack();
      const remaining = topModal();
      if (!remaining) {
        document.body.style.overflow = originalOverflow;
        const fallback = originalTrigger;
        originalTrigger = null;
        if (!focus(entry.trigger) && !focus(fallback)) restoreContentFocus(entry.returnRegion);
      } else if (wasTop) {
        if (!entry.trigger || !remaining.dialog.contains(entry.trigger) || !focus(entry.trigger)) remaining.initialFocus();
      }
    };
  }, []);

  useEffect(() => {
    if (!dirty && discardOpen) setDiscardOpen(false);
  }, [dirty, discardOpen]);

  useEffect(() => {
    if (previousDiscardRef.current === discardOpen) return;
    previousDiscardRef.current = discardOpen;
    if (!isTop()) return;
    if (discardOpen) {
      if (!focus(continueRef.current)) focus(dialogRef.current);
    } else if (!focus(beforeDiscardRef.current)) {
      focus(closeRef.current);
    }
  }, [discardOpen]);

  const content = <div className="modal-backdrop" ref={backdropRef} onMouseDown={event => {
    if (event.button === 0 && event.target === event.currentTarget) requestClose();
  }}>
    <section className={`modal ${wide ? 'wide' : ''}`} ref={dialogRef} role={discardOpen ? 'alertdialog' : 'dialog'}
      tabIndex={-1} aria-modal="true" aria-labelledby={titleId} aria-describedby={discardOpen || subtitle ? descriptionId : undefined}>
      <div className="modal-header">
        <div><h2 id={titleId}>{discardOpen ? '放弃未保存的更改？' : title}</h2>
          {(discardOpen || subtitle) && <p id={descriptionId}>{discardOpen ? closeWarning || '当前修改尚未保存。放弃后，本次修改不会保留。' : subtitle}</p>}
        </div>
        {!discardOpen && <button type="button" className="icon-button" ref={closeRef} aria-label="关闭" onClick={requestClose}><X size={20}/></button>}
      </div>
      <div className="modal-body">
        <div className="modal-content" hidden={discardOpen}>{children}</div>
        {discardOpen && <div className="modal-discard-confirm">
          <div className="modal-discard-actions">
            <button type="button" className="button primary" ref={continueRef} onClick={() => { if (isTop()) setDiscardOpen(false); }}>继续编辑</button>
            <button type="button" className="button secondary danger" onClick={() => { if (isTop()) latestRef.current.onClose(); }}>放弃更改</button>
          </div>
        </div>}
      </div>
    </section>
  </div>;
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
