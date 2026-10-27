import {isDeepStrictEqual} from 'node:util';
import {assertTrustedNamingElementResolution,type NamingElementResolution} from './naming-element-resolution';
import {assertNamingElementApplicationTuple} from '../shared/naming-element-application';
import type {ProjectNamingUseSnapshot} from '../shared/project-naming-use';
import {canonicalPlainJson} from '../shared/plain-json';

/** Construct a generation record only from a branded main-process resolution.
 * Saved records must separately pass pinned replay and candidate evaluation. */
export function buildProjectNamingUseSnapshot(resolution:NamingElementResolution,namingRuleVersion:string):ProjectNamingUseSnapshot|undefined {
 assertTrustedNamingElementResolution(resolution);
 if(resolution.source!=='project')return undefined;
 const {basis,selection,appliedGate:gate}=resolution;
 if(namingRuleVersion!=='naming-editorial-7.0.0'&&namingRuleVersion!=='naming-editorial-7.1.0')throw new Error('项目命名采用快照只支持明确登记的命名7.0或7.1。');
 assertNamingElementApplicationTuple(namingRuleVersion,selection.methodId,basis.applicationPolicyVersion);
 if(basis.source!=='project'||gate.status!=='applicable'||!isDeepStrictEqual(basis.selection,selection)||gate.certificate.methodId!==selection.methodId||gate.certificate.entryPolicy!==selection.entryPolicy||gate.certificate.applicationPolicyVersion!==basis.applicationPolicyVersion||!isDeepStrictEqual(gate.effectiveElements,gate.certificate.effectiveElements)||!isDeepStrictEqual(basis.elements,gate.effectiveElements.applied))throw new Error('项目命名解析、证书与实际消费五行不一致，未生成方案。');
 const snapshot:ProjectNamingUseSnapshot={
  schema:'project-naming-use/1',selection:structuredClone(selection),
  sourceRecipe:{schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:namingRuleVersion,applicationPolicyVersion:'naming-element-application/1.0.0'},
  engineCertificate:structuredClone(gate.certificate),
  application:{policyId:'naming-element-application/1.0.0',status:'applied',primary:[...gate.effectiveElements.primary],secondary:[...gate.effectiveElements.secondary],avoid:[...gate.effectiveElements.avoid],effectiveElements:[...basis.elements]}
 };
 canonicalPlainJson(snapshot);
 return snapshot;
}
