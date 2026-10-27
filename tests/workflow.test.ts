import { describe,expect,it } from 'vitest';
import { canApplyDraftResult,compareSessionReviews,createDraftTicket,getReportCandidates,isSessionCurrent,normalizePreferences,preferencesForProfile } from '../src/shared/workflow';
import type { BirthProfile,NameCandidate,NamingSession } from '../src/shared/types';

const profile:BirthProfile={id:'customer-a',customerName:'甲家长',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',fatherName:'林志远',motherName:'陈清'};
function candidate(index:number,favorite=false):NameCandidate{return {id:`name-${index}`,fullName:`林名${index}`,givenName:`名${index}`,pinyin:'lín míng',style:'清朗',characters:[],meaning:`寓意${index}`,reason:'推荐理由',traditionalReason:'传统依据',reviewNote:'',favorite,citations:[],evaluation:{sound:3,meaning:3,simplicity:3,traditional:3,distinctiveness:3},warnings:[],origin:'local',originalMeaning:`寓意${index}`};}
function session(overrides:Partial<NamingSession>={}):NamingSession{return {id:'session-a',profileId:profile.id,createdAt:'2026-10-17T00:00:00Z',profile:{...profile},preferences:normalizePreferences(),analysis:{bazi:{solarDate:'',lunarDate:'',zodiac:'马',pillars:[],elements:{木:0,火:0,土:0,金:0,水:0},favorable:['水'],unfavorable:[],strength:'',reasons:[],seasonalAdvice:'',warnings:[],version:'test',ruleDescription:''},qimen:{available:false,dun:'',ju:0,yuan:'',solarTerm:'',xun:'',chiefStar:'',chiefDoor:'',palaces:[],reasons:[],warnings:[],version:'test'}},candidates:Array.from({length:12},(_,i)=>candidate(i)),reviewNote:'',originalFavorable:['水'],dataVersion:'test',...overrides};}

describe('customer-scoped preferences',()=>{
  it('uses the opened customer preferences instead of a different customer latest session',()=>{
    const a=session({preferences:normalizePreferences({requiredChars:'安',elderTaboo:'远',preferredElements:['火']})});
    const b={...profile,id:'customer-b'};
    expect(preferencesForProfile(b,[a])).toEqual(normalizePreferences());
    expect(preferencesForProfile({...b,namingPreferences:normalizePreferences({style:'简约现代'})},[a]).style).toBe('简约现代');
  });
  it('recovers the most recent own-session preferences for legacy profiles, independent of array order',()=>{
    const old=session({createdAt:'2026-10-16T00:00:00Z',preferences:normalizePreferences({requiredChars:'安'})});
    const latest=session({id:'session-latest',createdAt:'2026-10-18T00:00:00Z',preferences:normalizePreferences({requiredChars:'宁'})});
    expect(preferencesForProfile(profile,[old,latest]).requiredChars).toBe('宁');
    expect(preferencesForProfile({...profile,namingPreferences:normalizePreferences({requiredChars:'清'})},[latest]).requiredChars).toBe('清');
  });
  it('does not share mutable element arrays between opened customers',()=>{
    const first=preferencesForProfile(profile,[]);first.preferredElements.push('水');
    expect(preferencesForProfile({...profile,id:'customer-b'},[]).preferredElements).toEqual([]);
  });
});

describe('draft inputs and immutable generated snapshots',()=>{
  it.each([
    ['forbiddenChars','安'],['requiredChars','宁'],['generationChar','清'],['elderTaboo','远'],['style','周易'],['meanings','坚毅'],['industry','医学'],['priority','sound'],['length',1],['zodiacRules',false],['avoidParentNames',false],['preferredElements',['木']]
  ] as const)('makes a generated session stale when %s changes',(key,value)=>{
    const s=session();expect(isSessionCurrent(profile,{...s.preferences,[key]:value},s)).toBe(false);
    expect(isSessionCurrent(profile,s.preferences,s)).toBe(true);
  });
  it.each([
    ['surname','陈'],['gender','女'],['fatherName','林志安'],['motherName','李宁'],['birthDate','2026-10-18'],['birthTime','10:30'],['timezone','UTC'],['calendar','lunar'],['id','customer-b']
  ] as const)('does not permit an old report to match after profile %s changes',(key,value)=>{
    const s=session();expect(isSessionCurrent({...profile,[key]:value},s.preferences,s)).toBe(false);
  });
  it('supports explicit snapshot reopening and harmless metadata or legacy-default differences',()=>{
    const s=session();delete s.preferences.avoidParentNames;delete s.profile.fatherName;delete s.profile.motherName;
    const draft={...s.profile,customerName:'更新称呼',notes:'内部沟通备注',fatherName:'',motherName:''};
    expect(isSessionCurrent(draft,normalizePreferences(s.preferences),s)).toBe(true);
    expect(isSessionCurrent(profile,normalizePreferences(),null)).toBe(false);
    expect(isSessionCurrent(s.profile,s.preferences,s)).toBe(true);
  });
  it('treats element order as irrelevant and ignores an unknown time value',()=>{
    const s=session({profile:{...profile,timeUnknown:true},preferences:normalizePreferences({preferredElements:['火','水']})});
    expect(isSessionCurrent({...s.profile,birthTime:'18:30'},{...s.preferences,preferredElements:['水','火']},s)).toBe(true);
  });
});

describe('request ownership during generation',()=>{
  it('applies an unedited result but rejects it after creating another customer',()=>{
    const prefs=normalizePreferences(),request=createDraftTicket(2,profile,prefs);
    expect(canApplyDraftResult(request,2,profile,prefs)).toBe(true);
    expect(canApplyDraftResult(request,3,{...profile,id:'new-draft'},prefs)).toBe(false);
  });
  it('keeps edited parent fields and rejects late responses even after editing back to the original value',()=>{
    const prefs=normalizePreferences(),request=createDraftTicket(4,profile,prefs);
    expect(canApplyDraftResult(request,5,{...profile,motherName:'李安'},prefs)).toBe(false);
    expect(canApplyDraftResult(request,6,profile,prefs)).toBe(false);
    expect(canApplyDraftResult(request,4,profile,{...prefs,forbiddenChars:'宁'})).toBe(false);
  });
});

describe('report list shared by preview and PDF',()=>{
  it('includes a lone favorite beyond the former six-name preview limit',()=>{
    const s=session();s.candidates[7].favorite=true;
    expect(getReportCandidates(s).map(c=>c.id)).toEqual(['name-7']);
  });
  it('uses all favorites in candidate order, or every candidate when none are saved',()=>{
    const s=session();expect(getReportCandidates(s)).toHaveLength(12);
    s.candidates[10].favorite=true;s.candidates[2].favorite=true;
    expect(getReportCandidates(s).map(c=>c.id)).toEqual(['name-2','name-10']);
  });
});

describe('readable history comparison',()=>{
  it('finds each reviewed field, favorite, overall note and manual elements without treating a changed ID as the same name',()=>{
    const old=session(),next=structuredClone(old);
    Object.assign(next.candidates[0],{meaning:'新寓意',reason:'新理由',traditionalReason:'新依据',reviewNote:'已与家长确认',favorite:true});
    next.preferences.preferredElements=['木'];next.reviewNote='推荐第一名';
    const changes=compareSessionReviews(old,next);
    expect(changes.map(c=>c.field)).toEqual(['总体审阅','人工喜用','组合寓意','推荐理由','传统依据','审阅备注','收藏状态']);
    expect(changes.find(c=>c.field==='组合寓意')).toMatchObject({name:'林名0',before:'寓意0',after:'新寓意'});
    expect(compareSessionReviews(next,structuredClone(next))).toEqual([]);
  });
  it('reports candidate additions and removals instead of omitting different lists',()=>{
    const old=session(),next=session({candidates:[candidate(99)]});
    const changes=compareSessionReviews(old,next);
    expect(changes.filter(c=>c.after==='已移除')).toHaveLength(12);
    expect(changes.find(c=>c.name==='林名99')).toMatchObject({field:'候选名单',before:'未收录',after:'已收录'});
  });
});
