/** Exact operation-batch table predicate. Pure calculation; no Store/issuer/source authority. */
import {isDeepStrictEqual} from 'node:util';
export function assertActualTables(actual:any,expected:any,archive:{version:string}):void{
if(actual.version!==archive.version||!isDeepStrictEqual([actual.characters,actual.citations,actual.knowledge,actual.sources],[expected.characters,expected.citations,expected.knowledge,expected.sources]))throw new Error('首次引文上下文的实际原包四表与已认证JSON全字段或原顺序不一致。');
}
export const actualMainSHA256='07d9557408be354fa858b2f0cbf9a7d0a728f601516e180da134920630540520';
export const actualComparisonRegionSHA256='eddbc676145baba056230b4878ae40c0789cc250654f2b1d4881bb6cf23dd8b2';
