import fs from 'node:fs';
import path from 'node:path';
import {createM779AdmittedElementImagery} from '../../src/main/m779-admitted-element-imagery';
import {catalogSession} from './catalog-session';
import {normalizePreferences} from '../../src/shared/workflow';
import naming7 from '../../data/naming-editorial-v7.json';
import {NAMING_RULE_V71_VERSION} from '../../src/shared/naming-rules';
import type {M754ObjectTheme} from '../../src/shared/m754-element-imagery';

const root=process.argv[2];
if(!root||fs.existsSync(path.join(root,'data'))||fs.existsSync(path.join(root,'src'))||fs.existsSync(path.join(root,'node_modules')))throw Error('Portable root must contain no development data/src/node_modules');
const admitted=createM779AdmittedElementImagery(root),characters=admitted.baselineCharacters(),original=JSON.stringify(characters),sample=catalogSession('m779-portable');
const preferences=normalizePreferences({...sample.preferences,length:1,requiredChars:'',generationChar:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',numerology:false,zodiacRules:false});
const profile={...sample.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',namingPreferences:preferences};
const context={packSha256:naming7.base.knowledgePackSha256,activeVersion:naming7.base.activeVersion};
const themes:Partial<Record<string,M754ObjectTheme>>={'川':'river-object','石':'mineral-stone-object','枝':'tree-branch-object','棉':'cotton-plant-object','蕤':'hanging-flower-object'};
const without=admitted.project(characters),withThemes=admitted.project(characters,themes);
const general:unknown[]=[],conditional:unknown[]=[],unselected:unknown[]=[];
for(const decision of withThemes.decisions){
 const char=decision.char,ownThemes:Partial<Record<string,M754ObjectTheme>>=decision.requiredTheme?{[char]:decision.requiredTheme}:{};
 const input={...preferences,requiredChars:char,preferredElements:[...decision.effectiveElements]};
 const result=admitted.generateLocal(characters,ownThemes,NAMING_RULE_V71_VERSION,context,profile,input,sample.analysis,[],7);
 const candidate=result.candidates.find(row=>row.givenName===char);if(!candidate||candidate.characters[0].elements.length!==1)throw Error('Actual portable 7.1 generator did not consume '+char);
 const snapshot=result.provenance.find(row=>row.binding.candidateId===candidate.id)!;
 admitted.verifyNameProvenance(JSON.parse(JSON.stringify(snapshot)),{candidateId:candidate.id,givenName:char},characters,ownThemes);
 (decision.requiredTheme?conditional:general).push({char,pinyin:candidate.characters[0].pinyin,elements:candidate.characters[0].elements,scope:snapshot.rows[0].mapping!.scope,requestedTheme:snapshot.rows[0].mapping!.requestedTheme});
 if(decision.requiredTheme){const off=admitted.generateLocal(characters,{},NAMING_RULE_V71_VERSION,context,profile,input,sample.analysis,[],7).candidates.find(row=>row.givenName===char);if(!off||off.characters[0].elements.length)throw Error('Missing theme silently adopted '+char);unselected.push({char,elements:off.characters[0].elements});}
}
if(JSON.stringify(characters)!==original)throw Error('Portable input mutated');
console.log(JSON.stringify({portable:true,developmentDataPresent:false,developmentSourcePresent:false,nodeModulesPresent:false,identity:admitted.identity,coverage:admitted.coverage,baselineTagged:characters.filter(row=>row.elements.length).length,withoutThemesTagged:without.characters.filter(row=>row.elements.length).length,allExactThemesTagged:withThemes.characters.filter(row=>row.elements.length).length,general,conditional,unselected,inputUnchanged:true,provenanceReplayVerified:10,persistence:'not-written'}));
