import React from 'react';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import type {BirthProfile} from '../src/shared/types';
import type {QiongtongClauseReferencePreview} from '../src/shared/qiongtong-clause-reference-preview';
import {validBirthTimeInput} from '../src/shared/birth-time-basis';
import {resolveBirthContext} from '../src/shared/civil-birth';
import {QiongtongClausePreviewPanel,hasQiongtongClauseReferenceApi} from '../src/renderer/QiongtongClausePreviewPanel';
import {QiongtongClauseReferenceView} from '../src/renderer/QiongtongClauseReferenceView';
import {evaluateQiongtongClauseReferences,type SafeChartInput140} from '../src/domain/traditional/qiongtong-clause-reference';
import dates from './fixtures/m548-six-date-rule-results.json';

const input=()=>structuredClone(dates[0].profile) as unknown as BirthProfile;
describe('M548 actual M561 readonly panel contract',()=>{
 it('renders the formally aligned CORE r2 schema without changing the result component or conflating envelope and asset versions',()=>{
  const positions=['年柱','月柱','日柱','时柱'] as const,input:SafeChartInput140={pillars:dates[0].actualPillars.map((value,index)=>({position:positions[index],gan:[...value][0] as SafeChartInput140['pillars'][number]['gan'],zhi:[...value][1] as SafeChartInput140['pillars'][number]['zhi']}))};
  const reference=evaluateQiongtongClauseReferences(input);expect(reference.schema).toBe('qiongtong-literal-conditions/1.0.1');const before=JSON.stringify(reference),html=renderToStaticMarkup(<QiongtongClauseReferenceView reference={reference}/>);
  expect(html).toContain('符合字面条件');expect(html).toContain('这只是字句条件参考');expect(html).toContain('完整用神、从格和合化仍未裁定');expect(html).not.toContain('qiongtong-literal-conditions/1.0.1');expect(JSON.stringify(reference)).toBe(before);
 });
 it('requires the exact method without calling an accessor or accepting the unrelated GengSi method',()=>{
  let reads=0;const getter=Object.defineProperty({},'previewQiongtongClauseReferences',{get(){reads++;return()=>{};}});
  expect(hasQiongtongClauseReferenceApi(getter)).toBe(false);expect(reads).toBe(0);expect(hasQiongtongClauseReferenceApi({previewGengSiReference:async()=>{}})).toBe(false);
  expect(hasQiongtongClauseReferenceApi({previewQiongtongClauseReferences:async()=>{throw Error('Not invoked');}})).toBe(true);
 });
 it('renders an explicit read action and never sends profile data during rendering',()=>{
  const profile=input(),before=JSON.stringify(profile),previewQiongtongClauseReferences=vi.fn(async()=>{throw Error('Rendering must not call API');});
  const html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile} api={{previewQiongtongClauseReferences}}/>);
  expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();expect(JSON.stringify(profile)).toBe(before);expect(html).toContain('查阅月别条文');expect(html).toContain('不改变评分或候选排序');expect(html).not.toContain('data-clause-status=');
 });
 it('keeps missing capability and host busy disabled without manufacturing a ready preview',()=>{
  const missing=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={input()}/>);expect(missing).toContain('当前版本此项查阅暂不可用');expect(missing).toMatch(/<button[^>]*disabled=""/);expect(missing).not.toContain('data-clause-status=');
  const previewQiongtongClauseReferences=vi.fn(async()=>{throw Error('Not invoked');}),busy=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={input()} api={{previewQiongtongClauseReferences}} disabled/>);expect(busy).toMatch(/<button[^>]*disabled=""/);expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();
 });
 it('uses user-facing idle copy without exposing lease, API, or stale-response implementation terms',()=>{
  const profile=input(),api={previewQiongtongClauseReferences:vi.fn(async()=>{throw Error('failure');})};const html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile} api={api}/>);expect(html).toContain('按当前出生资料查阅');expect(html).toContain('查阅月别条文');expect(html).not.toContain('资料或 API 实例变化');expect(html).not.toContain('旧回包');expect(html).not.toContain('本地补算');expect(html).toContain('只查阅');
 });
});

