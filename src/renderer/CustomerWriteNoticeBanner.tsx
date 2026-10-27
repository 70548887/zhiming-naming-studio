import React,{useSyncExternalStore} from 'react';
import {AlertTriangle,X} from 'lucide-react';
import {customerWriteNoticeFeed,type CustomerWriteNoticeFeed,type CustomerWriteNoticeItem} from './customer-write-notice-feed';
import './CustomerWriteNoticeBanner.css';

const empty:readonly CustomerWriteNoticeItem[]=Object.freeze([]);

export interface CustomerWriteNoticeBannerViewProps {
  items:readonly CustomerWriteNoticeItem[];
  onDismiss:(id:string)=>void;
}

/** Display only the owner-validated fixed message; this has no write action. */
export function CustomerWriteNoticeBannerView({items,onDismiss}:CustomerWriteNoticeBannerViewProps) {
  if(items.length===0)return null;
  return <aside className="customer-write-notices" aria-label="客户资料写入提醒">
    {items.map(({notice})=><section key={notice.id} className={`customer-write-notice ${notice.kind}`} role="alert" aria-live="assertive">
      <AlertTriangle size={19} aria-hidden="true"/>
      <div className="customer-write-notice-copy">
        <strong>{notice.kind==='committed-cleanup'?'客户资料收尾提醒':'操作收尾提醒'}</strong>
        <p>{notice.message}</p>
      </div>
      <button type="button" className="icon-button" title="关闭此提醒" aria-label="关闭此提醒" onClick={()=>onDismiss(notice.id)}><X size={17} aria-hidden="true"/></button>
    </section>)}
  </aside>;
}

export function CustomerWriteNoticeBanner({feed=customerWriteNoticeFeed}:{feed?:CustomerWriteNoticeFeed}) {
  const items=useSyncExternalStore(feed?.subscribe??(()=>()=>{}),feed?.getSnapshot??(()=>empty),()=>empty);
  return <CustomerWriteNoticeBannerView items={items} onDismiss={id=>feed?.dismiss(id)}/>;
}
