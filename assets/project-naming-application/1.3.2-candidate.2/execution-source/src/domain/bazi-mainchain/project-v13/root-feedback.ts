import type { Carrier140, Element140 } from '../../../shared/bazi-mainchain-method-types';
import type {
  MinimalSettlement,
  RootCandidateInterval,
  RootFeedbackCallbacks,
  RootFeedbackInput,
  RootFeedbackOptions,
  RootFeedbackRegime,
  RootFeedbackResolution,
  RootFeedbackResult,
  RootFeedbackVariable,
  RootNativeFact,
  RootPowerInterval,
  RootPredicateValue,
  RootRegimeInterval,
} from './root-feedback-types';

// Versioned project rules. These are intentionally absent from the public input.
const ROOT_MINIMUM = 0.5;
const RESOURCE_SEED_MINIMUM = 1;
const EPSILON = 1e-9;
const ELEMENTS: readonly Element140[] = ['木', '火', '土', '金', '水'];
const FLOAT_BITS = new DataView(new ArrayBuffer(8));

function nextUp(value: number): number {
  if (Number.isNaN(value) || value === Infinity) return value;
  if (value === 0) return Number.MIN_VALUE;
  FLOAT_BITS.setFloat64(0, value, false);
  let high = FLOAT_BITS.getUint32(0, false);
  let low = FLOAT_BITS.getUint32(4, false);
  if (value > 0) {
    low = (low + 1) >>> 0;
    if (low === 0) high = (high + 1) >>> 0;
  } else if (low === 0) {
    low = 0xffffffff;
    high = (high - 1) >>> 0;
  } else low -= 1;
  FLOAT_BITS.setUint32(0, high, false);
  FLOAT_BITS.setUint32(4, low, false);
  return FLOAT_BITS.getFloat64(0, false);
}

function nextDown(value: number): number {
  return -nextUp(-value);
}

