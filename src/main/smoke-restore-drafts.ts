import {dialog,type BrowserWindow} from 'electron';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Store} from './store';

/** Isolated smoke only: native chooser cancellation and delayed FileReader are explicit fixtures. */
export async function smokeRestoreDrafts(window:BrowserWindow,store:Store,out:string,capture:()=>Promise<Buffer>){
 const before=readFileSync(join(store.userDir,'customers.sqlite')),settingsBefore=JSON.stringify(store.settings());
 const chooser=dialog.showOpenDialog;let selections=0;
 dialog.showOpenDialog=(async()=>{selections++;return{canceled:true,filePaths:[]};}) as typeof dialog.showOpenDialog;
 try{
  const result=await window.webContents.executeJavaScript(`(async()=>{
   const wait=async(test,label)=>{for(let i=0;i<150;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Restore draft UI wait: '+label);};
   const field=label=>[...document.querySelectorAll('.settings-panel .field')].find(item=>item.querySelector('label')?.textContent.trim()===label)?.querySelector('input');
   const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
   const edit=async(label,value)=>{const input=field(label);if(!input)throw new Error('Missing restore draft field '+label);setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,40));};
   const original={model:field('模型名称').value,key:field('API 密钥').value,brand:field('工作室名称').value};
   const originalConfirm=window.confirm;let scopeConfirmations=0;window.confirm=()=>{scopeConfirmations++;return true;};
   const values=()=>({model:field('模型名称').value,keyPresent:field('API 密钥').value==='LOCAL-RESTORE-DRAFT-KEY',brand:field('工作室名称').value});
   const restore=()=>[...document.querySelectorAll('.data-maintenance button')].find(item=>item.textContent.trim()==='恢复备份').click();
   try{
    await edit('模型名称','local-unsaved-restore-model');await edit('API 密钥','LOCAL-RESTORE-DRAFT-KEY');await edit('工作室名称','隔离未保存品牌');
    const draft=values();restore();const first=await wait(()=>document.querySelector('.modal-discard-confirm'),'unsaved settings protection');
    const warning=first.innerText;if(!warning.includes('密钥草稿')||!warning.includes('恢复成功'))throw new Error('Restore did not explain settings replacement');
    [...first.querySelectorAll('button')].find(item=>item.textContent.trim()==='继续编辑').click();await wait(()=>!document.querySelector('.modal-discard-confirm'),'continue editing');const continued=values();
    restore();const second=await wait(()=>document.querySelector('.modal-discard-confirm'),'second draft protection');
    [...second.querySelectorAll('button')].find(item=>item.textContent.trim()==='放弃修改并继续').click();
    await wait(()=>document.body.innerText.includes('已取消恢复备份')&&!field('模型名称').disabled,'native chooser cancelled');
    const nativeCancelled=values();if(JSON.stringify(draft)!==JSON.stringify(continued)||JSON.stringify(draft)!==JSON.stringify(nativeCancelled))throw new Error('Cancelled restore lost unsaved model/key/brand');
    await edit('模型名称',original.model);await edit('API 密钥',original.key);await edit('工作室名称',original.brand);
    const OriginalReader=window.FileReader;let delayedReader;
    window.FileReader=class{result=null;onload=null;onerror=null;onabort=null;constructor(){delayedReader=this;}readAsDataURL(){}abort(){this.onabort?.();}};
    try{
     const input=document.querySelector('.logo-upload input[type="file"]');if(!input)throw new Error('Missing logo input');
     const transfer=new DataTransfer();transfer.items.add(new File(['isolated delayed fixture'],'delayed.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
     await wait(()=>document.body.innerText.includes('品牌图片读取中，尚未保存'),'pending logo status');
     const beforeUnload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(beforeUnload);
     const reading={status:document.body.innerText.includes('品牌图片读取中，尚未保存'),beforeUnloadPrevented:beforeUnload.defaultPrevented,saveDisabled:[...document.querySelectorAll('.settings-panel button')].find(item=>item.textContent.trim()==='保存品牌').disabled};
     if(!reading.beforeUnloadPrevented||!reading.saveDisabled)throw new Error('Pending logo not covered by exit/save protection');
     [...document.querySelectorAll('.logo-upload button')].find(item=>item.textContent.includes('取消读图并移除')).click();
     delayedReader.result='data:image/png;base64,aXNvbGF0ZWQ=';delayedReader.onload?.();await new Promise(r=>setTimeout(r,40));
     const lateLogoIgnored=!document.querySelector('.logo-upload img')&&!document.body.innerText.includes('品牌图片读取中，尚未保存');
     if(!lateLogoIgnored)throw new Error('Cancelled delayed logo returned');
     return{note:'Actual renderer/IPC; only native chooser cancellation, scope confirm response and delayed FileReader are fixtures. No real key or customer data.',warning,draftKeyRetained:continued.keyPresent&&nativeCancelled.keyPresent,continueRetainedDrafts:JSON.stringify(draft)===JSON.stringify(continued),nativeCancellationRetainedDrafts:JSON.stringify(draft)===JSON.stringify(nativeCancelled),scopeConfirmations,reading,lateLogoIgnored,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
    }finally{window.FileReader=OriginalReader;}
   }finally{window.confirm=originalConfirm;await edit('模型名称',original.model);await edit('API 密钥',original.key);await edit('工作室名称',original.brand);}
  })()`);
  if(selections!==1||result.scopeConfirmations!==1||result.horizontalOverflow||!readFileSync(join(store.userDir,'customers.sqlite')).equals(before)||JSON.stringify(store.settings())!==settingsBefore)throw new Error('Restore draft smoke changed persisted state or bypassed cancellation');
  const preview=await capture();if(preview.length>500000)throw new Error('Restore draft screenshot exceeds500KB');writeFileSync(join(out,'restore-draft-preview.jpg'),preview);
  return{...result,chooserFixtureCancellations:selections,persistedSettingsUnchanged:true,customerArchiveBytesUnchanged:true};
 }finally{dialog.showOpenDialog=chooser;}
}
