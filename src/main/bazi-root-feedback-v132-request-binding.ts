import {types} from 'node:util';
import type {BirthProfile} from '../shared/types';
import {readRootFeedbackFacadeOptions} from '../shared/bazi-root-feedback-facade';
import type {RootFeedbackV132FacadeDTO} from '../shared/bazi-root-feedback-v132-r2-facade';
import {canonicalPlainJson} from '../shared/plain-json';
import {ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA} from '../shared/bazi-root-feedback-v132-request-binding';
import type {RootFeedbackV132BoundPreviewResponse,RootFeedbackV132PreviewRequestBinding} from '../shared/bazi-root-feedback-v132-request-binding';
import {readRootFeedbackV132PreviewProfile} from './bazi-root-feedback-v132-preview';

export interface RootFeedbackV132OwnedPreviewRequest {
  readonly profile:BirthProfile;
  readonly options:Readonly<{fromOutputMonthStem:boolean}>;
  readonly requestBinding:RootFeedbackV132PreviewRequestBinding;
}

const ownedRequests=new WeakSet<object>();
function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){
    for(const child of Object.values(value))freeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Capture once before validateProfile normalizes names, preferences or ID.
 * Only the existing safe reader's optional-undefined omissions affect the key.
 * Returned owned values let integration compute without rereading callers.
 */
export function readRootFeedbackV132BoundPreviewRequest(profile:unknown,options?:unknown):RootFeedbackV132OwnedPreviewRequest {
  const snapshot=readRootFeedbackV132PreviewProfile(profile);
  if(types.isProxy(options))throw new Error('1.3.2 用神预览拒绝代理选项。');
  const safeOptions=readRootFeedbackFacadeOptions(options);
  const fromOutputMonthStem=safeOptions.fromOutputMonthStem===true;
  const requestBinding=Object.freeze({schema:ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA,profileKey:canonicalPlainJson(snapshot),fromOutputMonthStem});
  const request=Object.freeze({profile:freeze(snapshot),options:Object.freeze({fromOutputMonthStem}),requestBinding});
  ownedRequests.add(request);
  return request;
}

/**
 * Inside main, pass the fixed-adapter DTO computed with the validated owned
 * profile and owned options. This only attaches request metadata: it does not
 * authenticate a DTO, prove its computation, or accept a compute callback.
 */
export function bindRootFeedbackV132PreviewResponse(request:RootFeedbackV132OwnedPreviewRequest,result:RootFeedbackV132FacadeDTO):RootFeedbackV132BoundPreviewResponse {
  if(!ownedRequests.has(request))throw new Error('预览绑定请求必须由主进程安全读取。');
  return {...result,requestBinding:request.requestBinding};
}
