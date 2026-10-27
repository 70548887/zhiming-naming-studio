import type {SingleCharacterMeaningOptions, SingleCharacterMeaningQuery} from '../shared/single-character-meaning';
export interface ManualM690QueryConfig {batchRoot:string;sourceDataDir:string}
export function createManualM690MeaningQuery(config:ManualM690QueryConfig):Readonly<{
  getSingleCharacterMeaningOptions(query:SingleCharacterMeaningQuery):SingleCharacterMeaningOptions;
}>;
