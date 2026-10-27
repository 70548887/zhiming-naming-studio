/** Renderer overlay until the storage transport's shared contract is integrated. */
export interface CustomerStorageMigrationStatus {
  version:string;
  migrationRequired:boolean;
  bytes:number;
  maxPhysicalBytes:number;
  warning:boolean;
}

export type CustomerStorageState=CustomerStorageMigrationStatus;

export interface CustomerStorageMigrationApi {
  migrateCustomerStorage:()=>Promise<CustomerStorageMigrationStatus>;
}

export const CUSTOMER_STORAGE_MIGRATION_CONFIRM='确认已完成客户备份，并开始迁移本机客户资料存储？迁移期间资料保持只读，当前草稿与设置会保留。';

export function readCustomerStorageMigrationStatus(value:unknown):CustomerStorageMigrationStatus|null {
  try{
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const copy:Record<string,unknown>={};
    for(const key of ['version','migrationRequired','bytes','maxPhysicalBytes','warning']){
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor||!Object.hasOwn(descriptor,'value'))return null;
      copy[key]=descriptor.value;
    }
    if(typeof copy.version!=='string'||!copy.version.trim()||typeof copy.migrationRequired!=='boolean'||typeof copy.warning!=='boolean'
      ||!Number.isSafeInteger(copy.bytes)||(copy.bytes as number)<0
      ||!Number.isSafeInteger(copy.maxPhysicalBytes)||(copy.maxPhysicalBytes as number)<=0)return null;
    return copy as unknown as CustomerStorageMigrationStatus;
  }catch{return null;}
}

export interface CustomerStorageMigrationFrame {
  storage:CustomerStorageMigrationStatus|null;
  storageKey:string;
  api:CustomerStorageMigrationApi|undefined;
  method:CustomerStorageMigrationApi['migrateCustomerStorage']|undefined;
  busy:boolean;
  confirm:(message:string)=>boolean|Promise<boolean>;
  onMigrated:(state:CustomerStorageMigrationStatus)=>void|Promise<void>;
}

export interface CustomerStorageMigrationState extends CustomerStorageMigrationFrame {
  phase:'idle'|'confirming'|'migrating'|'refreshing'|'error'|'complete';
  errorKind?:'confirmation'|'migration'|'result'|'refresh';
  result?:CustomerStorageMigrationStatus;
}

export function readCustomerStorageMigrationFrame(input:{
  state?:CustomerStorageMigrationStatus;
  api?:CustomerStorageMigrationApi;
  busy?:boolean;
  confirm:CustomerStorageMigrationFrame['confirm'];
  onMigrated:CustomerStorageMigrationFrame['onMigrated'];
}):CustomerStorageMigrationFrame {
  const storage=readCustomerStorageMigrationStatus(input.state);
  let method:CustomerStorageMigrationApi['migrateCustomerStorage']|undefined;
  try{if(typeof input.api?.migrateCustomerStorage==='function')method=input.api.migrateCustomerStorage;}catch{/* Unavailable transport remains read-only. */}
  return {storage,storageKey:JSON.stringify(storage),api:input.api,method,busy:!!input.busy,confirm:input.confirm,onMigrated:input.onMigrated};
}

const sameFrame=(a:CustomerStorageMigrationFrame,b:CustomerStorageMigrationFrame)=>a.storageKey===b.storageKey&&a.api===b.api&&a.method===b.method&&a.busy===b.busy;
const workingPhase=(phase:CustomerStorageMigrationState['phase'])=>phase==='confirming'||phase==='migrating'||phase==='refreshing';
export const currentCustomerStorageMigrationState=(state:CustomerStorageMigrationState,frame:CustomerStorageMigrationFrame):CustomerStorageMigrationState=>sameFrame(state,frame)?state:{...frame,phase:workingPhase(state.phase)?state.phase:'idle'};

/** The renderer never owns a database or draft: only an explicit migration and its refresh callback. */
export function createCustomerStorageMigrationController({getFrame}:{getFrame:()=>CustomerStorageMigrationFrame}) {
  let alive=false,serial=0,inFlight=false,state:CustomerStorageMigrationState={...getFrame(),phase:'idle'};
  const listeners=new Set<()=>void>();
  const publish=(next:CustomerStorageMigrationState)=>{state=next;for(const listener of listeners)listener();};
  const refreshResult=async(frame:CustomerStorageMigrationFrame,result:CustomerStorageMigrationStatus,owns:()=>boolean)=>{
    if(!owns())return;
    publish({...frame,phase:'refreshing',result});
    try{
      await getFrame().onMigrated({...result});
      if(owns())publish({...frame,phase:'complete',result});
    }catch{if(owns())publish({...frame,phase:'error',errorKind:'refresh',result});}
  };
  return {
    getSnapshot:()=>state,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    activate:()=>{alive=true;},
    dispose:()=>{alive=false;serial++;state={...getFrame(),phase:'idle'};},
    refresh:()=>{const frame=getFrame();if(sameFrame(state,frame))return;serial++;publish({...frame,phase:inFlight&&workingPhase(state.phase)?state.phase:'idle'});},
    migrate:async()=>{
      const frame=getFrame();
      if(!alive||inFlight||frame.busy||!frame.storage?.migrationRequired||!frame.method||!frame.api)return;
      if(sameFrame(state,frame)&&['confirming','migrating','refreshing','complete'].includes(state.phase))return;
      const previous=sameFrame(state,frame)?state:undefined;
      const lease=++serial;
      const owns=()=>alive&&lease===serial&&sameFrame(frame,getFrame());
      inFlight=true;
      try{
        if(previous?.errorKind==='refresh'&&previous.result){await refreshResult(frame,previous.result,owns);return;}
        publish({...frame,phase:'confirming'});
        let confirmed=false;
        try{confirmed=await frame.confirm(CUSTOMER_STORAGE_MIGRATION_CONFIRM);}
        catch{if(owns())publish({...frame,phase:'error',errorKind:'confirmation'});return;}
        if(!owns())return;
        if(!confirmed){publish({...frame,phase:'idle'});return;}
        publish({...frame,phase:'migrating'});
        let result:CustomerStorageMigrationStatus|null;
        try{result=readCustomerStorageMigrationStatus(await frame.method.call(frame.api));}
        catch{if(owns())publish({...frame,phase:'error',errorKind:'migration'});return;}
        if(!owns())return;
        if(!result||result.migrationRequired){publish({...frame,phase:'error',errorKind:'result'});return;}
        await refreshResult(frame,result,owns);
      }finally{
        inFlight=false;
        if(alive&&!owns()&&workingPhase(state.phase))publish({...getFrame(),phase:'idle'});
      }
    },
  };
}
