import React, { useId } from 'react';

export function Field({ label, hint, required, error, controlId, children }: {
  label: string; hint?: string; required?: boolean; error?: string; controlId?: string; children: React.ReactNode;
}) {
  const generatedId = useId(), id = controlId || generatedId;
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const labelId = `${id}-label`;
  let assigned = false;
  const attach = (nodes: React.ReactNode): React.ReactNode => React.Children.map(nodes, child => {
    if (!React.isValidElement<Record<string, any>>(child) || typeof child.type !== 'string') return child;
    const isControl = ['input', 'textarea', 'select'].includes(child.type);
    const matches = controlId ? child.props.id === controlId : !assigned && isControl && !['checkbox', 'radio', 'file', 'hidden'].includes(child.props.type);
    if (isControl && matches) {
      assigned = true;
      return React.cloneElement(child, { id, 'aria-required': required || undefined, 'aria-invalid': error ? true : undefined, 'aria-describedby': [child.props['aria-describedby'], description].filter(Boolean).join(' ') || undefined });
    }
    return child.props.children ? React.cloneElement(child, { children: attach(child.props.children) }) : child;
  });
  const controls = attach(children);
  return <div className={`field${error ? ' field-invalid' : ''}`} role={assigned ? undefined : 'group'} aria-labelledby={assigned ? undefined : labelId}>
    <label id={labelId} htmlFor={assigned ? id : undefined}>{label}{required && <span className="required" aria-hidden="true">*</span>}</label>
    {controls}{hint && <small className="field-hint" id={`${id}-hint`}>{hint}</small>}{error && <p className="inline-error" id={`${id}-error`}>{error}</p>}
  </div>;
}
