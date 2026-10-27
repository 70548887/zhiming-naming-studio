import {createSingleCharacterMeaningAdapter} from '../../src/main/single-character-meaning-query.mjs';

const [root,batchRoot,mode]=process.argv.slice(2);
if(!root||!batchRoot||!['value','getter'].includes(mode))throw Error('Expected root, candidate package and isolated pollution mode');
if(Object.hasOwn(Object.prototype,'manualM690BatchRoot'))throw Error('Child started with an unexpected polluted prototype');
let getterCalls=0,adapter;
const config=Object.assign(Object.create(null),{projectRoot:root});
const configHasOwnBefore=Object.hasOwn(config,'manualM690BatchRoot');
try{
  Object.defineProperty(Object.prototype,'manualM690BatchRoot',mode==='value'
    ?{value:batchRoot,writable:true,enumerable:false,configurable:true}
    :{get(){getterCalls++;return batchRoot;},enumerable:false,configurable:true});
  adapter=createSingleCharacterMeaningAdapter(config);
}finally{
  delete Object.prototype.manualM690BatchRoot;
}
// Restore the child prototype before dictionary I/O. A mistakenly enabled helper
// remains captured by the factory, so its query still reveals the original bug.
const actual=adapter.getSingleCharacterMeaningOptions({char:'丘'});
process.stdout.write(JSON.stringify({mode,pid:process.pid,inputPrototypeIsNull:Object.getPrototypeOf(config)===null,
  configHasOwnBefore,configHasOwnAfter:Object.hasOwn(config,'manualM690BatchRoot'),getterCalls,
  status:actual.status,options:actual.options.length,batchId:actual.source?.batchId??null,
  prototypeRestored:!Object.hasOwn(Object.prototype,'manualM690BatchRoot')})+'\n');
