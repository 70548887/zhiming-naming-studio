export type ParentDraftRole='father'|'mother';
export interface ParentDraftTicket {
 readonly role:ParentDraftRole;readonly profileId:string;readonly draftEpoch:number;readonly roleEpoch:number;
}
/** UI concurrency guard only; it authenticates no source, pronunciation or IPC caller. */
export function createParentReadingDraftTicketGuard(initialProfileId:string) {
 let profileId=initialProfileId,draftEpoch=0,alive=true;
 const roles:Record<ParentDraftRole,number>={father:0,mother:0},issued=new WeakSet<object>();
 const assertRole=(role:ParentDraftRole)=>{if(role!=='father'&&role!=='mother')throw Error('家庭读音角色无效。');};
 const advanceAll=()=>{draftEpoch++;roles.father++;roles.mother++;};
 const invalidate=(role:ParentDraftRole)=>{assertRole(role);roles[role]++;};
 const stillCurrent=(ticket:ParentDraftTicket)=>alive&&issued.has(ticket)&&ticket.profileId===profileId&&ticket.draftEpoch===draftEpoch&&ticket.roleEpoch===roles[ticket.role];
 return {
  invalidate,
  loadProfile:(id:string)=>{if(typeof id!=='string'||!id)throw Error('家庭读音草稿须有客户身份。');profileId=id;advanceAll();},
  begin:(role:ParentDraftRole):ParentDraftTicket=>{assertRole(role);if(!alive)throw Error('家庭读音草稿已关闭。');invalidate(role);const ticket=Object.freeze({role,profileId,draftEpoch,roleEpoch:roles[role]});issued.add(ticket);return ticket;},
  stillCurrent,
  /** Consumes before a synchronous external write. Never call inside a React updater. */
  commitIfCurrent:(ticket:ParentDraftTicket,commit:()=>void):boolean=>{if(!stillCurrent(ticket))return false;issued.delete(ticket);invalidate(ticket.role);commit();return true;},
  dispose:()=>{alive=false;advanceAll();},
  activate:()=>{if(!alive){advanceAll();alive=true;}},
 };
}
