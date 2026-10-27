import type {BirthProfile} from '../../src/shared/types';
import type {RootFeedbackV132FacadeDTO} from '../../src/shared/bazi-root-feedback-v132-r2-facade';
import type {RootFeedbackV132BoundPreviewResponse} from '../../src/shared/bazi-root-feedback-v132-request-binding';
import {bindRootFeedbackV132PreviewResponse,readRootFeedbackV132BoundPreviewRequest} from '../../src/main/bazi-root-feedback-v132-request-binding';

/** Test-only main transport extension; it does not authenticate or recompute a captured DTO. */
export function bindPreviewFixtureResponse(dto:RootFeedbackV132FacadeDTO,profile:BirthProfile,options?:{fromOutputMonthStem?:boolean}):RootFeedbackV132BoundPreviewResponse {
 const request=readRootFeedbackV132BoundPreviewRequest(profile,options);
 return bindRootFeedbackV132PreviewResponse(request,structuredClone(dto));
}
