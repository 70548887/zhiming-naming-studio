import type {AiSettings,BirthProfile,StudioSettings} from '../shared/types';
import type {AiNamingCapability} from '../shared/ai-capability';
import {normalizePreferences} from '../shared/workflow';
import {analyzeProfile} from '../domain/engine';
import {generateAI} from './ai';
import {normalizeCredentialEndpoint} from './credentials';
import type {Dataset} from './store';

/** Use the actual naming protocol and local acceptance path with fixed, fictional inputs only. */
export async function testStructuredNaming(settings:AiSettings|StudioSettings,key:string,dataset:Dataset):Promise<AiNamingCapability> {
 const checks:AiNamingCapability['checks']={transport:'not-run',json:'not-run',candidateShape:'not-run',localConstraints:'not-run'};
 const result:AiNamingCapability={kind:'structured-naming',status:'failed',endpoint:'',model:typeof settings?.model==='string'?settings.model:'',checkedAt:new Date().toISOString(),checks,message:'',limitations:[
  '本次使用固定虚构资料检测同一JSON命名协议和本地约束，不读取当前客户、父母姓名、生日、地点或备注。',
  '通过仅说明此地址、模型与凭证在本次小样本请求可用，不代表未来稳定、全部模型能力或名字审美质量已验收。',
  '该检测不会保存设置、启用AI、生成客户档案或写入命名方案。'
 ]};
 try{
  if(!settings||typeof settings.apiBaseUrl!=='string'||settings.apiBaseUrl.length>2000||typeof settings.model!=='string'||!settings.model.trim()||settings.model.length>200||!Number.isFinite(settings.timeoutMs)||settings.timeoutMs<5000||settings.timeoutMs>120000)throw new Error('请填写有效接口、模型与5–120秒超时。');
  result.endpoint=normalizeCredentialEndpoint(settings.apiBaseUrl);if(!key.trim())throw new Error('尚未提供适用于当前接口的AI密钥。');
  const fixture:BirthProfile={id:'protocol-capability-fixture',customerName:'',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2000-01-01',birthTime:'12:00',timeUnknown:false,leapMonth:false,birthPlace:'',timezone:'Asia/Shanghai',notes:''};
  const prefs=normalizePreferences({length:2,requiredChars:'安宁',style:'清朗自然',meanings:'平安',zodiacRules:false,numerology:false,avoidParentNames:false});
  const selected=dataset.characters.filter(character=>[...'安宁'].includes(character.char));
  if(selected.length!==2)throw new Error('当前知识包缺少检测所需的安、宁记录，请先核对知识包。');
  const effective={studioName:'',contact:'',logoDataUrl:'',...settings,hasApiKey:true,useAi:false};
  checks.transport='failed';
  const value=await generateAI(effective,key,fixture,prefs,analyzeProfile(fixture),selected,[],[],stage=>{
   checks[stage]='passed';
   if(stage==='transport'){checks.json='failed';checks.candidateShape='not-run';checks.localConstraints='not-run';}
   if(stage==='json'){checks.candidateShape='failed';checks.localConstraints='not-run';}
   if(stage==='candidateShape'&&checks.localConstraints==='not-run')checks.localConstraints='failed';
  });
  if(!value.candidates.some(candidate=>candidate.givenName==='安宁'||candidate.givenName==='宁安'))throw new Error('返回的检测候选未通过指定字约束。');
  result.status='passed';result.message='命名格式检测通过：结构化响应、候选格式及本地指定字校验均通过。';
 }catch(error){result.message=error instanceof Error?error.message:'命名格式检测未通过。';}
 return result;
}
