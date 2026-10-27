import {createManualM970MeaningSelectionDirectory,type ManualM970DirectoryItem} from '../src/main/m970-manual-meaning-selection-directory.mjs';

const directory=createManualM970MeaningSelectionDirectory({dataDir:'main-configured-data',actualPackFile:'main-selected-active-or-archive.sqlite'});
const result=directory.listAvailableMeanings({mode:'manual-request',char:'革'});
const item:ManualM970DirectoryItem=result.items[0];
const originalMeaning:string=item.originalMeaning;
const citation:string=item.sourceCitation.dictionaryName;
const changed:boolean=item.changeMeaning;
const reason:string=item.manualReason;
const limits:readonly string[]=item.limits;
const selected=directory.selectMeaning({mode:'manual-request',selectionKey:item.selectionKey});
const score:0=selected.scoreDelta;
const automatic:false=selected.automaticMeaningAllowed;
if(selected.status==='selected'){const original=selected.meaningOptions.options[0];const pinyin:string=original.pinyin;void pinyin;}
// @ts-expect-error actual main-selected package path is mandatory
createManualM970MeaningSelectionDirectory({dataDir:'data'});
// @ts-expect-error no automatic directory mode
directory.listAvailableMeanings({mode:'automatic',char:'革'});
// @ts-expect-error UI never authors a sense identity
directory.listAvailableMeanings({mode:'manual-request',char:'革',senseId:'caller'});
// @ts-expect-error UI selects an opaque token only
directory.selectMeaning({mode:'manual-request',char:'革'});
// @ts-expect-error no pack hash is exposed in the display item
item.packSha256;
void [originalMeaning,citation,changed,reason,limits,score,automatic];
