"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// .local/team-176/dev02/revision-r2/candidate/src/main/smoke-desktop-workflow-176-contract.ts
var smoke_desktop_workflow_176_contract_exports = {};
__export(smoke_desktop_workflow_176_contract_exports, {
  DESKTOP176_APP_VERSION: () => DESKTOP176_APP_VERSION,
  DESKTOP176_PHASES: () => DESKTOP176_PHASES,
  DESKTOP176_REPRESENTATIVES: () => DESKTOP176_REPRESENTATIVES,
  DESKTOP176_SCENARIOS: () => DESKTOP176_SCENARIOS,
  DESKTOP176_SCHEMA: () => DESKTOP176_SCHEMA,
  DESKTOP176_WARNING: () => DESKTOP176_WARNING,
  DESKTOP176_WORKFLOW: () => DESKTOP176_WORKFLOW,
  assertDesktop176ExerciseProcessSource: () => assertDesktop176ExerciseProcessSource,
  assertDesktop176OnboardingObservation: () => assertDesktop176OnboardingObservation,
  assertDesktop176PhasePolicy: () => assertDesktop176PhasePolicy,
  assertDesktop176PreservedLegacy: () => assertDesktop176PreservedLegacy,
  assertDesktop176ProjectSaved: () => assertDesktop176ProjectSaved,
  assertDesktop176RawResult: () => assertDesktop176RawResult,
  assertDesktop176Ref: () => assertDesktop176Ref,
  desktop176Inputs: () => desktop176Inputs,
  desktop176Prefix: () => desktop176Prefix,
  parseDesktop176TestInputFreeze: () => parseDesktop176TestInputFreeze,
  serializeDesktop176ResolvedResponse: () => serializeDesktop176ResolvedResponse
});
module.exports = __toCommonJS(smoke_desktop_workflow_176_contract_exports);
var import_node_util = require("node:util");

// C:/Users/Administrator/.codex/worktrees/naming-core-preview/八卦周易/src/shared/plain-json.ts
function canonicalPlainJson(value, depth = 0) {
  if (depth > 100) throw new Error("\u4FDD\u5B58\u5FEB\u7167\u7ED3\u6784\u8FC7\u6DF1\u3002");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) throw new Error("\u4FDD\u5B58\u5FEB\u7167\u6570\u7EC4\u539F\u578B\u65E0\u6548\u3002");
    const keys = Reflect.ownKeys(value);
    if (keys.length !== value.length + 1 || keys.some((key) => typeof key !== "string" || key !== "length" && !/^(0|[1-9]\d*)$/.test(key))) throw new Error("\u4FDD\u5B58\u5FEB\u7167\u6570\u7EC4\u542B\u989D\u5916\u5B57\u6BB5\u3002");
    return "[" + Array.from({ length: value.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) throw new Error("\u4FDD\u5B58\u5FEB\u7167\u6570\u7EC4\u4E0D\u5F97\u5305\u542B\u7A7A\u4F4D\u6216\u8BBF\u95EE\u5668\u3002");
      return canonicalPlainJson(descriptor.value, depth + 1);
    }).join(",") + "]";
  }
  if (value && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) throw new Error("\u4FDD\u5B58\u5FEB\u7167\u542B\u65E0\u6548\u5C5E\u6027\u952E\u3002");
    return "{" + keys.sort().map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) throw new Error("\u4FDD\u5B58\u5FEB\u7167\u4E0D\u5F97\u5305\u542B\u9690\u85CF\u5B57\u6BB5\u6216\u8BBF\u95EE\u5668\u3002");
      return JSON.stringify(key) + ":" + canonicalPlainJson(descriptor.value, depth + 1);
    }).join(",") + "}";
  }
  throw new Error("\u4FDD\u5B58\u5FEB\u7167\u542B\u975EJSON\u503C\u3002");
}

