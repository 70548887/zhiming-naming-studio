/** Published version pairs. A supported individual label cannot downgrade a newer saved analysis. */
const q0='zhuanpan-chaibu-futou-kun2/1.0.0',q1='zhuanpan-chaibu-futou-kun2/1.1.0',q2='zhuanpan-chaibu-futou-kun2/1.2.0',q3='zhuanpan-chaibu-futou-kun2/1.3.0',q4='zhuanpan-chaibu-futou-kun2/1.4.0';
const bazi=(minor:number)=>`civil-midnight-fuyi-candidate/1.${minor}.0;lunar-typescript/1.8.6`;
const publishedPairs:Readonly<Record<string,readonly string[]>>={
 [bazi(0)]:[q0,q1,q2],
 [bazi(1)]:[q2],
 [bazi(2)]:[q2],
 [bazi(3)]:[q2],
 [bazi(4)]:[q2,q3],
 [bazi(5)]:[q3],
 [bazi(6)]:[q3],
 [bazi(7)]:[q3],
 [bazi(8)]:[q4],
 [bazi(9)]:[q4],
 [bazi(10)]:[q4],
 [bazi(11)]:[q4],
 [bazi(12)]:[q4],
 [bazi(13)]:[q4],
 [bazi(14)]:[q4],
 [bazi(15)]:[q4]
};
/** 1.4 introduced archive-required modern records; their generation-time registry cannot disappear. */
const sourceRequiredVersions=new Set([4,5,6,7,8,9,10,11,12,13,14,15].map(bazi));
export function compatibleSavedAnalysisVersions(baziVersion:unknown,qimenVersion:unknown):boolean{
 return typeof baziVersion==='string'&&typeof qimenVersion==='string'&&publishedPairs[baziVersion]?.includes(qimenVersion)===true;
}
export function requiresSessionSourceManifest(baziVersion:unknown):boolean{return typeof baziVersion==='string'&&sourceRequiredVersions.has(baziVersion);}
