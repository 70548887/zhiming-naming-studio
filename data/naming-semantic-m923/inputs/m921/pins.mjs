// Fixed build-owned source and decision roots. Never replace from caller manifests.
const freeze = value => { if(value && typeof value === "object") { for(const item of Object.values(value)) freeze(item); Object.freeze(value); } return value; };
export const INPUT_PINS = freeze({
  "inputs/m910-selection.json": {
    "sha256": "6019bf2c7bc170af093c5bf6458e798968f63a6c03dd09b24dc35abb6fd4948f",
    "bytes": 23959,
    "origin": "D:/Codex-NamingStudio-Evidence/m910-naming-data-batch/selection.json"
  },
  "inputs/m910-source-subset.json": {
    "sha256": "e9e096c203b8ae640fe9ae64f91ab25bbbe9c8fd62cf6ce36c8a8224dea17893",
    "bytes": 45689,
    "origin": "D:/Codex-NamingStudio-Evidence/m910-naming-data-batch/source-subset.json"
  },
  "inputs/m910-manifest.json": {
    "sha256": "a345d11b3f34cb5d4bc8b0a6de8453a2ff0cd68e559af5f0f48a215380da3e8c",
    "bytes": 1262,
    "origin": "D:/Codex-NamingStudio-Evidence/m910-naming-data-batch/manifest.json"
  },
  "inputs/m910-source-lock.json": {
    "sha256": "fec799c8ac7848e9eb0360207931862a3a06eda7bcf7570282daef22fd1d7307",
    "bytes": 5304,
    "origin": "D:/Codex-NamingStudio-Evidence/m910-naming-data-batch/source-lock.json"
  },
  "inputs/m914-selection.json": {
    "sha256": "b7e6d8bbf2ca13c086f781763e6b74ffb344f5585561be43b1a5705871e7bdf5",
    "bytes": 66093,
    "origin": "D:/Codex-NamingStudio-Evidence/m914-naming-data/work/candidates/m914-naming-data/selection.json"
  },
  "inputs/m914-source-subset.json": {
    "sha256": "8d76e27ad008ed92747ac19aa04563233a5479f215ba03743eff63d654c958ff",
    "bytes": 106824,
    "origin": "D:/Codex-NamingStudio-Evidence/m914-naming-data/work/candidates/m914-naming-data/source-subset.json"
  },
  "inputs/m914-manifest.json": {
    "sha256": "1f599fb1dd014448674d39a95c1bc5c62372c1d80b9bf73de1d467ac9e00f6e8",
    "bytes": 1261,
    "origin": "D:/Codex-NamingStudio-Evidence/m914-naming-data/work/candidates/m914-naming-data/manifest.json"
  },
  "inputs/m914-source-lock.json": {
    "sha256": "93cbee88e96b9a4e95cc0c2d2e19f0288d85040cce53ce45c7c1ed8b7864ee48",
    "bytes": 2199,
    "origin": "D:/Codex-NamingStudio-Evidence/m914-naming-data/work/candidates/m914-naming-data/source-lock.json"
  },
  "inputs/m916-review-input.json": {
    "sha256": "4c7f842b268943eab7d7207b5df2941ada3286d1558ad4eebc846830ce717291",
    "bytes": 101050,
    "origin": "D:/Codex-NamingStudio-Evidence/m916-meaning-semantic-review/review-input.json"
  },
  "inputs/m916-semantic-review.json": {
    "sha256": "55c0a6f9fd33b61e4a219da6d30275b9001e8bf519a33daf525ff269006555cf",
    "bytes": 101720,
    "origin": "D:/Codex-NamingStudio-Evidence/m916-meaning-semantic-review/meaning-semantic-review.json"
  },
  "inputs/m916-manifest.json": {
    "sha256": "d1c357985dcda8d74b063a05b2e06512a882f40ca573bb5a86db558a95cca2b1",
    "bytes": 1896,
    "origin": "D:/Codex-NamingStudio-Evidence/m916-meaning-semantic-review/manifest.json"
  },
  "inputs/m917-decision-contract.json": {
    "sha256": "99e649b8db0ccb8ab2dd979807f05cf1991e836bd7b211e161ee13a3655f2bed",
    "bytes": 12087,
    "origin": "D:/Codex-NamingStudio-Evidence/m917-semantic-admission-decision/r2/decision-contract.json"
  },
  "inputs/m917-rows.jsonl": {
    "sha256": "20feda04fc9387b6fc20de641e4b38dc52a805236ebd96a7f80d2f5ba80ea17e",
    "bytes": 145675,
    "origin": "D:/Codex-NamingStudio-Evidence/m917-semantic-admission-decision/r2/semantic-admission-contract.jsonl"
  }
});
export const SOURCE_PINS = freeze({
  "data/dataset-v6.json": {
    "sha256": "3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728",
    "bytes": 1563457
  },
  "data/knowledge-v6.sqlite": {
    "sha256": "1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b",
    "bytes": 1454080
  },
  "data/raw/moe-revised.json.gz": {
    "sha256": "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
    "bytes": 20310688
  },
  "data/raw/kTraditionalVariant.txt": {
    "sha256": "4eca6285d45070548e6e6c06e4b48c3ca6866d4380e8cb980c512f5d1fc71895",
    "bytes": 86288
  },
  "data/raw/kSimplifiedVariant.txt": {
    "sha256": "a7f0c9dbbca85cffd90517fa6ea9be97d2e6f811328a59b6b303d58a418ac9be",
    "bytes": 88425
  },
  "data/raw/moe-README.md": {
    "sha256": "a93321d9381bc1cf34b4ad844f71607fa748c86c0b228ae37d46720d6a659cb2",
    "bytes": 1214
  },
  "data/raw/CC-BY-ND-3.0-TW.html": {
    "sha256": "04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f",
    "bytes": 31775
  },
  "data/raw/unicode-LICENSE": {
    "sha256": "fe5c62b543e287981db198f2acfa0ca732d12591a1024536dc8fd85dacd77104",
    "bytes": 2033
  },
  "src/shared/naming-semantic-admission-v72.ts": {
    "sha256": "d36c063bb549c354627e37858f62aa8dd8263d3c47566882581b2817ff9fde15",
    "bytes": 7470
  },
  "src/domain/naming-semantic-admission-v72.ts": {
    "sha256": "26eeb2959d9ff815c625a2da6c0c8524ecd381f6d00cc3abf50ac974f9e2e808",
    "bytes": 15942
  }
});