// .local/team-176/dev02/revision-r2/candidate/src/main/smoke-desktop-workflow-176-contract.ts
var DESKTOP176_SCHEMA = "naming-studio-desktop176-result/1";
var DESKTOP176_WORKFLOW = "desktop176/1";
var DESKTOP176_APP_VERSION = "1.0.38";
var DESKTOP176_PHASES = ["exercise", "resume"];
var DESKTOP176_SCENARIOS = ["legacy70-canonical", "naming71-character40", "project131-family-review"];
var DESKTOP176_REPRESENTATIVES = ["\u9759", "\u5357", "\u9ECE"];
var DESKTOP176_WARNING = "\u4EBA\u5DE5\u559C\u7528\u9009\u62E9\u5DF2\u4FEE\u6539\uFF0C\u6B64\u6279\u5019\u9009\u4FDD\u7559\u751F\u6210\u65F6\u7684\u7528\u5B57\u4F9D\u636E\uFF1B\u91CD\u65B0\u751F\u6210\u53EF\u5E94\u7528\u65B0\u9009\u62E9\u3002";
function fact(condition, message) {
  if (!condition) throw new Error("\u684C\u9762176\u5408\u540C\uFF1A" + message);
}
function assertDesktop176PhasePolicy(phaseID, method) {
  fact(DESKTOP176_PHASES.includes(phaseID) && typeof method === "string" && /^[A-Za-z][A-Za-z0-9]*$/.test(method), "\u672A\u77E5\u9636\u6BB5\u6216API\u65B9\u6CD5\u3002");
  if (phaseID === "resume") fact(method === "bootstrap" || method === "listHistory", "resume\u53EA\u5141\u8BB8bootstrap/listHistory\uFF0C\u5FC5\u987B\u5728Service\u8C03\u7528\u524D\u62D2\u7EDD\u5199\u5165\u3002");
}
function assertDesktop176OnboardingObservation(value, phaseID, expected) {
  canonicalPlainJson(value);
  fact(!!value && typeof value === "object" && !Array.isArray(value), "\u5F15\u5BFC\u89C2\u5BDF\u987B\u4E3A\u666E\u901A\u8BB0\u5F55\u3002");
  const record = value;
  fact(record.storageKey === "studio.onboarding.v1" && typeof record.rawValue === "string" && record.guideVisible === false, "\u5B9E\u9645\u5F15\u5BFC\u504F\u597D\u7F3A\u5931/\u672A\u6301\u4E45\u5316\u6216\u6B22\u8FCE\u5F39\u7A97\u4ECD\u663E\u793A\u3002");
  let preference;
  try {
    preference = JSON.parse(record.rawValue);
  } catch {
    throw new Error("\u684C\u9762176\u5408\u540C\uFF1A\u5B9E\u9645\u672C\u5730\u5F15\u5BFC\u504F\u597D\u635F\u574F\uFF0C\u4E0D\u4F2A\u9020\u5DF2\u8BFB\u3002");
  }
  fact(!!preference && typeof preference === "object" && !Array.isArray(preference) && Object.keys(preference).length === 2 && preference.version === 1 && preference.dismissed === true, "\u5B9E\u9645\u672C\u5730\u5F15\u5BFC\u72B6\u6001\u4E0D\u7B26\u5408production\u5DF2\u8DF3\u8FC7\u8BB0\u5F55\u3002");
  if (expected) fact(expected.phaseID === "exercise" && expected.storageKey === record.storageKey && expected.rawValue === record.rawValue && expected.guideVisible === false, "resume\u7684\u5F15\u5BFC\u72B6\u6001\u4E0D\u540C\u4E8Eexercise\u771F\u5B9E\u7559\u4E0B\u7684seal\u3002");
  return Object.freeze({ schema: "desktop176-renderer-onboarding/1", phaseID, storageKey: "studio.onboarding.v1", rawValue: record.rawValue, guideVisible: false, observation: "read-only-production-preference" });
}
function assertDesktop176ExerciseProcessSource(exit, value) {
  assertDesktop176Ref(exit.stageProcess);
  canonicalPlainJson(value);
  fact(!!value && typeof value === "object" && !Array.isArray(value), "\u7F3A\u539F\u59CBstage process\u5BF9\u8C61\u3002");
  const record = value;
  fact(record.schema === "naming-studio-smoke-process/1" && record.version === "1.0.38" && record.mode === exit.mode && record.status === "completed" && record.pid === exit.pid && record.exitCode === 0 && record.signal === null && record.launchError === null, "postreceipt\u7684\u539FP\u7248\u672C/\u8FDB\u7A0B/\u9000\u51FA\u72B6\u6001\u4E0D\u7B26\u3002");
  assertDesktop176Ref(record.executable);
  assertDesktop176Ref(record.result);
  assertDesktop176Ref(record.sourceFreeze);
  fact((0, import_node_util.isDeepStrictEqual)(record.executable, exit.executable) && (0, import_node_util.isDeepStrictEqual)(record.result, exit.result) && (0, import_node_util.isDeepStrictEqual)(record.sourceFreeze, exit.inputFreeze), "\u539FP\u5FC5\u987B\u5168ref\u7ED1\u5B9A\u540Cexe\u3001\u539F176\u7ED3\u679C\u4E0Etest-input-freeze\uFF0C\u62D2\u7EDD\u522B\u540D/\u6362\u6E90\u3002");
}
function parseDesktop176TestInputFreeze(value) {
  canonicalPlainJson(value);
  fact(!!value && typeof value === "object" && !Array.isArray(value), "freeze\u987B\u4E3A\u666E\u901A\u6570\u636E\u5BF9\u8C61\u3002");
  const record = value, keys = Object.keys(record);
  fact(keys.length === 5 && ["schema", "version", "frozenAt", "files", "documentation"].every((key) => Object.hasOwn(record, key)) && record.schema === "naming-studio-test-input-freeze/1" && record.version === "1.0.38" && typeof record.frozenAt === "string" && Number.isFinite(Date.parse(record.frozenAt)), "\u53EA\u63A5\u53D7\u7CBE\u786Etest-input-freeze/1\u751F\u4EA7schema\u3002");
  const stringMap = (input, label, nonempty) => {
    fact(!!input && typeof input === "object" && !Array.isArray(input), "freeze " + label + "\u987B\u4E3ASHA\u5B57\u7B26\u4E32\u6620\u5C04\u3002");
    const entries = Object.entries(input);
    fact(!nonempty || entries.length > 0, "freeze files\u4E0D\u5F97\u4E3A\u7A7A\u3002");
    const output = /* @__PURE__ */ Object.create(null);
    for (const [key, hash] of entries) {
      fact(key.length > 0 && !key.startsWith("/") && !key.includes("\\") && !key.includes(":") && key.split("/").every((part) => part && part !== "." && part !== ".." && !["__proto__", "prototype", "constructor"].includes(part)) && typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash), "freeze " + label + "\u9879\u5FC5\u987B\u662F\u5B89\u5168\u76F8\u5BF9\u8DEF\u5F84\u5230\u5B8C\u6574SHA\u5B57\u7B26\u4E32\uFF0C\u62D2\u7EDD\u5BF9\u8C61/\u7F3A\u503C\u3002");
      output[key] = hash;
    }
    return Object.freeze(output);
  };
  return Object.freeze({ schema: "naming-studio-test-input-freeze/1", version: "1.0.38", frozenAt: record.frozenAt, files: stringMap(record.files, "files", true), documentation: stringMap(record.documentation, "documentation", false) });
}
function desktop176Prefix(mode, phase) {
  fact(["Development", "Installed"].includes(mode) && DESKTOP176_PHASES.includes(phase), "\u6A21\u5F0F\u6216\u9636\u6BB5\u672A\u767B\u8BB0\u3002");
  return "desktop176-" + mode + "-" + phase;
}
function assertDesktop176Ref(value) {
  fact(!!value && typeof value === "object" && !Array.isArray(value), "\u4EA7\u7269\u5F15\u7528\u987B\u4E3A\u5BF9\u8C61\u3002");
  canonicalPlainJson(value);
  const row = value;
  fact(typeof row.file === "string" && row.file.length > 0 && /^[a-f0-9]{64}$/.test(row.sha256) && Number.isSafeInteger(row.bytes) && row.bytes > 0, "\u4EA7\u7269\u5F15\u7528\u7F3A\u5C11\u5B9E\u9645\u8DEF\u5F84\u3001\u5B8C\u6574SHA\u6216\u957F\u5EA6\u3002");
}
function assertDesktop176PreservedLegacy(original, current, allowRestoreToken = false) {
  fact(original.namingRules?.version === "naming-editorial-7.0.0" && current.namingRules?.version === "naming-editorial-7.0.0", "\u65E770\u4E0D\u80FD\u88AB\u5347\u7EA7\u3001\u6539\u540D\u6216\u53BB\u6389\u7248\u672C\u3002");
  const before = JSON.parse(canonicalPlainJson(original)), after = JSON.parse(canonicalPlainJson(current));
  if (allowRestoreToken) {
    delete before.reviewToken;
    delete after.reviewToken;
  }
  fact((0, import_node_util.isDeepStrictEqual)(before, after), "\u65E770\u5B8C\u6574canonical\u6539\u53D8\uFF0C\u4E0D\u4EC5\u6BD4\u8F83\u82E5\u5E72\u6311\u9009\u5B57\u6BB5\u3002");
}
function serializeDesktop176ResolvedResponse(value) {
  canonicalPlainJson(value);
  return JSON.stringify(value) + "\n";
}
function desktop176Inputs(id, name, project = false) {
  fact(id.startsWith("desktop176-") && [...name].length === 1, "\u53EA\u63A5\u53D7\u72EC\u7ACB176\u5BA2\u6237\u548C\u5355\u5B57\u4EE3\u8868\u6837\u672C\u3002");
  const profile = { id, customerName: "\u684C\u9762176\u5408\u6210\u9A8C\u6536-" + id, surname: "\u6797", surnamePinyin: "l\xEDn", fatherName: project ? "\u6797\u6C90" : "\u6797\u6587\u821F", motherName: project ? "\u9648\u5B50" : "\u9648\u82E5\u5170", gender: "\u4E2D\u6027", calendar: "solar", birthDate: project ? "2022-02-13" : "2026-10-17", birthTime: project ? "11:30" : "09:30", timeUnknown: false, leapMonth: false, birthPlace: "\u4E0A\u6D77", timezone: "Asia/Shanghai", timeBasis: "civil", renMethod: "none", monthAuthorityMethod: "no-fixed-day/1.0.0", seasonalMethod: "no-monthly/1.0.0", notes: "\u4EC5\u72EC\u7ACB\u684C\u9762\u9A8C\u6536\u5408\u6210\u8D44\u6599\uFF0C\u975E\u6B63\u5E38\u5BA2\u6237\uFF1B\u7981\u6B62\u5916\u90E8AI\u3002" };
  const preferences = { length: 1, generationChar: name, requiredChars: name, forbiddenChars: "", elderTaboo: "", style: "\u81EA\u7136", meanings: "", industry: "", priority: "balanced", preferredElements: [], zodiacRules: false, numerology: false, avoidParentNames: !project, imageryReading: false, yueReading: false, yueHomophones: "none", wordPronunciationReference: false, elementAssessment: false, ...project ? { namingElementMethod: { methodId: "project-bazi-mainchain-145/1.3.1", entryPolicy: "month-branch-only" }, parentNamePhonetics: "strict" } : {} };
  return { profile, preferences };
}
function assertDesktop176ProjectSaved(session, original) {
  const saved = session.analysis.projectNamingUse;
  fact(session.namingRules?.version === "naming-editorial-7.1.0" && !!saved, "\u987B\u4FDD\u5B58\u547D\u540D7.1\u4E0E\u72EC\u7ACB\u9879\u76EE\u91C7\u7528\u8BB0\u5F55\u3002");
  fact(saved.selection.methodId === "project-bazi-mainchain-145/1.3.1" && saved.sourceRecipe.applicationPolicyVersion === "naming-element-application/1.0.0" && saved.sourceRecipe.namingRulesVersion === "naming-editorial-7.1.0", "\u9879\u76EE\u3001\u547D\u540D\u6216\u91C7\u7528\u534F\u8BAE\u7248\u672C\u4E0D\u7B26\u3002");
  fact((0, import_node_util.isDeepStrictEqual)(saved.application.effectiveElements, ["\u571F", "\u91D1"]) && (0, import_node_util.isDeepStrictEqual)(saved.engineCertificate.effectiveElements.applied, saved.application.effectiveElements), "\u9879\u76EE\u5B9E\u9645\u91C7\u7528\u4E0D\u662F\u5DF2\u8BC1\u571F\u91D1\u3002");
  fact((0, import_node_util.isDeepStrictEqual)(session.analysis.bazi.favorable, ["\u571F", "\u91D1", "\u6C34"]) && (0, import_node_util.isDeepStrictEqual)(session.originalFavorable, session.analysis.bazi.favorable), "\u57FA\u7840\u6276\u6291\u4E0E\u9879\u76EE\u91C7\u7528\u672A\u72EC\u7ACB\u4FDD\u7559\u3002");
  fact(session.profile.namingPreferences?.preferredElements.length === 0 && session.candidates.length === 1 && session.candidates[0].givenName === "\u6C90" && session.candidates[0].evaluation.traditional === 40, "\u751F\u6210\u504F\u597D\u6216\u539F\u59CB\u9879\u76EE\u8BC4\u5206\u88AB\u5BA1\u9605\u8349\u7A3F\u8986\u76D6\u3002");
  fact(session.profile.fatherName === "\u6797\u6C90" && session.profile.motherName === "\u9648\u5B50" && session.profile.parentNameReadings?.length === 2, "\u7236\u6BCD\u59D3\u540D/\u5B8C\u6574\u786E\u8BA4\u8BB0\u5F55\u672A\u4FDD\u5B58\u3002");
  const father = session.profile.parentNameReadings.find((row) => row.role === "father"), mother = session.profile.parentNameReadings.find((row) => row.role === "mother");
  fact(father?.readings.map((row) => row.token).join() === "mu4" && mother?.readings.map((row) => row.token).join() === "zi5", "\u56FA\u5B9A\u6765\u6E90\u786E\u8BA4\u97F3\u8282\u4E0D\u7B26\u3002");
  fact(session.candidates[0].parentNamePhoneticReview?.result.comparisons.some((row) => row.role === "father" && row.status === "matched") === true, "\u771F\u5B9E\u7236\u4EB2\u7ED9\u540D\u6BD4\u8F83\u7F3A\u5931\u3002");
  if (original) {
    fact((0, import_node_util.isDeepStrictEqual)(session.analysis, original.analysis) && (0, import_node_util.isDeepStrictEqual)(session.sourceSnapshot, original.sourceSnapshot) && (0, import_node_util.isDeepStrictEqual)(session.profile, original.profile), "\u4EBA\u5DE5\u8349\u7A3F\u6539\u53D8\u5B8C\u6574\u8BC1\u4E66/\u6765\u6E90/\u751F\u6210\u8D44\u6599\u3002");
    fact((0, import_node_util.isDeepStrictEqual)(session.candidates.map((row) => row.evaluation), original.candidates.map((row) => row.evaluation)), "\u4EBA\u5DE5\u8349\u7A3F\u91CD\u8BC4\u539F\u5019\u9009\u3002");
    fact((0, import_node_util.isDeepStrictEqual)(session.preferences.preferredElements, ["\u6C34"]) && session.candidates[0].warnings.includes(DESKTOP176_WARNING), "\u672A\u5B9E\u9645\u4FDD\u7559\u6C34\u8349\u7A3F\u4E0E\u660E\u786E\u7684\u539F\u4F9D\u636E\u8B66\u793A\u3002");
  }
}
function assertDesktop176RawResult(value) {
  canonicalPlainJson(value);
  fact(value.schema === DESKTOP176_SCHEMA && value.workflowId === DESKTOP176_WORKFLOW && value.appVersion === DESKTOP176_APP_VERSION, "\u539F\u59CB\u7ED3\u679Cschema/\u7248\u672C\u4E0D\u7B26\u3002");
  const prefix = desktop176Prefix(value.mode, value.phaseID);
  fact(value.status === (value.phaseID === "exercise" ? "awaiting-resume" : "completed"), "\u9636\u6BB5\u72B6\u6001\u4E0D\u7B26\u3002");
  fact(value.captureCompleteness === "full-original-responses" && value.generationCoverage === "representative-only", "\u539F\u59CB\u54CD\u5E94\u6216\u4EE3\u8868\u8986\u76D6\u58F0\u660E\u4E0D\u7B26\u3002");
  fact(Number.isSafeInteger(value.pid) && value.pid > 0 && value.scenarios.length === 3 && (0, import_node_util.isDeepStrictEqual)(value.scenarios.map((row) => row.scenarioId), DESKTOP176_SCENARIOS), "PID\u6216\u4E09\u7EC4\u56FA\u5B9A\u573A\u666F\u4E0D\u5B8C\u6574\u3002");
  const ids = /* @__PURE__ */ new Set(), responseFiles = /* @__PURE__ */ new Set();
  for (const row of value.originalResponses) {
    fact(row.requestId.startsWith(prefix + "-") && !ids.has(row.requestId) && DESKTOP176_SCENARIOS.includes(row.scenarioId), "\u539F\u54CD\u5E94\u8EAB\u4EFD\u91CD\u590D/\u8DE8\u9636\u6BB5\u3002");
    ids.add(row.requestId);
    assertDesktop176Ref(row.request);
    assertDesktop176Ref(row.response);
    for (const ref of [row.request, row.response]) {
      fact(!responseFiles.has(ref.file), "\u8BF7\u6C42/\u54CD\u5E94\u539F\u4EF6\u4E0D\u5F97\u590D\u7528\u8986\u76D6\u3002");
      responseFiles.add(ref.file);
    }
    fact(row.transport === "renderer-preload-ipc" && row.serialization === "complete-JSON-of-structured-value-as-received", "\u4E0D\u5F97\u7528\u8C03\u7528\u5143\u4FE1\u606F\u6216\u622A\u65AD\u6458\u8981\u4EE3\u66FF\u539F\u54CD\u5E94\u3002");
    if (value.phaseID === "resume") fact(["bootstrap", "listHistory"].includes(row.method) && row.responseKind === "resolved", "resume\u53EA\u5141\u8BB8\u53EA\u8BFB\u539F\u59CBIPC\u3002");
  }
  const pdfFiles = /* @__PURE__ */ new Set(), screenshotFiles = /* @__PURE__ */ new Set(), customerIds = /* @__PURE__ */ new Set();
  for (const row of value.scenarios) {
    fact(row.status === "passed" && row.responseRequestIds.length > 0 && row.responseRequestIds.every((id) => ids.has(id) && value.originalResponses.some((response) => response.requestId === id && response.scenarioId === row.scenarioId)), "\u573A\u666F\u6CA1\u6709\u672C\u9636\u6BB5\u771F\u5B9E\u539F\u54CD\u5E94\u3002");
    assertDesktop176Ref(row.pdf);
    assertDesktop176Ref(row.pdf.snapshot);
    assertDesktop176Ref(row.pdf.html);
    assertDesktop176Ref(row.screenshot);
    fact(row.pdf.phaseID === "exercise" && row.screenshot.phaseID === "exercise" && row.artifactPhase === "exercise", "\u4E09\u4EFDPDF/\u622A\u56FE\u4EC5exercise\u4EA7\u751F\uFF0C\u4E0D\u5728resume\u91CD\u5199\u3002");
    fact(row.sessionIds.includes(row.pdf.sessionId) && !pdfFiles.has(row.pdf.file) && !screenshotFiles.has(row.screenshot.file), "PDF\u4F1A\u8BDD\u7ED1\u5B9A\u6216\u4E09\u7EC4\u4EA7\u7269\u552F\u4E00\u6027\u4E0D\u7B26\u3002");
    pdfFiles.add(row.pdf.file);
    screenshotFiles.add(row.screenshot.file);
    fact(row.screenshot.mime === "image/png" && row.screenshot.bytes <= 5e5 && row.screenshot.width > 0 && row.screenshot.width <= 1280 && row.screenshot.height > 0 && row.screenshot.height <= 1280, "\u622A\u56FE\u9700\u4E3A1280px/500KB\u4EE5\u5185\u5B9E\u9645PNG\u3002");
    fact(row.customerIds.length > 0 && new Set(row.customerIds).size === row.customerIds.length && row.customerIds.every((id) => typeof id === "string" && id && !customerIds.has(id)), "\u6BCF\u7EC4\u5FC5\u987B\u6709\u72EC\u7ACB\u5BA2\u6237\u3002");
    for (const id of row.customerIds) customerIds.add(id);
  }
  for (const ref of [value.executable, value.inputFreeze, value.workflowSource, value.runtimeProcess, value.sqlProof, value.coverageInventory40, value.resumeSeal]) assertDesktop176Ref(ref);
  fact(value.AIEnabled === false && !value.networkAttempts.length && !value.rendererNetworkAttempts.length && value.nativeExecutionRequiredForAcceptance === true, "\u672A\u4FDD\u6301\u79BB\u7EBF\u5B9E\u9645\u6267\u884C\u9650\u5B9A\u3002");
  fact(Number.isFinite(Date.parse(value.startedAt)) && Number.isFinite(Date.parse(value.completedAt)) && Date.parse(value.completedAt) >= Date.parse(value.startedAt), "\u9636\u6BB5\u8D77\u6B62\u65F6\u95F4\u65E0\u6548\u3002");
  if (value.phaseID === "exercise") fact(value.reopenScope === "renderer-reload-and-store-reopen", "exercise\u4E0D\u80FD\u5192\u72EC\u7ACB\u8FDB\u7A0B\u91CD\u5F00\u3002");
  if (value.phaseID === "resume") {
    const evidence = value.resumeEvidence;
    fact(!!evidence && evidence.exercisePid !== evidence.resumePid && evidence.resumePid === value.pid && (0, import_node_util.isDeepStrictEqual)(evidence.runtimeInputBefore, evidence.runtimeInputAfter) && value.reopenScope === "separate-process-resume", "\u6CA1\u6709\u4E0D\u540CPID\u7684\u540Cseal\u53EA\u8BFB\u91CD\u5F00\u8BC1\u636E\u3002");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DESKTOP176_APP_VERSION,
  DESKTOP176_PHASES,
  DESKTOP176_REPRESENTATIVES,
  DESKTOP176_SCENARIOS,
  DESKTOP176_SCHEMA,
  DESKTOP176_WARNING,
  DESKTOP176_WORKFLOW,
  assertDesktop176ExerciseProcessSource,
  assertDesktop176OnboardingObservation,
  assertDesktop176PhasePolicy,
  assertDesktop176PreservedLegacy,
  assertDesktop176ProjectSaved,
  assertDesktop176RawResult,
  assertDesktop176Ref,
  desktop176Inputs,
  desktop176Prefix,
  parseDesktop176TestInputFreeze,
  serializeDesktop176ResolvedResponse
});
