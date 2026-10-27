import type {RootFeedbackFacadeOptions} from './bazi-root-feedback-facade';
import type {RootFeedbackV132FacadeDTO} from './bazi-root-feedback-v132-r2-facade';
import type {BirthProfile} from './types';

export interface BaziRootFeedbackV132PreviewApi {
  previewBaziRootFeedbackV132(profile:BirthProfile,options?:RootFeedbackFacadeOptions):Promise<RootFeedbackV132FacadeDTO>;
}