describe('M755 r2 capability, input guidance, and explicit retry',()=>{
 it('reports missing capability for a complete profile and points to the existing workbench without a fake retry action',()=>{
  const profile=input(),before=JSON.stringify(profile),html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile}/>);
  expect(html).toContain('当前版本此项查阅暂不可用');expect(html).toContain('左侧“工作空间”返回“起名工作台”');expect(html).toMatch(/<button[^>]*disabled=""/);
  expect(html).not.toMatch(/待补资料|请补|补全|重试|更新版本/);expect((html.match(/<button\b/g)||[]).length).toBe(1);expect(JSON.stringify(profile)).toBe(before);
 });
 it('asks only for genuinely absent birth details when the feature is available and keeps unavailable guidance independent of missing data',()=>{
  const profile={...input(),birthDate:'',birthTime:'',birthPlace:'',timezone:''},previewQiongtongClauseReferences=vi.fn(async()=>{throw Error('No automatic request');});
  const available=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile} api={{previewQiongtongClauseReferences}}/>),unavailable=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile}/>);
  expect(available).toContain('待补资料：出生日期、出生时刻');expect(available).not.toContain('出生日期、出生时刻、');expect(available).toContain('未填写时区，当前按 Asia/Shanghai');expect(available).toContain('请在“起名工作台”补充后查阅');expect(available).not.toContain('当前版本此项查阅暂不可用');
  expect(unavailable).toContain('当前版本此项查阅暂不可用');expect(unavailable).not.toContain('待补资料');expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();
 });
 it('lets an explicitly unknown hour remain unknown instead of requesting an invented birth time',()=>{
  const profile={...input(),birthTime:'',timeUnknown:true},previewQiongtongClauseReferences=vi.fn(async()=>{throw Error('No automatic request');}),html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile} api={{previewQiongtongClauseReferences}}/>);
  expect(html).toContain('出生时刻尚未确定，无需为查阅补填时刻');expect(html).not.toContain('待补资料');expect(html).not.toMatch(/<button[^>]*disabled/);expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();
 });
 it('invokes the rendered click handler, shows pending, rejects, and explicitly retries a second request in a bounded mocked hook harness (not a browser)',async()=>{
  // Executes the actual component and handlers with controlled hooks; no ReactDOM, browser, HTTP, or Service authentication is claimed.
  const actualReact=await vi.importActual<typeof import('react')>('react');
  type Slot={value?:unknown;current?:unknown;deps?:unknown[];cleanup?:()=>void};
  const slots:Slot[]=[],effects:(()=>void)[]=[];let cursor=0;
  vi.resetModules();
  vi.doMock('react',()=>({...actualReact,
   useId:()=>`m755-r2-${cursor++}`,
   useRef:(value:unknown)=>{const i=cursor++;return slots[i]??(slots[i]={current:value});},
   useState:(initial:unknown)=>{const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial};return[slots[i].value,(next:unknown)=>{slots[i].value=typeof next==='function'?(next as (previous:unknown)=>unknown)(slots[i].value):next;}];},
   useEffect:(setup:()=>void|(()=>void),deps:unknown[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((value,index)=>!Object.is(value,old.deps?.[index]))){const slot=slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slot.cleanup?.();slot.cleanup=setup()||undefined;});}}
  }));
  const nodes=(node:unknown,rows:React.ReactElement<any>[]=[]):React.ReactElement<any>[]=>{if(Array.isArray(node))node.forEach(child=>nodes(child,rows));else if(React.isValidElement<{children?:React.ReactNode}>(node)){rows.push(node);nodes(node.props.children,rows);}return rows;};
  const text=(node:unknown):string=>Array.isArray(node)?node.map(text).join(''):React.isValidElement<{children?:React.ReactNode}>(node)?text(node.props.children):typeof node==='string'||typeof node==='number'?String(node):'';
  const settle=async()=>{await Promise.resolve();await Promise.resolve();};
  try{
   const {QiongtongClausePreviewPanel:Panel}=await import('../src/renderer/QiongtongClausePreviewPanel');
   const response=JSON.parse(readFileSync(new URL('./fixtures/m615-legacy-service-preview.json',import.meta.url),'utf8')) as QiongtongClauseReferencePreview,beforeResponse=JSON.stringify(response);
   const profile={...input(),id:response.profileId},beforeProfile=JSON.stringify(profile);
   const deferred:{resolve:(value:QiongtongClauseReferencePreview)=>void;reject:(reason:Error)=>void}[]=[];
   const previewQiongtongClauseReferences=vi.fn((_profile:BirthProfile)=>new Promise<QiongtongClauseReferencePreview>((resolve,reject)=>deferred.push({resolve,reject}))),api={previewQiongtongClauseReferences};
   const render=()=>{cursor=0;const tree=Panel({profile,api});while(effects.length)effects.shift()!();return tree;};
   const action=(tree:React.ReactElement)=>nodes(tree).find(row=>row.type==='button')!;
   let tree=render();expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();expect(action(tree).props.disabled).toBe(false);
   action(tree).props.onClick();expect(previewQiongtongClauseReferences).toHaveBeenCalledTimes(1);expect(previewQiongtongClauseReferences.mock.calls[0][0]).toEqual(profile);expect(previewQiongtongClauseReferences.mock.calls[0][0]).not.toBe(profile);
   tree=render();expect(action(tree).props.disabled).toBe(true);expect(text(tree)).toContain('正在查阅月别条文…');expect(nodes(tree).filter(row=>row.props.role==='status').map(text).join('')).toContain('正在按当前出生资料查阅，请稍候');
   action(tree).props.onClick();expect(previewQiongtongClauseReferences).toHaveBeenCalledTimes(1);
   deferred[0].reject(Error('Controlled first request rejection'));await settle();tree=render();
   expect(action(tree).props.disabled).toBe(false);expect(nodes(tree).find(row=>row.props.role==='alert')).toBeDefined();expect(text(tree)).toContain('当前输入仍保留，可再次点击“查阅月别条文”');expect(JSON.stringify(profile)).toBe(beforeProfile);
   action(tree).props.onClick();expect(previewQiongtongClauseReferences).toHaveBeenCalledTimes(2);tree=render();expect(action(tree).props.disabled).toBe(true);expect(nodes(tree).some(row=>row.props.role==='alert')).toBe(false);
   // The success payload is an unchanged, tracked legacy Service receipt, not invented verification metadata.
   deferred[1].resolve(response);await settle();tree=render();expect(action(tree).props.disabled).toBe(false);expect(nodes(tree).some(row=>row.props.role==='alert')).toBe(false);
   const sourceList=nodes(tree).find(row=>row.type==='ul'&&row.props['aria-label']==='本次文献来源与许可');expect(sourceList).toBeDefined();
   expect(sourceList!.props.children).toHaveLength(response.sourceVerification.sources.length);for(const source of response.sourceVerification.sources){expect(text(sourceList)).toContain(source.name);expect(text(sourceList)).toContain(source.license);}
   expect(JSON.stringify(response)).toBe(beforeResponse);expect(JSON.stringify(profile)).toBe(beforeProfile);expect(previewQiongtongClauseReferences).toHaveBeenCalledTimes(2);
  }finally{for(const slot of slots)slot?.cleanup?.();vi.doUnmock('react');vi.resetModules();}
 });
});

