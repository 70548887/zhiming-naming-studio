import type {
  Carrier140,
  ChartCase140,
  Element140,
  Flow140,
  Relation140,
  Trace140,
} from '../../../shared/bazi-mainchain-method-types';
import type {RootFeedbackPreparationEvidence} from '../../../shared/bazi-root-feedback-v132';

export type RootFeedbackScope = 'complete-known-pillars' | 'known-pillars-only';
export type RootPredicateValue = 'true' | 'false' | 'unknown';
export type RootRegimeConsistency = 'consistent' | 'inconsistent' | 'possible';
export type RootFeedbackResolution =
  | 'unique-consistent-regime'
  | 'multiple-consistent-regimes'
  | 'no-consistent-regime'
  | 'pending-regime-resolution';

export interface RootPathFactor {
  source: string;
  target: string;
  factor: number;
}

/** A snapshot prepared by the domain layer after its relation decisions. */
export interface RootFeedbackInput {
  id: string;
  scope: RootFeedbackScope;
  carriers: readonly Carrier140[];
  relations: readonly Relation140[];
  /** Domain preparation trace, independent of settlement and downstream consumers. */
  preparationTrace?: readonly Trace140[];
  pathFactors: readonly RootPathFactor[];
  methodId: string;
  chart?: ChartCase140;
  pending: readonly string[];
  /** Frozen native hidden-stem order, before carrier sorting or conversion. */
  nativeHiddenOrder?:Readonly<Record<string,number>>;
}

export interface RootPowerInterval {
  lower: number;
  upper: number;
}

/** Structural boundary: a full 1.2 settlement satisfies this interface. */
export interface MinimalSettlement {
  status: string;
  carriers: Carrier140[];
  bounds: {
    powers: Record<string, RootPowerInterval>;
    flows?: Record<string, RootPowerInterval>;
  };
  controlSettlement?: unknown;
  flows?: readonly Flow140[];
  issues?: readonly string[];
}

export interface RootFeedbackCallbacks<
  TSettlement extends MinimalSettlement = MinimalSettlement,
  TMainchain = unknown,
> {
  settle(
    regimeCarriers: Carrier140[],
    paths: readonly RootPathFactor[],
    disabledControlEdgeIds: readonly string[],
  ): TSettlement;
  consume?(state: TSettlement, regimeId: string): TMainchain;
}

export interface RootFeedbackOptions {
  disabledControlEdgeIds?: readonly string[];
}

export interface RootNativeFact {
  carrierId: string;
  position: Carrier140['position'];
  stem: string;
  branch?: string;
  originalElement: Element140;
  workingElement: Element140;
  seed: number;
  hiddenOrder:number|null;
  conversion?: string;
  /** These are original-element facts, even if working elements have changed. */
  supportedOriginalCarrierIds: string[];
}

export interface RootFeedbackVariable {
  id: string;
  element: Element140;
  carrierIds: string[];
  resourceElement: Element140;
  resourceSeed: number;
  fallbackFactor: 0.35 | 0.7;
}

export interface RootAssumption {
  variableId: string;
  element: Element140;
  carrierIds: string[];
  rooted: boolean;
}

export interface RootRegimeCapacity {
  carrierId: string;
  seed: number;
  rootFactor: number;
  capacity: number;
}

export interface RootCandidateInterval {
  carrierId: string;
  basis: 'native-root' | 'transformed-support';
  qualification: 'accepted' | 'pending-prerequisite';
  relationId?: string;
  originalElement: Element140;
  workingElement: Element140;
  power: number | null;
  interval: RootPowerInterval | null;
  value: RootPredicateValue;
  reasons: string[];
}

export interface RootRegimeInterval {
  variableId: string;
  element: Element140;
  assumedRooted: boolean;
  value: RootPredicateValue;
  candidateSetComplete: boolean;
  candidateIntervals: RootCandidateInterval[];
  witnessCarrierIds: string[];
  reasons: string[];
}

export interface RootFeedbackRegime<
  TSettlement extends MinimalSettlement = MinimalSettlement,
  TMainchain = unknown,
> {
  id: string;
  rootAssumptions: RootAssumption[];
  capacities: RootRegimeCapacity[];
  settlement: TSettlement | null;
  controlSettlement: unknown | null;
  generation: {
    flows: Flow140[];
    bounds: Record<string, RootPowerInterval>;
  };
  rootIntervals: RootRegimeInterval[];
  consistency: RootRegimeConsistency;
  inconsistencyReasons: string[];
  mainchainResult: TMainchain | null;
  pending: string[];
}

export interface RootFeedbackResult<
  TSettlement extends MinimalSettlement = MinimalSettlement,
  TMainchain = unknown,
> {
  id: string;
  methodId: string;
  scope: RootFeedbackScope;
  preparation: RootFeedbackPreparationEvidence;
  facts: RootNativeFact[];
  variables: RootFeedbackVariable[];
  regimes: RootFeedbackRegime<TSettlement, TMainchain>[];
  consistentIds: string[];
  possibleIds: string[];
  resolution: RootFeedbackResolution;
  /** Aggregation belongs to the downstream domain consumer. */
  commonOpinion: unknown[];
  conflicts: unknown[];
  pending: string[];
}
