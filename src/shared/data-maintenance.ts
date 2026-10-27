export type DataPackTable = 'characters'|'citations'|'knowledge'|'sources';
export type DataPackCounts = Record<DataPackTable, number>;
export interface DataPackInfo { version:string;sha256:string;bytes:number;counts:DataPackCounts; }
export interface DataPackDelta { added:number;removed:number;changed:number;unchanged:number; }
export interface DataPackPreview {
  id:string;operation:'import'|'rollback';current:DataPackInfo;incoming:DataPackInfo;
  changes:Record<DataPackTable,DataPackDelta>;
  sourceChanges:{id:string;name:string;kind:'added'|'removed'|'changed'}[];
  expiresAt:string;
}
export interface DataMaintenanceStatus {
  active:DataPackInfo;builtin?:DataPackInfo;rollback?:DataPackInfo;rollbackError?:string;
  archives:{count:number;bytes:number;maxCount:number;maxBytes:number};
  ruleBoundary:string;
}
export const DATA_PACK_BOUNDARY='知识包只替换汉字、引文、文化知识及其来源；内置术数规则、固定逐月原文、客户资料和已有方案不随之替换。历史方案继续按生成时完整知识包归档核对。';
