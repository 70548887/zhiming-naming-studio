import { existsSync, readFileSync } from 'node:fs';
import { atomicWrite } from './store';

export interface SecretStorage { read(scope?:string):string; write(key:string,scope?:string):void; warning?():string; }
export interface SecretProtector { isEncryptionAvailable():boolean; encryptString(value:string):Buffer; decryptString(value:Buffer):string; }
export function normalizeCredentialEndpoint(base:string):string {
  let url:URL;try{url=new URL(base.trim());}catch{throw new Error('请输入有效的 AI 接口地址。');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('AI 接口地址需为不含凭证、查询参数或片段的 HTTP/HTTPS 地址。');
  const path=url.pathname.replace(/\/+$/,'');url.pathname=path.endsWith('/chat/completions')?path:path+'/chat/completions';return url.toString();
}
/** A credential is only usable for the endpoint explicitly selected when it was saved. */
export class EndpointSecretStorage implements SecretStorage {
  private notice='';
  constructor(private path:string,private protector:SecretProtector){}
  read(scope?:string):string {
    if(!existsSync(this.path))return '';
    try{
      const plain=this.protector.decryptString(readFileSync(this.path));let record:any;
      try{record=JSON.parse(plain);}catch{this.notice='原 AI 密钥未绑定接口地址，请在设置中重新填写密钥。';return '';}
      if(record?.version!==1||typeof record.endpoint!=='string'||typeof record.key!=='string'){this.notice='AI 密钥格式已更新，请在设置中重新填写密钥。';return '';}
      if(!scope||normalizeCredentialEndpoint(scope)!==record.endpoint)return '';
      return record.key;
    }catch{this.notice='系统无法读取已保存的 AI 密钥，请在设置中重新填写。';return '';}
  }
  write(key:string,scope?:string):void {
    if(!this.protector.isEncryptionAvailable())throw new Error('当前系统密钥保护不可用，未保存密钥。');
    if(!scope&&key)throw new Error('保存 AI 密钥时必须绑定接口地址。');
    const endpoint=scope?normalizeCredentialEndpoint(scope):'';
    atomicWrite(this.path,this.protector.encryptString(JSON.stringify({version:1,endpoint,key})));
    this.notice='';
  }
  warning(){return this.notice;}
}
