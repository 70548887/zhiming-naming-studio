# Explicit environment test partition

This candidate is based on `289228dd9d8b4f2dd24ff57f7314dcb98d51f709`. Default `npm test` excludes declared external-material tests and prints that exclusion is **not execution, a passing test or acceptance**. File discovery is not a full test run. The remaining default suite has not been fully executed or certified on a clean checkout by this change.

The partition catalog starts from fixed `57acb6d5c3d8fcd002ea028890aa227dbbd87ede`. Only 13 of its 36 named files exist at this base: 11 legacy external tests and two fixed C2 tests. The 23 absent baseline native tests are explicit integration dependencies, never copied from the Store branch or counted as installed. The existing Windows physical-path test is grouped separately. Every selected group requires its declared test paths to be ordinary files; missing files, same-name directories and symlinks fail before collection.

A separate follow-up commit records six concrete dependencies added at this root base: `m924-semantic-family` actually reads old fixed M752-family publications; `m925-cultural-source-forgery` needs its sealed NSBK and otherwise conditionally skips; `m924-zero-adoption-binding` and three M928/M936/M950 Electron tests default to absolute task evidence directories. They are explicitly grouped rather than importing or writing to those locations during default collection. Final counts are generated from the manifest: 20 present environment files and 26 declared integration dependencies at this candidate. These counts are file paths, not executed cases. This is a bounded inventory of known external prerequisites, not a claim that every remaining default test is operating-system independent.

The future joint actual file is exactly `tests/m937-candidate2-semantic-composition.test.ts`, supplied by fixed layout `31b79233e652b03a194c7550c1f93de334c22421` over its independently owned `aeac` source. The root combines that source/layout before this configuration. The portable companion `tests/m937-candidate2-semantic-input.test.ts` is never excluded. A regular file proves presence only; this preflight does not certify that file's content or its business results.

## Explicit use

```powershell
$env:NAMING_ENVIRONMENT_TEST_GROUP='c2-fixed-core-environment'
$env:CANDIDATE2_ACCEPTANCE_M873_DIR='<absolute physical fixed M873 directory>'
npm run test:environment -- tests/m924-candidate2-owned-mechanics.test.ts
```

C2 preflight requires the material root and four original files: `compiled-r2/consumer.cjs`, `runs/run-3/consumer-execution-manifest.json`, `runs/run-3/persisted-envelope.json` and `runs/run-3/source-blobs-managed.sqlite`. This checks file shape only. The existing fixture authenticates all original fixed hashes and execution/source boundaries. Its sole adaptation is the already-reviewed material-root environment variable; no hash, source pin or validation rule changes.

`c2-native-environment` remains unavailable until its declared native test files are integrated. `legacy-external-environment` requires the sealed M919 fixture directory (`M919_REPLAY_FIXTURE_DIR`) and sets its existing `M919_REPLAY_REQUIRE_FIXTURE=1`; no missing-fixture skip can become acceptance. Other older fixed external directories in the manifest remain prerequisites of their original tests.

`windows-path-environment` requires Windows and an explicit absolute existing ordinary directory in `M938_PATH_TEST_ROOT`. Run it with a dedicated task directory. Selecting that group does not run its cases merely by importing the config, and the default suite never counts the original test's conditional skips as acceptance.

`cultural-fixed-source-environment` requires `M925_REAL_RESTORE_CASE` and its regular `fixture/synthetic-three-revisions.nsbk`. `explicit-output-environment` requires `M924_ZERO_ADOPTION_TEST_EVIDENCE_DIR`. The three `desktop-runtime-environment` tests require their existing absolute evidence directories (`M928_TEST_EVIDENCE_DIR`, `M936_TEST_EVIDENCE_DIR`, `M950_TEST_EVIDENCE_DIR`) and their original Electron runtime prerequisites. No test module is changed to accept fabricated results, and preflight does not launch Electron. Other repository-contained DOM tests retain the baseline's discovery behavior; full default execution and broader cross-platform classification remain unverified.

## Scope and provenance

- The portable exclusion pattern and explicit command derive from fixed `57acb6d`; the actual-file/joint/Windows contract derives from fixed `d946e4d`; regular-file rejection is the accepted final `0b9b499` behavior.
- The shared `scripts/test-environment-partition.mjs` is a pure filesystem/configuration adaptation of those rules for this base. Its tests create small local prerequisite-shape fixtures and import configuration, without importing actual C2 test modules.
- The material-directory line in `tests/helpers/m921-generation-fixture.ts` derives from fixed `57acb6d`. The rest of that fixture is untouched.
- Reviewed record checker `9624fef` and source/PID sampling helper `3c6b5f6` are not dependencies of configuration or file discovery. They are not copied, executed or implicitly approved here. Their partial-evidence limits remain unchanged.

No Store, source data, core algorithm, runtime publication, scoring, source admission or production interface is changed. No test timeout, 60-second Store scan budget, 160-second watchdog or 15-second product target is increased. Build/package/CI do not acquire an automatic acceptance gate from this explicit runner. Native execution, operating-system timeout cleanup and release approval remain separate work.

The fixed `d946e4d` shared-recovery test path is also retained as an absent native integration contract, without copying that test or its Store dependencies. Any additional native test introduced after those fixed catalogs requires its own explicit partition review; this candidate does not import later unreviewed parent manifests wholesale.

## M970 correction: second actual replay file and explicit CPU-window flags

The fixed M968 replay file is also an environment dependency: `tests/m937-semantic-composition-replay.test.ts` from `6a50a47a98b013d740e77dc8379ae1b9073c5e3d` (original `2b83842b1ce858ddf9c5ac38bcc433f63e82c6ff`). Both this replay file and `tests/m937-candidate2-semantic-composition.test.ts` are excluded from default discovery, while `tests/m937-candidate2-semantic-input.test.ts` stays portable. The original a5b571 candidate omitted the replay path; its original evidence remains unchanged.

Selecting the fixed-core environment group requires `M937_ACTUAL_CPU_WINDOW=1` for actual composition and `M937_REPLAY_CPU_WINDOW=1` for actual replay, in addition to their regular files and fixed materials. Missing, zero or other values fail preflight. Configuration never sets either flag: an operator must have an explicitly allocated business-test window before setting it. File discovery or config import does not execute these cases or approve that allocation. The replay test also requires its original sealed record files and hash checks, which remain in the owned test and are not fabricated by configuration.
