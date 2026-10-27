import {canonicalPlainJson} from '../shared/plain-json';
import type {Candidate2ReportDocument,Candidate2ReportReference} from '../shared/candidate2-report-api';
import {captureCandidate2ReviewBase} from './candidate2-review-boundary';

const fields=['schema','status','sessionId','reviewRevision','reviewToken','filename','html','traditionalStatus','source','writes'] as const;
export const CANDIDATE2_REPORT_PREVIEW_CSP="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; child-src 'none'; object-src 'none'; media-src 'none'; base-uri 'none'; form-action 'none'";
export function candidate2ReportReference(raw:unknown):Readonly<Candidate2ReportReference>{
 const base=captureCandidate2ReviewBase(raw);
 return Object.freeze({id:base.session.id,expectedReviewRevision:base.session.reviewRevision,expectedReviewToken:base.session.reviewToken});
}
/** Correspondence only. The returned source marker and shape never establish
 * native Store authority; the real main method owns saved-source admission. */
export function captureCandidate2ReportDocument(raw:unknown,reference:Readonly<Candidate2ReportReference>):Readonly<Candidate2ReportDocument>|undefined{
 try{
  const json=canonicalPlainJson(raw);if(json.length>32*1024*1024)return;
  const value=JSON.parse(json) as Candidate2ReportDocument;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key)))return;
  if(value.schema!=='candidate2-report-document/1'||value.status!=='ready'||value.sessionId!==reference.id||value.reviewRevision!==reference.expectedReviewRevision||value.reviewToken!==reference.expectedReviewToken||value.traditionalStatus!=='unknown'||value.source!=='native-current-canonical'||value.writes!==0)return;
  if(typeof value.filename!=='string'||!value.filename||value.filename.length>1024||typeof value.html!=='string'||!value.html||value.html.length>24*1024*1024)return;
  return Object.freeze(value);
 }catch{return;}
}
/** Only a correlated bridge-returned document enters this function. App code
 * never supplies session templates or user-authored HTML. The leading CSP is
 * enforced in addition to an iframe sandbox without scripts, forms or origin. */
export function candidate2ReportSandboxDocument(document:Readonly<Candidate2ReportDocument>):string{
 const policy=CANDIDATE2_REPORT_PREVIEW_CSP.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
 return '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+policy+'">'+document.html;
}
