export interface ParentReadingEditorLease {readonly generation:number;}
export class ParentReadingEditorExitedError extends Error {
 constructor(){super('已离开家庭读音编辑区，本次未完成确认已取消；请在当前出生资料中重新确认。');this.name='ParentReadingEditorExitedError';}
}
/** Owner routing state only. Reading getLease during render has no side effects. */
export function createParentReadingEditorLease(initial:{page:string;section:'birth'|'preferences'},onExit:()=>void) {
 let page=initial.page,section=initial.section,generation=0,alive=true;
 const active=()=>alive&&page==='workbench'&&section==='birth';
 let lease:ParentReadingEditorLease|null=active()?Object.freeze({generation}):null;
 const move=(nextPage:string,nextSection:'birth'|'preferences')=>{
  if(page===nextPage&&section===nextSection)return;
  const wasActive=active();page=nextPage;section=nextSection;generation++;
  lease=active()?Object.freeze({generation}):null;
  if(wasActive&&!active())onExit();
 };
 return {
  getLease:()=>lease,
  stillCurrent:(candidate:ParentReadingEditorLease|null)=>candidate!==null&&candidate===lease&&active(),
  setPage:(nextPage:string)=>move(nextPage,section),
  setSection:(nextSection:'birth'|'preferences')=>move(page,nextSection),
  dispose:()=>{const wasActive=active();alive=false;generation++;lease=null;if(wasActive)onExit();},
  activate:()=>{if(alive)return;alive=true;generation++;lease=active()?Object.freeze({generation}):null;},
 };
}
