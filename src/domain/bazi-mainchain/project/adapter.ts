import type {ChartCase140,MethodInput140,Pillar140} from './types';

/** Accept previously calculated calendar facts only. No date or solar-term math. */
export function inputFromExistingBazi140(cases:{id:string;provenance:string;bazi:{pillars:{label:string;gan:string;zhi:string}[]}}[],uncertainty:MethodInput140['uncertainty']):MethodInput140{
 const names={year:'年',month:'月',day:'日',hour:'时'} as const;
 const chartCases:ChartCase140[]=cases.map(item=>{
  const take=(position:keyof typeof names):Pillar140|null=>{const matching=item.bazi.pillars.filter(pillar=>pillar.label.startsWith(names[position]));if(matching.length>1)throw new Error('140历法适配：重复柱位'+position);const value=matching[0];if(!value)return null;if(!/^[甲乙丙丁戊己庚辛壬癸]$/.test(value.gan)||!/^[子丑寅卯辰巳午未申酉戌亥]$/.test(value.zhi))return null;return{gan:value.gan,zhi:value.zhi};};
  const year=take('year'),month=take('month'),day=take('day');if(!year||!month||!day)throw new Error('140历法适配：日或月仍有歧义，须由既有历法提供独立柱方案，不能补定。');return{id:item.id,provenance:item.provenance,pillars:{year,month,day,hour:take('hour')}};
 });return{schema:'bazi-method-input/1',uncertainty,chartCases};
}
