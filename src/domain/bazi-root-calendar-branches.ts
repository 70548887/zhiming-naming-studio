import {Solar} from 'lunar-typescript';
import type {BirthProfile,BirthTimeAnalysis,Analysis} from '../shared/types';
import type {BirthContext} from '../shared/civil-birth';
import {resolveBirthContext} from '../shared/civil-birth';
import {resolveBirthCalculationClock} from '../shared/birth-time-basis';
import {calculateApparentSolarTime} from '../shared/apparent-solar';
import {calculateLegacyBazi} from './bazi-legacy';
import {calculateMonthAuthority} from './month-authority';
import type {ChartCase140} from '../shared/bazi-mainchain-method-types';

export interface RootCalendarPartition {context:BirthContext;timeBasis:BirthTimeAnalysis;complete:boolean;
 branches:{chart:ChartCase140;startEpoch:number;endEpoch:number;calculationClock:string;witnessEpoch:number}[];
 warnings:string[];}
/** Same UTC+08 coordinate conversion used by the existing month-authority module. */
const seasonalAt=(epoch:number)=>{const date=new Date(epoch+8*3600000);return Solar.fromYmdHms(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds()).getLunar();};
export function rootChartPillarsFromBazi(pillars:Analysis['bazi']['pillars']):ChartCase140['pillars'] {
 const take=(label:string)=>{const rows=pillars.filter(row=>row.label===label);if(rows.length!==1)throw new Error('条件历法分支未确定唯一'+label);return{gan:rows[0].gan,zhi:rows[0].zhi};};return{year:take('年柱'),month:take('月柱'),day:take('日柱'),hour:pillars.some(row=>row.label==='时柱')?take('时柱'):null};
}
/** Partition the original closed actual-instant interval, without inventing an hour. */
export function resolveRootCalendarBranches(profile:BirthProfile,base:Analysis):RootCalendarPartition {
 const context=resolveBirthContext(profile),time=resolveBirthCalculationClock(profile,context).trace;
 if(!profile.timeUnknown)return{context,timeBasis:time,complete:true,branches:[{chart:{id:profile.id,provenance:'existing-engine:'+base.bazi.version+';'+time.methodId,pillars:rootChartPillarsFromBazi(base.bazi.pillars)},startEpoch:context.instantEpoch,endEpoch:context.instantEpoch,calculationClock:time.calculationDateTime!,witnessEpoch:context.instantEpoch}],warnings:[...time.warnings]};
 const cuts=new Set<number>([context.startEpoch,context.endEpoch+1000]);
 const months=calculateMonthAuthority({timezone:context.timezone,timeUnknown:true,ambiguous:false,ranges:[{startEpoch:context.startEpoch,endEpoch:context.endEpoch}]});
 for(const segment of months.segments){cuts.add(Date.parse(segment.startAt));cuts.add(Date.parse(segment.endAt)+1000);}
 if(time.basis==='apparent-solar')for(const nextDate of time.dayCandidates.slice(1)){
  const midnight=Date.parse(nextDate+'T00:00:00.000Z');
  const coordinate=(epoch:number)=>{const value=calculateApparentSolarTime({instantEpoch:epoch,longitudeDegrees:profile.birthLongitude!,timezone:context.timezone});if(value.julianCentury < -1.1||value.julianCentury>1.1)throw new Error('固定太阳模型超出已证明单调性的逆向区间。');return value.apparentSolarEpoch;};
  if(coordinate(context.startEpoch)>=midnight||coordinate(context.endEpoch)<midnight)throw new Error('既有真太阳日期候选与区间端点不一致，停止分支枚举。');
  let low=context.startEpoch/1000,high=context.endEpoch/1000;
  while(low<high){const middle=Math.floor((low+high)/2);if(coordinate(middle*1000)>=midnight)high=middle;else low=middle+1;}
  const boundary=low*1000;if(coordinate(boundary)<midnight||boundary>context.startEpoch&&coordinate(boundary-1000)>=midnight)throw new Error('真太阳午夜整秒见证未通过。');cuts.add(boundary);
 }
 const ordered=[...cuts].filter(value=>value>=context.startEpoch&&value<=context.endEpoch+1000).sort((a,b)=>a-b);
 if(ordered.length>9)throw new Error('该出生日期产生超过八个精确历法区间，须明确补充资料。');
 const evaluate=(start:number,end:number)=>{
  const pointContext:BirthContext={...context,instantEpoch:start,startEpoch:start,endEpoch:end,seasonal:seasonalAt(start),startSeasonal:seasonalAt(start),endSeasonal:seasonalAt(end),ambiguous:false};
  const clock=resolveBirthCalculationClock(profile,pointContext);if(clock.trace.dayStatus!=='determined'||!clock.clock)throw new Error('精确区间内排盘日仍未确定，未任取日主。');
  const bazi=calculateLegacyBazi(profile,{...pointContext,local:clock.clock}),pillars=rootChartPillarsFromBazi(bazi.pillars);if(pillars.hour!==null)throw new Error('未知出生小时不应产生时柱。');
  return{pillars,clock:clock.trace.points[0].clockDateTime};
 };
 const branches=ordered.slice(0,-1).map((start,index)=>{const end=ordered[index+1]-1000;if(start>end)throw new Error('历法区间为空或重叠');const value=evaluate(start,end),last=evaluate(end,end);if(JSON.stringify(value.pillars)!==JSON.stringify(last.pillars))throw new Error('精确区间端点四柱不一致，缺失切点。');return{chart:{id:profile.id+':calendar-interval:'+index,provenance:'existing-civil/timebasis/calendar;unknown-hour;closed-actual-interval:'+new Date(start).toISOString()+'/'+new Date(end).toISOString(),pillars:value.pillars},startEpoch:start,endEpoch:end,calculationClock:value.clock,witnessEpoch:start};});
 return{context,timeBasis:time,complete:true,branches,warnings:[...time.warnings,'各分支起点仅作既有历法的计算见证，不是填写的出生时刻；所有分支的时柱均为空。','真太阳午夜以既有公式作整秒下界定位；节令分割复用既有十二节实际区间。']};
}
