import {createSingleCharacterMeaningAdapter} from '../../src/main/single-character-meaning-query.mjs';
import {createManualM690MeaningQuery} from '../../src/main/m690-single-character-meaning-query.mjs';
import type {ManualM690MeaningBatchSource,SingleCharacterMeaningOptions} from '../../src/shared/single-character-meaning';

export function manualQueryTypeConsumer(root:string, sourceDataDir:string):SingleCharacterMeaningOptions {
  const provider=createSingleCharacterMeaningAdapter({projectRoot:root,dataDir:sourceDataDir,manualM690BatchRoot:root});
  const standalone=createManualM690MeaningQuery({batchRoot:root,sourceDataDir});
  const result=provider.getSingleCharacterMeaningOptions({char:'丘',pinyin:'qiū',tone:1});
  if(result.source && 'manualOnly' in result.source){
    const source:ManualM690MeaningBatchSource=result.source;
    const state:'not-granted'=source.individualAdmission;
    void state;
  }
  return standalone.getSingleCharacterMeaningOptions({char:'丘'});
}
