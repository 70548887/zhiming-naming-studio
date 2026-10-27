import type {Database,SqlJsStatic} from 'sql.js';

type ConnectionLifecycle={originalExport:Database['export'];originalClose:Database['close'];rebind?:()=>void;failed?:Error};
const lifecycles=new WeakMap<Database,ConnectionLifecycle>();
const gateError=()=>new Error('客户数据库连接未启用外键约束，操作已取消。');

/** Read SQLite's live setting rather than remembering that an earlier connection enabled it. */
export function assertCustomerDatabaseForeignKeys(db:Database):void{
 const failed=lifecycles.get(db)?.failed;if(failed)throw failed;
 const rows=db.exec('PRAGMA foreign_keys');
 if(rows.length!==1||rows[0].values.length!==1||rows[0].values[0].length!==1||rows[0].values[0][0]!==1)throw gateError();
}

function enableForeignKeys(db:Database):void{
 db.run('PRAGMA foreign_keys=ON');
 // SQLite ignores a change to this pragma inside an active transaction. A no-op must fail closed.
 assertCustomerDatabaseForeignKeys(db);
}

/** sql.js export closes/reopens its native connection. Restore both FK state and private UDFs. */
export function configureCustomerDatabaseConnection(db:Database,rebind?:()=>void):Database{
 const failed=lifecycles.get(db)?.failed;if(failed)throw failed;
 enableForeignKeys(db);
 const existing=lifecycles.get(db);
 if(existing){if(rebind)existing.rebind=rebind;return db;}
 const lifecycle:ConnectionLifecycle={originalExport:db.export,originalClose:db.close,rebind};lifecycles.set(db,lifecycle);
 const sealFailedConnection=(cause:unknown,nativeKnownOpen:boolean)=>{
  const failure=new Error('数据库连接恢复失败，已封闭该连接，未交付待写入字节。',{cause});lifecycle.failed=failure;
  // A failed native export may have closed SQLite without updating its pointer. Do not run SQL or close it blindly.
  if(nativeKnownOpen)try{lifecycle.originalClose.call(db);}catch{}
  const blocked=()=>{throw failure;},methods=db as unknown as Record<string,unknown>;
  for(const name of ['run','exec','prepare','each','iterateStatements','getRowsModified','create_function','create_aggregate','export'])if(typeof methods[name]==='function')methods[name]=blocked;
  db.close=()=>{};
  return failure;
 };
 db.export=function(){
  assertCustomerDatabaseForeignKeys(db);
  let bytes:Uint8Array;
  try{bytes=lifecycle.originalExport.call(db);}catch(error){throw sealFailedConnection(error,false);}
  try{enableForeignKeys(db);lifecycle.rebind?.();assertCustomerDatabaseForeignKeys(db);}
  catch(error){throw sealFailedConnection(error,true);}
  return bytes;
 };
 return db;
}

/** All customer/raw/restore factories establish the same live connection invariant before use. */
export function createCustomerDatabase(SQL:SqlJsStatic,bytes?:Uint8Array):Database{
 const db=bytes===undefined?new SQL.Database():new SQL.Database(bytes);
 try{return configureCustomerDatabaseConnection(db);}catch(error){db.close();throw error;}
}
