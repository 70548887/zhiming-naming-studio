import type {Candidate2SemanticErrorCode} from '../shared/candidate2-semantic-composition-v1';
export class Candidate2SemanticError extends Error {
  constructor(readonly code:Candidate2SemanticErrorCode,readonly detail:string){super(code+': '+detail);this.name='Candidate2SemanticError';}
}
export function candidate2SemanticNeed(value:unknown,code:Candidate2SemanticErrorCode,detail:string):asserts value {
  if(!value)throw new Candidate2SemanticError(code,detail);
}
