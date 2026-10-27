import {isDeepStrictEqual as equal} from 'node:util';

const need=(ok,message)=>{if(!ok)throw Error('M970 dedup: '+message);};
const sorted=values=>[...new Set(values)].sort();
const difference=(a,b)=>a.filter(c=>!new Set(b).has(c));

// Same bounded verbatim-meaning matching convention used by the frozen V5/V6 data.
function selectedMeaningMatches(meaning,definitions){
 const match=(rest,used,depth)=>depth<3&&definitions.some(d=>!used.has(d)&&(rest===d||rest.startsWith(d+'；')&&match(rest.slice(d.length+1),new Set([...used,d]),depth+1)));
 return typeof meaning==='string'&&Array.isArray(definitions)&&definitions.every(d=>typeof d==='string')&&match(meaning,new Set(),0);
}
function matches(entry,binding){
 return !!binding&&binding.char===entry.char&&entry.pinyin===binding.pinyin&&entry.tone===binding.tone&&entry.sourceId===binding.sourceId&&entry.readings?.some(r=>r.referenceOnly!==true&&r.pinyin===binding.pinyin&&r.tone===binding.tone&&r.sourceId===binding.sourceId&&r.word===binding.dictionaryWord&&selectedMeaningMatches(entry.meaning,r.meanings)&&(binding.dictionarySense===undefined||r.meanings.includes(binding.dictionarySense)));
}
function legacyMeaning(entry,v4,v5,v6){
 const override6=v6.characterOverrides.find(r=>r.char===entry.char);
 if(override6){const migrated=v6.semanticMigrations.defaultSenseMap[entry.char]?.after;return migrated?.status==='bound-default-reading'&&migrated.readings.length===1&&matches(entry,migrated.readings[0])?migrated.meaning:undefined;}
 const sense=v4.defaultSenseMap[entry.char];if(sense?.status!=='bound-default-reading'||sense.readings.length!==1)return undefined;
 const correction=v5.characterOverrides.find(r=>r.char===entry.char)?.after;
 let binding=sense.readings[0];
 if(correction){const reading=correction.readings?.find(r=>r.pinyin===correction.pinyin&&r.tone===correction.tone&&r.sourceId===correction.sourceId&&selectedMeaningMatches(correction.meaning,r.meanings));need(reading,'V5 correction missing actual selected reading');binding={...binding,char:correction.char,pinyin:reading.pinyin,tone:reading.tone,sourceId:reading.sourceId,dictionaryWord:reading.word};}
 return matches(entry,binding)?sense.meaning:undefined;
}

/** Computes mutually distinct sets before applying external reservations.
 * 562 review rows are not a generation-coverage or exclusive-ownership set. */
export function reconstructCoverage({dataset,v7,v4,v5,v6,reservations}){
 const universe=sorted(dataset.characters.map(r=>r.char));need(dataset.characters.length===779&&universe.length===779,'exact779 unique dataset required');
 const reviewChars=sorted(v7.meaningReviews.map(r=>r.char));need(v7.meaningReviews.length===562&&reviewChars.length===562&&reviewChars.every(c=>universe.includes(c)),'later562 unique review set required');
 const previous217=difference(universe,reviewChars);need(previous217.length===217&&v7.coverage.previouslyReviewed===217,'legacy217 complement missing');
 const actualLegacy=dataset.characters.filter(e=>!!legacyMeaning(e,v4,v5,v6)).map(e=>e.char);
 need(equal(sorted(actualLegacy),previous217),'legacy default-sense bindings do not equal preserved217; no count-only fallback');
 const automatic304=sorted(v7.meaningReviews.filter(r=>r.status==='approved'&&r.automaticMeaningAllowed===true&&['any-name','allowed-names'].includes(r.applicability.mode)).map(r=>r.char));
 need(automatic304.length===304&&v7.coverage.automaticallyDisplayableAdditions===304,'automatic304 selector missing');
 const default521=sorted([...previous217,...automatic304]);need(default521.length===521,'legacy and automatic sets overlap or missing');
 const results=[];const occupied=new Set(default521);
 for(const source of reservations){
  need(Array.isArray(source.characters)&&source.characters.every(c=>typeof c==='string'&&[...c].length===1&&universe.includes(c)),'invalid reservation character '+source.label);
  const chars=sorted(source.characters);results.push({...source,characters:chars,rows:source.characters.length,unique:chars.length,additionalToReservationUnion:chars.filter(c=>!occupied.has(c))});chars.forEach(c=>occupied.add(c));
 }
 const onDemand=results.find(r=>r.label==='on-demand60');need(onDemand?.unique===60,'independent on-demand60 missing');
 const family=results.find(r=>r.label==='M923-family40');need(family?.unique===40,'opt-in family40 missing');
 const regularAndOnDemand=sorted([...default521,...onDemand.characters]);
 const notRecommended=sorted(v7.meaningReviews.filter(r=>r.status==='not-recommended').map(r=>r.char));need(notRecommended.length===15,'not-recommended15 incomplete');
 const remaining=difference(universe,[...occupied]);
 return {schema:'m970-complete-coverage-and-occupancy/1',interpretation:'Existing behavior/reference inventory, not independent endorsement or new admission. Context and reservations are separate from default generation coverage.',universe,previous217,automatic304,default521,onDemand60:onDemand.characters,defaultAndOnDemandUnion:regularAndOnDemand,optInFamily40:family.characters,notRecommended15:notRecommended,reservationSources:results,occupied:sorted(occupied),remainingUnreserved:remaining,eligibleForSourceScreening:remaining.filter(c=>!notRecommended.includes(c)),counts:{universe:779,previous217:217,automatic304:304,default521:521,onDemand60:60,defaultAndOnDemandUnion:regularAndOnDemand.length,optInFamily40:40,occupied:occupied.size,remainingUnreserved:remaining.length,remainingNotRecommended:remaining.filter(c=>notRecommended.includes(c)).length},formalCoverageAdded:0};
}

export function classifyCharacters(coverage,characters){
 return characters.map(char=>({char,inDefault521:coverage.default521.includes(char),inLegacy217:coverage.previous217.includes(char),inAutomatic304:coverage.automatic304.includes(char),inOnDemand60:coverage.onDemand60.includes(char),inFamily40:coverage.optInFamily40.includes(char),reservationLabels:coverage.reservationSources.filter(s=>s.characters.includes(char)).map(s=>s.label),notRecommended:coverage.notRecommended15.includes(char),unreserved:coverage.remainingUnreserved.includes(char),disposition:coverage.default521.includes(char)?'existing-default-meaning-comparison-candidate':coverage.occupied.includes(char)?'existing-reserved-candidate':'unreserved-needs-source-screening',formalCoverageAdded:0}));
}
