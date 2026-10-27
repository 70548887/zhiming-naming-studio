import {isMainThread,parentPort,workerData} from 'node:worker_threads';
import path from 'node:path';
import {loadVerifiedCmnReadingSource} from './cmn-reading-source';

const VERSION='cmn-reading-worker/1.0.0';
if(isMainThread||!parentPort||workerData?.version!==VERSION)throw new Error('Invalid CMN worker startup');
const port=parentPort;
port.on('message',(message:unknown)=>{
  const m=message as {version?:unknown;kind?:unknown;id?:unknown;char?:unknown;dataDirectory?:unknown};
  if(!m||m.version!==VERSION||m.kind!=='query'||!Number.isSafeInteger(m.id)||Number(m.id)<1||typeof m.char!=='string'||!/^[\p{Script=Han}]$/u.test(m.char)||typeof m.dataDirectory!=='string'||!path.isAbsolute(m.dataDirectory)){
    port.postMessage({version:VERSION,kind:'rejected',id:Number.isSafeInteger(m?.id)?m.id:0,code:'INVALID_REQUEST'});return;
  }
  try{
    // Hash every original on every query. CPU parsing/index construction occurs
    // only here, outside the main event loop, using the audited source adapter.
    const query=loadVerifiedCmnReadingSource(m.dataDirectory).query(m.char);
    port.postMessage({version:VERSION,kind:'result',id:m.id,query});
  }catch{
    port.postMessage({version:VERSION,kind:'rejected',id:m.id,code:'SOURCE_UNAVAILABLE'});
  }
});
port.postMessage({version:VERSION,kind:'ready'});
