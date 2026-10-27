import type {Database,SqlValue} from 'sql.js';
import {ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import type {CustomerStorageVersion} from '../shared/cultural-storage-v3';
import type {CulturalComparisonCatalogMetadata,CulturalComparisonCatalogPage} from '../shared/cultural-comparison-catalog';

export interface CulturalCatalogQuery {ownerProfileId:string;limit:number;cursor?:string;}
interface Cursor {version:1;ownerProfileId:string;generation:string;limit:number;afterComparisonId:string;}
type NativeRows=(sql:string,parameters?:SqlValue[])=>ReturnType<Database['exec']>;
const invalid=():never=>{throw Error('CULTURAL_CATALOG_INVALID_INPUT: 需要宝宝编号和有界目录参数。');};
const metadataInvalid=():never=>{throw Error('CULTURAL_CATALOG_INVALID_METADATA: 文化目录结构或归属无效。');};
const comparisonId=(value:unknown):value is string=>typeof value==='string'&&/^qc_[a-f0-9]{64}$/.test(value);
const identifier=(value:unknown,max=300):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value&&!/\p{Cc}/u.test(value);
function cursorValue(value:string):Cursor {
 if(value.length>2048||!/^[A-Za-z0-9_-]+$/.test(value))return invalid();
 const bytes=Buffer.from(value,'base64url');if(bytes.toString('base64url')!==value)return invalid();
 let cursor:Cursor;
 try{cursor=parseSnapshotJsonStrict(new TextDecoder('utf-8',{fatal:true}).decode(bytes),2048) as Cursor;}catch{return invalid();}
 if(!cursor||typeof cursor!=='object'||Array.isArray(cursor)||Object.keys(cursor).sort().join(',')!=='afterComparisonId,generation,limit,ownerProfileId,version'||cursor.version!==1||!identifier(cursor.ownerProfileId)||!Number.isSafeInteger(cursor.limit)||cursor.limit<1||cursor.limit>50||typeof cursor.generation!=='string'||!/^[a-f0-9]{64}$/.test(cursor.generation)||!comparisonId(cursor.afterComparisonId))return invalid();
 return cursor;
}
export function readCulturalCatalogQuery(ownerProfileId:unknown,request:unknown={}):CulturalCatalogQuery {
 if(!identifier(ownerProfileId))return invalid();
 const fields=ownCulturalJson<Record<string,unknown>>(request);
 if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).some(key=>key!=='limit'&&key!=='cursor'))return invalid();
 const limit=Object.hasOwn(fields,'limit')?fields.limit:25;
 if(!Number.isSafeInteger(limit)||Number(limit)<1||Number(limit)>50)return invalid();
 if(Object.hasOwn(fields,'cursor')&&(typeof fields.cursor!=='string'||fields.cursor.length===0||fields.cursor.length>2048))return invalid();
 if(typeof fields.cursor==='string')cursorValue(fields.cursor);
 return{ownerProfileId,limit:Number(limit),...(typeof fields.cursor==='string'?{cursor:fields.cursor}:{})};
}

/** Metadata query only. Store supplies its native registered reader after its
 * managed-directory/fresh/connection/schema guards. The callback is never a
 * source/admission capability, and this function never expands stored JSON. */
export function queryCulturalComparisonCatalog(rows:NativeRows,query:CulturalCatalogQuery,generation:string,storageVersion:CustomerStorageVersion):CulturalComparisonCatalogPage {
 const {ownerProfileId,limit}=query;
 const owner=rows('SELECT id FROM profiles WHERE id=? LIMIT 1',[ownerProfileId])[0]?.values??[];
 if(owner.length!==1||owner[0].length!==1||owner[0][0]!==ownerProfileId)throw Error('CULTURAL_CATALOG_OWNER_NOT_FOUND: 未找到指定宝宝档案。');
 const boundary={schema:'cultural-comparison-catalog/1' as const,ownerProfileId,storageVersion,limit,order:'comparison-id-desc' as const,factsAuthenticated:false as const,sourceAuthority:'not-authenticated-facts' as const};
 if(storageVersion!=='customer-compact/3')return ownCulturalJson({...boundary,status:'unsupported' as const,reason:'cultural-tables-unavailable' as const,items:[]});
 const cursor=query.cursor===undefined?undefined:cursorValue(query.cursor);
 if(cursor){const reason=cursor.ownerProfileId!==ownerProfileId?'owner-changed':cursor.generation!==generation?'database-changed':cursor.limit!==limit?'query-changed':null;if(reason)return ownCulturalJson({...boundary,status:'cursor-expired' as const,reason,items:[]});}
 const parameters:SqlValue[]=[ownerProfileId];
 if(cursor)parameters.push(cursor.afterComparisonId);
 parameters.push(limit+1);
 // Existing (profile_id,id) index supports bounded keyset pages. Ordering by
 // identifier is deterministic and makes no claim to chronological recency.
 const sql=`SELECT c.id,c.profile_id,c.source_session_id,c.current_revision,c.created_at,
 r.comparison_id,r.profile_id,r.revision,s.id
 FROM cultural_comparisons c
 LEFT JOIN cultural_comparison_revisions r ON r.comparison_id=c.id AND r.profile_id=c.profile_id AND r.revision=c.current_revision
 LEFT JOIN session_records s ON s.id=c.source_session_id AND s.profile_id=c.profile_id
 WHERE c.profile_id=?${cursor?' AND c.id<?':''} ORDER BY c.id DESC LIMIT ?`;
 const values=rows(sql,parameters)[0]?.values??[];
 if(values.length>limit+1)return metadataInvalid();
 let previous=cursor?.afterComparisonId;
 const items:CulturalComparisonCatalogMetadata[]=values.map(row=>{
  const [id,ownerId,sourceSessionId,currentRevision,createdAt,revisionId,revisionOwner,revisionNumber,sessionId]=row;
  if(row.length!==9||!comparisonId(id)||ownerId!==ownerProfileId||!identifier(ownerId)||sourceSessionId!==null&&!identifier(sourceSessionId,1000)||!Number.isSafeInteger(currentRevision)||Number(currentRevision)<1||typeof createdAt!=='string'||createdAt.length>80||!Number.isFinite(Date.parse(createdAt))||revisionId!==id||revisionOwner!==ownerProfileId||revisionNumber!==currentRevision||sourceSessionId!==null&&sessionId!==sourceSessionId||previous!==undefined&&id>=previous)return metadataInvalid();
  previous=id;
  return{comparisonId:id,ownerProfileId:ownerId,sourceSessionId:sourceSessionId as string|null,currentRevision:Number(currentRevision),createdAt,factsAuthenticated:false,sourceAuthority:'not-authenticated-facts'};
 });
 const visible=items.slice(0,limit),hasMore=items.length>limit;
 const nextCursor=hasMore?Buffer.from(JSON.stringify({version:1,ownerProfileId,generation,limit,afterComparisonId:visible.at(-1)!.comparisonId} satisfies Cursor),'utf8').toString('base64url'):undefined;
 return ownCulturalJson({...boundary,status:'available' as const,items:visible,...(nextCursor?{nextCursor}:{})});
}
