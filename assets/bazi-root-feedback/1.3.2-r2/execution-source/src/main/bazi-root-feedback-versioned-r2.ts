import type {RootFeedbackVersionSelection} from '../shared/bazi-root-feedback-v132-r2-facade';
import {createBaziRootFeedbackFacade} from './bazi-root-feedback-facade';
import {loadRootFeedbackResources} from './bazi-root-feedback-resources';
import {createRootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';
import {loadRootFeedbackV132Resources} from './bazi-root-feedback-v132-r2-resources';
import {createBaziRootFeedbackV132Facade} from './bazi-root-feedback-v132-r2-facade';
/** Explicit selection seam. The production default/saved resolver continues to call the fixed 1.3.1 factory. */
export function createVersionedBaziRootFeedbackFacade(configuration:{assetDir:string;dataDir?:string},selection:RootFeedbackVersionSelection){
 if(selection?.methodId==='project-bazi-mainchain-145/1.3.1'&&(selection.purpose==='preview'||selection.purpose==='saved-replay'))return{methodId:selection.methodId,purpose:selection.purpose,facade:createBaziRootFeedbackFacade(loadRootFeedbackResources(configuration))} as const;
 if(selection?.methodId==='project-bazi-mainchain-145/1.3.2'&&selection.purpose==='preview'){const engine=createRootFeedbackV132Engine();return{methodId:selection.methodId,purpose:'preview',facade:createBaziRootFeedbackV132Facade(engine,loadRootFeedbackV132Resources(configuration,engine))} as const;}
 throw Error('ROOT_FEEDBACK_VERSION_UNSUPPORTED: select an admitted exact method and purpose; 1.3.2 saved replay is not admitted.');
}
