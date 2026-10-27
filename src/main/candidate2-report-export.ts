import {captureCandidate2ReportInput} from './candidate2-report-source';
import type {Candidate2ReportDocument} from '../shared/candidate2-report-api';

/** Desktop orchestration only. These main-owned dependencies are not an IPC
 * argument or a Store callback. Neither the client nor this helper saves. */
export async function exportCandidate2ReportWithDialog(args:readonly unknown[],dependencies:{
 prepare:(id:string,revision:number,token:string)=>Pick<Candidate2ReportDocument,'filename'|'html'>;
 selectPath:(suggestedFilename:string)=>Promise<string|null>;
 exportHtml:(html:string,filePath:string)=>Promise<string>;
}):Promise<string|null>{
 const request=Reflect.apply(captureCandidate2ReportInput,undefined,args);
 const beforeDialog=dependencies.prepare(request.id,request.expectedReviewRevision,request.expectedReviewToken);
 const selected=await dependencies.selectPath(beforeDialog.filename);if(selected===null)return null;
 // The dialog is an await boundary. A revision/token change after the first
 // read must reject here, rather than silently exporting another version.
 const canonical=dependencies.prepare(request.id,request.expectedReviewRevision,request.expectedReviewToken);
 return dependencies.exportHtml(canonical.html,selected);
}
