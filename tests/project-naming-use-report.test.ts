import {afterAll,beforeAll,expect,it} from 'vitest';
import {reportHTML} from '../src/main/report';
import {projectNamingUseReport} from '../src/main/project-naming-use-report';
import {normalizePreferences} from '../src/shared/workflow';
import type {NamingSession} from '../src/shared/types';
import {open,cleanup,positiveProfile,projectPreferences,selected} from './helpers/project-naming-store-fixture';

const settings={studioName:'报告验收工作室',contact:'',logoDataUrl:'',apiBaseUrl:'http://127.0.0.1',model:'',timeoutMs:45000,hasApiKey:false,useAi:false};
let generated:NamingSession,manual:NamingSession,legacy:NamingSession;
beforeAll(async()=>{
 const context=await open();
 generated=(await context.service.generate(positiveProfile(),projectPreferences())).session;
 expect(selected(generated).evaluation.traditional).toBe(40);
 const draft=structuredClone(generated);draft.preferences={...draft.preferences,preferredElements:['水']};
 expect(draft.profile.namingPreferences!.preferredElements).toEqual([]);
 manual=context.service.saveSession(draft);
 const preference=normalizePreferences({length:1,requiredChars:'沐',preferredElements:[],numerology:false,zodiacRules:false});
 legacy=(await context.service.generate(positiveProfile(),preference)).session;
 expect(selected(legacy).evaluation.traditional).toBe(100);
},30000);
afterAll(async()=>{await cleanup();});

it('prints the adopted project elements rather than the separate legacy favorable candidates',()=>{
 const before=JSON.stringify(generated),html=reportHTML(generated,settings);
 expect(html).toContain('本方案采用：土、金（项目主链 · 月支取法）');
 expect(html).not.toContain('本方案采用：土、金、水');
 expect(html).toContain('本次实际选字参考');
 expect(html).toContain('原扶抑候选');
 expect(JSON.stringify(generated)).toBe(before);
});
it('prints the saved adoption after a real manual review without applying the later water draft to the saved score',()=>{
 const before=JSON.stringify(manual),html=reportHTML(manual,settings);
 expect(html).toContain('本方案采用：土、金（项目主链 · 月支取法）');
 expect(html).not.toContain('本方案采用：水');
 expect(html).toContain('后续人工审阅草稿');
 expect(html).toContain('水（未用于本次生成');
 expect(manual.profile.namingPreferences!.preferredElements).toEqual([]);
 expect(selected(manual).evaluation.traditional).toBe(40);
 expect(JSON.stringify(manual)).toBe(before);
});
it('retains the legacy report path without adding a project adoption section',()=>{
 expect(projectNamingUseReport(legacy)).toEqual({kind:'legacy',html:'',styles:''});
 expect(reportHTML(legacy,settings)).toContain('本方案采用：土、金、水');
 expect(reportHTML(legacy,settings)).not.toContain('生成时的取法与用字参考');
});
it('does not replace incomplete project evidence with legacy or review elements',()=>{
 const missing=structuredClone(generated);delete missing.analysis.projectNamingUse;
 expect(reportHTML(missing,settings)).toContain('本方案采用：未核实');
 const unknown=JSON.parse(JSON.stringify(generated));unknown.namingRules.version='naming-editorial-7.2.0';
 expect(reportHTML(unknown,settings)).toContain('本方案采用：未核实');
});
