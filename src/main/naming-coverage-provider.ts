import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {CharacterEntry, Citation, KnowledgeEntry, SourceRecord} from '../shared/types';
import type {CoverageDto, CoverageFailure, CoverageLoaderSets, CoverageSourceResult, CoverageWordsInput} from '../shared/naming-coverage';
import type {NamingCoverageApi} from '../shared/naming-coverage-api';
import type {MeaningContextPublication, MeaningContextRequest, MeaningContextResult} from '../domain/meaning-context-next.mjs';

export interface NamingCoverageCurrentDataset {
  readonly version: string;
  readonly characters: readonly CharacterEntry[];
  readonly citations: readonly Citation[];
  readonly knowledge: readonly KnowledgeEntry[];
  readonly sources: readonly SourceRecord[];
}
/** A trusted owning-service view; this is never an RPC request shape. */
export interface NamingCoverageStoreView {
  readonly dataDir: string;
  readonly dataset: NamingCoverageCurrentDataset;
}
class CoverageUnavailable extends Error {
  constructor(readonly reason: CoverageFailure) { super(reason); }
}
function need(ok: unknown, reason: CoverageFailure = 'invalid-data'): asserts ok {
  if (!ok) throw new CoverageUnavailable(reason);
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const unavailable = (reason: CoverageFailure): CoverageDto => Object.freeze({schema: 'naming-coverage/1', status: 'unavailable', reason,
  message: '覆盖资料暂不可用，请在资料核验完成后重试；当前不显示完整覆盖数量。'});

/** Creation performs no read or loader work. Each explicit parameterless request
 * authenticates fresh source bytes and uses the owner's current Store.dataset.
 * Module imports may be reused; no source verdict or result DTO is cached. */
export function createNamingCoverageProvider(getCurrentStore: () => NamingCoverageStoreView): Readonly<NamingCoverageApi> {
  return Object.freeze({
    async getNamingCoverage(): Promise<CoverageDto> {
      if (arguments.length !== 0) return unavailable('invalid-data');
      try {
        const [editorial, semantics, review, m460, contextLoader, b04Loader, elementLoader, elementConstants, factory] = await Promise.all([
          import('./naming-editorial-v7-data'), import('../domain/naming-semantics-v6'), import('../domain/naming-review-v7.mjs'),
          import('./m460-publication-data.mjs'), import('./meaning-context-data'), import('../../scripts/meaning-context-m460-b04-candidate.mjs'),
          import('../../data/element-object/load-verified-element-package.mjs'), import('../shared/element-assessment'), import('../domain/naming-coverage')
        ]);
        const owner = getCurrentStore();
        need(owner && typeof owner.dataDir === 'string' && owner.dataDir.length > 0, 'missing-source');
        const directory = owner.dataDir, actual = owner.dataset;
        review.assertPlainJson(actual);
        need(actual && typeof actual.version === 'string', 'source-mismatch');

        const v7 = editorial.loadNamingEditorialV7Data(directory);
        const pins = editorial.NAMING_EDITORIAL_V7_PUBLICATION_PINS;
        const readVerified = (relative: string, expected: string): unknown => {
          const bytes = readFileSync(join(directory, relative));
          need(sha(bytes) === expected, 'source-mismatch');
          const value: unknown = JSON.parse(bytes.toString('utf8'));
          review.assertPlainJson(value);
          return value;
        };
        const table = readVerified(pins.tableFile, pins.tableSha256) as import('../domain/naming-review-v7.mjs').SupplementalReviewTable;
        const lock = readVerified(pins.lockFile, pins.lockSha256) as {sources: {fileHashes: Record<string, string>}[]};
        const fixed = readVerified('dataset-v6.json', table.base.datasetJsonSha256) as {
          characters: CharacterEntry[]; citations: Citation[]; knowledge: KnowledgeEntry[]; sources: SourceRecord[];
        };
        need(actual.version === table.base.activeVersion && table.base.activeVersion === table.base.knowledgePackSha256.slice(0, 12), 'source-mismatch');
        for (const key of ['characters', 'citations', 'knowledge', 'sources'] as const)
          need(isDeepStrictEqual(actual[key], fixed[key]), 'source-mismatch');

        const baseLockSha = lock.sources[0].fileHashes['data/naming-editorial-dictionary-v6-source-lock.json'];
        need(typeof baseLockSha === 'string', 'missing-source');
        const baseSource = (readVerified('naming-editorial-dictionary-v6-source-lock.json', baseLockSha) as {sources: SourceRecord[]}).sources[0];
        // Direct optional-publication loader is required. Undefined never falls back to old40.
        const standalone = m460.loadM460V71Publication(directory);
        need(standalone, 'missing-source');
        need(standalone.source.sha256 === standalone.identity.sourceSha256, 'source-mismatch');
        const contexts = contextLoader.loadMeaningContextData(directory);
        const b04 = b04Loader.loadVerifiedB04ContextCandidate(directory, directory);
        need(b04.candidateOnly === true && b04.activation === 'off' && b04.productionApproved === false && b04.formalCoverageAdded === 0);
        const imagery = elementLoader.loadVerifiedElementPackage(join(directory, 'element-object'), elementConstants.ELEMENT_ASSESSMENT_LOCK, resolve(directory, '..'));
        need(imagery.defaultActivation === 'off' && Array.isArray(imagery.defaultEffectiveElements) && imagery.defaultEffectiveElements.length === 0);
        const traditional = imagery.traditionalAssessment as {status?: unknown};
        need(traditional && traditional.status === 'pending');

        const pack = {packSha256: table.base.knowledgePackSha256, activeVersion: table.base.activeVersion};
        need(contexts.pins.packSha256 === pack.packSha256 && contexts.pins.activeVersion === pack.activeVersion, 'source-mismatch');
        const lookup = review.createNamingReviewLookup(table);
        const loaded = <T,>(source: {id: string; sha256: string}, value: T): CoverageSourceResult<T> => ({status: 'available',
          source: {sourceId: source.id, sha256: source.sha256, packSha256: pack.packSha256, readingScope: 'dataset-default'}, value});
        const wordCases = (publication: MeaningContextPublication, query: (request: MeaningContextRequest) => MeaningContextResult): CoverageWordsInput => {
          need(publication.policy.automaticSemanticCreditAllowed === false && publication.policy.independentCharacterMeaningApproved === false && publication.policy.wholeNameApproved === false);
          const cases = publication.cases.map(row => {
            const choice = {usage: row.selection.usage, caseId: row.selection.caseId, senseId: row.selection.senseId, contextKey: row.selection.contextKey};
            const result = query({char: row.char, givenName: row.givenName, characters: row.characterBindings.map(binding => binding.character), confirmedReadings: row.confirmedReadings, choice});
            need(result.status === 'explanation-ready' && result.independentCharacterMeaningApproved === false && result.wholeNameApproved === false && result.automaticSemanticCreditAllowed === false && result.scoreDelta === 0);
            return {caseId: row.caseId, targetCharacter: row.char, givenName: row.givenName};
          });
          return {cases, wholeWordOnly: true, explicitChoiceRequired: true, confirmedReadingsRequired: true, automaticSemanticCreditAllowed: false, standalonePromotion: false};
        };
        // sourceLock is an existing actual verifier output; no caller source claims are accepted.
        const b04Lock = JSON.parse(readFileSync(join(directory, 'meaning-context-m460-b04-source-lock.json'), 'utf8')) as {sources: readonly SourceRecord[]};
        need(Array.isArray(b04Lock.sources) && b04Lock.sources.length === 1, 'source-mismatch');
        const b04Source = b04Lock.sources[0];
        const input: CoverageLoaderSets = {
          dataset: loaded(baseSource, {characters: actual.characters.map(row => row.char), datasetSha256: table.base.datasetJsonSha256}),
          baseMeanings: loaded(baseSource, actual.characters.filter(row => semantics.reviewedNamingSense(row)).map(row => row.char)),
          supplementalAutomatic: loaded(v7.sources[0], actual.characters.filter(row => lookup.lookupMeaning(row, pack)).map(row => row.char)),
          standaloneOnRequest: loaded(standalone.source, {characters: actual.characters.filter(row => standalone.lookup.characterExplanation(row, pack).status === 'character-explanations-ready').map(row => row.char),
            publication: 'm460-b02', wholeNameAssessment: 'not-assessed', automaticNameRecommendation: false, automaticSemanticCreditAllowed: false, scoreDelta: 0}),
          conditionalWords: loaded(contexts.source, wordCases(contexts.publication, request => contexts.lookup.lookup(request, pack))),
          b04ReadOnlyOff: loaded(b04Source, {...wordCases(b04.publication, request => b04Loader.queryB04ContextCandidate(b04, request, pack)),
            activation: 'off', candidateOnly: true, productionApproved: false, formalCoverageAdded: 0}),
          originalElements: loaded(baseSource, {labeledCharacters: actual.characters.filter(row => row.elements.length > 0).map(row => row.char), unknownCharacters: actual.characters.filter(row => row.elements.length === 0).map(row => row.char)}),
          imageryCandidates: loaded({id: elementConstants.ELEMENT_ASSESSMENT_SOURCE_ID, sha256: elementConstants.ELEMENT_ASSESSMENT_LOCK}, {
            candidateCharacters: imagery.rows.filter(row => row.evidenceBySense.length > 0).map(row => row.char), unresolvedCharacters: imagery.rows.filter(row => row.evidenceBySense.length === 0).map(row => row.char),
            activation: 'off', defaultEffectiveElements: [], traditionalAssessment: 'pending'})
        };
        return factory.createNamingCoverageDto(input);
      } catch (error) {
        const code = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'code') : undefined;
        return unavailable(error instanceof CoverageUnavailable ? error.reason : code && Object.hasOwn(code, 'value') && code.value === 'ENOENT' ? 'missing-source' : 'invalid-data');
      }
    }
  });
}
