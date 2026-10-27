import type {Database,SqlValue} from 'sql.js';
import {readCustomerRevisionSequence} from './customer-revision-sequence';

const rawColumns:Record<string,readonly string[]>={
  profiles:['id','json'],
  sessions:['id','json'],
  settings:['id','json'],
  profile_versions:['id','token'],
  revisions:['id','session_id','created_at','json'],
  knowledge_archives:['sha256','version','pack']
};

function* rows(db:Database,sql:string):Generator<SqlValue[]>{
  const statement=db.prepare(sql);
  try{while(statement.step())yield statement.get();}
  finally{statement.free();}
}

/** Check every physical raw column before staging; unknown data is never normalized away.
 * table_info omits generated/hidden fields, so only table_xinfo can establish this boundary.
 * Older raw databases may omit the empty optional history/token/archive tables. */
export function assertRawCustomerSchema(db:Database):void{
  const names=new Set<string>();
  for(const [type,name,sql]of rows(db,"SELECT type,name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'")){
    const table=String(name);
    if(type!=='table'||!Object.hasOwn(rawColumns,table))throw new Error('原始客户库含未知扩展结构，未迁移或丢弃。');
    if(typeof sql!=='string')throw new Error('原始客户库结构无效。');
    const expected=rawColumns[table],columns=[...rows(db,'PRAGMA table_xinfo('+table+')')];
    if(columns.length!==expected.length||columns.some((column,index)=>column[1]!==expected[index]||column[6]!==0))
      throw new Error('原始客户库含未知扩展字段，未迁移或丢弃。');
    names.add(table);
  }
  for(const table of ['profiles','sessions','settings'])if(!names.has(table))throw new Error('原始客户库缺少必需数据表。');
  readCustomerRevisionSequence(db);
}