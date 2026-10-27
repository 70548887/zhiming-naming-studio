import {describe,it,expect,vi} from 'vitest';
import {captureCandidate2ReportInput,renderCandidate2ReportSource} from '../src/main/candidate2-report-source';
import {exportCandidate2ReportWithDialog} from '../src/main/candidate2-report-export';
import {candidate2GenerationFixture} from './fixtures/m936-candidate2-generation';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {readFileSync} from 'node:fs';

// Presentation and dispatch fixtures only. No native Store is initialized and
// successful documents from this pure helper do not assert source admission.
const session=()=>candidate2GenerationFixture().result.session;
const settings={studioName:'M990纯呈现',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:45000,hasApiKey:false,useAi:false};
const values=()=>{const s=session();return[s.id,s.reviewRevision,s.reviewToken] as const;};
const invoke=(args:unknown[])=>Reflect.apply(captureCandidate2ReportInput,undefined,args);

describe('M990 report reference and pure canonical presentation',()=>{
 it('captures only exact three primitive reference fields without normalization',()=>{const args=values(),request=invoke([...args]);expect(request).toEqual({id:args[0],expectedReviewRevision:args[1],expectedReviewToken:args[2]});});
 it.each([[],[values()[0]],[...values().slice(0,2)],[...values().slice(0,2),undefined],[...values().slice(0,2),null],[...values(),undefined],[...values(),{session:session()}],[session(),0,values()[2]],[values()[0],-1,values()[2]],[values()[0],Number.MAX_SAFE_INTEGER,values()[2]]].map(args=>({args})))('rejects malformed reference $args before any source is read',({args})=>{expect(()=>invoke(args)).toThrow(/CANDIDATE2_REPORT_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/);});
 it('rejects Proxy/accessor session arguments without invoking their traps',()=>{let getter=0,trap=0;const accessor=Object.defineProperty({},'id',{get(){getter++;return values()[0];},enumerable:true});const proxy=new Proxy({},{ownKeys(){trap++;throw Error('trap');},get(){trap++;throw Error('trap');}});expect(()=>invoke([accessor,0,values()[2]])).toThrow();expect(()=>invoke([proxy,0,values()[2]])).toThrow();expect(getter).toBe(0);expect(trap).toBe(0);});
 it('rejects both stale CAS fields before HTML is generated',()=>{const s=session(),req=invoke([...values()]);const trapSettings=new Proxy(settings,{get(){throw Error('HTML must not be reached');}});expect(()=>renderCandidate2ReportSource(s,trapSettings,{...req,expectedReviewRevision:1})).toThrow('方案已被其他窗口更新');expect(()=>renderCandidate2ReportSource(s,trapSettings,{...req,expectedReviewToken:'22222222-2222-4222-8222-222222222222'})).toThrow('方案已被其他窗口更新');});
 it('uses only the supplied owned canonical snapshot, preserves it and escapes final HTML',()=>{const s=session(),req=invoke([...values()]);s.reviewNote='<script>reportAttack()</script>';s.candidates[0].meaning='<img src=x onerror=reportAttack()>';const before=JSON.stringify(s),doc=renderCandidate2ReportSource(s,settings,req);expect(doc.sessionId).toBe(s.id);expect(doc.reviewRevision).toBe(s.reviewRevision);expect(doc.reviewToken).toBe(s.reviewToken);expect(Object.hasOwn(doc,'source')).toBe(false);expect(Object.hasOwn(doc,'writes')).toBe(false);expect(doc.html).toContain('candidate2-project-report');expect(doc.html).toContain('&lt;script&gt;reportAttack()&lt;/script&gt;');expect(doc.html).not.toContain('<script>reportAttack()');expect(doc.html).not.toContain('<img src=x');expect(JSON.stringify(s)).toBe(before);});
});

