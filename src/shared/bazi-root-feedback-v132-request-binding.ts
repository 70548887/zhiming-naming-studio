import type {RootFeedbackV132FacadeDTO} from './bazi-root-feedback-v132-r2-facade';

export const ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA='bazi-root-feedback-v132-request-binding/1.0.0' as const;

/** Request correlation metadata only; it grants no resource or naming authority. */
export interface RootFeedbackV132PreviewRequestBinding {
  readonly schema:typeof ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA;
  readonly profileKey:string;
  readonly fromOutputMonthStem:boolean;
}

/** Transport extension; the fixed facade DTO and publication remain unchanged. */
export type RootFeedbackV132BoundPreviewResponse=RootFeedbackV132FacadeDTO&{
  readonly requestBinding:RootFeedbackV132PreviewRequestBinding;
};

/** Compare against the dispatched raw profile key and explicit entry option. */
export function matchesRootFeedbackV132RequestBinding(value:unknown,profileKey:string,fromOutputMonthStem:boolean):value is RootFeedbackV132PreviewRequestBinding {
  try{
    if(typeof profileKey!=='string'||typeof fromOutputMonthStem!=='boolean'||!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
    const keys=Reflect.ownKeys(value),expected=['schema','profileKey','fromOutputMonthStem'];
    if(keys.length!==expected.length||keys.some(key=>typeof key!=='string'||!expected.includes(key)))return false;
    const fields=expected.map(key=>Object.getOwnPropertyDescriptor(value,key));
    if(fields.some(field=>!field||!Object.hasOwn(field,'value')||!field.enumerable))return false;
    return fields[0]!.value===ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA&&fields[1]!.value===profileKey&&fields[2]!.value===fromOutputMonthStem;
  }catch{return false;}
}
