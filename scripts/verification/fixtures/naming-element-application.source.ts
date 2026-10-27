export const NAMING_ELEMENT_APPLICATION_POLICY='naming-element-application/1.0.0' as const;

/** Every supported naming/method/application combination is registered exactly.
 * An equal knowledge-pack hash never upgrades a saved naming-rule version. */
export const NAMING_ELEMENT_APPLICATION_TUPLES=Object.freeze([
 Object.freeze({namingRulesVersion:'naming-editorial-7.0.0',methodId:'project-bazi-mainchain-145/1.3.1',applicationPolicyVersion:NAMING_ELEMENT_APPLICATION_POLICY}),
 Object.freeze({namingRulesVersion:'naming-editorial-7.1.0',methodId:'project-bazi-mainchain-145/1.3.1',applicationPolicyVersion:NAMING_ELEMENT_APPLICATION_POLICY}),
] as const);

export function assertNamingElementApplicationTuple(namingRulesVersion:unknown,methodId:unknown,applicationPolicyVersion:unknown):void {
 if(!NAMING_ELEMENT_APPLICATION_TUPLES.some(tuple=>tuple.namingRulesVersion===namingRulesVersion&&tuple.methodId===methodId&&tuple.applicationPolicyVersion===applicationPolicyVersion))throw new Error('命名规则、项目取法与采用协议组合尚未登记；不能按版本范围推断、升级或降级。');
}
