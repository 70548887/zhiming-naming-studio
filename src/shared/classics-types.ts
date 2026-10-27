import type {SourceRecord} from './types';

export type ClassicBookId='classic-ditian-2600158'|'classic-qiongtong-2294674';
export interface ClassicPrivateUseCharacter {offset:number;codepoint:string;character:string;}
export interface ClassicBookQuality {privateUseCount:number;originalTranscription:true;scanCollation:false;note:string;}
export interface ClassicBookSummary {
 id:ClassicBookId;title:string;aliases:string[];revision:string;source:SourceRecord;
 codepoints:number;rawSha256:string;sectionCount:number;quality:ClassicBookQuality;
}
/** Every range is from zero, Unicode codepoints, [start,end), in the immutable original wikitext. */
export interface ClassicSectionSummary {
 id:string;bookId:ClassicBookId;title:string;headingLevel:number;path:string[];
 start:number;end:number;sha256:string;kind:'frontmatter'|'section';
 previousSectionId?:string;nextSectionId?:string;
}
export interface ClassicTextQuality {
 privateUseCharacters:ClassicPrivateUseCharacter[];originalTranscription:true;scanCollation:false;note:string;
}
export interface ClassicSearchHit {
 id:string;bookId:ClassicBookId;bookTitle:string;revision:string;
 sectionId:string;sectionTitle:string;sectionPath:string[];
 /** Empty-query catalogue entries have a zero-length match at the section start. */
 sourceStart:number;sourceEnd:number;excerptStart:number;excerptEnd:number;
 matchedOriginal:string;rawExcerpt:string;readingExcerpt:string;source:SourceRecord;quality:ClassicTextQuality;
 usage:'source-text-only';
}
export interface ClassicSearchResponse {
 query:string;bookId?:ClassicBookId;page:number;pageSize:20;total:number;pageCount:number;
 books:ClassicBookSummary[];hits:ClassicSearchHit[];
 searchMode:'literal-original-text';notice:string;
}
export interface ClassicSection extends ClassicSectionSummary {
 bookTitle:string;revision:string;rawText:string;source:SourceRecord;quality:ClassicTextQuality;
 usage:'source-text-only';
}
export interface ClassicBookContents {book:ClassicBookSummary;sections:ClassicSectionSummary[];}
