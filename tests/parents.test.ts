import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {parentNameReference,expandNameVariants,generateLocal,evaluateName,validatePreferences} from '../src/domain/naming';
import {analyzeProfile} from '../src/domain/engine';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import type {BirthProfile,NamingPreferences,CharacterEntry,Citation,NamingSession} from '../src/shared/types';
const profile:BirthProfile={id:'parents-test',customerName:'父母资料测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',fatherName:'林知远',motherName:'陈安宁'};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安求知',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
const data=JSON.parse(readFileSync(resolve('data/dataset.json'),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
describe('parent names and naming constraints',()=>{
  it('extracts given-name characters with each parent own surname, including compound surnames',()=>{
    expect(parentNameReference({...profile,fatherName:'张德明',motherName:'李安宁'},pref).excluded).toBe('德明安宁');
    expect(parentNameReference({...profile,fatherName:'欧阳修',motherName:'司马清'},pref).excluded).toBe('修清');
    expect(parentNameReference({...profile,fatherName:'刘志远',motherName:'郭书宁'},pref).excluded).toBe('志远书宁');
    expect(parentNameReference({...profile,fatherName:'林林',motherName:''},pref).excluded).toBe('林');
  });
  it('keeps old empty records usable and reports uncertain names without guessing',()=>{
    expect(parentNameReference({...profile,fatherName:undefined,motherName:undefined},pref)).toEqual({excluded:'',warnings:[]});
    for(const fatherName of ['欧阳','林','Alice','某甲乙']){const r=parentNameReference({...profile,fatherName,motherName:''},pref);expect(r.excluded).toBe('');expect(r.warnings.length).toBe(1);}
  });
  it('filters both local combinations and returned AI names; disabling only removes automatic parent exclusions',()=>{
    const analysis=analyzeProfile(profile),r=generateLocal(profile,pref,analysis,data.characters,data.citations,0);
    expect(r.candidates).toHaveLength(12);expect(r.candidates.every(c=>![...c.givenName].some(ch=>'知远安宁'.includes(ch)))).toBe(true);
    expect(evaluateName('安宁',profile,pref,analysis,data.characters,data.citations,'ai')).toBeNull();
    expect(evaluateName('安宁',profile,{...pref,avoidParentNames:false},analysis,data.characters,data.citations,'ai')).not.toBeNull();
    expect(evaluateName('安宁',profile,{...pref,avoidParentNames:false,elderTaboo:'宁'},analysis,data.characters,data.citations)).toBeNull();
  });
  it('explains specified or generation-character conflicts before generation',()=>{
    expect(()=>validatePreferences({...pref,requiredChars:'安'},data.characters,profile)).toThrow('父母姓名避讳冲突');
    expect(()=>validatePreferences({...pref,generationChar:'知'},data.characters,profile)).toThrow('父母姓名避讳冲突');
    expect(()=>validatePreferences({...pref,requiredChars:'安',avoidParentNames:false},data.characters,profile)).not.toThrow();
  });
  it('uses the same Unicode, traditional and variant equivalence for local, AI, and constraint validation',()=>{
    const p={...profile,fatherName:'林志遠',motherName:'陳安寧'},a=analyzeProfile(p);
    expect(parentNameReference(p,pref,data.characters).excluded).toBe('志远安宁');
    expect(evaluateName('远宁',p,pref,a,data.characters,data.citations,'ai')).toBeNull();
    expect(evaluateName('远宁',p,{...pref,avoidParentNames:false},a,data.characters,data.citations,'ai')).not.toBeNull();
    expect(()=>validatePreferences({...pref,requiredChars:'远'},data.characters,p)).toThrow('父母姓名避讳冲突');
    expect(evaluateName('远宁',{...profile,fatherName:'',motherName:''},{...pref,forbiddenChars:'遠'},a,data.characters,data.citations)).toBeNull();
    expect(evaluateName('远宁',{...profile,fatherName:'',motherName:''},{...pref,elderTaboo:'甯'},a,data.characters,data.citations)).toBeNull();
    expect(expandNameVariants('林',data.characters)).toContain('林');
    const generated=generateLocal(p,pref,a,data.characters,data.citations,8);expect(generated.candidates).toHaveLength(12);expect(generated.candidates.every(c=>![...c.givenName].some(ch=>'志远安宁'.includes(ch)))).toBe(true);
    expect(parentNameReference({...p,fatherName:'太史明',motherName:'百里清'},pref,data.characters).excluded).toBe('明清');
  });
});
describe('parent profile persistence and legacy backup compatibility', { timeout: 15_000 },()=>{
  let dir:string,store:Store,svc:StudioService;
  beforeAll(async()=>{dir=mkdtempSync(join(tmpdir(),'zhiming-parents-'));store=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();svc=new StudioService(store,{read:()=>'',write:()=>{}});});
  afterAll(()=>{store?.db.close();if(dir)rmSync(dir,{recursive:true,force:true});});
  it('round-trips parent names in profiles, session snapshots and SQLite backups',async()=>{
    const result=await svc.generate({...profile,fatherName:'  林知远  '},pref);expect(result.session.profile.fatherName).toBe('林知远');const backup=store.backupBytes();store.deleteProfile(profile.id);store.restore(backup);
    expect(svc.bootstrap().profiles[0].motherName).toBe('陈安宁');expect(svc.bootstrap().sessions[0].profile.fatherName).toBe('林知远');
    const reopened=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();expect(reopened.rows<BirthProfile>('profiles')[0].fatherName).toBe('林知远');reopened.db.close();
    const html=reportHTML(result.session,svc.bootstrap().settings);expect(html).toContain('爸爸姓名：林知远');expect(html).toContain('妈妈姓名：陈安宁');expect(html).toContain('知、远、安、宁');
  });
  it('restores pre-feature profiles/sessions and validates provided parent field types',()=>{
    const session=svc.bootstrap().sessions[0];delete session.profile.fatherName;delete session.profile.motherName;delete session.preferences.avoidParentNames;
    const legacyProfile={...session.profile};store.put('profiles',legacyProfile.id,legacyProfile);store.put('sessions',session.id,session);const backup=store.backupBytes();store.restore(backup);
    expect(svc.bootstrap().profiles[0].fatherName).toBeUndefined();expect(svc.bootstrap().sessions[0].profile.motherName).toBeUndefined();
    expect(()=>svc.saveProfile({...profile,fatherName:123 as any})).toThrow('爸爸姓名');expect(()=>svc.saveProfile({...profile,motherName:'名'.repeat(41)})).toThrow('妈妈姓名');
    const original=store.backupBytes();store.db.run('UPDATE profiles SET json=?',[JSON.stringify({...legacyProfile,fatherName:42})]);const invalid=store.db.export();store.restore(original);expect(()=>store.restore(invalid)).toThrow('字段不完整');expect(svc.bootstrap().profiles.length).toBe(1);
  });
  it('keeps saved historical family snapshots when customer information changes',()=>{const historic=store.rows<NamingSession>('sessions')[0];svc.saveProfile({...profile,fatherName:'林启明'});expect(svc.bootstrap().profiles[0].fatherName).toBe('林启明');expect(store.rows<NamingSession>('sessions')[0].profile.fatherName).toBe(historic.profile.fatherName);});
});
