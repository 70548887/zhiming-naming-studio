import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Script} from 'node:vm';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const need=(ok,message)=>{if(!ok)throw Error('CMN worker build receipt: '+message);};
const relative=file=>typeof file==='string'&&!file.includes('\\')&&!file.startsWith('/')&&!file.includes(':')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
const read=(root,file)=>{need(relative(file),'unsafe relative file');const actual=fs.realpathSync(path.join(root,file)),base=fs.realpathSync(root),rel=path.relative(base,actual);need(rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel),'file leaves root');need(fs.statSync(actual).isFile(),'not a file');return fs.readFileSync(actual);};
const validateOutput=(bytes,spec)=>{need(bytes.length>0,'worker output empty');new Script(bytes.toString('utf8'),{filename:spec.outputFile});for(const token of spec.requiredTokens)need(bytes.toString('utf8').includes(token),'worker entry token missing: '+token);};
export function recordCmnWorkerBuild({root,spec,metafile,esbuildVersion}){
 need(esbuildVersion===spec.esbuildVersion,'esbuild version differs');
 need(metafile&&same(Object.keys(metafile.inputs).sort(),Object.keys(spec.inputFiles).sort()),'actual compiler input set differs');
 const inputs={};for(const[file,pin]of Object.entries(spec.inputFiles)){const bytes=read(root,file);need(bytes.length===pin.bytes&&digest(bytes)===pin.sha256,'compiler source differs: '+file);inputs[file]={sha256:digest(bytes),bytes:bytes.length};}
 const buildBytes=read(root,spec.buildScript.file);need(digest(buildBytes)===spec.buildScript.sha256,'build script differs');
 const outputs=Object.keys(metafile.outputs).map(file=>path.relative(root,path.resolve(root,file)).replaceAll(path.sep,'/'));need(outputs.includes(spec.outputFile),'compiler did not emit exact worker entry');
 const output=read(root,spec.outputFile);validateOutput(output,spec);
 const receipt={schema:'cmn-worker-build-receipt/1',buildId:randomUUID(),builtAt:new Date().toISOString(),entry:spec.entry,protocol:spec.protocol,inputFiles:inputs,buildScript:spec.buildScript,esbuildVersion,output:{file:spec.outputFile,bytes:output.length,sha256:digest(output)}};
 const bytes=Buffer.from(JSON.stringify(receipt,null,2)+'\n'),filename=path.join(root,spec.receiptFile),temporary=filename+'.'+receipt.buildId+'.tmp';fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,filename);return{file:spec.receiptFile,sha256:digest(bytes),buildId:receipt.buildId};
}
export function verifyCmnWorkerRuntime({root,spec,expectedReceiptSha256,readFile=file=>read(root,file)}){
 need(typeof expectedReceiptSha256==='string'&&/^[a-f0-9]{64}$/.test(expectedReceiptSha256)&&expectedReceiptSha256!=='0'.repeat(64),'trusted current-build receipt SHA required');
 const receiptBytes=readFile(spec.receiptFile);need(digest(receiptBytes)===expectedReceiptSha256,'actual receipt differs from current-build reference');const receipt=JSON.parse(receiptBytes.toString('utf8'));
 need(receipt.schema==='cmn-worker-build-receipt/1'&&/^[a-f0-9-]{36}$/.test(receipt.buildId)&&Number.isFinite(Date.parse(receipt.builtAt))&&receipt.entry===spec.entry&&receipt.protocol===spec.protocol&&receipt.esbuildVersion===spec.esbuildVersion&&same(receipt.inputFiles,spec.inputFiles)&&same(receipt.buildScript,spec.buildScript),'receipt source/tool/entry binding differs');
 const output=readFile(spec.outputFile);need(receipt.output?.file===spec.outputFile&&receipt.output.bytes===output.length&&receipt.output.sha256===digest(output),'actual worker output differs from bound build output');validateOutput(output,spec);
 return{status:'passed',file:spec.outputFile,bytes:output.length,sha256:digest(output),receiptSha256:digest(receiptBytes),buildId:receipt.buildId};
}
