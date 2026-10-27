import type { Plugin } from 'vite';
import {invokeWithCustomerWriteNotice} from '../src/main/customer-write-notice-transport';
import {publishCustomerWriteNoticeHeader} from '../src/shared/customer-write-notice-delivery';
import {CULTURAL_WORKFLOW_METHODS} from '../src/shared/cultural-workflow-api';
import {CULTURAL_COMPARISON_CATALOG_METHODS} from '../src/shared/cultural-comparison-catalog';
import {build} from 'esbuild';
import { StringDecoder } from 'node:string_decoder';
import { resolve } from 'node:path';
import { Store } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { normalizeCredentialEndpoint } from '../src/main/credentials';
export function studioDevPlugin():Plugin {
  let instance:Promise<StudioService>|undefined;
  let buildRootFeedbackPreview:(()=>Promise<unknown>)|undefined;
  return {name:'studio-local-dev',transformIndexHtml:{order:'post',handler(html,ctx){return ctx.server?html.replace("script-src 'self';","script-src 'self' 'unsafe-inline';"):html;}},async configureServer(server){
    const previewRoot=resolve(server.config.root);
    await build({absWorkingDir:previewRoot,entryPoints:['src/main/cmn-reading-worker.ts'],outfile:resolve(previewRoot,'dist-electron/cmn-reading-worker.cjs'),bundle:true,platform:'node',target:'node22',format:'cjs',sourcemap:true});
    server.httpServer?.once('close',()=>{void instance?.then(service=>service.closeCmnReadingWorker()).catch(()=>{});});
    server.middlewares.use(async(req,res,next)=>{
    if(!req.url?.startsWith('/__studio_api/'))return next();
    const host=req.headers.host;const origin=req.headers.origin;
    if(req.method!=='POST'||req.headers['x-studio-local-request']!=='1'||origin&&origin!==`http://${host}`){res.statusCode=403;res.end('Forbidden');return;}
    res.setHeader('Content-Type','application/json; charset=utf-8');
    try{
      if(!instance)instance=(async()=>{let key='',keyScope='';const store=await new Store(resolve(process.env.NAMING_STUDIO_PREVIEW_DATA||'.local/preview'),resolve(previewRoot,'data'),resolve(previewRoot,'node_modules/sql.js/dist/sql-wasm.wasm')).init();return new StudioService(store,{read:scope=>scope&&normalizeCredentialEndpoint(scope)===keyScope?key:'',write:(k,scope)=>{key=k;keyScope=scope?normalizeCredentialEndpoint(scope):'';}},false);})().catch(e=>{instance=undefined;throw e;});
      const svc=await instance;let body='';const decoder=new StringDecoder('utf8');
      for await(const chunk of req){body+=typeof chunk==='string'?chunk:decoder.write(chunk);if(body.length>4000000)throw new Error('请求过大。');}
      body+=decoder.end();if(body.length>4000000)throw new Error('请求过大。');
      const args=JSON.parse(body||'[]');if(!Array.isArray(args))throw new Error('无效请求参数');
      const method=req.url.slice('/__studio_api/'.length).split('?')[0];
      const allowed=['listSessionCatalog','readSessionDetail','migrateCustomerStorage','bootstrap','saveProfile','deleteProfile','analyze','generate','saveSession','listHistory','restoreHistory','updateNumerology','updateYueReading','updateElementAssessment','recordModernPracticalEvidence','clearModernPracticalEvidence','searchKnowledge','searchClassics','readClassicSection','getOfficialNamePopularity','searchCharacters','saveSettings','saveBrand','saveAiSettings','testConnection','testNamingCapability','previewRollbackDataPack','previewBuiltinDataPack','applyDataPackPreview','discardDataPackPreview'];
      allowed.push('getMeaningContextOptions','updateMeaningContext','previewBaziMainchain','previewBaziRootFeedback','previewBaziRootFeedbackV132','previewGengSiReference','previewQiongtongClauseReferences','previewJiaHaiControl','getB04WordContextOptions');
      allowed.push('getCmnReadingOptions','confirmParentNameReading','getSingleCharacterMeaningOptions','getNamingCoverage');
      allowed.push('generateReviewed');
      allowed.push('checkCandidate2NamingEligibility');
      allowed.push('generateCandidate2');
      allowed.push('reviewCandidate2');
      allowed.push('restoreCandidate2History');
      allowed.push('previewCandidate2Report');
      allowed.push('listManualCharacterMeanings','selectManualCharacterMeaning');
      allowed.push(...CULTURAL_WORKFLOW_METHODS);
      allowed.push(...CULTURAL_COMPARISON_CATALOG_METHODS);
      if(!allowed.includes(method))throw new Error('此功能使用系统文件选择器，请在桌面应用中操作。');
      if(method==='previewBaziRootFeedbackV132'){
        const {createLazyRootFeedbackV132PreviewBuild}=await import('./build-root-feedback-v132-preview.mjs');
        buildRootFeedbackPreview??=createLazyRootFeedbackV132PreviewBuild(previewRoot);
        await buildRootFeedbackPreview();
      }
      const {result}=await invokeWithCustomerWriteNotice(svc.store,()=>(svc as any)[method](...args),notice=>publishCustomerWriteNoticeHeader(res,notice));
      res.end(JSON.stringify(result??null));
    }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e instanceof Error?e.message:String(e)}));}
  });}};
}