function validateSnapshot(input: RootFeedbackInput): void {
  const ids = new Set<string>();
  for (const row of input.carriers) {
    if (row.id.length === 0 || ids.has(row.id)) throw new TypeError(`重复或空载体 ID：${row.id}`);
    ids.add(row.id);
    if (!ELEMENTS.includes(row.element) || !ELEMENTS.includes(row.originalElement)) {
      throw new TypeError(`载体 ${row.id} 的原始或工作五行无效。`);
    }
    if (!Number.isFinite(row.seed) || row.seed < 0) {
      throw new RangeError(`载体 ${row.id} 的 seed 必须为有限非负数。`);
    }
    if (row.kind !== 'hidden' && row.kind !== 'exposed' && row.kind !== 'day-master') {
      throw new TypeError(`载体 ${row.id} 的类型无效。`);
    }
  }
  const relationIds = new Set<string>();
  for (const relation of input.relations) {
    if (relation.id.length === 0 || relationIds.has(relation.id)) {
      throw new TypeError(`重复或空关系 ID：${relation.id}`);
    }
    relationIds.add(relation.id);
  }
  const pathPairs = new Set<string>();
  for (const path of input.pathFactors) {
    if (!ids.has(path.source) || !ids.has(path.target)) {
      throw new TypeError(`路径 ${path.source}→${path.target} 引用了未知载体。`);
    }
    if (!Number.isFinite(path.factor) || path.factor < 0) {
      throw new RangeError(`路径 ${path.source}→${path.target} 的 factor 必须为有限非负数。`);
    }
    const pair = JSON.stringify([path.source, path.target]);
    if (pathPairs.has(pair)) throw new TypeError(`重复路径：${path.source}→${path.target}`);
    pathPairs.add(pair);
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function previousElement(element: Element140): Element140 {
  return ELEMENTS[(ELEMENTS.indexOf(element) + ELEMENTS.length - 1) % ELEMENTS.length];
}

function nativeFacts(rows: readonly Carrier140[],input:RootFeedbackInput): RootNativeFact[] {
  return rows.filter(row => row.kind === 'hidden').map(row => ({
    carrierId: row.id,
    position: row.position,
    stem: row.stem,
    ...(row.branch === undefined ? {} : { branch: row.branch }),
    originalElement: row.originalElement,
    workingElement: row.element,
    seed: row.seed,
    hiddenOrder:input.nativeHiddenOrder?.[row.id]??null,
    ...(row.conversion === undefined ? {} : { conversion: row.conversion }),
    supportedOriginalCarrierIds: rows
      .filter(target => target.kind !== 'hidden' && target.originalElement === row.originalElement)
      .map(target => target.id).sort(),
  })).sort((a, b) => a.carrierId.localeCompare(b.carrierId));
}

function rootVariables(rows: readonly Carrier140[]): RootFeedbackVariable[] {
  const variables: RootFeedbackVariable[] = [];
  for (const element of ELEMENTS) {
    const stems = rows.filter(row => row.kind !== 'hidden' && row.element === element);
    if (stems.length === 0) continue;
    const resourceElement = previousElement(element);
    const resourceSeed = rows.filter(row => row.element === resourceElement)
      .reduce((sum, row) => sum + row.seed, 0);
    if (!Number.isFinite(resourceSeed)) throw new RangeError(`${element} 的固定源 seed 求和溢出。`);
    variables.push({
      id: `root:${element}`,
      element,
      carrierIds: stems.map(row => row.id).sort(),
      resourceElement,
      resourceSeed,
      fallbackFactor: resourceSeed + EPSILON >= RESOURCE_SEED_MINIMUM ? 0.7 : 0.35,
    });
  }
  if (variables.length > 4) {
    throw new RangeError('Root feedback requires at most four exposed working-element predicates.');
  }
  return variables;
}

function validInterval(interval: RootPowerInterval | undefined): interval is RootPowerInterval {
  return interval !== undefined && Number.isFinite(interval.lower)
    && Number.isFinite(interval.upper) && interval.lower <= interval.upper;
}

function intervalValue(interval: RootPowerInterval): RootPredicateValue {
  // The addition itself also needs an outward bound at the epsilon boundary.
  if (nextDown(interval.lower + EPSILON) >= ROOT_MINIMUM) return 'true';
  if (nextUp(interval.upper + EPSILON) < ROOT_MINIMUM) return 'false';
  return 'unknown';
}

function candidateInterval(
  candidate: Carrier140,
  input: RootFeedbackInput,
  state: MinimalSettlement | null,
  kernelClosed: boolean,
): RootCandidateInterval {
  const transformed = candidate.conversion !== undefined || candidate.element !== candidate.originalElement;
  const relation = candidate.conversion === undefined ? undefined
    : input.relations.find(item => item.id === candidate.conversion);
  const accepted = !transformed || relation?.status === 'applied';
  const rawInterval = state?.bounds?.powers?.[candidate.id];
  const interval = validInterval(rawInterval) ? { ...rawInterval } : null;
  const settledCarrier = state?.carriers?.find(row => row.id === candidate.id);
  const reasons: string[] = [];
  if (!accepted) reasons.push(`转换支撑 ${candidate.id} 的关系前提未采用。`);
  if (!kernelClosed) reasons.push('本机制内核未闭合，根可用量未认证。');
  else if (interval === null) reasons.push(`支撑 ${candidate.id} 缺少有效最终 power 区间。`);
  const value = accepted && kernelClosed && interval !== null ? intervalValue(interval) : 'unknown';
  if (value === 'unknown' && accepted && kernelClosed && interval !== null) {
    reasons.push(`支撑 ${candidate.id} 的最终 power 区间跨根门槛。`);
  }
  return {
    carrierId: candidate.id,
    basis: transformed ? 'transformed-support' : 'native-root',
    qualification: accepted ? 'accepted' : 'pending-prerequisite',
    ...(candidate.conversion === undefined ? {} : { relationId: candidate.conversion }),
    originalElement: candidate.originalElement,
    workingElement: candidate.element,
    power: settledCarrier && Number.isFinite(settledCarrier.power) ? settledCarrier.power : null,
    interval,
    value,
    reasons,
  };
}

function evaluateRoot(
  variable: RootFeedbackVariable,
  assumedRooted: boolean,
  input: RootFeedbackInput,
  rows: readonly Carrier140[],
  state: MinimalSettlement | null,
  kernelClosed: boolean,
  complete: boolean,
): RootRegimeInterval {
  const candidateIntervals = rows
    .filter(row => row.kind === 'hidden' && row.element === variable.element)
    .map(row => candidateInterval(row, input, state, kernelClosed));
  const witnesses = candidateIntervals.filter(candidate => candidate.value === 'true');
  const reasons: string[] = [];
  let value: RootPredicateValue = 'unknown';
  if (!complete) reasons.push('缺时仅覆盖已知柱，所有根谓词保留未知。');
  else if (!kernelClosed) reasons.push('本机制内核未闭合，不能排除该机制。');
  else if (witnesses.length > 0) value = 'true';
  else if (candidateIntervals.some(candidate => candidate.value === 'unknown')) {
    reasons.push('支撑资格或最终区间仍有未知。');
  } else value = 'false';
  return {
    variableId: variable.id,
    element: variable.element,
    assumedRooted,
    value,
    candidateSetComplete: complete,
    candidateIntervals,
    witnessCarrierIds: value === 'true' ? witnesses.map(candidate => candidate.carrierId) : [],
    reasons,
  };
}

function resolution(
  consistentCount: number,
  possibleCount: number,
  complete: boolean,
  adopted: boolean,
): RootFeedbackResolution {
  if (consistentCount === 0 && possibleCount === 0) return 'no-consistent-regime';
  if (consistentCount >= 2) return 'multiple-consistent-regimes';
  if (consistentCount === 1 && possibleCount === 0 && complete && adopted) {
    return 'unique-consistent-regime';
  }
  return 'pending-regime-resolution';
}

/**
 * Enumerate every frozen capacity regime, calling the unchanged inner kernel once
 * per regime. No posterior root judgement is ever fed back into an existing run.
 */
export function resolveRootFeedback<
  TSettlement extends MinimalSettlement,
  TMainchain = unknown,
>(
  input: RootFeedbackInput,
  callbacks: RootFeedbackCallbacks<TSettlement, TMainchain>,
  options: RootFeedbackOptions = {},
): RootFeedbackResult<TSettlement, TMainchain> {
  validateSnapshot(input);
  // Canonical order makes resource summation and callback inputs permutation stable.
  const rows = input.carriers.map(row => ({ ...row })).sort((a, b) => a.id.localeCompare(b.id));
  const paths = input.pathFactors.map(path => ({ ...path }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  const disabledEdgeIds = [...(options.disabledControlEdgeIds ?? [])].sort();
  const variables = rootVariables(rows);
  const complete = input.scope === 'complete-known-pillars'
    && (input.chart === undefined || input.chart.pillars.hour !== null);
  // Even a converted exposed carrier has to retain its adopted relation premise.
  // An unrelated blocked/observed relation does not itself invalidate the snapshot.
  const unadoptedConversions = rows.some(row => {
    if (row.conversion === undefined && row.element === row.originalElement) return false;
    return row.conversion === undefined
      || !input.relations.some(relation => relation.id === row.conversion && relation.status === 'applied');
  });
  const pending = [...input.pending];
  if (!complete) pending.push('缺时：结果仅为已知柱投影，根谓词和机制选择均未认证完整。');
  const regimes: RootFeedbackRegime<TSettlement, TMainchain>[] = [];

  for (let mask = 0; mask < 2 ** variables.length; mask += 1) {
    const id = `${input.id}:root-${mask.toString(2).padStart(Math.max(1, variables.length), '0')}`;
    const rootAssumptions = variables.map((variable, index) => ({
      variableId: variable.id,
      element: variable.element,
      carrierIds: [...variable.carrierIds],
      rooted: (mask & (1 << index)) !== 0,
    }));
    const byElement = new Map(variables.map((variable, index) => [
      variable.element,
      rootAssumptions[index].rooted ? 1 : variable.fallbackFactor,
    ]));
    const regimeCarriers = rows.map(row => {
      const rootFactor = row.kind === 'hidden' ? 1 : byElement.get(row.element)!;
      return {
        ...row,
        rootFactor,
        capacity: row.seed * rootFactor,
        incomingControl: 0,
        generationIn: 0,
        generationOut: 0,
        power: 0,
      };
    });
    const capacities = regimeCarriers.map(row => ({
      carrierId: row.id, seed: row.seed, rootFactor: row.rootFactor, capacity: row.capacity,
    }));
    const regimePending: string[] = [];
    let state: TSettlement | null = null;
    try {
      // Copies also isolate the frozen paths/disabled list from an impure callback.
      state = callbacks.settle(regimeCarriers, paths.map(path => ({ ...path })), [...disabledEdgeIds]) ?? null;
    } catch (error) {
      regimePending.push(`内核求解失败：${error instanceof Error ? error.message : String(error)}`);
    }
    const kernelClosed = state !== null && state.status === 'closed';
    if (!kernelClosed && regimePending.length === 0) {
      regimePending.push(`内核未闭合：${state?.issues?.join('；') || state?.status || '缺少结算结果'}`);
    }
    const rootIntervals = variables.map((variable, index) => evaluateRoot(
      variable, rootAssumptions[index].rooted, input, rows, state, kernelClosed, complete,
    ));
    const inconsistencyReasons = rootIntervals.filter(root => root.value !== 'unknown'
      && (root.value === 'true') !== root.assumedRooted)
      .map(root => `${root.variableId} 假设${root.assumedRooted ? '有根' : '回退'}，结算后确定${root.value === 'true' ? '有根' : '无可用根'}。`);
    const consistency = inconsistencyReasons.length > 0 ? 'inconsistent'
      : !kernelClosed || rootIntervals.some(root => root.value === 'unknown') ? 'possible' : 'consistent';
    let mainchainResult: TMainchain | null = null;
    if (consistency !== 'inconsistent' && kernelClosed && state !== null && callbacks.consume) {
      try {
        mainchainResult = callbacks.consume(state, id);
      } catch (error) {
        regimePending.push(`后续主链计算失败：${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const generationFlows = (state?.flows ?? []).filter(flow => flow.kind === 'generate');
    const generationBounds: Record<string, RootPowerInterval> = {};
    for (const flow of generationFlows) {
      const bound = state?.bounds?.flows?.[flow.id];
      if (validInterval(bound)) generationBounds[flow.id] = { ...bound };
    }
    regimes.push({
      id, rootAssumptions, capacities, settlement: state,
      controlSettlement: state?.controlSettlement ?? null,
      generation: { flows: generationFlows.map(flow => ({ ...flow })), bounds: generationBounds },
      rootIntervals, consistency, inconsistencyReasons, mainchainResult, pending: regimePending,
    });
  }

  const consistentIds = regimes.filter(regime => regime.consistency === 'consistent').map(regime => regime.id);
  const possibleIds = regimes.filter(regime => regime.consistency === 'possible').map(regime => regime.id);
  const unadopted = unadoptedConversions || regimes.some(regime => regime.rootIntervals.some(root => root.candidateIntervals
    .some(candidate => candidate.qualification === 'pending-prerequisite')));
  if (unadopted) pending.push('转换支撑资格未采用，保留相应条件分支。');
  for (const regime of regimes) {
    for (const issue of regime.pending) pending.push(`${regime.id}：${issue}`);
  }
  return {
    id: input.id,
    methodId: input.methodId,
    scope: complete ? 'complete-known-pillars' : 'known-pillars-only',
    facts: nativeFacts(rows,input),
    variables,
    regimes,
    consistentIds,
    possibleIds,
    resolution: resolution(consistentIds.length, possibleIds.length, complete, !unadopted && input.pending.length === 0),
    commonOpinion: [],
    conflicts: [],
    pending: unique(pending),
  };
}
