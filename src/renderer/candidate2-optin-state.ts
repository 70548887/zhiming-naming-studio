import type {Candidate2NamingEligibility} from '../shared/candidate2-naming-eligibility-v1';
import type {NamingPreferences} from '../shared/types';
import type {Candidate2OptInChoice,Candidate2OptInIntent} from './Candidate2OptInPanel';
export interface Candidate2OptInState {choice:Candidate2OptInChoice;contextKey:string;eligibility?:Candidate2NamingEligibility;}
export interface Candidate2OptInContext {preferences:NamingPreferences;contextKey:string;eligibility?:Candidate2NamingEligibility;}
export interface Candidate2OptInStateController {getSnapshot:()=>Candidate2OptInState;setEligibility:(value:Candidate2NamingEligibility|undefined)=>void;choose:(choice:Candidate2OptInChoice)=>Candidate2OptInIntent|undefined;refresh:()=>void;}
/** Local UI state only. It never calls a checker, generates a name, saves a
 * session, clears manual elements, or derives a traditional conclusion. */
export function createCandidate2OptInState({getContext,onIntent}:{getContext:()=>Candidate2OptInContext;onIntent?:(intent:Candidate2OptInIntent)=>void}):Candidate2OptInStateController{
 let state:Candidate2OptInState={choice:'legacy',contextKey:getContext().contextKey,eligibility:getContext().eligibility};
 const refresh=()=>{const context=getContext();if(context.contextKey!==state.contextKey){state={choice:'legacy',contextKey:context.contextKey,eligibility:context.eligibility};}else state={...state,eligibility:context.eligibility};};
 return{getSnapshot:()=>state,setEligibility:value=>{state={...state,eligibility:value};},choose:choice=>{refresh();if(choice===state.choice)return undefined;const intent:Candidate2OptInIntent={choice,contextKey:state.contextKey,source:'explicit-user-opt-in'};state={...state,choice};onIntent?.(intent);return intent;},refresh};
}
