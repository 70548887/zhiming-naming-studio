/** A report selects an explicitly reviewed current native record. It never
 * accepts a client session, candidate list, report HTML or source certificate. */
export interface Candidate2ReportReference {
 id:string;
 expectedReviewRevision:number;
 expectedReviewToken:string;
}
export interface Candidate2ReportDocument {
 schema:'candidate2-report-document/1';
 status:'ready';
 sessionId:string;
 reviewRevision:number;
 reviewToken:string;
 filename:string;
 html:string;
 traditionalStatus:'unknown';
 source:'native-current-canonical';
 writes:0;
}
export interface Candidate2ReportAPI {
 previewCandidate2Report(id:string,expectedReviewRevision:number,expectedReviewToken:string):Promise<Candidate2ReportDocument>;
 /** Desktop save dialog/PDF. The browser preview transport does not implement
  * native file export; it exposes previewCandidate2Report instead. */
 exportCandidate2Report(id:string,expectedReviewRevision:number,expectedReviewToken:string):Promise<string|null>;
}
