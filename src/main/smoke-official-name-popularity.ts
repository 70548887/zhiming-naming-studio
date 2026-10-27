import type {BrowserWindow} from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {StudioService} from './service';
import {atomicWrite} from './store';

/** Isolated real IPC/DOM checks. This does not automate native keyboard or dialogs. */
export async function smokeOfficialNamePopularity(window:BrowserWindow,service:StudioService,out:string,capture:()=>Promise<Buffer>){
 if(!process.env.NAMING_STUDIO_SMOKE||!process.env.NAMING_STUDIO_USER_DATA)throw new Error('姓名统计验收必须使用隔离用户目录。');
 const database=join(service.store.userDir,'customers.sqlite'),before=readFileSync(database),beforeBootstrap=service.bootstrap();
 const bounds=window.getBounds();
 const originalUI=await window.webContents.executeJavaScript(`({font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,page:document.querySelector('nav .nav-item.active')?.textContent||'起名工作台'})`);
 const catalog=await window.webContents.executeJavaScript('window.studio.getOfficialNamePopularity()');
 const tools=`const wait=async(test,label)=>{for(let i=0;i<250;i++){const value=test();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw new Error('Official popularity UI: '+label);};const click=async(selector,text)=>(await wait(()=>[...document.querySelectorAll(selector)].find(node=>node.textContent.includes(text)),text)).click();const geom=()=>({width:innerWidth,height:innerHeight,font:document.documentElement.dataset.fontSize,density:document.documentElement.dataset.density,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1});const input=value=>{const field=document.querySelector('input[aria-label="给名（不含姓氏）"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));};`;
 const ui:Record<string,any>={};
 try{
  window.setSize(1100,850);
  ui.initial=await window.webContents.executeJavaScript(`(async()=>{${tools}await click('button','工作室设置');for(const label of ['大字','紧凑']){const node=await wait(()=>[...document.querySelectorAll('.presentation-choice label')].find(n=>n.textContent.includes(label)),label);node.querySelector('input').click();}await wait(()=>document.documentElement.dataset.fontSize==='large'&&document.documentElement.dataset.density==='compact','display settings');await click('nav .nav-item','文化知识库');await click('.knowledge-toolbar .segmented button','历史姓名统计');await wait(()=>document.querySelectorAll('.official-popularity-row').length===20,'twenty official rows');return {rows:document.querySelectorAll('.official-popularity-row').length,text:document.querySelector('.official-name-popularity').innerText,...geom()};})()`);
  if(ui.initial.rows!==20||ui.initial.horizontalOverflow||!ui.initial.text.includes('2021')||!ui.initial.text.includes('登记'))throw new Error('官方历史榜单、口径或窄桌面布局未通过。');
  const query=async(value:string)=>window.webContents.executeJavaScript(`(async()=>{${tools}input(${JSON.stringify(value)});await wait(()=>document.querySelectorAll('.official-popularity-result').length===0,'stale results hidden on edit');await click('.official-name-popularity button','查询给名');await wait(()=>document.querySelectorAll('.official-popularity-result').length===2&&[...document.querySelectorAll('.official-popularity-result')].every(node=>node.dataset.givenName===${JSON.stringify(value)}),'new query results');return {cards:[...document.querySelectorAll('.official-popularity-result')].map(node=>({givenName:node.dataset.givenName,sex:node.dataset.sexCohort,status:node.dataset.resultStatus,people:node.dataset.reportedPeople??null,text:node.innerText})),...geom()};})()`);
  ui.muchen=await query('沐宸');ui.muchenDifferent=await query('沐辰');ui.fullName=await query('王沐宸');ui.unlisted=await query('知远');
  const male=ui.muchen.cards.find((card:any)=>card.sex==='male'),female=ui.muchen.cards.find((card:any)=>card.sex==='female'),differentMale=ui.muchenDifferent.cards.find((card:any)=>card.sex==='male');
  if(male?.people!=='22958'||male.status!=='listed'||female?.status!=='not-listed'||female.people!==null||differentMale?.people!=='15660')throw new Error('实际查询混淆给名、同音名字或性别人数。');
  for(const value of [ui.fullName,ui.unlisted])if(value.cards.some((card:any)=>card.status!=='not-listed'||card.people!==null||!card.text.includes('人数未公布')))throw new Error('未列榜名字被自动去姓、补零或推算人数。');
  if([ui.muchen,ui.muchenDifferent,ui.fullName,ui.unlisted].some(value=>value.horizontalOverflow))throw new Error('姓名查询结果横向溢出。');
  ui.browse=await window.webContents.executeJavaScript(`(async()=>{${tools}await click('.official-name-popularity button','浏览两榜');await wait(()=>document.querySelectorAll('.official-popularity-row').length===20,'browse restored');const filter=document.querySelector('select[aria-label="查看榜单范围"]');const states=[];for(const value of ['male','female','all']){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(filter,value);filter.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>document.querySelectorAll('.official-popularity-row').length===(value==='all'?20:10),'cohort '+value);states.push({cohort:value,rows:document.querySelectorAll('.official-popularity-row').length,...geom()});}await click('.official-name-popularity summary','数据版本与统计口径');const section=document.querySelector('.official-name-popularity');const link=[...section.querySelectorAll('a')].find(node=>node.textContent.includes('查看官方报告'));return {states,sourceDetailsOpen:[...section.querySelectorAll('details')].some(node=>node.open),text:section.innerText,officialLink:link?.href,...geom()};})()`);
  if(ui.browse.states.some((state:any)=>state.horizontalOverflow)||!ui.browse.sourceDetailsOpen||ui.browse.officialLink!=='https://gat.hunan.gov.cn/gat/jwgk/jwzx/gabyw/202201/t20220126_22471460.html'||!ui.browse.text.includes('2021-12-31'))throw new Error('实际分榜浏览、截止日期或官方来源展示未通过。');
  const preview=await capture();if(preview.length>500000)throw new Error('官方姓名统计预览超过500KB。');
  const previewFile=join(out,'official-name-popularity-preview.jpg');atomicWrite(previewFile,preview);
  if(!before.equals(readFileSync(database))||!isDeepStrictEqual(service.bootstrap().sessions,beforeBootstrap.sessions)||!isDeepStrictEqual(service.bootstrap().profiles,beforeBootstrap.profiles))throw new Error('只读统计查询改写了客户档案或方案。');
  return {scope:'Actual Electron preload IPC and DOM controls in an isolated installed/development app; no native keyboard or window-dialog claim.',catalog,ui,previewFile,previewBytes:preview.length,databaseSha256:createHash('sha256').update(before).digest('hex'),databaseUnchanged:true,sessionsAndProfilesUnchanged:true,noCustomerDataSent:true,originalUI};
 }finally{
  await window.webContents.executeJavaScript(`(async()=>{${tools}await click('button','工作室设置');for(const label of [${JSON.stringify(originalUI.font==='large'?'大字':'标准')},${JSON.stringify(originalUI.density==='compact'?'紧凑':'舒适')}]){(await wait(()=>[...document.querySelectorAll('.presentation-choice label')].find(node=>node.textContent.includes(label)),label)).querySelector('input').click();}await click('nav .nav-item',${JSON.stringify(originalUI.page)});})()`);
  window.setBounds(bounds);
 }
}
