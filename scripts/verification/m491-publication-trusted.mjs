export const TRUSTED={
  "schema": "M491-trusted-publication-policy/1",
  "publications": [
    {
      "sourceId": "naming-character-meanings-v7.1-fixed",
      "publicationId": "m476-approved-character-notes",
      "sourceSha256": "870846c44faa368c913536467cf62b60cf5a96d43256f796644856dc1ae007a4",
      "ruleVersion": "naming-editorial-7.1.0",
      "rows": 60,
      "scope": "per-character-position-project-explanation-only",
      "dependencyClasses": [
        "original-material-complete",
        "project-character-candidate-only"
      ],
      "requiredFiles": [
        "patchcheck/data/m460-lexical/naming-character-meanings-m393-NOTICE.md",
        "patchcheck/data/m460-lexical/naming-character-meanings-m393-admission.json",
        "patchcheck/data/m460-lexical/naming-character-meanings-m393-manifest.json",
        "patchcheck/data/m460-lexical/naming-character-meanings-m393-profile.json",
        "patchcheck/data/m460-lexical/naming-character-meanings-m393-source-lock.json",
        "patchcheck/data/m460-lexical/raw/naming-character-meanings-m393-subset.json",
        "patchcheck/data/m460-lexical/reviews/M412.json",
        "patchcheck/data/m460-lexical/reviews/M418-r3.json",
        "patchcheck/data/naming-character-meanings-v71-m460-b02-NOTICE.md",
        "patchcheck/data/naming-character-meanings-v71-m460-b02-admission.json",
        "patchcheck/data/naming-character-meanings-v71-m460-b02-manifest.json",
        "patchcheck/data/naming-character-meanings-v71-m460-b02-profile.json",
        "patchcheck/data/naming-character-meanings-v71-m460-b02-root-decision.json",
        "patchcheck/data/naming-character-meanings-v71-m460-b02-source-lock.json",
        "patchcheck/data/raw/naming-character-meanings-v71-m460-b02-subset.json",
        "stage/data/dataset-v6.json",
        "stage/data/knowledge-v6.sqlite",
        "stage/data/naming-character-meanings-v7.1-NOTICE.md",
        "stage/data/naming-character-meanings-v7.1-admission.json",
        "stage/data/naming-character-meanings-v7.1-profile.json",
        "stage/data/naming-editorial-dictionary-v6-source-lock.json",
        "stage/data/naming-editorial-meanings-v7-source-lock.json",
        "stage/data/naming-editorial-v4.json",
        "stage/data/naming-editorial-v5.json",
        "stage/data/naming-editorial-v6.json",
        "stage/data/naming-editorial-v7-NOTICE.md",
        "stage/data/naming-editorial-v7.json",
        "stage/data/naming-editorial.json",
        "stage/data/raw/CC-BY-ND-3.0-TW.html",
        "stage/data/raw/kSimplifiedVariant.txt",
        "stage/data/raw/kTraditionalVariant.txt",
        "stage/data/raw/moe-README.md",
        "stage/data/raw/moe-revised.json.gz",
        "stage/data/raw/naming-character-meanings-v7.1-subset.json",
        "stage/data/raw/naming-citations-v7-errata-r2.json",
        "stage/data/raw/naming-citations-v7-review.json",
        "stage/data/raw/naming-meanings-v7-errata-r1.json",
        "stage/data/raw/naming-meanings-v7-review.json",
        "stage/data/raw/poetry-LICENSE",
        "stage/data/raw/shijing.json",
        "stage/data/raw/unicode-LICENSE",
        "stage/data/raw/zhouyi-LICENSE",
        "stage/data/raw/zhouyi.tar.gz",
        "stage/data/source-lock.json"
      ],
      "requiredFileCount": 44,
      "licenseRefs": [
        "CC-BY-ND-3.0-TW",
        "Unicode-data-license",
        "publication-declared-license"
      ]
    },
    {
      "sourceId": "naming-character-meanings-m393-candidate",
      "publicationId": "m393-lexical-sidecar-candidate",
      "sourceSha256": null,
      "ruleVersion": "naming-character-meanings-candidate/M393.1",
      "rows": 20,
      "scope": "per-character-project-explanation-only",
      "dependencyClasses": [
        "candidate-only"
      ],
      "requiredFiles": [
        "data/m460-lexical/naming-character-meanings-m393-NOTICE.md",
        "data/m460-lexical/naming-character-meanings-m393-admission.json",
        "data/m460-lexical/naming-character-meanings-m393-manifest.json",
        "data/m460-lexical/naming-character-meanings-m393-profile.json",
        "data/m460-lexical/naming-character-meanings-m393-source-lock.json",
        "data/m460-lexical/raw/naming-character-meanings-m393-subset.json",
        "data/m460-lexical/reviews/M412.json",
        "data/m460-lexical/reviews/M418-r3.json",
        "src/main/m393-meaning-candidate-pins.mjs",
        "src/main/m393-meaning-candidate.mjs"
      ],
      "requiredFileCount": 10,
      "licenseRefs": [
        "candidate-publication-declared-license"
      ]
    }
  ],
  "licenseEvidence": {
    "m476": [
      "data/raw/CC-BY-ND-3.0-TW.html",
      "data/raw/unicode-LICENSE",
      "data/raw/poetry-LICENSE",
      "data/raw/shijing.json",
      "data/raw/zhouyi-LICENSE"
    ],
    "m393": [
      "data/m460-lexical/naming-character-meanings-m393-NOTICE.md",
      "data/m460-lexical/naming-character-meanings-m393-source-lock.json"
    ]
  },
  "duplicatePolicy": {
    "naming-character-meanings-v7.1-fixed": [
      "m476-approved-character-notes"
    ],
    "naming-character-meanings-m393-candidate": [
      "m393-lexical-sidecar-candidate"
    ]
  }
};

