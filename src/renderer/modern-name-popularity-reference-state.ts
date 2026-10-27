import type {NameCandidate,StudioAPI} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import {assertOfficialNamePopularityCatalog} from '../shared/official-name-popularity';
import {buildModernNamePopularityReference,type ModernNamePopularityReference} from '../shared/modern-name-popularity-reference';

export type ModernNamePopularityReferenceApi=Pick<StudioAPI,'getOfficialNamePopularity'>;
export type ModernReferenceCandidate=Pick<NameCandidate,'givenName'|'meaning'|'modernPracticalEvidence'>&Partial<Pick<NameCandidate,'id'>>;
type CatalogMethod=ModernNamePopularityReferenceApi['getOfficialNamePopularity'];
export interface ModernReferenceFrame {
  owner:ModernReferenceCandidate;ownerKey:string;candidate:ModernReferenceCandidate|null;api:ModernNamePopularityReferenceApi|undefined;
  method:CatalogMethod|undefined;disabled:boolean;
}
export interface ModernReferenceState extends ModernReferenceFrame {
  phase:'idle'|'loading'|'ready'|'error';expanded:boolean;
  result?:ModernNamePopularityReference;errorKind?:'input'|'request'|'source';
}

/** Display identity only. The saved session path owns candidate verification. */
export function readModernReferenceFrame(candidate:ModernReferenceCandidate,api:ModernNamePopularityReferenceApi|undefined,disabled=false):ModernReferenceFrame {
  let input:ModernReferenceCandidate|null=null,ownerKey='invalid-candidate';
  try{
    if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))throw Error('candidate');
    const values:Record<string,unknown>={};
    for(const key of ['id','givenName','meaning','modernPracticalEvidence']){
      const property=Object.getOwnPropertyDescriptor(candidate,key);
      if(!property){if(key==='givenName'||key==='meaning')throw Error('missing field');continue;}
      if(!Object.hasOwn(property,'value')||!property.enumerable)throw Error('accessor');
      values[key]=property.value;
    }
    if(typeof values.givenName!=='string'||typeof values.meaning!=='string')throw Error('text');
    ownerKey=canonicalPlainJson(values);
    input=structuredClone(values) as ModernReferenceCandidate;
  }catch{/* Invalid display input never triggers an API request or retains counts. */}
  let method:CatalogMethod|undefined;
  try{
    const property=api&&Object.getOwnPropertyDescriptor(api,'getOfficialNamePopularity');
    if(property&&Object.hasOwn(property,'value')&&typeof property.value==='function')method=property.value;
  }catch{/* An unavailable bridge is presented without invoking it. */}
  return {owner:candidate,ownerKey,candidate:input,api,method,disabled};
}

const sameFrame=(a:ModernReferenceFrame,b:ModernReferenceFrame)=>a.owner===b.owner&&a.ownerKey===b.ownerKey&&a.api===b.api&&a.method===b.method&&a.disabled===b.disabled;
export function currentModernReferenceState(state:ModernReferenceState,frame:ModernReferenceFrame):ModernReferenceState {
  return sameFrame(state,frame)?state:{...frame,phase:'idle',expanded:false};
}

export function createModernNamePopularityReferenceController({getFrame}:{getFrame:()=>ModernReferenceFrame}){
  let alive=false,serial=0,state:ModernReferenceState={...getFrame(),phase:'idle',expanded:false};
  const listeners=new Set<()=>void>();
  const publish=(next:ModernReferenceState)=>{state=next;for(const listener of listeners)listener();};
  return {
    getSnapshot:()=>state,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    activate:()=>{alive=true;},
    dispose:()=>{alive=false;serial++;state={...getFrame(),phase:'idle',expanded:false};},
    refresh:()=>{const frame=getFrame();if(sameFrame(state,frame))return;serial++;publish({...frame,phase:'idle',expanded:false});},
    close:()=>{serial++;publish({...getFrame(),phase:'idle',expanded:false});},
    query:async()=>{
      const frame=getFrame();
      if(!alive||frame.disabled||!frame.method||!frame.api)return;
      if(!frame.candidate){publish({...frame,phase:'error',expanded:true,errorKind:'input'});return;}
      if(state.phase==='loading'&&sameFrame(state,frame))return;
      const lease=++serial;
      publish({...frame,phase:'loading',expanded:true});
      const owns=()=>alive&&lease===serial&&sameFrame(frame,getFrame());
      let catalog:unknown;
      try{catalog=await frame.method.call(frame.api);}catch{if(owns())publish({...frame,phase:'error',expanded:true,errorKind:'request'});return;}
      if(!owns())return;
      try{
        assertOfficialNamePopularityCatalog(catalog);
        const result=buildModernNamePopularityReference(frame.candidate,catalog);
        if(owns())publish({...frame,phase:'ready',expanded:true,result});
      }catch{if(owns())publish({...frame,phase:'error',expanded:true,errorKind:'source'});}
    },
  };
}
