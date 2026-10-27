import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {cpSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile} from '../src/shared/types';

// The file is intended to be applied at <projectRoot>/tests/. It derives the
// project root from its own URL; it does not use an environment variable or a
// machine-specific path.
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let dataDirectory=join(projectRoot,'data');
const profile:BirthProfile={id:'m526-api-readonly',customerName:'M526 条文预览边界',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2020-05-07',birthTime:'12:00:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
let sourceCopy:string|undefined,forbiddenStoreReads=0,projectLockSha:string,projectTableSha:string;

// Constructor-free Service: previewGengSiReference only receives a restricted
// store capability containing dataDir. Any customer/SQL/settings access fails.
const storeOwner=new Proxy({}, {get(_target,key){if(key==='dataDir')return dataDirectory;forbiddenStoreReads++;throw new Error('M526 forbidden Store dependency: '+String(key));}});
const service=Object.create(StudioService.prototype) as StudioService;
Object.defineProperty(service,'store',{value:storeOwner,writable:false,enumerable:false,configurable:false});

beforeAll(()=>{
  const local=join(projectRoot,'.local');mkdirSync(local,{recursive:true});
  projectLockSha=digest(join(projectRoot,'data','monthly-seasonal-source-lock.json'));
  projectTableSha=digest(join(projectRoot,'data','monthly-seasonal-table.json'));
  sourceCopy=mkdtempSync(join(local,'m526-source-'));cpSync(dataDirectory,sourceCopy,{recursive:true});
});
afterAll(()=>{if(sourceCopy)rmSync(sourceCopy,{recursive:true,force:true});});

function digest(file:string){return createHash('sha256').update(readFileSync(file)).digest('hex');}
function actualSourceProfile(overrides:Partial<BirthProfile>={}):BirthProfile{return {...profile,...overrides};}

describe('M526 actual constructor-free Service and fixed-source GengSi preview',()=>{
  it('returns a typed source-verified DTO for a known complete time',async()=>{
    const pending=service.previewGengSiReference(actualSourceProfile());expect(typeof pending.then).toBe('function');
    const result=await pending;
    expect(result.schema).toBe('geng-si-reference-preview/1.0.0');
    expect(result.profileId).toBe(profile.id);
    expect(result.analysis).toEqual(analyzeProfile(actualSourceProfile()));
    expect(result.explanation.paragraph.statusLabel).toBe('条文适用');
    expect(result.explanation.paragraph.referenceSet?.stems).toEqual(['壬','丙','戊']);
    expect(result.explanation.paragraph.referenceSet?.selectionStatus).toBe('unknown');
    expect(result.sourceVerification.status).toBe('verified-fixed-resources');
    expect(result.sourceVerification.sources.map(source=>source.id)).toEqual(['bazi-monthly-qiongtong-2294674','bazi-evidence-lunar186']);
    expect(result.sourceVerification.quoteSpan).toEqual({start:24089,end:24113,unit:'unicode-codepoint',interval:'[start,end)'});
    expect(result.explanation.rankingImpact).toBe('none');
    expect(result.explanation.selectionCertificate).toBe('not-created-or-modified');
  });

  it('keeps missing hour facts unknown without inventing a favorable result',async()=>{
    const input=actualSourceProfile({birthTime:'',timeUnknown:true}),result=await service.previewGengSiReference(input);
    expect(result.analysis).toEqual(analyzeProfile(input));
    expect(result.explanation.paragraph.status).toBe('matched');
    expect(result.explanation.paragraph.statusLabel).toBe('条文适用');
    expect(result.explanation.paragraph.unknownPositions).toContain('时柱');
    expect(result.explanation.seasonalFacts.status).toBe('pending');
    expect(result.explanation.paragraph.referenceSet).not.toBeNull();
    expect(result.explanation.paragraph.referenceSet?.stems).toEqual(['壬','丙','戊']);
    expect(result.explanation.paragraph.referenceSet?.selectionStatus).toBe('unknown');
    expect(result.explanation.paragraph.referenceSet?.orderPolicy).toBe('unranked');
    expect(result.explanation.paragraph.conditions.some(condition=>condition.status==='unknown')).toBe(true);
    expect(result.explanation.rankingImpact).toBe('none');
    expect(result.explanation.selectionCertificate).toBe('not-created-or-modified');
  });

  it('prioritizes a known non-applicable clause over a speculative reference set',async()=>{
    const input=actualSourceProfile({birthDate:'2020-04-15'}),result=await service.previewGengSiReference(input);
    expect(result.explanation.paragraph.status).toBe('not-applicable');
    expect(result.explanation.paragraph.statusLabel).toBe('本条不适用');
    expect(result.explanation.paragraph.referenceSet).toBeNull();
    expect(result.explanation.paragraph.conditions.some(condition=>condition.status==='not-met')).toBe(true);
  });

  it('rejects extra arguments, forged fields, accessors and proxies before reading request data',async()=>{
    await expect((service.previewGengSiReference as (...args:unknown[])=>Promise<unknown>)(profile,{})).rejects.toThrow('只接受');
    await expect(service.previewGengSiReference({...profile,hiddenStems:[]} as never)).rejects.toThrow('未允许字段');
    let getterReads=0;const getter=Object.defineProperty({...profile},'birthDate',{enumerable:true,get(){getterReads++;return profile.birthDate;}});
    await expect(service.previewGengSiReference(getter)).rejects.toThrow('访问器');expect(getterReads).toBe(0);
    const proxy=new Proxy(profile,{getPrototypeOf(){getterReads++;throw new Error('proxy trap');}});
    await expect(service.previewGengSiReference(proxy)).rejects.toThrow('代理');expect(getterReads).toBe(0);
    expect(forbiddenStoreReads).toBe(0);
  });

  it('rejects a tampered owned source-lock copy and leaves the project source unchanged',async()=>{
    if(!sourceCopy)throw new Error('source copy not prepared');
    const lock=join(sourceCopy,'monthly-seasonal-source-lock.json'),original=readFileSync(lock),originalDigest=digest(lock);
    writeFileSync(lock,Buffer.concat([original,Buffer.from(' ')]));
    dataDirectory=sourceCopy;
    try{await expect(service.previewGengSiReference(profile)).rejects.toThrow('来源登记校验失败');}
    finally{writeFileSync(lock,original);dataDirectory=join(projectRoot,'data');}
    expect(digest(lock)).toBe(originalDigest);
    expect(digest(lock)).toBe(projectLockSha);
    expect(digest(join(projectRoot,'data','monthly-seasonal-source-lock.json'))).toBe(projectLockSha);
    expect((await service.previewGengSiReference(profile)).sourceVerification.status).toBe('verified-fixed-resources');
  });

  it('rejects an altered quoted rule in an owned copy while preserving the original table bytes',async()=>{
    if(!sourceCopy)throw new Error('source copy not prepared');
    const table=join(sourceCopy,'monthly-seasonal-table.json'),original=readFileSync(table),originalDigest=digest(table),value=JSON.parse(original.toString('utf8'));
    const entry=value.entries.find((item:{id:string})=>item.id==='庚-巳');if(!entry)throw new Error('庚-巳 entry missing');
    entry.conditions.find((item:{id:string})=>item.id==='geng-si-no-fixed-order').sourceQuote+='M526-tamper';
    writeFileSync(table,JSON.stringify(value));dataDirectory=sourceCopy;
    try{await expect(service.previewGengSiReference(profile)).rejects.toThrow('原文、结构表或许可校验失败');}
    finally{writeFileSync(table,original);dataDirectory=join(projectRoot,'data');}
    expect(digest(table)).toBe(originalDigest);
    expect(digest(table)).toBe(projectTableSha);
    expect(digest(join(projectRoot,'data','monthly-seasonal-table.json'))).toBe(projectTableSha);
    expect((await service.previewGengSiReference(profile)).sourceVerification.status).toBe('verified-fixed-resources');
  });
});