// Exact managed evidence and actual checkout runtime reader; original TRUSTED publication identities stay unchanged.
export const PUBLICATION_RUNTIME_POLICY={
  "schema": "M581-fixed-publication-runtime-reader/1",
  "inventory": {
    "file": "data/publication-lock-baseline.json",
    "sha256": "d1165890480135ec19bc8a765aea29b34b5400931ecc58eafdf463462fe28f82",
    "bytes": 47988
  },
  "roots": {
    "file": "data/publication-roots.example.json",
    "sha256": "af3c0a4c860a806143452c21a5136c12c1db5bcd386990ee0486a8d167387260",
    "bytes": 83
  },
  "readerFile": "src/main/m393-meaning-candidate.mjs",
  "old": {
    "sha256": "cde83055510c06c30a8599146779c6d783285a6887e52cd3c6220b964a784e3b",
    "bytes": 18414
  },
  "current": {
    "sha256": "0e23b3e6c744446a07ebb7d96a19bc03da190859c9b1188260fa1833818948a7",
    "bytes": 19458
  },
  "receipt": {
    "file": "scripts/verification/publication-evidence/M541-reader-migration.json",
    "sha256": "3987a755d1cd49c909c8f22fb2a1834787ceb8a627dae64424abc0b83c58e3cf",
    "bytes": 2938
  },
  "review": {
    "file": "scripts/verification/publication-evidence/M518-source-review.json",
    "sha256": "60eaeffc393175305ca41b1fd67aa8a213cfc60798d8013411e55e02da53e56c",
    "bytes": 4750
  },
  "licenseEvidence": [
    {
      "file": "fixtures/publication-roots/m476/data/raw/CC-BY-ND-3.0-TW.html",
      "sha256": "04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f",
      "bytes": 31775
    },
    {
      "file": "fixtures/publication-roots/m476/data/raw/unicode-LICENSE",
      "sha256": "fe5c62b543e287981db198f2acfa0ca732d12591a1024536dc8fd85dacd77104",
      "bytes": 2033
    },
    {
      "file": "fixtures/publication-roots/m476/data/raw/poetry-LICENSE",
      "sha256": "c195319aeaa3ffcbe16aa5d26eec19eae5a42f84337dd2b3dc3c9d5ccbbd6507",
      "bytes": 1076
    },
    {
      "file": "fixtures/publication-roots/m476/data/raw/shijing.json",
      "sha256": "3c7ca54d59424542ada99adfcc85420287fbbd5c8a511e9baf705cb2b04051e7",
      "bytes": 156972
    },
    {
      "file": "fixtures/publication-roots/m476/data/raw/zhouyi-LICENSE",
      "sha256": "0506d67239c89a3d3b14e253ed29e20e2e9259b41c4b32031eab5ac22ed2811f",
      "bytes": 1070
    },
    {
      "file": "fixtures/publication-roots/m393/data/m460-lexical/naming-character-meanings-m393-NOTICE.md",
      "sha256": "d1f21e9ffc7e207c816486ed74cb551b48a4c1ba46c49020f891a7cd290893c0",
      "bytes": 1396
    },
    {
      "file": "fixtures/publication-roots/m393/data/m460-lexical/naming-character-meanings-m393-source-lock.json",
      "sha256": "f2f42e2370e4dce0b1701375764f5254493d0062c102bafe317129b84c017e76",
      "bytes": 2727
    }
  ]
};

const freezePublicationPolicy=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freezePublicationPolicy(item);Object.freeze(value);}return value;};
freezePublicationPolicy(TRUSTED);
freezePublicationPolicy(PUBLICATION_RUNTIME_POLICY);
