import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createB04WordContextAdapter} from '../src/domain/meaning-context-m460-b04-adapter.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('B04 serialized option has declared fields and omits unreliable single-character pitch fields',async()=>{
 const result=await createB04WordContextAdapter({candidateDataDir:path.join(root,'data'),originalDataDir:path.join(root,'data')}).getB04WordContextOptions({char:'渤'});
 const option=JSON.parse(JSON.stringify(result.options[0]));
 for(const key of ['givenName','word','targetPositions','confirmedReadings','selection','contextLabel','source','grammar','reason','exclusions','limits','wholeWordOnly','sourcePOS','activation','productionApproved','automaticNameRecommendation','automaticSemanticCreditAllowed','wholeNameApproved','wholeNameMeaning','scoreDelta','projectWish'])assert.equal(Object.hasOwn(option,key),true,key);
 assert.equal(Object.hasOwn(option,'selectedPinyin'),false);assert.equal(Object.hasOwn(option,'tone'),false);assert.equal(option.source.pinyin,'bó hǎi');
});
