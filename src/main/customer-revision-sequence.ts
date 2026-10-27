import type {Database,SqlValue} from 'sql.js';

export type CustomerRevisionTable='revisions'|'revision_records';
type RevisionSequenceState={table?:CustomerRevisionTable;saved?:number;highWater:number;hasSequenceTable:boolean};
const sequenceError=()=>new Error('客户历史自增序列无效，原始数据保留。');
function first(db:Database,sql:string,values:SqlValue[]=[]):SqlValue[]|undefined{
  const statement=db.prepare(sql);
  try{statement.bind(values);return statement.step()?statement.get():undefined;}
  finally{statement.free();}
}
function revisionSequenceState(db:Database,requestedTable?:CustomerRevisionTable):RevisionSequenceState{
  if(requestedTable!==undefined&&!['revisions','revision_records'].includes(requestedTable))throw sequenceError();
  const tables=db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('revisions','revision_records')")[0]?.values??[];
  if(requestedTable===undefined&&tables.length>1)throw sequenceError();
  const table=(requestedTable===undefined?tables[0]?.[0]:requestedTable) as CustomerRevisionTable|undefined;
  const exists=table!==undefined&&tables.some(row=>row[0]===table);
  const hasSequenceTable=first(db,"SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")!==undefined;
  // A legacy database may omit its empty revisions table. Still validate a retained raw sequence row.
  const sequenceTable=table??'revisions';
  let saved:number|undefined;
  if(hasSequenceTable){
    const statement=db.prepare('SELECT seq,typeof(seq) FROM sqlite_sequence WHERE name=? LIMIT 2');
    try{
      statement.bind([sequenceTable]);
      if(statement.step()){
        const row=statement.get(),value=row[0];
        if(row[1]!=='integer'||typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw sequenceError();
        saved=value;
        if(statement.step())throw sequenceError();
      }
    }finally{statement.free();}
  }
  let maxId=0;
  if(exists){
    const row=first(db,`SELECT MAX(id),typeof(MAX(id)) FROM ${table}`);
    if(!row)throw sequenceError();
    if(row[0]!==null){
      if(row[1]!=='integer'||typeof row[0]!=='number'||!Number.isSafeInteger(row[0])||row[0]<1)throw sequenceError();
      maxId=row[0];
    }
  }
  return{table:exists?table:undefined,saved,highWater:Math.max(saved??0,maxId),hasSequenceTable};
}
/** Validate the physical AUTOINCREMENT metadata without coercing SQLite types.
 * Missing sequence rows are valid; the largest retained history ID remains the floor. */
export function readCustomerRevisionSequence(db:Database,table?:CustomerRevisionTable):number{
  return revisionSequenceState(db,table).highWater;
}
/** Preserve deleted-history IDs while keeping every existing destination row and higher sequence. */
export function preserveCustomerRevisionSequence(source:Database,target:Database,sourceTable?:CustomerRevisionTable,targetTable?:CustomerRevisionTable):number{
  const sourceHighWater=readCustomerRevisionSequence(source,sourceTable),destination=revisionSequenceState(target,targetTable);
  if(!destination.table||!destination.hasSequenceTable)throw sequenceError();
  const highWater=Math.max(sourceHighWater,destination.highWater);
  if(destination.saved===undefined)target.run('INSERT INTO sqlite_sequence(name,seq) VALUES(?,CAST(? AS INTEGER))',[destination.table,highWater]);
  else if(destination.saved<highWater)target.run('UPDATE sqlite_sequence SET seq=CAST(? AS INTEGER) WHERE name=?',[highWater,destination.table]);
  return highWater;
}