describe('M990 main-owned desktop dialog sequencing, pure dependencies only',()=>{
 it('rereads with the exact same CAS after dialog and exports only new canonical HTML',async()=>{const calls:unknown[]=[];let count=0;const result=await exportCandidate2ReportWithDialog(values(),{prepare:(...args)=>{calls.push(args);const doc=renderCandidate2ReportSource(session(),settings,invoke([...args]));return{...doc,html:++count===1?'first-canonical-html':'second-canonical-html'};},selectPath:async filename=>{expect(filename).toMatch(/\.pdf$/);return'D:/pure-test.pdf';},exportHtml:async(html,file)=>{expect(html).toBe('second-canonical-html');return file;}});expect(result).toBe('D:/pure-test.pdf');expect(calls).toEqual([[...values()],[...values()]]);});
 it('cancellation does not reread, save, export or create history',async()=>{const prepare=vi.fn(()=>renderCandidate2ReportSource(session(),settings,invoke([...values()]))),exportHtml=vi.fn();expect(await exportCandidate2ReportWithDialog(values(),{prepare,selectPath:async()=>null,exportHtml})).toBe(null);expect(prepare).toHaveBeenCalledTimes(1);expect(exportHtml).not.toHaveBeenCalled();});
 it('CAS refusal after the dialog does not print or save the changed version',async()=>{let count=0;const exportHtml=vi.fn();await expect(exportCandidate2ReportWithDialog(values(),{prepare:(id,rev,token)=>{const s=session();if(++count===2)s.reviewRevision=1;return renderCandidate2ReportSource(s,settings,invoke([id,rev,token]));},selectPath:async()=> 'D:/pure-test.pdf',exportHtml})).rejects.toThrow('方案已被其他窗口更新');expect(exportHtml).not.toHaveBeenCalled();});
 it('does not accept extra arguments even in main desktop orchestration',async()=>{const prepare=vi.fn(),selectPath=vi.fn(),exportHtml=vi.fn();await expect(exportCandidate2ReportWithDialog([...values(),undefined],{prepare,selectPath,exportHtml})).rejects.toThrow('CANDIDATE2_REPORT_INPUT_INVALID');expect(prepare).not.toHaveBeenCalled();expect(selectPath).not.toHaveBeenCalled();});
});

describe('M990 actual Service captured native report receiver boundary, rejection only',()=>{
 it.each(['plain','same-prototype','proxy'] as const)('rejects %s fake Store without any public reader/writer fallback',kind=>{
  const read=vi.fn(),prepare=vi.fn(),save=vi.fn(),migrate=vi.fn(),target=kind==='plain'?{}:Object.create(Store.prototype);for(const[key,value]of Object.entries({readVerifiedSession:read,prepareCandidate2Report:prepare,saveSession:save,migrateCustomerStorage:migrate}))Object.defineProperty(target,key,{value});let get=0;const receiver=kind==='proxy'?new Proxy(target,{get(){get++;throw Error('Unexpected fake receiver get');}}):target;
  const svc=Object.create(StudioService.prototype);Object.defineProperty(svc,'store',{value:receiver});expect(()=>Reflect.apply(StudioService.prototype.previewCandidate2Report,svc,[...values()])).toThrow(/private|Receiver must be an instance|Cannot access/i);expect(get).toBe(0);for(const spy of [read,prepare,save,migrate])expect(spy).not.toHaveBeenCalled();
 });
 it('contains only private read operations in the actual new Store source, not save/persist/history',()=>{
  const source=readFileSync(new URL('../src/main/store.ts',import.meta.url),'utf8'),block=source.slice(source.indexOf('  prepareCandidate2Report('),source.indexOf('  #readVerifiedSessionCore('));expect(block).toContain('#withStoredReadOperation');expect(block).toContain('#readVerifiedSessionCore');expect(block).toContain('#settingsCore');expect(block).toContain('renderCandidate2ReportSource');expect(block).not.toMatch(/\b(?:saveSession|persist|withWriter|mutate|writeCompactSession|INSERT|UPDATE)\b/);
 });
});