describe('M797 readonly preview input requiredness',()=>{
 const civilFixture=():BirthProfile=>({...input(),surname:'林',surnamePinyin:'lín',fatherName:'林泽',motherName:'陈宁',calendar:'solar',birthDate:'2024-02-10',birthTime:'12:00',timezone:'Asia/Shanghai',birthPlace:''});
 const markup=(profile:BirthProfile)=>{const previewQiongtongClauseReferences=vi.fn(async()=>{throw Error('No automatic request');}),html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile} api={{previewQiongtongClauseReferences}}/>);expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();return html;};
 it.each([undefined,'civil'] as const)('keeps an empty place optional with %s time basis and the exact public solar-date fixture',timeBasis=>{
  const profile={...civilFixture(),...(timeBasis?{timeBasis}:{})},html=markup(profile);
  expect(profile.calendar).toBe('solar');expect(validBirthTimeInput(profile)).toBe(true);expect(resolveBirthContext(profile).timezone).toBe('Asia/Shanghai');expect(html).not.toMatch(/待补资料|出生地点|出生地经度/);expect(html).not.toMatch(/<button[^>]*disabled/);
 });
 it('does not ask for optional customer or parent names, surname readings, notes, or naming preferences',()=>{
  const profile={...civilFixture(),customerName:'',fatherName:undefined,motherName:undefined,surnamePinyin:'',notes:'',namingPreferences:undefined},html=markup(profile);
  expect(html).not.toMatch(/待补资料|客户姓名|爸爸|妈妈|父母|偏好/);expect(html).not.toMatch(/<button[^>]*disabled/);
 });
 it('retains genuinely mandatory surname, date, and known-time prompts without collecting place or parent text',()=>{
  const html=markup({...civilFixture(),surname:'',birthDate:'',birthTime:''});expect(html).toContain('待补资料：姓氏、出生日期、出生时刻。');expect(html).not.toMatch(/待补资料：[^。]*(?:出生地点|时区|爸爸|妈妈|偏好)/);
 });
 it.each(['','  '])('explains the actual Asia/Shanghai fallback for an empty timezone %j without declaring it missing',timezone=>{
  const profile={...civilFixture(),timezone},html=markup(profile);expect(resolveBirthContext(profile).timezone).toBe('Asia/Shanghai');expect(html).toContain('未填写时区，当前按 Asia/Shanghai（中国标准时间）查阅');expect(html).not.toContain('待补资料');
 });
 it('keeps an invalid explicit timezone as a correction prompt rather than silently claiming it is usable',()=>{
  const profile={...civilFixture(),timezone:'Not/A_Timezone'};expect(()=>resolveBirthContext(profile)).toThrow('时区无效');const html=markup(profile);expect(html).toContain('待核对资料：时区无效');expect(html).not.toContain('未填写时区');
 });
 it.each([-180,0,180])('accepts the actual apparent-solar longitude boundary %s with optional empty place',birthLongitude=>{
  const profile={...civilFixture(),timeBasis:'apparent-solar' as const,birthLongitude},html=markup(profile);expect(validBirthTimeInput(profile)).toBe(true);expect(html).not.toMatch(/待补资料|待核对资料|出生地点/);expect(html).not.toMatch(/<button[^>]*disabled/);
 });
 it.each(['','上海'])('requires separate apparent-solar longitude even with place text %j and an unknown hour',birthPlace=>{
  const profile={...civilFixture(),timeBasis:'apparent-solar' as const,birthLongitude:undefined,timeUnknown:true,birthTime:'',birthPlace},html=markup(profile);expect(validBirthTimeInput(profile)).toBe(false);expect(html).toContain('待补资料：出生地经度。');expect(html).toContain('无需为查阅补填时刻');expect(html).not.toMatch(/待补资料：[^。]*(?:出生时刻|出生地点)/);
 });
 it.each([-181,181,NaN,Infinity])('marks an invalid supplied longitude %s according to the shared contract in either time basis',birthLongitude=>{
  for(const timeBasis of ['civil','apparent-solar'] as const){const profile={...civilFixture(),timeBasis,birthLongitude},html=markup(profile);expect(validBirthTimeInput(profile)).toBe(false);expect(html).toContain('待核对资料：出生地经度应为 -180 至 180 的有限数字');expect(html).not.toContain('待补资料');}
 });
 it.each(['civil','apparent-solar'] as const)('preserves unknown time without requiring it for %s readonly scope judgments',timeBasis=>{
  const profile={...civilFixture(),timeBasis,timeUnknown:true,birthTime:'',...(timeBasis==='apparent-solar'?{birthLongitude:0}:{})},html=markup(profile);expect(validBirthTimeInput(profile)).toBe(true);expect(html).toContain('无需为查阅补填时刻');expect(html).not.toContain('待补资料');expect(html).not.toMatch(/<button[^>]*disabled/);
 });
 it.each(['civil','apparent-solar'] as const)('explicitly clicks an enabled %s empty-place request with the unchanged input in a bounded hook harness (not HTTP)',async timeBasis=>{
  // Actual production handler; controlled hooks and API rejection only, not browser/HTTP/Service success.
  const actualReact=await vi.importActual<typeof import('react')>('react');
  type Slot={value?:unknown;current?:unknown;deps?:unknown[];cleanup?:()=>void};
  const slots:Slot[]=[],effects:(()=>void)[]=[];let cursor=0;
  vi.resetModules();vi.doMock('react',()=>({...actualReact,
   useId:()=>`m797-${cursor++}`,
   useRef:(value:unknown)=>{const i=cursor++;return slots[i]??(slots[i]={current:value});},
   useState:(initial:unknown)=>{const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial};return[slots[i].value,(next:unknown)=>{slots[i].value=typeof next==='function'?(next as (value:unknown)=>unknown)(slots[i].value):next;}];},
   useEffect:(setup:()=>void|(()=>void),deps:unknown[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((value,index)=>!Object.is(value,old.deps?.[index]))){const slot=slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slot.cleanup?.();slot.cleanup=setup()||undefined;});}}
  }));
  const nodes=(node:unknown,rows:React.ReactElement<any>[]=[]):React.ReactElement<any>[]=>{if(Array.isArray(node))node.forEach(child=>nodes(child,rows));else if(React.isValidElement<{children?:React.ReactNode}>(node)){rows.push(node);nodes(node.props.children,rows);}return rows;};
  try{
   const {QiongtongClausePreviewPanel:Panel}=await import('../src/renderer/QiongtongClausePreviewPanel'),profile={...civilFixture(),timeBasis,...(timeBasis==='apparent-solar'?{birthLongitude:0}:{})},before=JSON.stringify(profile);
   let rejectRequest!:(reason:Error)=>void;const previewQiongtongClauseReferences=vi.fn((_profile:BirthProfile)=>new Promise<QiongtongClauseReferencePreview>((_resolve,reject)=>{rejectRequest=reject;})),api={previewQiongtongClauseReferences};
   const render=()=>{cursor=0;const tree=Panel({profile,api});while(effects.length)effects.shift()!();return tree;},action=(tree:React.ReactElement)=>nodes(tree).find(row=>row.type==='button')!;
   let tree=render();expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();expect(action(tree).props.disabled).toBe(false);expect(nodes(tree).some(row=>row.props.role==='status')).toBe(false);
   action(tree).props.onClick();expect(previewQiongtongClauseReferences).toHaveBeenCalledTimes(1);const sent=previewQiongtongClauseReferences.mock.calls[0][0];expect(sent).toEqual(profile);expect(sent).not.toBe(profile);expect(sent.birthPlace).toBe('');expect(sent.birthLongitude).toBe(timeBasis==='apparent-solar'?0:undefined);
   tree=render();expect(action(tree).props.disabled).toBe(true);expect(nodes(tree).some(row=>row.props.role==='status')).toBe(true);rejectRequest(Error('Controlled M797 API rejection'));await Promise.resolve();await Promise.resolve();tree=render();expect(action(tree).props.disabled).toBe(false);expect(nodes(tree).some(row=>row.props.role==='alert')).toBe(true);expect(JSON.stringify(profile)).toBe(before);
  }finally{for(const slot of slots)slot?.cleanup?.();vi.doUnmock('react');vi.resetModules();}
 });
});
