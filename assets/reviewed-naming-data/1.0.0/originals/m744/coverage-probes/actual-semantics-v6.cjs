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

// src/domain/naming-semantics-v6.ts
var naming_semantics_v6_exports = {};
__export(naming_semantics_v6_exports, {
  createCitationReadingGateV6: () => createCitationReadingGateV6,
  currentCharacterWarning: () => currentCharacterWarning2,
  hasBaselinePronunciation: () => hasBaselinePronunciation2,
  hasFixedDefaultDictionaryIdentity: () => hasFixedDefaultDictionaryIdentity,
  hasReviewedNaturalPair: () => hasReviewedNaturalPair2,
  hasReviewedProjectReading: () => hasReviewedProjectReading2,
  matchesReviewedReading: () => matchesReviewedReading2,
  readLiveCitationReadingDependenciesV6: () => readLiveCitationReadingDependenciesV6,
  reviewedNamingCombination: () => reviewedNamingCombination2,
  reviewedNamingSense: () => reviewedNamingSense2,
  reviewedNamingSenseConcept: () => reviewedNamingSenseConcept,
  semanticTagsForReading: () => semanticTagsForReading2
});
module.exports = __toCommonJS(naming_semantics_v6_exports);

// data/naming-editorial-v6.json
var naming_editorial_v6_default = {
  version: "naming-editorial-6.0.0",
  dataVersion: "2026.10.20.2",
  base: {
    version: "naming-editorial-5.0.0",
    sourceId: "naming-editorial-names-v5-fixed",
    sha256: "bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8",
    sourceLockSha256: "e277c927f24f059e9be1fede52be6be327fb287c27276663711b5834d10d4981",
    dataVersion: "2026.10.20.1",
    datasetSha256: "0799bd0b5088bb99f3ab34ac02340fbcfc5a8a4072cee46caa41ab963b1d56af",
    knowledgeSqliteSha256: "21bcc3b2e60f4051bdb220c126db6121259ead36947109974b01cc386d87c1df"
  },
  newDataset: {
    file: "data/dataset-v6.json",
    sha256: "3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728",
    sqliteFile: "data/knowledge-v6.sqlite",
    sqliteSha256: "1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b",
    version: "2026.10.20.2"
  },
  policy: "Nine exact original-MOE-word corrections only. All779 characters/default pronunciations/Unicode variants are retained; other770 records, all40 old rules44 names and27 supplementary names are unchanged. Corrected dictionary identity does not confer project semantic credit. Only2 explicitly labeled seasonal metaphors and\u81F4\u8FDCnatural expression migrate.\u6C88ch\xE9nis an explicitly labeled dictionary cross-reference, not an entity definition or reviewed naming sense.",
  correctedCharacterProjectCredit: "explicit-use-only",
  characterOverrides: [
    {
      char: "\u624D",
      before: {
        char: "\u624D",
        pinyin: "c\xE1i",
        tone: 2,
        meaning: "\u65B9\u3001\u59CB\u3001\u525B\u525B\u3002\uFF1B\u50C5\u3001\u53EA\u3002",
        traditional: "\u7E94",
        strokes: 3,
        radical: "\u624B",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u7E94\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u624D\u3001\u7E94\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "c\xE1i",
            tone: 2,
            meanings: [
              "\u65B9\u3001\u59CB\u3001\u525B\u525B\u3002",
              "\u50C5\u3001\u53EA\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u7E94"
          }
        ],
        polyphonic: false,
        variants: [
          "\u624D",
          "\u7E94"
        ]
      },
      after: {
        char: "\u624D",
        pinyin: "c\xE1i",
        tone: 2,
        meaning: "\u5929\u8CE6\u7684\u80FD\u529B\u3001\u7A1F\u6027\u3002\uFF1B\u529B\u91CF\u3001\u667A\u6167\u3002\uFF1B\u6709\u624D\u80FD\u3001\u667A\u6167\u7684\u4EBA\u3002",
        traditional: "\u624D",
        strokes: 3,
        radical: "\u624B",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u624D\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "c\xE1i",
            tone: 2,
            meanings: [
              "\u5929\u8CE6\u7684\u80FD\u529B\u3001\u7A1F\u6027\u3002",
              "\u529B\u91CF\u3001\u667A\u6167\u3002",
              "\u6709\u624D\u80FD\u3001\u667A\u6167\u7684\u4EBA\u3002",
              "\u8AF7\u7A31\u67D0\u985E\u7684\u4EBA\u3002",
              "\u59D3\u3002\u5982\u660E\u4EE3\u6709\u624D\u5BEC\u3002",
              "\u65B9\u3001\u59CB\u3002",
              "\u50C5\u3002",
              "\u8868\u793A\u5F37\u8ABF\u7684\u8A9E\u6C23\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u624D"
          }
        ],
        polyphonic: false,
        variants: [
          "\u624D",
          "\u7E94"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u7E94\u7684\u65F6\u95F4/\u9650\u5236\u526F\u8BCD\uFF1B\u6539\u9009\u672C\u5B57\u624D\u7684\u5B8C\u6574\u539F\u6761\uFF0C\u9ED8\u8BA4c\xE1i\u4E0D\u53D8\uFF0C\u4E0D\u6CDB\u6388\u624D\u534E\u7B49\u9879\u76EE\u6807\u7B7E\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u7E94",
        beforeRawEntryIndex: 114611,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3118\u311E\u02CA",
              definitions: [
                {
                  def: "\u65B9\u3001\u59CB\u3001\u525B\u525B\u3002",
                  quote: [
                    "\u300A\u6F22\u66F8\uFF0E\u5377\u56DB\u4E5D\uFF0E\u9F02\u932F\u50B3\u300B\uFF1A\u300C\u6551\u4E4B\uFF0C\u5C11\u767C\u5247\u4E0D\u8DB3\uFF0C\u591A\u767C\uFF0C\u9060\u7E23\u7E94\u81F3\uFF0C\u5247\u80E1\u53C8\u5DF2\u53BB\u3002\u300D",
                    "\u5510\uFF0E\u9B5A\u7384\u6A5F\u3008\u95A8\u6028\u3009\u8A69\uFF1A\u300C\u5225\u65E5\u5357\u9D3B\u7E94\u5317\u53BB\uFF0C\u4ECA\u671D\u5317\u96C1\u53C8\u5357\u98DB\u3002\u300D"
                  ],
                  type: "\u526F"
                },
                {
                  def: "\u50C5\u3001\u53EA\u3002",
                  quote: [
                    "\u300A\u6F22\u66F8\uFF0E\u5377\u4E94\u4E00\uFF0E\u8CC8\u5C71\u50B3\u300B\uFF1A\u300C\u7136\u8EAB\u6B7B\u7E94\u6578\u6708\u8033\uFF0C\u5929\u4E0B\u56DB\u9762\u800C\u653B\u4E4B\uFF0C\u5B97\u5EDF\u6EC5 \u7D55\u77E3\u3002\u300D",
                    "\u5143\uFF0E\u95DC\u6F22\u537F\u300A\u7AC7\u5A25\u51A4\uFF0E\u7B2C\u56DB\u6298\u300B\uFF1A\u300C\u81F3\u5341\u4E03\u6B72\u8207\u592B\u914D\u5408\uFF0C\u7E94\u5F97\u5169\u5E74\uFF0C\u4E0D\u5E78\u5152\u592B\u4EA1\u5316\u3002\u300D"
                  ],
                  type: "\u526F"
                }
              ],
              pinyin: "c\xE1i"
            }
          ],
          non_radical_stroke_count: 17,
          radical: "\u7CF8",
          stroke_count: 23,
          title: "\u7E94"
        },
        afterRawEntryIndex: 58303,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3118\u311E\u02CA",
              definitions: [
                {
                  def: "\u5929\u8CE6\u7684\u80FD\u529B\u3001\u7A1F\u6027\u3002",
                  quote: [
                    "\u300A\u5B5F\u5B50\uFF0E\u544A\u5B50\u4E0A\u300B\uFF1A\u300C\u5BCC\u6B72\u5B50\u5F1F\u591A\u8CF4\uFF0C\u51F6\u6B72\u5B50\u5F1F\u591A\u66B4\uFF0C\u975E\u5929\u4E4B\u964D\u624D\u723E\u6B8A\u4E5F\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u529B\u91CF\u3001\u667A\u6167\u3002",
                  link: [
                    "\u901A\u300C\u6750\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8A69\u7D93\uFF0E\u9B6F\u980C\uFF0E\u99C9\u300B\uFF1A\u300C\u601D\u7121\u671F\uFF0C\u601D\u99AC\u65AF\u624D\u3002\u300D",
                    "\u6F22\uFF0E\u738B\u5145\u300A\u8AD6\u8861\uFF0E\u5BE6\u77E5\u300B\uFF1A\u300C\u4EBA\u624D\u6709\u9AD8\u4E0B\uFF0C\u77E5\u7269\u7531\u5B78\uFF0C\u5B78\u4E4B\u4E43\u77E5\uFF0C\u4E0D\u554F\u4E0D\u8B58\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u6709\u624D\u80FD\u3001\u667A\u6167\u7684\u4EBA\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5929\u624D\u300D\u3001\u300C\u82F1\u624D\u300D\u3001\u300C\u5E79\u624D\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u5B5F\u5B50\uFF0E\u96E2\u5A41\u4E0B\u300B\uFF1A\u300C\u4E2D\u4E5F\u990A\u4E0D\u4E2D\uFF0C\u624D\u4E5F\u990A\u4E0D\u624D\u3002\u300D",
                    "\u300A\u79AE\u8A18\uFF0E\u6587\u738B\u4E16\u5B50\u300B\uFF1A\u300C\u51E1\u8A9E\u4E8E\u90CA\u8005\uFF0C\u5FC5\u53D6\u8CE2\u6582\u624D\u7109\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u8AF7\u7A31\u67D0\u985E\u7684\u4EBA\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u8822\u624D\u300D\u3001\u300C\u5974\u624D\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u59D3\u3002\u5982\u660E\u4EE3\u6709\u624D\u5BEC\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u65B9\u3001\u59CB\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u525B\u624D\u300D\u3001\u300C\u65B9\u624D\u300D\u3001\u300C\u6232\u624D\u958B\u947C\u300D\u3001\u300C\u5446\u4E86\u534A\u664C\uFF0C\u6211\u624D\u6703\u610F\u904E\u4F86\u3002\u300D"
                  ],
                  quote: [
                    "\u300A\u6649\u66F8\uFF0E\u5377\u4E03\u4E5D\uFF0E\u8B1D\u5B89\u50B3\u300B\uFF1A\u300C\u624D\u5C0F\u5BCC\u8CB4\uFF0C\u4FBF\u8C6B\u4EBA\u5BB6\u4E8B\u3002\u300D"
                  ],
                  type: "\u526F"
                },
                {
                  def: "\u50C5\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u4ED6\u4ECA\u5E74\u624D\u4E94\u6B72\u3002\u300D\u3001\u300C\u6211\u8EAB\u4E0A\u624D\u5E36\u4E94\u584A\u9322\u3002\u300D"
                  ],
                  type: "\u526F"
                },
                {
                  def: "\u8868\u793A\u5F37\u8ABF\u7684\u8A9E\u6C23\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u6211\u624D\u4E0D\u5E79\u5462\uFF01\u300D\u3001\u300C\u4ED6\u54EA\u6709\u7D2F\uFF1F\u6211\u624D\u7D2F\u5462\uFF01\u300D"
                  ],
                  type: "\u526F"
                }
              ],
              pinyin: "c\xE1i"
            }
          ],
          non_radical_stroke_count: 0,
          radical: "\u624B",
          stroke_count: 3,
          title: "\u624D"
        }
      }
    },
    {
      char: "\u51AC",
      before: {
        char: "\u51AC",
        pinyin: "d\u014Dng",
        tone: 1,
        meaning: "\u5F62\u5BB9\u6572\u9F13\u3001\u6572\u9580\u7B49\u7684\u8072\u97F3\u3002",
        traditional: "\u9F15",
        strokes: 5,
        radical: "\u51AB",
        elements: [
          "\u6C34"
        ],
        elementBasis: "\u5B57\u5F62\uFF0F\u5B57\u4E49\u610F\u8C61\u53C2\u8003 v1\uFF08\u9879\u76EE\u81EA\u7F16\u6807\u7B7E\uFF0C\u975E\u552F\u4E00\u6C49\u5B57\u4E94\u884C\u5B9A\u8BBA\uFF1B\u4E0D\u5F97\u5F53\u4F5C\u5EB7\u7199\u7B14\u753B\u4E94\u884C\uFF09",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u9F15\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u51AC\u3001\u9F15\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "d\u014Dng",
            tone: 1,
            meanings: [
              "\u5F62\u5BB9\u6572\u9F13\u3001\u6572\u9580\u7B49\u7684\u8072\u97F3\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u9F15"
          }
        ],
        polyphonic: false,
        variants: [
          "\u51AC",
          "\u9F15"
        ]
      },
      after: {
        char: "\u51AC",
        pinyin: "d\u014Dng",
        tone: 1,
        meaning: "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u6700\u5F8C\u4E00\u5B63\u3002\u8FB2\u66C6\u6307\u7ACB\u51AC\u81F3\u7ACB\u6625\u7684\u6642\u671F\uFF0C\u4E00\u822C\u800C\u8A00\u6C23\u6EAB\u8F03\u4F4E\u3002\u82E5\u4EE5\u5317\u534A\u7403\u6C23\u5019\u8AD6\uFF0C\u6982\u6307\u5341\u4E00\u6708\u6216\u5341\u4E8C\u6708\u81F3\u7FCC\u5E74\u7684\u4E8C\u6708\u6216\u4E09\u6708\u671F\u9593\u3002\uFF1B\u95A9\u5357\u65B9\u8A00\u3002\u4EE3\u8868\u4E00\u5E74\u7684\u6642\u9593\u3002\uFF1B\u59D3\u3002\u5982\u4E09\u570B\u6642\u6709\u51AC\u9022\u3002",
        traditional: "\u51AC",
        strokes: 5,
        radical: "\u51AB",
        elements: [
          "\u6C34"
        ],
        elementBasis: "\u5B57\u5F62\uFF0F\u5B57\u4E49\u610F\u8C61\u53C2\u8003 v1\uFF08\u9879\u76EE\u81EA\u7F16\u6807\u7B7E\uFF0C\u975E\u552F\u4E00\u6C49\u5B57\u4E94\u884C\u5B9A\u8BBA\uFF1B\u4E0D\u5F97\u5F53\u4F5C\u5EB7\u7199\u7B14\u753B\u4E94\u884C\uFF09",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u51AC\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002 \u201C\u575A\u97E7\u201D\u4E3A\u9879\u76EE\u539F\u521B\u5B63\u8282\u7C7B\u6BD4\uFF0C\u975E\u5B57\u5178\u539F\u4E49\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "d\u014Dng",
            tone: 1,
            meanings: [
              "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u6700\u5F8C\u4E00\u5B63\u3002\u8FB2\u66C6\u6307\u7ACB\u51AC\u81F3\u7ACB\u6625\u7684\u6642\u671F\uFF0C\u4E00\u822C\u800C\u8A00\u6C23\u6EAB\u8F03\u4F4E\u3002\u82E5\u4EE5\u5317\u534A\u7403\u6C23\u5019\u8AD6\uFF0C\u6982\u6307\u5341\u4E00\u6708\u6216\u5341\u4E8C\u6708\u81F3\u7FCC\u5E74\u7684\u4E8C\u6708\u6216\u4E09\u6708\u671F\u9593\u3002",
              "\u95A9\u5357\u65B9\u8A00\u3002\u4EE3\u8868\u4E00\u5E74\u7684\u6642\u9593\u3002",
              "\u59D3\u3002\u5982\u4E09\u570B\u6642\u6709\u51AC\u9022\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u51AC"
          }
        ],
        polyphonic: false,
        variants: [
          "\u51AC",
          "\u9F15"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u9F15\u7684\u62DF\u58F0\u4E49\uFF1B\u6539\u9009\u5B63\u8282\u672C\u5B57\u51AC\uFF0C\u575A\u97E7\u53EA\u5728\u72EC\u7ACB\u9879\u76EE\u5B63\u8282\u7C7B\u6BD4\u4E2D\u6279\u51C6\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u9F15",
        beforeRawEntryIndex: 162382,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3109\u3128\u3125",
              definitions: [
                {
                  def: "\u5F62\u5BB9\u6572\u9F13\u3001\u6572\u9580\u7B49\u7684\u8072\u97F3\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u9F13\u8072\u9F15\u9F15\u300D\u3001\u300C\u9F15\u9F15\u9F15\u2026\u2026\uFF0C\u4E00\u9663\u6025\u4FC3\u7684\u6572\u9580\u8072\uFF0C\u9A5A\u9192\u4E86\u5C4B\u5167\u719F\u7761\u7684\u4EBA\u5011\u3002\u300D"
                  ],
                  quote: [
                    "\u5510\uFF0E\u5289\u79B9\u932B\u3008\u540C\u767D\u4E8C\u5341\u4E8C\u8D08\u738B\u5C71\u4EBA\u3009\u8A69\uFF1A\u300C\u7B11\u807D\u9F15\u9F15\u671D\u66AE\u9F13\uFF0C\u53EA\u80FD\u50AC\u5F97\u5E02\u671D\u4EBA\u3002\u300D"
                  ],
                  type: "\u72C0"
                }
              ],
              pinyin: "d\u014Dng"
            }
          ],
          non_radical_stroke_count: 5,
          radical: "\u9F13",
          stroke_count: 18,
          title: "\u9F15"
        },
        afterRawEntryIndex: 17795,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3109\u3128\u3125",
              definitions: [
                {
                  def: "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u6700\u5F8C\u4E00\u5B63\u3002\u8FB2\u66C6\u6307\u7ACB\u51AC\u81F3\u7ACB\u6625\u7684\u6642\u671F\uFF0C\u4E00\u822C\u800C\u8A00\u6C23\u6EAB\u8F03\u4F4E\u3002\u82E5\u4EE5\u5317\u534A\u7403\u6C23\u5019\u8AD6\uFF0C\u6982\u6307\u5341\u4E00\u6708\u6216\u5341\u4E8C\u6708\u81F3\u7FCC\u5E74\u7684\u4E8C\u6708\u6216\u4E09\u6708\u671F\u9593\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5BD2\u51AC\u300D\u3001\u300C\u6B98\u51AC\u300D\u3001\u300C\u51AC\u5929\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u95A9\u5357\u65B9\u8A00\u3002\u4EE3\u8868\u4E00\u5E74\u7684\u6642\u9593\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5169\u51AC\u300D\u3001\u300C\u4E09\u51AC\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u59D3\u3002\u5982\u4E09\u570B\u6642\u6709\u51AC\u9022\u3002",
                  type: "\u540D"
                }
              ],
              pinyin: "d\u014Dng"
            }
          ],
          non_radical_stroke_count: 3,
          radical: "\u51AB",
          stroke_count: 5,
          title: "\u51AC"
        }
      }
    },
    {
      char: "\u5343",
      before: {
        char: "\u5343",
        pinyin: "qi\u0101n",
        tone: 1,
        meaning: "\u53C3\u898B\u300C\u97A6\u97C6\u300D\u689D\u3002",
        traditional: "\u97C6",
        strokes: 3,
        radical: "\u5341",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u97C6\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u5343\u3001\u97C6\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "qi\u0101n",
            tone: 1,
            meanings: [
              "\u53C3\u898B\u300C\u97A6\u97C6\u300D\u689D\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u97C6"
          }
        ],
        polyphonic: false,
        variants: [
          "\u5343",
          "\u97C6",
          "\u{31076}"
        ]
      },
      after: {
        char: "\u5343",
        pinyin: "qi\u0101n",
        tone: 1,
        meaning: "\u6578\u76EE\u5B57\u3002\u5341\u7684\u767E\u500D\u3002\u300A\u8AAA\u6587\u89E3\u5B57\uFF0E\u5341\u90E8\u300B\uFF1A\u300C\u5343\uFF0C\u5341\u767E\u4E5F\u3002\u300D\u5927\u5BEB\u4F5C\u300C\u4EDF\u300D\u3002\uFF1B\u59D3\u3002\u5982\u6F22\u4EE3\u6709\u5343\u737B\u3002\uFF1B\u773E\u591A\u3002",
        traditional: "\u5343",
        strokes: 3,
        radical: "\u5341",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u5343\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "qi\u0101n",
            tone: 1,
            meanings: [
              "\u6578\u76EE\u5B57\u3002\u5341\u7684\u767E\u500D\u3002\u300A\u8AAA\u6587\u89E3\u5B57\uFF0E\u5341\u90E8\u300B\uFF1A\u300C\u5343\uFF0C\u5341\u767E\u4E5F\u3002\u300D\u5927\u5BEB\u4F5C\u300C\u4EDF\u300D\u3002",
              "\u59D3\u3002\u5982\u6F22\u4EE3\u6709\u5343\u737B\u3002",
              "\u773E\u591A\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u5343"
          }
        ],
        polyphonic: false,
        variants: [
          "\u5343",
          "\u97C6",
          "\u{31076}"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u97C6\u7684\u97A6\u97C6\u53C2\u89C1\uFF1B\u6539\u9009\u672C\u5B57\u5343\u7684\u6570\u91CF\u4E0E\u4F17\u591A\u539F\u4E49\uFF0C\u4E0D\u6CDB\u6388\u9879\u76EE\u4FE1\u7528\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u97C6",
        beforeRawEntryIndex: 153915,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3111\u3127\u3122",
              definitions: [
                {
                  def: "\u53C3\u898B\u300C\u97A6\u97C6\u300D\u689D\u3002"
                }
              ],
              pinyin: "qi\u0101n"
            }
          ],
          non_radical_stroke_count: 15,
          radical: "\u9769",
          stroke_count: 24,
          title: "\u97C6"
        },
        afterRawEntryIndex: 22828,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3111\u3127\u3122",
              definitions: [
                {
                  def: "\u6578\u76EE\u5B57\u3002\u5341\u7684\u767E\u500D\u3002\u300A\u8AAA\u6587\u89E3\u5B57\uFF0E\u5341\u90E8\u300B\uFF1A\u300C\u5343\uFF0C\u5341\u767E\u4E5F\u3002\u300D\u5927\u5BEB\u4F5C\u300C\u4EDF\u300D\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u59D3\u3002\u5982\u6F22\u4EE3\u6709\u5343\u737B\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u773E\u591A\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5343\u65B9\u767E\u8A08\u300D\u3001\u300C\u5343\u5C71\u842C\u6C34\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8001\u5B50\uFF0E\u7B2C\u516D\u56DB\u7AE0\u300B\uFF1A\u300C\u5343\u91CC\u4E4B\u884C\uFF0C\u59CB\u65BC\u8DB3\u4E0B\u3002\u300D",
                    "\u5510\uFF0E\u674E\u767D\u3008\u5C07\u9032\u9152\u3009\uFF1A\u300C\u5929\u751F\u6211\u6750\u5FC5\u6709\u7528\uFF0C\u5343\u91D1\u6563\u76E1\u9084\u5FA9\u4F86\u3002\u300D"
                  ],
                  type: "\u5F62"
                }
              ],
              pinyin: "qi\u0101n"
            }
          ],
          non_radical_stroke_count: 1,
          radical: "\u5341",
          stroke_count: 3,
          title: "\u5343"
        }
      }
    },
    {
      char: "\u79CB",
      before: {
        char: "\u79CB",
        pinyin: "qi\u016B",
        tone: 1,
        meaning: "\u53C3\u898B\u300C\u97A6\u97C6\u300D\u689D\u3002",
        traditional: "\u97A6",
        strokes: 9,
        radical: "\u79BE",
        elements: [
          "\u6728",
          "\u91D1"
        ],
        elementBasis: "\u5B57\u5F62\uFF0F\u5B57\u4E49\u610F\u8C61\u53C2\u8003 v1\uFF08\u9879\u76EE\u81EA\u7F16\u6807\u7B7E\uFF0C\u975E\u552F\u4E00\u6C49\u5B57\u4E94\u884C\u5B9A\u8BBA\uFF1B\u4E0D\u5F97\u5F53\u4F5C\u5EB7\u7199\u7B14\u753B\u4E94\u884C\uFF09",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u97A6\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u79CB\u3001\u97A6\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "qi\u016B",
            tone: 1,
            meanings: [
              "\u53C3\u898B\u300C\u97A6\u97C6\u300D\u689D\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u97A6"
          }
        ],
        polyphonic: false,
        variants: [
          "\u79CB",
          "\u97A6"
        ]
      },
      after: {
        char: "\u79CB",
        pinyin: "qi\u016B",
        tone: 1,
        meaning: "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u7B2C\u4E09\u5B63\u3002\u8FB2\u66C6\u70BA\u4E03\u3001\u516B\u3001\u4E5D\u6708\uFF0C\u967D\u66C6\u70BA\u4E5D\u3001\u5341\u3001\u5341\u4E00\u6708\u3002\uFF1B\u5E74\u3002\u53E4\u4EE3\u5E74\u7684\u9577\u5EA6\u4EE5\u4E8C\u6B21\u79CB\u6536\u70BA\u6E96\uFF0C\u6545\u4EE5\u79CB\u4EE3\u8868\u5E74\u3002\uFF1B\u6642\u5019\u3002",
        traditional: "\u79CB",
        strokes: 9,
        radical: "\u79BE",
        elements: [
          "\u6728",
          "\u91D1"
        ],
        elementBasis: "\u5B57\u5F62\uFF0F\u5B57\u4E49\u610F\u8C61\u53C2\u8003 v1\uFF08\u9879\u76EE\u81EA\u7F16\u6807\u7B7E\uFF0C\u975E\u552F\u4E00\u6C49\u5B57\u4E94\u884C\u5B9A\u8BBA\uFF1B\u4E0D\u5F97\u5F53\u4F5C\u5EB7\u7199\u7B14\u753B\u4E94\u884C\uFF09",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u79CB\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002 \u201C\u6536\u83B7\u201D\u4E3A\u9879\u76EE\u539F\u521B\u5B63\u8282\u7C7B\u6BD4\uFF0C\u975E\u5B57\u5178\u539F\u4E49\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "qi\u016B",
            tone: 1,
            meanings: [
              "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u7B2C\u4E09\u5B63\u3002\u8FB2\u66C6\u70BA\u4E03\u3001\u516B\u3001\u4E5D\u6708\uFF0C\u967D\u66C6\u70BA\u4E5D\u3001\u5341\u3001\u5341\u4E00\u6708\u3002",
              "\u5E74\u3002\u53E4\u4EE3\u5E74\u7684\u9577\u5EA6\u4EE5\u4E8C\u6B21\u79CB\u6536\u70BA\u6E96\uFF0C\u6545\u4EE5\u79CB\u4EE3\u8868\u5E74\u3002",
              "\u6642\u5019\u3002",
              "\u59D3\u3002\u5982\u6E05\u4EE3\u6709\u79CB\u747E\u3002",
              "\u55BB\u8870\u8001\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u79CB"
          }
        ],
        polyphonic: false,
        variants: [
          "\u79CB",
          "\u97A6"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u97A6\u7684\u97A6\u97C6\u53C2\u89C1\uFF1B\u6539\u9009\u5B63\u8282\u672C\u5B57\u79CB\uFF0C\u6536\u83B7\u53EA\u5728\u72EC\u7ACB\u9879\u76EE\u7C7B\u6BD4\u4E2D\u6279\u51C6\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u97A6",
        beforeRawEntryIndex: 153844,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3111\u3127\u3121",
              definitions: [
                {
                  def: "\u53C3\u898B\u300C\u97A6\u97C6\u300D\u689D\u3002",
                  type: "\u540D"
                }
              ],
              pinyin: "qi\u016B"
            }
          ],
          non_radical_stroke_count: 9,
          radical: "\u9769",
          stroke_count: 18,
          title: "\u97A6"
        },
        afterRawEntryIndex: 106848,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3111\u3127\u3121",
              definitions: [
                {
                  def: "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u7B2C\u4E09\u5B63\u3002\u8FB2\u66C6\u70BA\u4E03\u3001\u516B\u3001\u4E5D\u6708\uFF0C\u967D\u66C6\u70BA\u4E5D\u3001\u5341\u3001\u5341\u4E00\u6708\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u79CB\u5929\u300D\u3001\u300C\u79CB\u5B63\u300D\u3001\u300C\u4E2D\u79CB\u300D\u3001\u300C\u6DF1\u79CB\u300D\u3001\u300C\u4E00\u8449\u77E5\u79CB\u300D\u3002"
                  ],
                  quote: [
                    "\u5510\uFF0E\u675C\u752B\u3008\u767B\u9AD8\u3009\u8A69\uFF1A\u300C\u842C\u91CC\u60B2\u79CB\u5E38\u4F5C\u5BA2\uFF0C\u767E\u5E74\u591A\u75C5\u7368\u767B\u81FA\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u5E74\u3002\u53E4\u4EE3\u5E74\u7684\u9577\u5EA6\u4EE5\u4E8C\u6B21\u79CB\u6536\u70BA\u6E96\uFF0C\u6545\u4EE5\u79CB\u4EE3\u8868\u5E74\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5343\u79CB\u842C\u4E16\u300D\u3001\u300C\u4E00\u65E5\u4E0D\u898B\uFF0C\u5982\u9694\u4E09\u79CB\u3002\u300D"
                  ],
                  quote: [
                    "\u5510\uFF0E\u5289\u79B9\u932B\u3008\u8700\u5148\u4E3B\u5EDF\u3009\u8A69\uFF1A\u300C\u5929\u5730\u82F1\u96C4\u6C23\uFF0C\u5343\u79CB\u5C1A\u51DC\u7136\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u6642\u5019\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u591A\u4E8B\u4E4B\u79CB\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u6587\u9078\uFF0E\u8AF8\u845B\u4EAE\uFF0E\u51FA\u5E2B\u8868\u300B\uFF1A\u300C\u6B64\u8AA0\u5371\u6025\u5B58\u4EA1\u4E4B\u79CB\u4E5F\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u59D3\u3002\u5982\u6E05\u4EE3\u6709\u79CB\u747E\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u55BB\u8870\u8001\u3002",
                  quote: [
                    "\u5B8B\uFF0E\u9678\u6E38\u3008\u5357\u9109\u5B50\uFF0E\u65E9\u6B72\u5165\u7687\u5DDE\u3009\u8A5E\uFF1A\u300C\u4E09\u5341\u5E74\u4F86\u771F\u4E00\u5922\uFF0C\u582A\u6101\u3002\u5BA2\u8DEF\u856D\u856D\u5169\u9B22\u79CB\u3002\u300D"
                  ],
                  type: "\u5F62"
                }
              ],
              pinyin: "qi\u016B"
            }
          ],
          non_radical_stroke_count: 4,
          radical: "\u79BE",
          stroke_count: 9,
          title: "\u79CB"
        }
      }
    },
    {
      char: "\u6C88",
      before: {
        char: "\u6C88",
        pinyin: "sh\u011Bn",
        tone: 3,
        meaning: "\u6C41\u3002\uFF1B\u5927\u9678\u5730\u5340\u700B\u967D\u5E02\u7684\u7C21\u7A31\u3002",
        traditional: "\u700B",
        strokes: 7,
        radical: "\u6C34",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u660E\u6717"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u700B\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u6C88\u3001\u700B\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "sh\u011Bn",
            tone: 3,
            meanings: [
              "\u6C41\u3002",
              "\u5927\u9678\u5730\u5340\u700B\u967D\u5E02\u7684\u7C21\u7A31\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u700B"
          }
        ],
        polyphonic: false,
        variants: [
          "\u6C88",
          "\u700B",
          "\u6E16"
        ]
      },
      after: {
        char: "\u6C88",
        pinyin: "sh\u011Bn",
        tone: 3,
        meaning: "\u59D3\u3002\u5982\u5B8B\u4EE3\u6709\u6C88\u62EC\u3002",
        traditional: "\u6C88",
        strokes: 7,
        radical: "\u6C34",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [],
        warning: "\u591A\u97F3\u5B57\uFF1A\u672C\u65B9\u6848\u91C7\u7528 sh\u011Bn\uFF0C\u8BF7\u6309\u59D3\u540D\u7528\u6CD5\u786E\u8BA4\uFF1B\u5404\u8BFB\u97F3\u4E49\u9879\u5206\u522B\u4FDD\u5B58\u3002 \u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u6C88\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002 sh\u011Bn \u4EC5\u636E\u539F\u8BCD\u6761\u59D3\u4E49\uFF1Bch\xE9n \u4EC5\u4FDD\u5B58\u8F9E\u5178\u53C2\u7167\uFF0C\u4E0D\u501F\u4F5C\u6C89\u7A33\u7B49\u547D\u540D\u4E49\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "ch\xE9n",
            tone: 2,
            meanings: [
              "\u8F9E\u5178\u53C2\u7167\uFF1A\u540C\u300C\u6C89\u300D\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u6C88",
            referenceOnly: true,
            sourceReference: {
              kind: "dictionary-cross-reference",
              rawDefinitionIndex: 0,
              text: "\u540C\u300C\u6C89\u300D\u3002"
            }
          },
          {
            pinyin: "sh\u011Bn",
            tone: 3,
            meanings: [
              "\u59D3\u3002\u5982\u5B8B\u4EE3\u6709\u6C88\u62EC\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u6C88"
          }
        ],
        polyphonic: true,
        variants: [
          "\u6C88",
          "\u700B",
          "\u6E16"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning",
        "tags"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u700B\u7684\u6C41/\u5730\u540D\u4E49\uFF1Bsh\u011Bn\u672C\u5B57\u6C88\u4EC5\u636E\u59D3\u4E49\u3002\u4FDD\u7559ch\xE9n\u539F\u53C2\u7167\u800C\u4E0D\u501F\u6C89\u7A33\u4E49\uFF1B\u552F\u4E00\u79FB\u9664\u65E7\u660E\u6717\u6807\u7B7E\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false,
        tagsException: "remove-unrelated-\u660E\u6717-only",
        referenceOnlyNotDefinition: true
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u700B",
        beforeRawEntryIndex: 90504,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3115\u3123\u02C7",
              definitions: [
                {
                  def: "\u6C41\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u58A8\u700B\u672A\u4E7E\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8AAA\u6587\u89E3\u5B57\uFF0E\u6C34\u90E8\u300B\uFF1A\u300C\u700B\uFF0C\u6C41\u4E5F\u3002\u300D",
                    "\u5143\uFF0E\u9676\u5B97\u5100\u300A\u5357\u6751\u8F1F\u8015\u9304\uFF0E\u5377\u4E8C\u4E5D\uFF0E\u58A8\u300B\uFF1A\u300C\u6240\u4EE5\u6649\u4EBA\u591A\u7528\u51F9\u5FC3\u786F\u8005\uFF0C\u6B32\u78E8\u58A8\u8CAF\u700B\u8033\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u5927\u9678\u5730\u5340\u700B\u967D\u5E02\u7684\u7C21\u7A31\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5B89\u700B\u9435\u8DEF\u300D\u3002"
                  ],
                  type: "\u540D"
                }
              ],
              pinyin: "sh\u011Bn"
            }
          ],
          non_radical_stroke_count: 15,
          radical: "\u6C34",
          stroke_count: 18,
          title: "\u700B"
        },
        afterRawEntryIndex: 83184,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3114\u3123\u02CA",
              definitions: [
                {
                  def: "",
                  link: [
                    "\u540C\u300C\u6C89\u300D\u3002"
                  ]
                }
              ],
              pinyin: "ch\xE9n"
            },
            {
              bopomofo: "\u3115\u3123\u02C7",
              definitions: [
                {
                  def: "\u59D3\u3002\u5982\u5B8B\u4EE3\u6709\u6C88\u62EC\u3002",
                  type: "\u540D"
                }
              ],
              pinyin: "sh\u011Bn"
            }
          ],
          non_radical_stroke_count: 4,
          radical: "\u6C34",
          stroke_count: 7,
          title: "\u6C88"
        }
      }
    },
    {
      char: "\u54B8",
      before: {
        char: "\u54B8",
        pinyin: "xi\xE1n",
        tone: 2,
        meaning: "\u542B\u9E7D\u5206\u6216\u9E7D\u5473\u7684\u3002\uFF1B\u541D\u55C7\u3001\u5C0F\u6C23\u3002\uFF1B\u9E7D\u5473\u3002",
        traditional: "\u9E79",
        strokes: 9,
        radical: "\u53E3",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u9E79\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u54B8\u3001\u9E79\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "xi\xE1n",
            tone: 2,
            meanings: [
              "\u542B\u9E7D\u5206\u6216\u9E7D\u5473\u7684\u3002",
              "\u541D\u55C7\u3001\u5C0F\u6C23\u3002",
              "\u9E7D\u5473\u3002",
              "\u5730\u540D\uFF1A(1) \u6625\u79CB\u6642\u9B6F\u5730\uFF0C\u7D04\u5728\u4ECA\u5927\u9678\u5730\u5340\u5C71\u6771\u7701\u66F9\u7E23\u5883\u3002(2) \u6625\u79CB\u6642\u885B\u5730\uFF0C\u7D04\u5728\u4ECA\u5927\u9678\u5730\u5340\u6CB3\u5317\u7701\u6FEE\u967D\u7E23\u6771\u5357\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u9E79"
          }
        ],
        polyphonic: false,
        variants: [
          "\u54B8",
          "\u9E79"
        ]
      },
      after: {
        char: "\u54B8",
        pinyin: "xi\xE1n",
        tone: 2,
        meaning: "\u90FD\u3001\u7686\u3001\u5168\u3002\uFF1B\u666E\u53CA\u3001\u904D\u53CA\u3002\uFF1B\u548C\u7766\u3002",
        traditional: "\u54B8",
        strokes: 9,
        radical: "\u53E3",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u54B8\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002 \u539F\u8F9E\u5178\u5366\u8C61\u62EC\u53F7\u7B26\u53F7\u4E0E\u5366\u540D\u6587\u5B57\u5B58\u5728\u51B2\u7A81\uFF0C\u539F\u6587\u4FDD\u7559\u5F85\u6838\uFF0C\u4E0D\u7528\u4E8E\u81EA\u52A8\u63A8\u5366\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "xi\xE1n",
            tone: 2,
            meanings: [
              "\u90FD\u3001\u7686\u3001\u5168\u3002",
              "\u666E\u53CA\u3001\u904D\u53CA\u3002",
              "\u548C\u7766\u3002",
              "\u300A\u6613\u7D93\u300B\u5366\u540D\u3002\u516D\u5341\u56DB\u5366\u4E4B\u4E00\u3002\u826E\uFF08\u2631\uFF09\u4E0B\u514C\uFF08\u2636\uFF09\u4E0A\u3002\u8868\u793A\u5C71\u6FA4\u76F8\u611F\u61C9\u4E4B\u8C61\u3002",
              "\u59D3\u3002\u5982\u6F22\u4EE3\u6709\u54B8\u5BA3\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u54B8"
          }
        ],
        polyphonic: false,
        variants: [
          "\u54B8",
          "\u9E79"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u9E79\u7684\u76D0\u5473\u4E49\uFF1B\u6539\u9009\u672C\u5B57\u54B8\u7684\u7686/\u904D\u53CA/\u548C\u7766\u7B49\u539F\u4E49\uFF1B\u539F\u5366\u8C61\u7B26\u53F7\u51B2\u7A81\u4E0D\u6539\u5199\u3001\u4E0D\u81EA\u52A8\u63A8\u5366\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false,
        originalGlyphConflictPreserved: true
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u9E79",
        beforeRawEntryIndex: 160954,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3112\u3127\u3122\u02CA",
              definitions: [
                {
                  def: "\u542B\u9E7D\u5206\u6216\u9E7D\u5473\u7684\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u9E79\u9B5A\u300D\u3001\u300C\u9E79\u6C34\u6E56\u300D\u3001\u300C\u6771\u897F\u5F88\u9E79\u3002\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u541D\u55C7\u3001\u5C0F\u6C23\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u4ED6\u662F\u6709\u540D\u7684\u9435\u516C\u96DE\uFF0C\u9E79\u7684\u5F88\uFF01\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u9E7D\u5473\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u9178\u751C\u82E6\u8FA3\u9E79\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8340\u5B50\uFF0E\u6B63\u540D\u300B\uFF1A\u300C\u7518\u82E6\u9E79\u6DE1\uFF0C\u8F9B\u9178\u5947\u5473\uFF0C\u4EE5\u53E3\u7570\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u5730\u540D\uFF1A(1) \u6625\u79CB\u6642\u9B6F\u5730\uFF0C\u7D04\u5728\u4ECA\u5927\u9678\u5730\u5340\u5C71\u6771\u7701\u66F9\u7E23\u5883\u3002(2) \u6625\u79CB\u6642\u885B\u5730\uFF0C\u7D04\u5728\u4ECA\u5927\u9678\u5730\u5340\u6CB3\u5317\u7701\u6FEE\u967D\u7E23\u6771\u5357\u3002",
                  type: "\u540D"
                }
              ],
              pinyin: "xi\xE1n"
            }
          ],
          non_radical_stroke_count: 9,
          radical: "\u9E75",
          stroke_count: 20,
          title: "\u9E79"
        },
        afterRawEntryIndex: 28363,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3112\u3127\u3122\u02CA",
              definitions: [
                {
                  def: "\u90FD\u3001\u7686\u3001\u5168\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u8001\u5C11\u54B8\u5B9C\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u66F8\u7D93\uFF0E\u821C\u5178\u300B\uFF1A\u300C\u6B9B\u9BC0\u4E8E\u7FBD\u5C71\uFF0C\u56DB\u7F6A\u800C\u5929\u4E0B\u54B8\u670D\u3002\u300D",
                    "\u5510\uFF0E\u738B\u660C\u9F61\u3008\u585E\u4E0B\u66F2\u3009\u56DB\u9996\u4E4B\u4E8C\uFF1A\u300C\u6614\u65E5\u9577\u57CE\u6230\uFF0C\u54B8\u8A00\u610F\u6C23\u9AD8\u3002\u300D"
                  ],
                  type: "\u526F"
                },
                {
                  def: "\u666E\u53CA\u3001\u904D\u53CA\u3002",
                  quote: [
                    "\u300A\u570B\u8A9E\uFF0E\u9B6F\u8A9E\u300B\uFF1A\u300C\u5C0F\u8CDC\u4E0D\u54B8\uFF0C\u7368\u606D\u4E0D\u512A\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u548C\u7766\u3002",
                  quote: [
                    "\u300A\u5DE6\u50B3\uFF0E\u50D6\u516C\u4E8C\u5341\u56DB\u5E74\u300B\uFF1A\u300C\u6614\u5468\u516C\u5F14\u4E8C\u53D4\u4E4B\u4E0D\u54B8\uFF0C\u6545\u5C01\u5EFA\u89AA\u621A\u4EE5\u8543\u5C4F\u5468\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u300A\u6613\u7D93\u300B\u5366\u540D\u3002\u516D\u5341\u56DB\u5366\u4E4B\u4E00\u3002\u826E\uFF08\u2631\uFF09\u4E0B\u514C\uFF08\u2636\uFF09\u4E0A\u3002\u8868\u793A\u5C71\u6FA4\u76F8\u611F\u61C9\u4E4B\u8C61\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u59D3\u3002\u5982\u6F22\u4EE3\u6709\u54B8\u5BA3\u3002",
                  type: "\u540D"
                }
              ],
              pinyin: "xi\xE1n"
            }
          ],
          non_radical_stroke_count: 6,
          radical: "\u53E3",
          stroke_count: 9,
          title: "\u54B8"
        }
      }
    },
    {
      char: "\u65CB",
      before: {
        char: "\u65CB",
        pinyin: "xu\xE0n",
        tone: 4,
        meaning: "\u5713\u5F62\u7684\u7210\u5B50\u3002\uFF1B\u6EAB\u9152\u5668\u3002\uFF1B\u9285\u932B\u76E4\u3002",
        traditional: "\u93C7",
        strokes: 11,
        radical: "\u65B9",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u93C7\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u65CB\u3001\u93C7\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "xu\xE0n",
            tone: 4,
            meanings: [
              "\u5713\u5F62\u7684\u7210\u5B50\u3002",
              "\u6EAB\u9152\u5668\u3002",
              "\u9285\u932B\u76E4\u3002",
              "\u7528\u93C7\u5B50\u6EAB\u9152\u3002",
              "\u4EE5\u6A5F\u5668\u6216\u5200\u65CB\u8F49\u8457\u524A\u5207\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u93C7"
          }
        ],
        polyphonic: false,
        variants: [
          "\u65CB",
          "\u93C7",
          "\u955F"
        ]
      },
      after: {
        char: "\u65CB",
        pinyin: "xu\xE0n",
        tone: 4,
        meaning: "\u6253\u8F49\u7684\u3002\uFF1B\u6EAB\u9152\u3002\uFF1B\u8868\u52D5\u4F5C\u662F\u81E8\u6642\u3001\u73FE\u6642\u7684\u3002",
        traditional: "\u65CB",
        strokes: 11,
        radical: "\u65B9",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u591A\u97F3\u5B57\uFF1A\u672C\u65B9\u6848\u91C7\u7528 xu\xE0n\uFF0C\u8BF7\u6309\u59D3\u540D\u7528\u6CD5\u786E\u8BA4\uFF1B\u5404\u8BFB\u97F3\u4E49\u9879\u5206\u522B\u4FDD\u5B58\u3002 \u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u65CB\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "xu\xE1n",
            tone: 2,
            meanings: [
              "\u7E5E\u8457\u8F49\u52D5\u3002",
              "\u56DE\u3001\u6B78\u3002",
              "\u5C0F\u4FBF\u3002",
              "\u7ACB\u523B\u3001\u5F88\u5FEB\u7684\u3002",
              "\u53C8\u3001\u518D\u3002",
              "\u8868\u793A\u540C\u6642\u505A\u5169\u4EF6\u4E8B\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u65CB"
          },
          {
            pinyin: "xu\xE0n",
            tone: 4,
            meanings: [
              "\u6253\u8F49\u7684\u3002",
              "\u6EAB\u9152\u3002",
              "\u8868\u52D5\u4F5C\u662F\u81E8\u6642\u3001\u73FE\u6642\u7684\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u65CB"
          }
        ],
        polyphonic: true,
        variants: [
          "\u65CB",
          "\u93C7",
          "\u955F"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u93C7\u5668\u7269\u4E49\uFF1B\u6539\u9009\u672C\u5B57\u65CB\uFF0C\u9ED8\u8BA4xu\xE0n\u4E0D\u53D8\uFF0C\u5B8C\u6574\u4FDD\u7559xu\xE1n\u4E0Exu\xE0n\u4E24\u8BFB\u5E76\u5206\u4E49\uFF0C\u4E0D\u501F\u51EF\u65CB\u4E49\u7ED9xu\xE0n\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u93C7",
        beforeRawEntryIndex: 147272,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3112\u3129\u3122\u02CB",
              definitions: [
                {
                  def: "\u5713\u5F62\u7684\u7210\u5B50\u3002",
                  quote: [
                    "\u300A\u8AAA\u6587\u89E3\u5B57\uFF0E\u91D1\u90E8\u300B\uFF1A\u300C\u93C7\uFF0C\u5713\u946A\u4E5F\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u6EAB\u9152\u5668\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u91D1\u93C7\u300D\u3001\u300C\u9152\u93C7\u300D\u3002"
                  ],
                  link: [
                    "\u4E5F\u7A31\u70BA\u300C\u93C7\u5B50\u300D\u3002"
                  ],
                  quote: [
                    "\u5143\uFF0E\u6234\u4F97\u300A\u516D\u66F8\u6545\uFF0E\u5377\u56DB\uFF0E\u5730\u7406\u300B\uFF1A\u300C\u93C7\uFF0C\u6EAB\u5668\u4E5F\uFF0C\u65CB\u4E4B\u6E6F\u4E2D\uFF0C\u4EE5\u6EAB\u9152\u8207\u6D0E\u8005\u4E5F\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u9285\u932B\u76E4\u3002",
                  quote: [
                    "\u660E\uFF0E\u99AE\u5922\u9F8D\u300A\u53E4\u4ECA\u8B5A\u6982\uFF0E\u5996\u7570\u90E8\uFF0E\u93C7\u4E2D\u4F5B\u50CF\u300B\uFF1A\u300C\u5E38\u719F\u4E18\u90E1\u5BB6\u98DF\u6AE5\u5167\uFF0C\u932B\u93C7\u7F6E\u719F\u96DE\u534A\u96BB\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u7528\u93C7\u5B50\u6EAB\u9152\u3002",
                  quote: [
                    "\u300A\u6C34\u6EF8\u50B3\uFF0E\u7B2C\u4E03\u4E8C\u56DE\u300B\uFF1A\u300C\u4F60\u81EA\u53BB\u8207\u6211\u93C7\u4E00\u676F\u71B1\u9152\u4F86\u5403\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u4EE5\u6A5F\u5668\u6216\u5200\u65CB\u8F49\u8457\u524A\u5207\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u93C7\u9640\u87BA\u300D\u3001\u300C\u93C7\u87BA\u7D72\u91D8\u300D\u3001\u300C\u628A\u863F\u8514\u76AE\u93C7\u4E0B\u4F86\u300D\u3002"
                  ],
                  type: "\u52D5"
                }
              ],
              pinyin: "xu\xE0n"
            }
          ],
          non_radical_stroke_count: 11,
          radical: "\u91D1",
          stroke_count: 19,
          title: "\u93C7"
        },
        afterRawEntryIndex: 69896,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3112\u3129\u3122\u02CA",
              definitions: [
                {
                  def: "\u7E5E\u8457\u8F49\u52D5\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u76E4\u65CB\u300D\u3001\u300C\u56DE\u65CB\u300D\u3002"
                  ],
                  quote: [
                    "\u5510\uFF0E\u767D\u5C45\u6613\u3008\u9577\u6068\u6B4C\u3009\uFF1A\u300C\u5929\u65CB\u65E5\u8F49\u8FF4\u9F8D\u99AD\uFF0C\u5230\u6B64\u8E8A\u8E87\u4E0D\u80FD\u53BB\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u56DE\u3001\u6B78\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u51F1\u65CB\u6B78\u4F86\u300D\u3002"
                  ],
                  quote: [
                    "\u5510\uFF0E\u674E\u5546\u96B1\u3008\u884C\u6B21\u897F\u90CA\u4F5C\u4E00\u767E\u97FB\u3009\uFF1A\u300C\u7389\u8F26\u671B\u5357\u6597\uFF0C\u672A\u77E5\u4F55\u65E5\u65CB\u3002\u300D",
                    "\u5B8B\uFF0E\u6C6A\u85FB\u3008\u5DF1\u9149\u4E82\u5F8C\u5BC4\u5E38\u5DDE\u4F7F\u541B\u59EA\u3009\u8A69\uFF1A\u300C\u8349\u8349\u5B98\u8ECD\u6E21\uFF0C\u60A0\u60A0\u6575\u9A0E\u65CB\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u5C0F\u4FBF\u3002",
                  quote: [
                    "\u5510\uFF0E\u97D3\u6108\u3008\u5F35\u4E2D\u4E1E\u50B3\u5F8C\u6558\u3009\uFF1A\u300C\u53CA\u57CE\u9677\uFF0C\u8CCA\u7E1B\u5DE1\u7B49\u6578\u5341\u4EBA\u5750\uFF0C\u4E14\u5C07\u622E\uFF0C\u5DE1\u8D77\u65CB\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u7ACB\u523B\u3001\u5F88\u5FEB\u7684\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u65CB\u5373\u300D\u3002"
                  ],
                  quote: [
                    "\u5510\uFF0E\u5C91\u53C3\u3008\u8D70\u99AC\u5DDD\u884C\u5949\u9001\u51FA\u5E2B\u897F\u5F81\u3009\u8A69\uFF1A\u300C\u99AC\u6BDB\u5E36\u96EA\u6C57\u6C23\u84B8\uFF0C\u4E94\u82B1\u9023\u9322\u65CB\u4F5C\u51B0\u3002\u300D",
                    "\u5B8B\uFF0E\u8607\u8EFE\u3008\u6D63\u6EAA\u6C99\uFF0E\u65CB\u62B9\u7D05\u599D\u770B\u4F7F\u541B\u3009\u8A5E\uFF1A\u300C\u65CB\u62B9\u7D05\u599D\u770B\u4F7F\u541B\uFF0C\u4E09\u4E09\u4E94\u4E94\u68D8\u7C6C\u9580\uFF0C\u76F8\u6328\u8E0F\u7834\u84A8\u7F85\u88D9\u3002\u300D"
                  ],
                  type: "\u526F"
                },
                {
                  def: "\u53C8\u3001\u518D\u3002",
                  quote: [
                    "\u5B8B\uFF0E\u6641\u88DC\u4E4B\u3008\u516B\u516D\u5B50\uFF0E\u559C\u79CB\u6674\u3009\u8A5E\uFF1A\u300C\u9189\u4F11\u9192\uFF0C\u9192\u4F86\u820A\u6101\u65CB\u751F\u3002\u300D"
                  ],
                  type: "\u526F"
                },
                {
                  def: "\u8868\u793A\u540C\u6642\u505A\u5169\u4EF6\u4E8B\u3002",
                  quote: [
                    "\u5510\uFF0E\u7AE0\u78A3\u3008\u966A\u6D59\u897F\u738B\u4F8D\u90CE\u591C\u5BB4\u3009\u8A69\uFF1A\u300C\u65CB\u770B\u6B4C\u821E\u65CB\u50B3\u676F\u3002\u300D"
                  ],
                  type: "\u9023"
                }
              ],
              pinyin: "xu\xE1n"
            },
            {
              bopomofo: "\u3112\u3129\u3122\u02CB",
              definitions: [
                {
                  def: "\u6253\u8F49\u7684\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u65CB\u98A8\u300D\u3001\u300C\u65CB\u7403\u300D\u3002"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u6EAB\u9152\u3002",
                  link: [
                    "\u901A\u300C\u93C7\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u6C34\u6EF8\u50B3\uFF0E\u7B2C\u4E94\u56DE\u300B\uFF1A\u300C\u90A3\u838A\u5BA2\u65CB\u4E86\u4E00\u58FA\u9152\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u8868\u52D5\u4F5C\u662F\u81E8\u6642\u3001\u73FE\u6642\u7684\u3002",
                  quote: [
                    "\u5510\uFF0E\u675C\u8340\u9DB4\u3008\u5C71\u4E2D\u5BE1\u5A66\u3009\u8A69\uFF1A\u300C\u6642\u6311\u91CE\u83DC\u548C\u6839\u716E\uFF0C\u65CB\u65AB\u751F\u67F4\u5E36\u8449\u71D2\u3002\u300D",
                    "\u5143\uFF0E\u55AC\u5409\u3008\u6EFF\u5EAD\u82B3\uFF0E\u6D3B\u9B5A\u65CB\u6253\u3009\u66F2\uFF1A\u300C\u6D3B\u9B5A\u65CB\u6253\uFF0C\u6CBD\u4E9B\u6751\u9152\uFF0C\u554F\u90A3\u4EBA\u5BB6\u3002\u300D"
                  ],
                  type: "\u526F"
                }
              ],
              pinyin: "xu\xE0n"
            }
          ],
          non_radical_stroke_count: 7,
          radical: "\u65B9",
          stroke_count: 11,
          title: "\u65CB"
        }
      }
    },
    {
      char: "\u90C1",
      before: {
        char: "\u90C1",
        pinyin: "y\xF9",
        tone: 4,
        meaning: "\u7A4D\u805A\u3001\u51DD\u6EEF\u3002\uFF1B\u6028\u6068\u3002\uFF1B\u8302\u76DB\u7684\u6A23\u5B50\u3002",
        traditional: "\u9B31",
        strokes: 8,
        radical: "\u9091",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u9B31\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u90C1\u3001\u9B31\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "y\xF9",
            tone: 4,
            meanings: [
              "\u7A4D\u805A\u3001\u51DD\u6EEF\u3002",
              "\u6028\u6068\u3002",
              "\u8302\u76DB\u7684\u6A23\u5B50\u3002",
              "\u6101\u60B6\u7684\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u9B31"
          }
        ],
        polyphonic: false,
        variants: [
          "\u90C1",
          "\u9B31"
        ]
      },
      after: {
        char: "\u90C1",
        pinyin: "y\xF9",
        tone: 4,
        meaning: "\u6587\u91C7\u8C50\u76DB\u3002\uFF1B\u9999\u6C23\u6FC3\u70C8\u3002\uFF1B\u548C\u6696\u3002",
        traditional: "\u90C1",
        strokes: 8,
        radical: "\u9091",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u90C1\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "y\xF9",
            tone: 4,
            meanings: [
              "\u6587\u91C7\u8C50\u76DB\u3002",
              "\u9999\u6C23\u6FC3\u70C8\u3002",
              "\u548C\u6696\u3002",
              "\u59D3\u3002\u5982\u6E05\u4EE3\u6709\u90C1\u677E\u5E74\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u90C1"
          }
        ],
        polyphonic: false,
        variants: [
          "\u90C1",
          "\u9B31"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u9B31\u7684\u79EF\u805A/\u6028\u6068\u4E49\uFF1B\u6539\u9009\u672C\u5B57\u90C1\u539F\u6761\uFF0C\u9ED8\u8BA4y\xF9\u4E0D\u53D8\uFF0C\u4E0D\u6CDB\u6388\u6587\u91C7\u7B49\u9879\u76EE\u6807\u7B7E\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u9B31",
        beforeRawEntryIndex: 159379,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3129\u02CB",
              definitions: [
                {
                  def: "\u7A4D\u805A\u3001\u51DD\u6EEF\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u9B31\u7A4D\u300D\u3001\u300C\u9B31\u7D50\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u6F22\u66F8\uFF0E\u5377\u516B\uFF0E\u5BA3\u5E1D\u7D00\u300B\uFF1A\u300C\u6715\u4E0D\u660E\u516D\u85DD\uFF0C\u9B31\u4E8E\u5927\u9053\uFF0C\u662F\u4EE5\u9670\u967D\u98A8\u96E8\u672A\u6642\u3002\u300D",
                    "\u5510\uFF0E\u76AE\u65E5\u4F11\u3008\u8ACB\u97D3\u6587\u516C\u914D\u9957\u592A\u5B78\u66F8\u3009\uFF1A\u300C\u96F2\u9727\u4E45\u9B31\uFF0C\u5FFD\u5ED3\u5247\u6E05\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u6028\u6068\u3002",
                  quote: [
                    "\u300A\u5442\u6C0F\u6625\u79CB\uFF0E\u4EF2\u590F\u7D00\uFF0E\u4F88\u6A02\u300B\uFF1A\u300C\u6545\u6A02\u6108\u4F88\u800C\u6C11\u6108\u9B31\uFF0C\u570B\u6108\u4E82\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u8302\u76DB\u7684\u6A23\u5B50\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u9B31\u9B31\u84BC\u84BC\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8A69\u7D93\uFF0E\u79E6\u98A8\uFF0E\u6668\u98A8\u300B\uFF1A\u300C\u9D25\u5F7C\u6668\u98A8\uFF0C\u9B31\u5F7C\u5317\u6797\u3002\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u6101\u60B6\u7684\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u6182\u9B31\u300D\u3001\u300C\u9B31\u9B31\u5BE1\u6B61\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u695A\u8FAD\uFF0E\u5289\u5411\uFF0E\u4E5D\u6B4E\uFF0E\u6182\u82E6\u300B\uFF1A\u300C\u9858\u5047\u7C27\u4EE5\u8212\u6182\u516E\uFF0C\u5FD7\u7D06\u9B31\u5176\u96E3\u91CB\u3002\u300D"
                  ],
                  type: "\u5F62"
                }
              ],
              pinyin: "y\xF9"
            }
          ],
          non_radical_stroke_count: 19,
          radical: "\u9B2F",
          stroke_count: 29,
          title: "\u9B31"
        },
        afterRawEntryIndex: 143695,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3129\u02CB",
              definitions: [
                {
                  def: "\u6587\u91C7\u8C50\u76DB\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u6587\u91C7\u90C1\u90C1\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8AD6\u8A9E\uFF0E\u516B\u4F7E\u300B\uFF1A\u300C\u5468\u76E3\u65BC\u4E8C\u4EE3\uFF0C\u90C1\u90C1\u4E4E\u6587\u54C9\uFF01\u543E\u5F9E\u5468\u3002\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u9999\u6C23\u6FC3\u70C8\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u6FC3\u90C1\u300D\u3001\u300C\u99A5\u90C1\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u6649\u66F8\uFF0E\u5377\u56DB\u56DB\uFF0E\u912D\u88A4\u7B49\u50B3\uFF0E\u8D0A\u66F0\u300B\uFF1A\u300C\u540C\u93D8\u7389\u632F\uFF0C\u722D\u82AC\u862D\u90C1\u3002\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u548C\u6696\u3002",
                  link: [
                    "\u901A\u300C\u71E0\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u6587\u9078\uFF0E\u5289\u5B5D\u6A19\uFF0E\u5EE3\u7D55\u4EA4\u8AD6\u300B\uFF1A\u300C\u6558\u6EAB\u90C1\u5247\u5BD2\u8C37\u6210\u6684\uFF0C\u8AD6\u56B4\u82E6\u5247\u6625\u53E2\u96F6\u8449\u3002\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u59D3\u3002\u5982\u6E05\u4EE3\u6709\u90C1\u677E\u5E74\u3002",
                  type: "\u540D"
                }
              ],
              pinyin: "y\xF9"
            }
          ],
          non_radical_stroke_count: 6,
          radical: "\u9091",
          stroke_count: 9,
          title: "\u90C1"
        }
      }
    },
    {
      char: "\u81F4",
      before: {
        char: "\u81F4",
        pinyin: "zh\xEC",
        tone: 4,
        meaning: "\u7D30\u5BC6\u7684\u7D72\u5E1B\u3002\uFF1B\u7CBE\u7D30\u3001\u7D30\u5BC6\u3002\uFF1B\u7F8E\u597D\u3002",
        traditional: "\u7DFB",
        strokes: 10,
        radical: "\u81F3",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u7F8E\u5FB7"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u7DFB\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u7DFB\u3001\u81F4\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "zh\xEC",
            tone: 4,
            meanings: [
              "\u7D30\u5BC6\u7684\u7D72\u5E1B\u3002",
              "\u7CBE\u7D30\u3001\u7D30\u5BC6\u3002",
              "\u7F8E\u597D\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u7DFB"
          }
        ],
        polyphonic: false,
        variants: [
          "\u81F4",
          "\u7DFB",
          "\u{30B2B}"
        ]
      },
      after: {
        char: "\u81F4",
        pinyin: "zh\xEC",
        tone: 4,
        meaning: "\u7D66\u4E88\u3002\uFF1B\u9054\u5230\u3002\uFF1B\u50B3\u9054\u3001\u8868\u793A\u3002",
        traditional: "\u81F4",
        strokes: 10,
        radical: "\u81F3",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u7F8E\u5FB7"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u81F4\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "zh\xEC",
            tone: 4,
            meanings: [
              "\u7D66\u4E88\u3002",
              "\u9054\u5230\u3002",
              "\u50B3\u9054\u3001\u8868\u793A\u3002",
              "\u62DB\u5F15\u3001\u5EF6\u652C\u3002",
              "\u6B78\u9084\u3001\u9000\u56DE\u3002",
              "\u76E1\u5FC3\u3001\u76E1\u529B\u3002",
              "\u63A8\u6975\u3001\u7AAE\u7A76\u3002",
              "\u65E8\u8DA3\u3001\u610F\u614B\u3002",
              "\u4E8B\u7269\u7684\u9053\u7406\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u81F4"
          }
        ],
        polyphonic: false,
        variants: [
          "\u81F4",
          "\u7DFB",
          "\u{30B2B}"
        ]
      },
      allowedChangedFields: [
        "meaning",
        "traditional",
        "readings",
        "polyphonic",
        "warning"
      ],
      review: {
        rationale: "\u539F\u9ED8\u8BA4\u501F\u7DFB\u7684\u4E1D\u5E1B/\u7CBE\u7EC6\u4E49\uFF1B\u6539\u9009\u672C\u5B57\u81F4\u5B8C\u6574\u539F\u6761\uFF0C\u4EC5\u81F4\u8FDC\u81EA\u7136\u8868\u8FBE\u53E6\u884C\u5BA1\u5B9A\uFF0C\u4E0D\u6CDB\u6388\u5355\u5B57\u4E3B\u9898\u3002",
        defaultPinyinUnchanged: true,
        allHeteronymsPreserved: true,
        standaloneProjectApproval: false
      },
      sourceEvidence: {
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u7DFB",
        beforeRawEntryIndex: 113834,
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3113\u02CB",
              definitions: [
                {
                  def: "\u7D30\u5BC6\u7684\u7D72\u5E1B\u3002",
                  quote: [
                    "\u6E05\uFF0E\u738B\u5FF5\u5B6B\u300A\u5EE3\u96C5\u758F\u8B49\uFF0E\u5377\u4E03\u4E0B\uFF0E\u91CB\u5668\u300B\uFF1A\u300C\u7DFB\uFF0C\u7DF4\u4E5F\u3002\u300D",
                    "\u758F\u8B49\uFF1A\u300C\u7DFB\uFF0C\u4E00\u540D\u7D30\u7DFB\u3002\u300A\u91CB\u540D\u300B\u4E91\uFF1A\u300E\u7D30\u7DFB\uFF0C\u67D3\u7E11\u70BA\u4E94\u8272\uFF0C\u7D30\u4E14\u7DFB\uFF0C\u4E0D\u6F0F\u6C34\u4E5F\u3002\u300F\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u7CBE\u7D30\u3001\u7D30\u5BC6\u3002",
                  quote: [
                    "\u300A\u65B0\u5510\u66F8\uFF0E\u5377\u4E8C\u25CB\u4E09\uFF0E\u6587\u85DD\u50B3\u4E0B\uFF0E\u5D14\u5143\u7FF0\u50B3\u300B\uFF1A\u300C\u5176\u597D\u5B78\u8001\u4E0D\u5026\uFF0C\u7528\u601D\u7CBE\u7DFB\uFF0C\u99B3\u9A01\u73ED\u56FA\u3001\u8521\u9095\u9593\u4EE5\u81EA\u540D\u5BB6\u3002\u300D"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u7F8E\u597D\u3002",
                  quote: [
                    "\u300A\u7D05\u6A13\u5922\uFF0E\u7B2C\u516B\u56DE\u300B\uFF1A\u300C\u8CC8\u6BCD\u898B\u79E6\u937E\u5F62\u5BB9\u6A19\u7DFB\uFF0C\u8209\u6B62\u6EAB\u67D4\u3002\u300D"
                  ],
                  type: "\u5F62"
                }
              ],
              pinyin: "zh\xEC"
            }
          ],
          non_radical_stroke_count: 9,
          radical: "\u7CF8",
          stroke_count: 15,
          title: "\u7DFB"
        },
        afterRawEntryIndex: 120532,
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3113\u02CB",
              definitions: [
                {
                  def: "\u7D66\u4E88\u3002",
                  quote: [
                    "\u300A\u53F2\u8A18\uFF0E\u5377\u56DB\u4E03\uFF0E\u5B54\u5B50\u4E16\u5BB6\u300B\uFF1A\u300C\u9B6F\u4ECA\u4E14\u90CA\uFF0C\u5982\u81F4\u81B0\u4E4E\u5927\u592B\uFF0C\u5247\u543E\u7336\u53EF\u4EE5\u6B62\u3002\u300D",
                    "\u300A\u6649\u66F8\uFF0E\u5377\u56DB\u4E09\uFF0E\u5C71\u6FE4\u50B3\u300B\uFF1A\u300C\u4ECA\u81F4\u9322\u4E8C\u5341\u842C\u3001\u7A40\u4E8C\u767E\u659B\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u9054\u5230\u3002",
                  quote: [
                    "\u300A\u838A\u5B50\uFF0E\u5916\u7269\u300B\uFF1A\u300C\u5929\u5730\u975E\u4E0D\u5EE3\u4E14\u5927\u4E5F\uFF0C\u4EBA\u4E4B\u6240\u7528\u5BB9\u8DB3\u8033\uFF1B\u7136\u5247\u5EC1\u8DB3\u800C\u588A\u4E4B\uFF0C\u81F4\u9EC3\u6CC9\uFF0C\u4EBA\u5C1A\u6709\u7528\u4E4E\uFF1F\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u50B3\u9054\u3001\u8868\u793A\u3002",
                  quote: [
                    "\u300A\u8A69\u7D93\uFF0E\u5C0F\u96C5\uFF0E\u695A\u8328\u300B\uFF1A\u300C\u5DE5\u795D\u81F4\u544A\uFF0C\u5F82\u8CDA\u5B5D\u5B6B\u3002\u300D",
                    "\u300A\u4E09\u570B\u5FD7\uFF0E\u5377\u4E8C\u56DB\uFF0E\u9B4F\u66F8\uFF0E\u5D14\u6797\u50B3\u300B\uFF1A\u300C\u4ED7\u7BC0\u7D71\u4E8B\uFF0C\u5DDE\u90B5\u83AB\u4E0D\u5949\u724B\u81F4\u656C\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u62DB\u5F15\u3001\u5EF6\u652C\u3002",
                  quote: [
                    "\u300A\u6613\u7D93\uFF0E\u9700\u5366\uFF0E\u4E5D\u4E09\u300B\uFF1A\u300C\u9700\u4E8E\u6CE5\uFF0C\u81F4\u5BC7\u81F3\u3002\u300D",
                    "\u300A\u6F22\u66F8\uFF0E\u5377\u4E09\u4E5D\uFF0E\u856D\u4F55\u50B3\u300B\uFF1A\u300C\u81E3\u9858\u5927\u738B\u738B\u6F22\u4E2D\uFF0C\u990A\u5176\u6C11\u4EE5\u81F4\u8CE2\u4EBA\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u6B78\u9084\u3001\u9000\u56DE\u3002",
                  quote: [
                    "\u300A\u516C\u7F8A\u50B3\uFF0E\u5BA3\u516C\u5143\u5E74\u300B\uFF1A\u300C\u65E2\u800C\u66F0\u82E5\u6B64\u4E4E\uFF0C\u53E4\u4E4B\u9053\u4E0D\u5373\u4EBA\u5FC3\uFF0C\u9000\u800C\u81F4\u4ED5\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u76E1\u5FC3\u3001\u76E1\u529B\u3002",
                  quote: [
                    "\u300A\u8AD6\u8A9E\uFF0E\u5B50\u5F35\u300B\uFF1A\u300C\u4EBA\u672A\u6709\u81EA\u81F4\u8005\u4E5F\uFF0C\u5FC5\u4E5F\u89AA\u55AA\u4E4E\uFF1F\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u63A8\u6975\u3001\u7AAE\u7A76\u3002",
                  quote: [
                    "\u300A\u79AE\u8A18\uFF0E\u5927\u5B78\u300B\uFF1A\u300C\u6B32\u8AA0\u5176\u610F\u8005\uFF0C\u5148\u81F4\u5176\u77E5\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u65E8\u8DA3\u3001\u610F\u614B\u3002",
                  quote: [
                    "\u300A\u9B4F\u66F8\uFF0E\u5377\u4E5D\u4E09\uFF0E\u6069\u5016\u50B3\uFF0E\u8339\u7693\u50B3\u300B\uFF1A\u300C\u6A39\u8349\u683D\u6728\uFF0C\u9817\u6709\u91CE\u81F4\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u4E8B\u7269\u7684\u9053\u7406\u3002",
                  quote: [
                    "\u300A\u6587\u9078\uFF0E\u8881\u5B8F\uFF0E\u4E09\u570B\u540D\u81E3\u5E8F\u8D0A\u300B\uFF1A\u300C\u6240\u4EE5\u5B58\u4EA1\u6B8A\u81F4\uFF0C\u59CB\u7D42\u4E0D\u540C\u3002\u300D"
                  ],
                  type: "\u540D"
                }
              ],
              pinyin: "zh\xEC"
            }
          ],
          non_radical_stroke_count: 3,
          radical: "\u81F3",
          stroke_count: 9,
          title: "\u81F4"
        }
      }
    }
  ],
  semanticMigrations: {
    defaultSenseMap: {
      \u51AC: {
        before: {
          meaning: "\u575A\u97E7",
          readings: [
            {
              char: "\u51AC",
              pinyin: "d\u014Dng",
              tone: 1,
              sourceId: "moe-revised",
              dictionaryWord: "\u9F15"
            }
          ],
          status: "bound-default-reading"
        },
        after: {
          meaning: "\u575A\u97E7\uFF08\u9879\u76EE\u539F\u521B\u5B63\u8282\u7C7B\u6BD4\uFF0C\u975E\u5B57\u5178\u539F\u4E49\uFF09",
          readings: [
            {
              char: "\u51AC",
              pinyin: "d\u014Dng",
              tone: 1,
              sourceId: "moe-revised",
              dictionaryWord: "\u51AC",
              dictionarySense: "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u6700\u5F8C\u4E00\u5B63\u3002\u8FB2\u66C6\u6307\u7ACB\u51AC\u81F3\u7ACB\u6625\u7684\u6642\u671F\uFF0C\u4E00\u822C\u800C\u8A00\u6C23\u6EAB\u8F03\u4F4E\u3002\u82E5\u4EE5\u5317\u534A\u7403\u6C23\u5019\u8AD6\uFF0C\u6982\u6307\u5341\u4E00\u6708\u6216\u5341\u4E8C\u6708\u81F3\u7FCC\u5E74\u7684\u4E8C\u6708\u6216\u4E09\u6708\u671F\u9593\u3002",
              rawHeteronymIndex: 0,
              rawDefinitionIndex: 0
            }
          ],
          status: "bound-default-reading"
        },
        review: {
          kind: "project-seasonal-metaphor",
          dictionaryDefinitionClaim: false,
          standaloneCharacterApproval: false,
          scope: "\u4EC5\u4EE5\u51AC\u5B63\u5BD2\u51B7\u73AF\u5883\u8054\u60F3\u575A\u97E7\u7684\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u4E0D\u662F\u8BCD\u5178\u5173\u4E8E\u4EBA\u683C\u6216\u547D\u8FD0\u7684\u5224\u65AD\u3002"
        }
      },
      \u79CB: {
        before: {
          meaning: "\u6536\u83B7",
          readings: [
            {
              char: "\u79CB",
              pinyin: "qi\u016B",
              tone: 1,
              sourceId: "moe-revised",
              dictionaryWord: "\u97A6"
            }
          ],
          status: "bound-default-reading"
        },
        after: {
          meaning: "\u6536\u83B7\uFF08\u9879\u76EE\u539F\u521B\u5B63\u8282\u7C7B\u6BD4\uFF0C\u975E\u5B57\u5178\u539F\u4E49\uFF09",
          readings: [
            {
              char: "\u79CB",
              pinyin: "qi\u016B",
              tone: 1,
              sourceId: "moe-revised",
              dictionaryWord: "\u79CB",
              dictionarySense: "\u4E00\u5E74\u56DB\u5B63\u4E2D\u7684\u7B2C\u4E09\u5B63\u3002\u8FB2\u66C6\u70BA\u4E03\u3001\u516B\u3001\u4E5D\u6708\uFF0C\u967D\u66C6\u70BA\u4E5D\u3001\u5341\u3001\u5341\u4E00\u6708\u3002",
              rawHeteronymIndex: 0,
              rawDefinitionIndex: 0
            }
          ],
          status: "bound-default-reading"
        },
        review: {
          kind: "project-seasonal-metaphor",
          dictionaryDefinitionClaim: false,
          standaloneCharacterApproval: false,
          scope: "\u4EC5\u4EE5\u79CB\u5B63\u4E0E\u79CB\u6536\u7684\u8054\u7CFB\u4F5C\u6536\u83B7\u7684\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u4E0D\u662F\u628A\u6536\u83B7\u5192\u79F0\u4E3A\u79CB\u7684\u8BCD\u5178\u539F\u4E49\u3002"
        }
      }
    },
    naturalPairs: [
      {
        name: "\u81F4\u8FDC",
        before: {
          name: "\u81F4\u8FDC",
          readings: [
            {
              char: "\u81F4",
              pinyin: "zh\xEC",
              tone: 4,
              sourceId: "moe-revised",
              dictionaryWord: "\u7DFB"
            },
            {
              char: "\u8FDC",
              pinyin: "yu\u01CEn",
              tone: 3,
              sourceId: "moe-revised",
              dictionaryWord: "\u9060"
            }
          ],
          status: "bound-default-reading"
        },
        after: {
          name: "\u81F4\u8FDC",
          readings: [
            {
              char: "\u81F4",
              pinyin: "zh\xEC",
              tone: 4,
              sourceId: "moe-revised",
              dictionaryWord: "\u81F4",
              dictionarySense: "\u9054\u5230\u3002",
              rawHeteronymIndex: 0,
              rawDefinitionIndex: 1
            },
            {
              char: "\u8FDC",
              pinyin: "yu\u01CEn",
              tone: 3,
              sourceId: "moe-revised",
              dictionaryWord: "\u9060",
              dictionarySense: "\u6642\u9593\u3001\u7A7A\u9593\u7684\u8DDD\u96E2\u5927\u3002\u8207\u300C\u8FD1\u300D\u76F8\u5C0D\u3002",
              rawHeteronymIndex: 0,
              rawDefinitionIndex: 0
            }
          ],
          status: "bound-default-reading"
        },
        review: {
          kind: "modern-natural-expression",
          newCitation: false,
          standaloneCharacterApproval: false,
          scope: "\u4EC5\u6309\u81F4\u7684\u9054\u5230\u4E0E\u9060\u7684\u8DDD\u79BB\u5927\u89E3\u91CA\u4E3A\u8FBE\u5230\u8FDC\u5904\u7684\u73B0\u4EE3\u81EA\u7136\u642D\u914D\uFF0C\u4E0D\u81EA\u52A8\u9644\u8BF8\u845B\u4EAE\u6216\u5176\u4ED6\u7ECF\u5178\u51FA\u5904\uFF0C\u4E0D\u6269\u6210\u5176\u4ED6\u81F4\u5B57\u5BD3\u610F\u3002"
        }
      }
    ]
  },
  nameRules: [
    {
      name: "\u626C\u5584",
      ruleId: "naming-v5-proposal-zhouyi-14-xiang-626c5584",
      citation: {
        id: "zhouyi-14-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C14\u5366\xB7\u706B\u5929\u5927\u6709\xB7\u5927\u8C61",
        text: "\u706B\u5728\u5929\u4E0A\uFF0C\u5927\u6709\u3002\u541B\u5B50\u4EE5\u904F\u6076\u626C\u5584\uFF0C\u987A\u5929\u4F11\u547D\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u904F\u6076\u626C\u5584",
      extraction: "continuous",
      context: "\u5927\u8C61\u8981\u6C42\u904F\u6B62\u6076\u4E8B\u3001\u5F70\u626C\u5584\u4E8B\uFF1B\u626C\u4E3A\u5F70\u663E\uFF0C\u5584\u4E3A\u7F8E\u597D\u7684\u4E8B\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4FDD\u7559\u904F\u6076\u4E0E\u987A\u5929\u4F11\u547D\u7684\u539F\u6587\uFF0C\u4E0D\u628A\u5927\u6709\u5366\u540D\u89E3\u91CA\u6210\u4E2A\u4EBA\u5FC5\u7136\u5BCC\u6709\u3002",
      meaning: "\u613F\u5B69\u5B50\u8FA8\u522B\u662F\u975E\u3001\u4E50\u4E8E\u80AF\u5B9A\u4E0E\u8DF5\u884C\u5584\u610F\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5927\u8C61\u8981\u6C42\u904F\u6B62\u6076\u4E8B\u3001\u5F70\u626C\u5584\u4E8B\uFF1B\u626C\u4E3A\u5F70\u663E\uFF0C\u5584\u4E3A\u7F8E\u597D\u7684\u4E8B\u3002\uFF09",
      sourceMeaning: "\u5927\u8C61\u8981\u6C42\u904F\u6B62\u6076\u4E8B\u3001\u5F70\u626C\u5584\u4E8B\uFF1B\u626C\u4E3A\u5F70\u663E\uFF0C\u5584\u4E3A\u7F8E\u597D\u7684\u4E8B\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8FA8\u522B\u662F\u975E\u3001\u4E50\u4E8E\u80AF\u5B9A\u4E0E\u8DF5\u884C\u5584\u610F\u3002",
      readings: [
        {
          char: "\u626C",
          pinyin: "y\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u63DA",
          dictionarySense: "\u5F70\u986F\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u5584",
          pinyin: "sh\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5584",
          dictionarySense: "\u7F8E\u597D\u7684\u4E8B\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u614E\u8A00",
      ruleId: "naming-v5-proposal-zhouyi-27-xiang-614e8a00",
      citation: {
        id: "zhouyi-27-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C27\u5366\xB7\u5C71\u96F7\u9890\xB7\u5927\u8C61",
        text: "\u5C71\u4E0B\u6709\u96F7\uFF0C\u9890\u3002\u541B\u5B50\u4EE5\u614E\u8A00\u8BED\uFF0C\u8282\u996E\u98DF\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u614E\u8A00\u8BED\uFF0C\u8282\u996E\u98DF",
      extraction: "continuous",
      context: "\u5927\u8C61\u5C06\u8C28\u614E\u8A00\u8BED\u4E0E\u8282\u5236\u996E\u98DF\u5E76\u5217\uFF0C\u662F\u4FEE\u8EAB\u529D\u6212\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u614E\u8A00\u662F\u614E\u8A00\u8BED\u7684\u8FDE\u7EED\u6458\u5B57\uFF1B\u4E0D\u662F\u8981\u6C42\u5B69\u5B50\u6C89\u9ED8\u6216\u6027\u683C\u5185\u5411\u3002",
      meaning: "\u613F\u5B69\u5B50\u8868\u8FBE\u8BA4\u771F\u3001\u8BF4\u8BDD\u6709\u5206\u5BF8\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5927\u8C61\u5C06\u8C28\u614E\u8A00\u8BED\u4E0E\u8282\u5236\u996E\u98DF\u5E76\u5217\uFF0C\u662F\u4FEE\u8EAB\u529D\u6212\u3002\uFF09",
      sourceMeaning: "\u5927\u8C61\u5C06\u8C28\u614E\u8A00\u8BED\u4E0E\u8282\u5236\u996E\u98DF\u5E76\u5217\uFF0C\u662F\u4FEE\u8EAB\u529D\u6212\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8868\u8FBE\u8BA4\u771F\u3001\u8BF4\u8BDD\u6709\u5206\u5BF8\u3002",
      readings: [
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E",
          dictionarySense: "\u5C0F\u5FC3\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00",
          dictionarySense: "\u8A71\u8A9E\u3001\u6240\u8AAA\u7684\u8A71\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 5
        }
      ]
    },
    {
      name: "\u6709\u6052",
      ruleId: "naming-v5-proposal-zhouyi-37-xiang-67096052",
      citation: {
        id: "zhouyi-37-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C37\u5366\xB7\u98CE\u706B\u5BB6\u4EBA\xB7\u5927\u8C61",
        text: "\u98CE\u81EA\u706B\u51FA\uFF0C\u5BB6\u4EBA\u3002\u541B\u5B50\u4EE5\u8A00\u6709\u7269\u800C\u884C\u6709\u6052\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u8A00\u6709\u7269\u800C\u884C\u6709\u6052",
      extraction: "continuous",
      context: "\u5927\u8C61\u8BB2\u8A00\u8BED\u6709\u5185\u5BB9\u3001\u884C\u52A8\u6709\u6052\u5E38\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4FDD\u7559\u8A00\u3001\u884C\u5E76\u4E3E\u7684\u8BED\u5883\uFF1B\u4E0D\u628A\u6052\u89E3\u91CA\u6210\u4E00\u751F\u72B6\u6001\u6C38\u4E0D\u53D8\u5316\u3002",
      meaning: "\u613F\u5B69\u5B50\u505A\u4E8B\u6709\u59CB\u6709\u7EC8\u3001\u4FDD\u6301\u8010\u5FC3\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5927\u8C61\u8BB2\u8A00\u8BED\u6709\u5185\u5BB9\u3001\u884C\u52A8\u6709\u6052\u5E38\u3002\uFF09",
      sourceMeaning: "\u5927\u8C61\u8BB2\u8A00\u8BED\u6709\u5185\u5BB9\u3001\u884C\u52A8\u6709\u6052\u5E38\u3002",
      projectWish: "\u613F\u5B69\u5B50\u505A\u4E8B\u6709\u59CB\u6709\u7EC8\u3001\u4FDD\u6301\u8010\u5FC3\u3002",
      readings: [
        {
          char: "\u6709",
          pinyin: "y\u01D2u",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6709",
          dictionarySense: "\u8868\u4E8B\u5BE6\u3001\u72C0\u6CC1\u7684\u6B63\u9762\u5B58\u5728\uFF0C\u8207\u300C\u7121\u300D\u76F8\u5C0D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u6052",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6046",
          dictionarySense: "\u9577\u4E45\u7684\u3001\u4E0D\u8B8A\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u9E64\u9E23",
      ruleId: "naming-v5-proposal-shijing-184-1-9e649e23",
      citation: {
        id: "shijing-184-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E3F\u96C1\u4E4B\u4EC0\xB7\u9E64\u9E23 \u7B2C1\u7AE0",
        text: "\u9E64\u9E23\u4E8E\u4E5D\u768B\uFF0C\u58F0\u95FB\u4E8E\u91CE\u3002\u9C7C\u6F5C\u5728\u6E0A\uFF0C\u6216\u5728\u4E8E\u6E1A\u3002\u4E50\u5F7C\u4E4B\u56ED\uFF0C\u7230\u6709\u6811\u6A80\uFF0C\u5176\u4E0B\u7EF4\u841A\u3002\u4ED6\u5C71\u4E4B\u77F3\uFF0C\u53EF\u4EE5\u4E3A\u9519\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u9E64\u9E23\u4E8E\u4E5D\u768B\uFF0C\u58F0\u95FB\u4E8E\u91CE",
      extraction: "continuous",
      context: "\u539F\u8BD7\u5199\u9E64\u5728\u4E5D\u768B\u9E23\u53EB\u3001\u58F0\u97F3\u4F20\u5230\u91CE\u5916\uFF1B\u5168\u7BC7\u8FD8\u5199\u9C7C\u3001\u56ED\u6797\u4E0E\u4ED6\u5C71\u4E4B\u77F3\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u9884\u8BBE\u6574\u8BD7\u5BD3\u610F\u7684\u4E89\u8BAE\u6027\u4EBA\u7269\u6620\u5C04\uFF1B\u4E0D\u7531\u9E64\u7684\u4F20\u7EDF\u8C61\u5F81\u63A8\u65AD\u5BFF\u547D\u6216\u58F0\u540D\u3002",
      meaning: "\u501F\u6E05\u8D8A\u6709\u5E94\u7684\u81EA\u7136\u610F\u8C61\uFF0C\u5BC4\u671B\u5766\u8BDA\u8868\u8FBE\u3001\u5584\u4E8E\u503E\u542C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u8BD7\u5199\u9E64\u5728\u4E5D\u768B\u9E23\u53EB\u3001\u58F0\u97F3\u4F20\u5230\u91CE\u5916\uFF1B\u5168\u7BC7\u8FD8\u5199\u9C7C\u3001\u56ED\u6797\u4E0E\u4ED6\u5C71\u4E4B\u77F3\u3002\uFF09",
      sourceMeaning: "\u539F\u8BD7\u5199\u9E64\u5728\u4E5D\u768B\u9E23\u53EB\u3001\u58F0\u97F3\u4F20\u5230\u91CE\u5916\uFF1B\u5168\u7BC7\u8FD8\u5199\u9C7C\u3001\u56ED\u6797\u4E0E\u4ED6\u5C71\u4E4B\u77F3\u3002",
      projectWish: "\u501F\u6E05\u8D8A\u6709\u5E94\u7684\u81EA\u7136\u610F\u8C61\uFF0C\u5BC4\u671B\u5766\u8BDA\u8868\u8FBE\u3001\u5584\u4E8E\u503E\u542C\u3002",
      readings: [
        {
          char: "\u9E64",
          pinyin: "h\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9DB4",
          dictionarySense: "\u9CE5\u7DB1\u9DB4\u5F62\u76EE\u52D5\u7269\u7684\u901A\u7A31\u3002\u982D\u5C0F\uFF0C\u9838\u3001\u5599\u3001\u8173\u7686\u7D30\u9577\uFF0C\u9AD8\u4E09\u5C3A\u9918\u3002\u7FBD\u6BDB\u767D\u8272\u6216\u7070\u8272\uFF0C\u7FFC\u5927\u5584\u98DB\uFF0C\u9CF4\u8072\u9AD8\u6717\u3002\u591A\u751F\u6D3B\u65BC\u6CBC\u6FA4\u6216\u5E73\u539F\u6C34\u969B\uFF0C\u4EE5\u5C0F\u9B5A\u3001\u6606\u87F2\u53CA\u7A40\u985E\u70BA\u98DF\u3002\u7A2E\u985E\u751A\u591A\uFF0C\u5927\u9678\u5730\u5340\u5E38\u898B\u7684\u6709\u767D\u9DB4\u3001\u7070\u9DB4\u3001\u4E39\u9802\u9DB4\u3001\u84D1\u7FBD\u9DB4\u7B49\u3002\u9DB4\u5728\u50B3\u8AAA\u4E2D\u662F\u795E\u4ED9\u7684\u5750\u9A0E\uFF0C\u4E5F\u662F\u9577\u58FD\u7684\u8C61\u5FB5\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u9E23",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9CF4",
          dictionarySense: "\u6606\u87F2\u9CE5\u7378\u767C\u8072\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u6E29\u60E0",
      ruleId: "naming-v5-proposal-shijing-28-4-6e2960e0",
      citation: {
        id: "shijing-28-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90B6\u98CE\xB7\u71D5\u71D5 \u7B2C4\u7AE0",
        text: "\u4EF2\u6C0F\u4EFB\u53EA\uFF0C\u5176\u5FC3\u585E\u6E0A\u3002\u7EC8\u6E29\u4E14\u60E0\uFF0C\u6DD1\u614E\u5176\u8EAB\u3002\u5148\u541B\u4E4B\u601D\uFF0C\u4EE5\u52D6\u5BE1\u4EBA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u7EC8\u6E29\u4E14\u60E0\uFF0C\u6DD1\u614E\u5176\u8EAB",
      extraction: "recombined",
      context: "\u9001\u522B\u8BD7\u672B\u6BB5\u79F0\u8D5E\u4EF2\u6C0F\u6E29\u548C\u3001\u548C\u987A\u4E14\u614E\u4E8E\u81EA\u8EAB\uFF1B\u6E29\u4E0E\u60E0\u9694\u7740\u4E14\u5B57\u3002 \u672C\u540D\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u8BCD\uFF1B\u5168\u7BC7\u6709\u9001\u522B\u3001\u6D95\u6CE3\uFF0C\u4E0D\u80FD\u79F0\u6574\u8BD7\u4E3A\u5409\u5E86\u795D\u8F9E\u3002",
      meaning: "\u613F\u5B69\u5B50\u6E29\u539A\u5F85\u4EBA\uFF0C\u540C\u65F6\u73CD\u91CD\u81EA\u6211\u4FEE\u517B\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u9001\u522B\u8BD7\u672B\u6BB5\u79F0\u8D5E\u4EF2\u6C0F\u6E29\u548C\u3001\u548C\u987A\u4E14\u614E\u4E8E\u81EA\u8EAB\uFF1B\u6E29\u4E0E\u60E0\u9694\u7740\u4E14\u5B57\u3002\uFF09",
      sourceMeaning: "\u9001\u522B\u8BD7\u672B\u6BB5\u79F0\u8D5E\u4EF2\u6C0F\u6E29\u548C\u3001\u548C\u987A\u4E14\u614E\u4E8E\u81EA\u8EAB\uFF1B\u6E29\u4E0E\u60E0\u9694\u7740\u4E14\u5B57\u3002",
      projectWish: "\u613F\u5B69\u5B50\u6E29\u539A\u5F85\u4EBA\uFF0C\u540C\u65F6\u73CD\u91CD\u81EA\u6211\u4FEE\u517B\u3002",
      readings: [
        {
          char: "\u6E29",
          pinyin: "w\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAB",
          dictionarySense: "\u67D4\u548C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0",
          dictionarySense: "\u67D4\u9806\u3001\u548C\u9806\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 4
        }
      ]
    },
    {
      name: "\u8083\u96CD",
      ruleId: "naming-v5-proposal-shijing-266-1-808396cd",
      citation: {
        id: "shijing-266-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5468\u9882\xB7\u6E05\u5E99\u4E4B\u4EC0\xB7\u6E05\u5E99 \u7B2C1\u7AE0",
        text: "\u4E8E\u7A46\u6E05\u5E99\uFF0C\u8083\u96CD\u663E\u76F8\u3002\u6D4E\u6D4E\u591A\u58EB\uFF0C\u79C9\u6587\u4E4B\u5FB7\u3002\u5BF9\u8D8A\u5728\u5929\uFF0C\u9A8F\u5954\u8D70\u5728\u5E99\u3002\u4E0D\u663E\u4E0D\u627F\uFF0C\u65E0\u5C04\u4E8E\u4EBA\u65AF\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u4E8E\u7A46\u6E05\u5E99\uFF0C\u8083\u96CD\u663E\u76F8",
      extraction: "continuous",
      context: "\u6E05\u5E99\u796D\u7940\u8BED\u5883\u4E2D\u7684\u606D\u656C\u3001\u548C\u8C10\uFF1B\u4E0D\u662F\u60E9\u7F5A\u4E25\u8083\u6216\u5730\u7406\u96CD\u5DDE\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u660E\u786E\u5176\u796D\u7940\u793C\u4EEA\u80CC\u666F\uFF1B\u4E0D\u4EE5\u5E99\u5802\u8EAB\u4EFD\u4FDD\u8BC1\u5730\u4F4D\u3002",
      meaning: "\u613F\u5B69\u5B50\u656C\u91CD\u4ED6\u4EBA\u3001\u5904\u4E8B\u548C\u800C\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u6E05\u5E99\u796D\u7940\u8BED\u5883\u4E2D\u7684\u606D\u656C\u3001\u548C\u8C10\uFF1B\u4E0D\u662F\u60E9\u7F5A\u4E25\u8083\u6216\u5730\u7406\u96CD\u5DDE\u3002\uFF09",
      sourceMeaning: "\u6E05\u5E99\u796D\u7940\u8BED\u5883\u4E2D\u7684\u606D\u656C\u3001\u548C\u8C10\uFF1B\u4E0D\u662F\u60E9\u7F5A\u4E25\u8083\u6216\u5730\u7406\u96CD\u5DDE\u3002",
      projectWish: "\u613F\u5B69\u5B50\u656C\u91CD\u4ED6\u4EBA\u3001\u5904\u4E8B\u548C\u800C\u6709\u793C\u3002",
      readings: [
        {
          char: "\u8083",
          pinyin: "s\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u8085",
          dictionarySense: "\u606D\u656C\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u96CD",
          pinyin: "y\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u96CD",
          dictionarySense: "\u548C\u8AE7\u7684\u3001\u548C\u7766\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5982\u748B",
      ruleId: "naming-v5-proposal-shijing-252-6-5982748b",
      citation: {
        id: "shijing-252-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u5377\u963F \u7B2C6\u7AE0",
        text: "\u9899\u9899\u536C\u536C\uFF0C\u5982\u572D\u5982\u748B\uFF0C\u4EE4\u95FB\u4EE4\u671B\u3002\u5C82\u5F1F\u541B\u5B50\uFF0C\u56DB\u65B9\u4E3A\u7EB2\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u9899\u9899\u536C\u536C\uFF0C\u5982\u572D\u5982\u748B\uFF0C\u4EE4\u95FB\u4EE4\u671B",
      extraction: "continuous",
      context: "\u4EE5\u572D\u748B\u8FD9\u6837\u7684\u7389\u5668\u6BD4\u55BB\u53D7\u8D5E\u4EBA\u7269\u7684\u98CE\u91C7\uFF1B\u748B\u662F\u5F62\u5982\u534A\u572D\u7684\u7389\u5668\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u539F\u7BC7\u6709\u738B\u8005\u3001\u8D24\u58EB\u548C\u795D\u9882\u80CC\u666F\uFF1B\u4E0D\u5C06\u793C\u5668\u8EAB\u4EF7\u6216\u7B49\u7EA7\u8D4B\u7ED9\u5B69\u5B50\u3002",
      meaning: "\u501F\u7389\u5668\u7AEF\u6574\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u81EA\u6301\u6709\u5EA6\u3001\u73CD\u60DC\u54C1\u683C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u4EE5\u572D\u748B\u8FD9\u6837\u7684\u7389\u5668\u6BD4\u55BB\u53D7\u8D5E\u4EBA\u7269\u7684\u98CE\u91C7\uFF1B\u748B\u662F\u5F62\u5982\u534A\u572D\u7684\u7389\u5668\u3002\uFF09",
      sourceMeaning: "\u4EE5\u572D\u748B\u8FD9\u6837\u7684\u7389\u5668\u6BD4\u55BB\u53D7\u8D5E\u4EBA\u7269\u7684\u98CE\u91C7\uFF1B\u748B\u662F\u5F62\u5982\u534A\u572D\u7684\u7389\u5668\u3002",
      projectWish: "\u501F\u7389\u5668\u7AEF\u6574\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u81EA\u6301\u6709\u5EA6\u3001\u73CD\u60DC\u54C1\u683C\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982",
          dictionarySense: "\u5982\u540C\u3001\u597D\u50CF\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u748B",
          pinyin: "zh\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u748B",
          dictionarySense: "\u7389\u5668\uFF0C\u5F62\u5982\u534A\u572D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u71D5\u559C",
      ruleId: "naming-v5-proposal-shijing-177-6-71d5559c",
      citation: {
        id: "shijing-177-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u516D\u6708 \u7B2C6\u7AE0",
        text: "\u5409\u752B\u71D5\u559C\uFF0C\u65E2\u591A\u53D7\u7949\u3002\u6765\u5F52\u81EA\u9550\uFF0C\u6211\u884C\u6C38\u4E45\u3002\u996E\u5FA1\u8BF8\u53CB\uFF0C\u70B0\u9CD6\u810D\u9CA4\u3002\u4FAF\u8C01\u5728\u77E3\uFF1F\u5F20\u4EF2\u5B5D\u53CB\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5409\u752B\u71D5\u559C\uFF0C\u65E2\u591A\u53D7\u7949",
      extraction: "continuous",
      context: "\u539F\u7BC7\u5199\u51FA\u5F81\uFF0C\u672B\u6BB5\u8F6C\u4E3A\u5409\u752B\u5F52\u6765\u4E0E\u670B\u53CB\u5BB4\u996E\u6B22\u559C\uFF1B\u71D5\u5728\u672C\u53E5\u662F\u5BB4\u996E\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u628A\u672C\u53E5\u71D5\u89E3\u91CA\u4E3A\u71D5\u5B50\uFF1B\u539F\u8BD7\u7684\u6218\u4E89\u4E0E\u795D\u7949\u5747\u4FDD\u7559\uFF0C\u4E0D\u8F6C\u6210\u672A\u6765\u6210\u5C31\u4FDD\u8BC1\u3002",
      meaning: "\u501F\u76F8\u805A\u6B22\u559C\u7684\u573A\u9762\uFF0C\u5BC4\u671B\u73CD\u91CD\u53CB\u8C0A\u3001\u61C2\u5F97\u5206\u4EAB\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u7BC7\u5199\u51FA\u5F81\uFF0C\u672B\u6BB5\u8F6C\u4E3A\u5409\u752B\u5F52\u6765\u4E0E\u670B\u53CB\u5BB4\u996E\u6B22\u559C\uFF1B\u71D5\u5728\u672C\u53E5\u662F\u5BB4\u996E\u3002\uFF09",
      sourceMeaning: "\u539F\u7BC7\u5199\u51FA\u5F81\uFF0C\u672B\u6BB5\u8F6C\u4E3A\u5409\u752B\u5F52\u6765\u4E0E\u670B\u53CB\u5BB4\u996E\u6B22\u559C\uFF1B\u71D5\u5728\u672C\u53E5\u662F\u5BB4\u996E\u3002",
      projectWish: "\u501F\u76F8\u805A\u6B22\u559C\u7684\u573A\u9762\uFF0C\u5BC4\u671B\u73CD\u91CD\u53CB\u8C0A\u3001\u61C2\u5F97\u5206\u4EAB\u3002",
      readings: [
        {
          char: "\u71D5",
          pinyin: "y\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u71D5",
          dictionarySense: "\u5BB4\u98F2\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u559C",
          pinyin: "x\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u559C",
          dictionarySense: "\u611F\u5230\u6B61\u6A02\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        }
      ]
    },
    {
      name: "\u656C\u4EEA",
      ruleId: "naming-v5-proposal-shijing-253-6-656c4eea",
      citation: {
        id: "shijing-253-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u6C11\u52B3 \u7B2C6\u7AE0",
        text: "\u5F0F\u904F\u5BC7\u8650\uFF0C\u65E0\u4FFE\u4F5C\u615D\u3002\u656C\u614E\u5A01\u4EEA\uFF0C\u4EE5\u8FD1\u6709\u5FB7\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u656C\u614E\u5A01\u4EEA\uFF0C\u4EE5\u8FD1\u6709\u5FB7",
      extraction: "recombined",
      context: "\u529D\u6212\u6CBB\u7406\u8005\u656C\u614E\u4E3E\u6B62\u3001\u4EB2\u8FD1\u6709\u5FB7\u8005\uFF1B\u53D6\u656C\u4E0E\u4EEA\uFF0C\u7701\u53BB\u614E\u5A01\u3002 \u672C\u540D\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u540C\u4E00\u53E5\u62BD\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u8FDE\u7EED\u539F\u8BCD\uFF1B\u4E0D\u628A\u5A01\u4EEA\u91CA\u6210\u5BB9\u8C8C\u6216\u4EBA\u683C\u6D4B\u8BC4\u3002",
      meaning: "\u613F\u5B69\u5B50\u5F85\u4EBA\u6709\u793C\u3001\u4E3E\u6B62\u8BA4\u771F\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u529D\u6212\u6CBB\u7406\u8005\u656C\u614E\u4E3E\u6B62\u3001\u4EB2\u8FD1\u6709\u5FB7\u8005\uFF1B\u53D6\u656C\u4E0E\u4EEA\uFF0C\u7701\u53BB\u614E\u5A01\u3002\uFF09",
      sourceMeaning: "\u529D\u6212\u6CBB\u7406\u8005\u656C\u614E\u4E3E\u6B62\u3001\u4EB2\u8FD1\u6709\u5FB7\u8005\uFF1B\u53D6\u656C\u4E0E\u4EEA\uFF0C\u7701\u53BB\u614E\u5A01\u3002",
      projectWish: "\u613F\u5B69\u5B50\u5F85\u4EBA\u6709\u793C\u3001\u4E3E\u6B62\u8BA4\u771F\u3002",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C",
          dictionarySense: "\u614E\u91CD\u3001\u606D\u656C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100",
          dictionarySense: "\u8209\u6B62\u5BB9\u8C8C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 3
        }
      ]
    },
    {
      name: "\u4E54\u6728",
      ruleId: "naming-v5-proposal-shijing-165-1-4e546728",
      citation: {
        id: "shijing-165-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E7F\u9E23\u4E4B\u4EC0\xB7\u4F10\u6728 \u7B2C1\u7AE0",
        text: "\u4F10\u6728\u4E01\u4E01\uFF0C\u9E1F\u9E23\u5624\u5624\u3002\u51FA\u81EA\u5E7D\u8C37\uFF0C\u8FC1\u4E8E\u4E54\u6728\u3002\u5624\u5176\u9E23\u77E3\uFF0C\u6C42\u5176\u53CB\u58F0\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u51FA\u81EA\u5E7D\u8C37\uFF0C\u8FC1\u4E8E\u4E54\u6728",
      extraction: "continuous",
      context: "\u5199\u9E1F\u4ECE\u5E7D\u8C37\u8FC1\u5230\u9AD8\u5927\u7684\u6811\u6728\uFF0C\u7EE7\u800C\u5199\u6C42\u53CB\u3001\u8BBE\u5BB4\u5F85\u4EB2\u53CB\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u91C7\u7528\u4F10\u6728\u800C\u975E\u4E0D\u53EF\u4F11\u606F\u7684\u6C49\u5E7F\uFF1B\u4E0D\u628A\u4E54\u6728\u76F4\u63A5\u6539\u91CA\u4E3A\u5347\u8FC1\u6216\u663E\u8D35\u3002",
      meaning: "\u501F\u6811\u6728\u633A\u7ACB\u7684\u81EA\u7136\u5F62\u8C61\uFF0C\u5BC4\u671B\u7A33\u5065\u6210\u957F\u3001\u73CD\u60DC\u53CB\u8C0A\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5199\u9E1F\u4ECE\u5E7D\u8C37\u8FC1\u5230\u9AD8\u5927\u7684\u6811\u6728\uFF0C\u7EE7\u800C\u5199\u6C42\u53CB\u3001\u8BBE\u5BB4\u5F85\u4EB2\u53CB\u3002\uFF09",
      sourceMeaning: "\u5199\u9E1F\u4ECE\u5E7D\u8C37\u8FC1\u5230\u9AD8\u5927\u7684\u6811\u6728\uFF0C\u7EE7\u800C\u5199\u6C42\u53CB\u3001\u8BBE\u5BB4\u5F85\u4EB2\u53CB\u3002",
      projectWish: "\u501F\u6811\u6728\u633A\u7ACB\u7684\u81EA\u7136\u5F62\u8C61\uFF0C\u5BC4\u671B\u7A33\u5065\u6210\u957F\u3001\u73CD\u60DC\u53CB\u8C0A\u3002",
      readings: [
        {
          char: "\u4E54",
          pinyin: "qi\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u55AC",
          dictionarySense: "\u5F62\u5BB9\u6A39\u5E79\u9AD8\u5927\u4E14\u6A39\u679D\u5F80\u4E0A\u76E4\u65CB\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u6728",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6728",
          dictionarySense: "\u6A39\u3001\u6728\u672C\u690D\u7269\u7684\u901A\u7A31\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5982\u7389",
      ruleId: "naming-v5-proposal-shijing-128-2-59827389",
      citation: {
        id: "shijing-128-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u79E6\u98CE\xB7\u5C0F\u620E \u7B2C2\u7AE0",
        text: "\u8A00\u5FF5\u541B\u5B50\uFF0C\u6E29\u5176\u5982\u7389\u3002\u5728\u5176\u677F\u5C4B\uFF0C\u4E71\u6211\u5FC3\u66F2\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u8A00\u5FF5\u541B\u5B50\uFF0C\u6E29\u5176\u5982\u7389",
      extraction: "continuous",
      context: "\u601D\u5FF5\u8005\u4EE5\u7389\u6E29\u6DA6\u7684\u5F62\u8C61\u8D5E\u5199\u541B\u5B50\uFF1B\u5168\u7BC7\u4EA4\u66FF\u5199\u8F66\u9A6C\u519B\u5907\u4E0E\u601D\u5FF5\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u4ECE\u522B\u7BC7\u62FC\u63A5\u6709\u5973\u5982\u7389\uFF1B\u4E0D\u628A\u539F\u8BD7\u601D\u5FF5\u7684\u8EAB\u4EFD\u7EC6\u8282\u4F5C\u672A\u7ECF\u6838\u5B9E\u7684\u5386\u53F2\u7ED3\u8BBA\u3002",
      meaning: "\u613F\u5B69\u5B50\u6E29\u539A\u81EA\u6301\uFF0C\u4FDD\u6709\u53EF\u8D35\u54C1\u683C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u601D\u5FF5\u8005\u4EE5\u7389\u6E29\u6DA6\u7684\u5F62\u8C61\u8D5E\u5199\u541B\u5B50\uFF1B\u5168\u7BC7\u4EA4\u66FF\u5199\u8F66\u9A6C\u519B\u5907\u4E0E\u601D\u5FF5\u3002\uFF09",
      sourceMeaning: "\u601D\u5FF5\u8005\u4EE5\u7389\u6E29\u6DA6\u7684\u5F62\u8C61\u8D5E\u5199\u541B\u5B50\uFF1B\u5168\u7BC7\u4EA4\u66FF\u5199\u8F66\u9A6C\u519B\u5907\u4E0E\u601D\u5FF5\u3002",
      projectWish: "\u613F\u5B69\u5B50\u6E29\u539A\u81EA\u6301\uFF0C\u4FDD\u6709\u53EF\u8D35\u54C1\u683C\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982",
          dictionarySense: "\u5982\u540C\u3001\u597D\u50CF\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u7389",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7389",
          dictionarySense: "\u8CEA\u5730\u6EAB\u6F64\u5805\u786C\u800C\u6709\u5149\u6FA4\u7684\u7F8E\u77F3\uFF0C\u5448\u534A\u900F\u660E\u72C0\uFF0C\u4E00\u822C\u7528\u4F5C\u88DD\u98FE\u54C1\u6216\u96D5\u523B\u6750\u6599\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5982\u661F",
      ruleId: "naming-v5-proposal-shijing-55-2-5982661f",
      citation: {
        id: "shijing-55-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u536B\u98CE\xB7\u6DC7\u5965 \u7B2C2\u7AE0",
        text: "\u77BB\u5F7C\u6DC7\u5965\uFF0C\u7EFF\u7AF9\u9752\u9752\u3002\u6709\u532A\u541B\u5B50\uFF0C\u5145\u8033\u79C0\u83B9\uFF0C\u4F1A\u5F01\u5982\u661F\u3002\u745F\u516E\u50F4\u516E\u3002\u8D6B\u516E\u54BA\u516E\uFF0C\u6709\u532A\u541B\u5B50\uFF0C\u7EC8\u4E0D\u53EF\u8C16\u516E\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5145\u8033\u79C0\u83B9\uFF0C\u4F1A\u5F01\u5982\u661F",
      extraction: "continuous",
      context: "\u539F\u53E5\u4EE5\u661F\u5149\u6BD4\u62DF\u51A0\u9970\u7684\u4EAE\u70B9\uFF1B\u6574\u7BC7\u8D5E\u541B\u5B50\u98CE\u91C7\u5E76\u6D89\u53CA\u4FEE\u517B\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u5982\u661F\u5728\u6B64\u662F\u51A0\u9970\u6BD4\u55BB\uFF0C\u4E0D\u662F\u5929\u8C61\u5360\u9A8C\uFF1B\u56FA\u5B9A\u6E90\u4F5C\u79C0\u83B9\uFF0C\u4FDD\u7559\u539F\u5B57\uFF0C\u4E0D\u81EA\u52A8\u6539\u4E3A\u7407\u83B9\u3002",
      meaning: "\u501F\u661F\u5149\u660E\u4EAE\u7684\u5F62\u8C61\uFF0C\u5BC4\u671B\u6E05\u6717\u81EA\u6301\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u53E5\u4EE5\u661F\u5149\u6BD4\u62DF\u51A0\u9970\u7684\u4EAE\u70B9\uFF1B\u6574\u7BC7\u8D5E\u541B\u5B50\u98CE\u91C7\u5E76\u6D89\u53CA\u4FEE\u517B\u3002\uFF09",
      sourceMeaning: "\u539F\u53E5\u4EE5\u661F\u5149\u6BD4\u62DF\u51A0\u9970\u7684\u4EAE\u70B9\uFF1B\u6574\u7BC7\u8D5E\u541B\u5B50\u98CE\u91C7\u5E76\u6D89\u53CA\u4FEE\u517B\u3002",
      projectWish: "\u501F\u661F\u5149\u660E\u4EAE\u7684\u5F62\u8C61\uFF0C\u5BC4\u671B\u6E05\u6717\u81EA\u6301\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982",
          dictionarySense: "\u5982\u540C\u3001\u597D\u50CF\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F",
          dictionarySense: "\u5B87\u5B99\u4E2D\u6703\u767C\u5149\u6216\u53CD\u5C04\u5149\u7684\u5929\u9AD4\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u6709\u4EEA",
      ruleId: "naming-v5-proposal-shijing-176-1-67094eea",
      citation: {
        id: "shijing-176-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u83C1\u83C1\u8005\u83AA \u7B2C1\u7AE0",
        text: "\u83C1\u83C1\u8005\u83AA\uFF0C\u5728\u5F7C\u4E2D\u963F\u3002\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA",
      extraction: "continuous",
      context: "\u76F8\u89C1\u800C\u559C\u4E50\uFF0C\u4ECD\u6709\u5F97\u4F53\u7684\u4E3E\u6B62\u793C\u4EEA\uFF1B\u4E0B\u6587\u91CD\u590D\u5199\u89C1\u541B\u5B50\u540E\u7684\u559C\u3001\u4F11\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4FDD\u7559\u89C1\u541B\u5B50\u7684\u76F8\u805A\u8BED\u5883\uFF0C\u4E0D\u5C06\u793C\u4EEA\u7B49\u540C\u5916\u8C8C\u6216\u670D\u4ECE\u3002",
      meaning: "\u613F\u5B69\u5B50\u81EA\u7136\u5F00\u6717\u3001\u5F85\u4EBA\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u76F8\u89C1\u800C\u559C\u4E50\uFF0C\u4ECD\u6709\u5F97\u4F53\u7684\u4E3E\u6B62\u793C\u4EEA\uFF1B\u4E0B\u6587\u91CD\u590D\u5199\u89C1\u541B\u5B50\u540E\u7684\u559C\u3001\u4F11\u3002\uFF09",
      sourceMeaning: "\u76F8\u89C1\u800C\u559C\u4E50\uFF0C\u4ECD\u6709\u5F97\u4F53\u7684\u4E3E\u6B62\u793C\u4EEA\uFF1B\u4E0B\u6587\u91CD\u590D\u5199\u89C1\u541B\u5B50\u540E\u7684\u559C\u3001\u4F11\u3002",
      projectWish: "\u613F\u5B69\u5B50\u81EA\u7136\u5F00\u6717\u3001\u5F85\u4EBA\u6709\u793C\u3002",
      readings: [
        {
          char: "\u6709",
          pinyin: "y\u01D2u",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6709",
          dictionarySense: "\u8868\u4E8B\u5BE6\u3001\u72C0\u6CC1\u7684\u6B63\u9762\u5B58\u5728\uFF0C\u8207\u300C\u7121\u300D\u76F8\u5C0D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100",
          dictionarySense: "\u8209\u6B62\u5BB9\u8C8C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 3
        }
      ]
    },
    {
      name: "\u4E50\u4EEA",
      ruleId: "naming-v5-proposal-shijing-176-1-4e504eea",
      citation: {
        id: "shijing-176-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u83C1\u83C1\u8005\u83AA \u7B2C1\u7AE0",
        text: "\u83C1\u83C1\u8005\u83AA\uFF0C\u5728\u5F7C\u4E2D\u963F\u3002\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA",
      extraction: "recombined",
      context: "\u7531\u4E50\u4E14\u6709\u4EEA\u9009\u4E50\u3001\u4EEA\u91CD\u7EC4\uFF1B\u4E50\u5728\u53E5\u4E2D\u53D6\u559C\u60A6\uFF0C\u4EEA\u53D6\u5F97\u4F53\u4E3E\u6B62\u3002 \u672C\u540D\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u975E\u539F\u6587\u8FDE\u7EED\u8BCD\uFF1B\u4E50\u9650\u5B9Al\xE8\uFF0C\u4E0D\u80FD\u4EE5yu\xE8\u97F3\u4E50\u4E49\u590D\u7528\u672C\u89E3\u91CA\u3002",
      meaning: "\u613F\u5B69\u5B50\u559C\u4E50\u6709\u5EA6\u3001\u5F85\u4EBA\u4ECE\u5BB9\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u7531\u4E50\u4E14\u6709\u4EEA\u9009\u4E50\u3001\u4EEA\u91CD\u7EC4\uFF1B\u4E50\u5728\u53E5\u4E2D\u53D6\u559C\u60A6\uFF0C\u4EEA\u53D6\u5F97\u4F53\u4E3E\u6B62\u3002\uFF09",
      sourceMeaning: "\u7531\u4E50\u4E14\u6709\u4EEA\u9009\u4E50\u3001\u4EEA\u91CD\u7EC4\uFF1B\u4E50\u5728\u53E5\u4E2D\u53D6\u559C\u60A6\uFF0C\u4EEA\u53D6\u5F97\u4F53\u4E3E\u6B62\u3002",
      projectWish: "\u613F\u5B69\u5B50\u559C\u4E50\u6709\u5EA6\u3001\u5F85\u4EBA\u4ECE\u5BB9\u6709\u793C\u3002",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02",
          dictionarySense: "\u6B61\u559C\u3001\u6109\u6085\u3002",
          rawHeteronymIndex: 2,
          rawDefinitionIndex: 0
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100",
          dictionarySense: "\u8209\u6B62\u5BB9\u8C8C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 3
        }
      ]
    },
    {
      name: "\u656C\u660E",
      ruleId: "naming-v5-proposal-shijing-299-4-656c660e",
      citation: {
        id: "shijing-299-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u9C81\u9882\xB7\u99C9\u4E4B\u4EC0\xB7\u6CEE\u6C34 \u7B2C4\u7AE0",
        text: "\u7A46\u7A46\u9C81\u4FAF\uFF0C\u656C\u660E\u5176\u5FB7\u3002\u656C\u614E\u5A01\u4EEA\uFF0C\u7EF4\u6C11\u4E4B\u5219\u3002\u5141\u6587\u5141\u6B66\uFF0C\u662D\u5047\u70C8\u7956\u3002\u9761\u6709\u4E0D\u5B5D\uFF0C\u81EA\u6C42\u4F0A\u795C\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u7A46\u7A46\u9C81\u4FAF\uFF0C\u656C\u660E\u5176\u5FB7",
      extraction: "continuous",
      context: "\u8BD7\u4E2D\u79F0\u5199\u9C81\u4FAF\u656C\u614E\u662D\u660E\u5176\u5FB7\uFF1B\u4E0A\u4E0B\u6587\u5E76\u53CA\u5A01\u4EEA\u3001\u6587\u6B66\u4E0E\u796D\u7956\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u5C06\u9C81\u4FAF\u653F\u6CBB\u3001\u519B\u4E8B\u8EAB\u4EFD\u79FB\u7ED9\u5B69\u5B50\uFF0C\u4E0D\u628A\u660E\u53EA\u5F53\u4EAE\u5149\u3002",
      meaning: "\u613F\u5B69\u5B50\u656C\u614E\u4FEE\u8EAB\u3001\u660E\u767D\u5904\u4E8B\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u8BD7\u4E2D\u79F0\u5199\u9C81\u4FAF\u656C\u614E\u662D\u660E\u5176\u5FB7\uFF1B\u4E0A\u4E0B\u6587\u5E76\u53CA\u5A01\u4EEA\u3001\u6587\u6B66\u4E0E\u796D\u7956\u3002\uFF09",
      sourceMeaning: "\u8BD7\u4E2D\u79F0\u5199\u9C81\u4FAF\u656C\u614E\u662D\u660E\u5176\u5FB7\uFF1B\u4E0A\u4E0B\u6587\u5E76\u53CA\u5A01\u4EEA\u3001\u6587\u6B66\u4E0E\u796D\u7956\u3002",
      projectWish: "\u613F\u5B69\u5B50\u656C\u614E\u4FEE\u8EAB\u3001\u660E\u767D\u5904\u4E8B\u3002",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C",
          dictionarySense: "\u614E\u91CD\u3001\u606D\u656C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E",
          dictionarySense: "\u662D\u793A\u3001\u5F70\u986F\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        }
      ]
    },
    {
      name: "\u656C\u614E",
      ruleId: "naming-v5-proposal-shijing-256-3-656c614e",
      citation: {
        id: "shijing-256-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u8361\u4E4B\u4EC0\xB7\u6291 \u7B2C3\u7AE0",
        text: "\u8A0F\u8C1F\u5B9A\u547D\uFF0C\u8FDC\u72B9\u8FB0\u544A\u3002\u656C\u614E\u5A01\u4EEA\uFF0C\u7EF4\u6C11\u4E4B\u5219\u3002\u5176\u5728\u4E8E\u4ECA\uFF0C\u5174\u8FF7\u4E71\u4E8E\u653F\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u656C\u614E\u5A01\u4EEA\uFF0C\u7EF4\u6C11\u4E4B\u5219",
      extraction: "continuous",
      context: "\u6291\u662F\u544A\u8BEB\u3001\u529D\u6212\u7684\u8BED\u5883\uFF0C\u8981\u6C42\u656C\u614E\u4E3E\u6B62\uFF1B\u4E0B\u6587\u6279\u8BC4\u653F\u4E8B\u8FF7\u4E71\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u9690\u53BB\u540E\u6587\u6279\u8BC4\u800C\u79F0\u6574\u7BC7\u6B4C\u9882\u592A\u5E73\uFF1B\u4E0D\u4EE5\u8C28\u614E\u6807\u7B7E\u65AD\u8A00\u5B69\u5B50\u5FC3\u7406\u7279\u5F81\u3002",
      meaning: "\u613F\u5B69\u5B50\u8C28\u8A00\u614E\u884C\u3001\u5C0A\u91CD\u4ED6\u4EBA\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u6291\u662F\u544A\u8BEB\u3001\u529D\u6212\u7684\u8BED\u5883\uFF0C\u8981\u6C42\u656C\u614E\u4E3E\u6B62\uFF1B\u4E0B\u6587\u6279\u8BC4\u653F\u4E8B\u8FF7\u4E71\u3002\uFF09",
      sourceMeaning: "\u6291\u662F\u544A\u8BEB\u3001\u529D\u6212\u7684\u8BED\u5883\uFF0C\u8981\u6C42\u656C\u614E\u4E3E\u6B62\uFF1B\u4E0B\u6587\u6279\u8BC4\u653F\u4E8B\u8FF7\u4E71\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8C28\u8A00\u614E\u884C\u3001\u5C0A\u91CD\u4ED6\u4EBA\u3002",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C",
          dictionarySense: "\u614E\u91CD\u3001\u606D\u656C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E",
          dictionarySense: "\u5C0F\u5FC3\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u6709\u6210",
      ruleId: "naming-v5-proposal-shijing-227-5-67096210",
      citation: {
        id: "shijing-227-5",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9C7C\u85FB\u4E4B\u4EC0\xB7\u9ECD\u82D7 \u7B2C5\u7AE0",
        text: "\u539F\u96B0\u65E2\u5E73\uFF0C\u6CC9\u6D41\u65E2\u6E05\u3002\u53EC\u4F2F\u6709\u6210\uFF0C\u738B\u5FC3\u5219\u5B81\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u53EC\u4F2F\u6709\u6210\uFF0C\u738B\u5FC3\u5219\u5B81",
      extraction: "continuous",
      context: "\u524D\u6587\u5199\u8425\u5EFA\u3001\u52B3\u4F5C\u548C\u6574\u6CBB\uFF0C\u672B\u6BB5\u79F0\u53EC\u4F2F\u5DE5\u4F5C\u6709\u6240\u5B8C\u6210\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u53D6\u505A\u4E8B\u6709\u6210\u7684\u5BB6\u5EAD\u671F\u8BB8\uFF0C\u4E0D\u4FDD\u8BC1\u6210\u529F\u3001\u529F\u4E1A\u6216\u5B98\u4F4D\u3002",
      meaning: "\u613F\u5B69\u5B50\u8E0F\u5B9E\u505A\u4E8B\u3001\u91CD\u89C6\u5B8C\u6210\u4E0E\u79EF\u7D2F\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u524D\u6587\u5199\u8425\u5EFA\u3001\u52B3\u4F5C\u548C\u6574\u6CBB\uFF0C\u672B\u6BB5\u79F0\u53EC\u4F2F\u5DE5\u4F5C\u6709\u6240\u5B8C\u6210\u3002\uFF09",
      sourceMeaning: "\u524D\u6587\u5199\u8425\u5EFA\u3001\u52B3\u4F5C\u548C\u6574\u6CBB\uFF0C\u672B\u6BB5\u79F0\u53EC\u4F2F\u5DE5\u4F5C\u6709\u6240\u5B8C\u6210\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8E0F\u5B9E\u505A\u4E8B\u3001\u91CD\u89C6\u5B8C\u6210\u4E0E\u79EF\u7D2F\u3002",
      readings: [
        {
          char: "\u6709",
          pinyin: "y\u01D2u",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6709",
          dictionarySense: "\u8868\u4E8B\u5BE6\u3001\u72C0\u6CC1\u7684\u6B63\u9762\u5B58\u5728\uFF0C\u8207\u300C\u7121\u300D\u76F8\u5C0D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u6210",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6210",
          dictionarySense: "\u505A\u597D\u4E8B\u60C5\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u707C\u707C",
      ruleId: "naming-v5-proposal-shijing-6-1-707c707c",
      citation: {
        id: "shijing-6-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u5468\u5357\xB7\u6843\u592D \u7B2C1\u7AE0",
        text: "\u6843\u4E4B\u592D\u592D\uFF0C\u707C\u707C\u5176\u534E\u3002\u4E4B\u5B50\u4E8E\u5F52\uFF0C\u5B9C\u5176\u5BA4\u5BB6\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u6843\u4E4B\u592D\u592D\uFF0C\u707C\u707C\u5176\u534E",
      extraction: "continuous",
      context: "\u6843\u592D\u5A5A\u5AC1\u8BED\u5883\u4E2D\u5199\u6843\u82B1\u660E\u8273\uFF1B\u707C\u707C\u63CF\u5199\u82B1\u7684\u660E\u4EAE\u9C9C\u660E\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u5C06\u707C\u89E3\u91CA\u6210\u706B\u70E7\u800C\u63A8\u4E94\u884C\u8865\u706B\uFF0C\u4E5F\u4E0D\u4FDD\u8BC1\u5A5A\u604B\uFF1B\u53E0\u5B57\u9002\u914D\u9700\u7531\u5BB6\u5EAD\u9009\u62E9\u3002",
      meaning: "\u501F\u82B1\u5F00\u660E\u8273\u7684\u610F\u8C61\uFF0C\u5BC4\u671B\u660E\u6717\u3001\u73CD\u60DC\u751F\u6D3B\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u6843\u592D\u5A5A\u5AC1\u8BED\u5883\u4E2D\u5199\u6843\u82B1\u660E\u8273\uFF1B\u707C\u707C\u63CF\u5199\u82B1\u7684\u660E\u4EAE\u9C9C\u660E\u3002\uFF09",
      sourceMeaning: "\u6843\u592D\u5A5A\u5AC1\u8BED\u5883\u4E2D\u5199\u6843\u82B1\u660E\u8273\uFF1B\u707C\u707C\u63CF\u5199\u82B1\u7684\u660E\u4EAE\u9C9C\u660E\u3002",
      projectWish: "\u501F\u82B1\u5F00\u660E\u8273\u7684\u610F\u8C61\uFF0C\u5BC4\u671B\u660E\u6717\u3001\u73CD\u60DC\u751F\u6D3B\u3002",
      readings: [
        {
          char: "\u707C",
          pinyin: "zhu\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u707C",
          dictionarySense: "\u660E\u986F\u3001\u660E\u4EAE\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u707C",
          pinyin: "zhu\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u707C",
          dictionarySense: "\u660E\u986F\u3001\u660E\u4EAE\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        }
      ]
    },
    {
      name: "\u9752\u9752",
      ruleId: "naming-v5-proposal-shijing-91-1-97529752",
      citation: {
        id: "shijing-91-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u5B50\u887F \u7B2C1\u7AE0",
        text: "\u9752\u9752\u5B50\u887F\uFF0C\u60A0\u60A0\u6211\u5FC3\u3002\u7EB5\u6211\u4E0D\u5F80\uFF0C\u5B50\u5B81\u4E0D\u55E3\u97F3\uFF1F",
        sourceId: "shijing"
      },
      excerpt: "\u9752\u9752\u5B50\u887F\uFF0C\u60A0\u60A0\u6211\u5FC3",
      extraction: "continuous",
      context: "\u63CF\u5199\u5BF9\u65B9\u8863\u9886\u7684\u9752\u8272\uFF0C\u7EE7\u800C\u5199\u7EF5\u957F\u601D\u5FF5\uFF1B\u5168\u7BC7\u542B\u672A\u89C1\u5BF9\u65B9\u7684\u60C6\u6005\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u8BF4\u539F\u53E5\u5C31\u662F\u9752\u6625\u3001\u5E0C\u671B\u6216\u6027\u683C\u5F00\u6717\uFF1B\u4E0D\u5F3A\u884C\u65AD\u5B9A\u56FA\u5B9A\u9752\u8272\u5FC5\u662F\u54EA\u79CD\u73B0\u4EE3\u8272\u53F7\u3002",
      meaning: "\u501F\u9752\u8272\u6E05\u65B0\u7684\u5BA1\u7F8E\u8054\u60F3\uFF0C\u5BC4\u671B\u771F\u8BDA\u3001\u73CD\u91CD\u60C5\u8C0A\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u63CF\u5199\u5BF9\u65B9\u8863\u9886\u7684\u9752\u8272\uFF0C\u7EE7\u800C\u5199\u7EF5\u957F\u601D\u5FF5\uFF1B\u5168\u7BC7\u542B\u672A\u89C1\u5BF9\u65B9\u7684\u60C6\u6005\u3002\uFF09",
      sourceMeaning: "\u63CF\u5199\u5BF9\u65B9\u8863\u9886\u7684\u9752\u8272\uFF0C\u7EE7\u800C\u5199\u7EF5\u957F\u601D\u5FF5\uFF1B\u5168\u7BC7\u542B\u672A\u89C1\u5BF9\u65B9\u7684\u60C6\u6005\u3002",
      projectWish: "\u501F\u9752\u8272\u6E05\u65B0\u7684\u5BA1\u7F8E\u8054\u60F3\uFF0C\u5BC4\u671B\u771F\u8BDA\u3001\u73CD\u91CD\u60C5\u8C0A\u3002",
      readings: [
        {
          char: "\u9752",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u9752",
          dictionarySense: "\u984F\u8272\uFF1A(1) \u7DA0\u8272\u3002\u5510\uFF0E\u5289\u79B9\u932B\u3008\u964B\u5BA4\u9298\u3009\uFF1A\u300C\u8349\u8272\u5165\u7C3E\u9752\u3002\u300D(2) \u85CD\u8272\u3002\u300A\u8340\u5B50\uFF0E\u52F8\u5B78\u300B\uFF1A\u300C\u9752\u53D6\u4E4B\u65BC\u85CD\uFF0C\u800C\u9752\u65BC\u85CD\u3002\u300D(3) \u9ED1\u8272\u3002\u5982\uFF1A\u300C\u7384\u9752\u300D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u9752",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u9752",
          dictionarySense: "\u984F\u8272\uFF1A(1) \u7DA0\u8272\u3002\u5510\uFF0E\u5289\u79B9\u932B\u3008\u964B\u5BA4\u9298\u3009\uFF1A\u300C\u8349\u8272\u5165\u7C3E\u9752\u3002\u300D(2) \u85CD\u8272\u3002\u300A\u8340\u5B50\uFF0E\u52F8\u5B78\u300B\uFF1A\u300C\u9752\u53D6\u4E4B\u65BC\u85CD\uFF0C\u800C\u9752\u65BC\u85CD\u3002\u300D(3) \u9ED1\u8272\u3002\u5982\uFF1A\u300C\u7384\u9752\u300D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u7FF0\u98DE",
      ruleId: "naming-v5-proposal-shijing-196-1-7ff098de",
      citation: {
        id: "shijing-196-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u8282\u5357\u5C71\u4E4B\u4EC0\xB7\u5C0F\u5B9B \u7B2C1\u7AE0",
        text: "\u5B9B\u5F7C\u9E23\u9E20\uFF0C\u7FF0\u98DE\u623E\u5929\u3002\u6211\u5FC3\u5FE7\u4F24\uFF0C\u5FF5\u6614\u5148\u4EBA\u3002\u660E\u53D1\u4E0D\u5BD0\uFF0C\u6709\u6000\u4E8C\u4EBA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5B9B\u5F7C\u9E23\u9E20\uFF0C\u7FF0\u98DE\u623E\u5929",
      extraction: "continuous",
      context: "\u5148\u5199\u9E23\u9E20\u9AD8\u98DE\uFF0C\u968F\u5373\u5199\u5FE7\u4F24\u5FF5\u5148\u4EBA\uFF1B\u5168\u7BC7\u8FD8\u529D\u8282\u996E\u3001\u656C\u4EEA\u3001\u6BCB\u5FDD\u6240\u751F\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u7FF0\u53D6\u672C\u53E5\u9AD8\u98DE\u4E49\uFF0C\u4E0D\u6539\u6210\u6587\u7AE0\u6216\u6BDB\u7B14\uFF1B\u4E0D\u628A\u5168\u7BC7\u5FE7\u6212\u5305\u88C5\u6210\u5E86\u529F\u6216\u4FDD\u8BC1\u817E\u8FBE\u3002",
      meaning: "\u501F\u9AD8\u98DE\u7684\u52A8\u6001\u5F62\u8C61\uFF0C\u5BC4\u671B\u5F00\u9614\u773C\u754C\u5E76\u81EA\u52C9\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5148\u5199\u9E23\u9E20\u9AD8\u98DE\uFF0C\u968F\u5373\u5199\u5FE7\u4F24\u5FF5\u5148\u4EBA\uFF1B\u5168\u7BC7\u8FD8\u529D\u8282\u996E\u3001\u656C\u4EEA\u3001\u6BCB\u5FDD\u6240\u751F\u3002\uFF09",
      sourceMeaning: "\u5148\u5199\u9E23\u9E20\u9AD8\u98DE\uFF0C\u968F\u5373\u5199\u5FE7\u4F24\u5FF5\u5148\u4EBA\uFF1B\u5168\u7BC7\u8FD8\u529D\u8282\u996E\u3001\u656C\u4EEA\u3001\u6BCB\u5FDD\u6240\u751F\u3002",
      projectWish: "\u501F\u9AD8\u98DE\u7684\u52A8\u6001\u5F62\u8C61\uFF0C\u5BC4\u671B\u5F00\u9614\u773C\u754C\u5E76\u81EA\u52C9\u3002",
      readings: [
        {
          char: "\u7FF0",
          pinyin: "h\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7FF0",
          dictionarySense: "\u9AD8\u98DB\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 8
        },
        {
          char: "\u98DE",
          pinyin: "f\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u98DB",
          dictionarySense: "\u9CE5\u985E\u53CA\u6606\u87F2\u985E\u6216\u822A\u7A7A\u6A5F\u68B0\u9A30\u884C\u65BC\u7A7A\u4E2D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u4EE4\u671B",
      ruleId: "naming-v5-proposal-shijing-252-6-4ee4671b",
      citation: {
        id: "shijing-252-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u5377\u963F \u7B2C6\u7AE0",
        text: "\u9899\u9899\u536C\u536C\uFF0C\u5982\u572D\u5982\u748B\uFF0C\u4EE4\u95FB\u4EE4\u671B\u3002\u5C82\u5F1F\u541B\u5B50\uFF0C\u56DB\u65B9\u4E3A\u7EB2\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u4EE4\u95FB\u4EE4\u671B",
      extraction: "continuous",
      context: "\u4EE4\u671B\u79F0\u7F8E\u597D\u7684\u540D\u671B\uFF0C\u4E0E\u5982\u572D\u5982\u748B\u7B49\u8D5E\u5199\u5E76\u5217\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u671B\u53D6\u540D\u671B\uFF0C\u4E0D\u8BF4\u672C\u53E5\u662F\u8FDC\u671B\u6216\u613F\u671B\uFF1B\u4E0D\u4FDD\u8BC1\u5C06\u6765\u6709\u540D\u3002",
      meaning: "\u613F\u5B69\u5B50\u73CD\u60DC\u58F0\u8A89\uFF0C\u4EE5\u5B9E\u5728\u7684\u54C1\u884C\u5F85\u4EBA\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u4EE4\u671B\u79F0\u7F8E\u597D\u7684\u540D\u671B\uFF0C\u4E0E\u5982\u572D\u5982\u748B\u7B49\u8D5E\u5199\u5E76\u5217\u3002\uFF09",
      sourceMeaning: "\u4EE4\u671B\u79F0\u7F8E\u597D\u7684\u540D\u671B\uFF0C\u4E0E\u5982\u572D\u5982\u748B\u7B49\u8D5E\u5199\u5E76\u5217\u3002",
      projectWish: "\u613F\u5B69\u5B50\u73CD\u60DC\u58F0\u8A89\uFF0C\u4EE5\u5B9E\u5728\u7684\u54C1\u884C\u5F85\u4EBA\u3002",
      readings: [
        {
          char: "\u4EE4",
          pinyin: "l\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EE4",
          dictionarySense: "\u597D\u7684\u3001\u5584\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 6
        },
        {
          char: "\u671B",
          pinyin: "w\xE0ng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u671B",
          dictionarySense: "\u540D\u8B7D\u3001\u540D\u8072\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 6
        }
      ]
    },
    {
      name: "\u7EF4\u65B0",
      ruleId: "naming-v5-proposal-shijing-235-1-7ef465b0",
      citation: {
        id: "shijing-235-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u6587\u738B\u4E4B\u4EC0\xB7\u6587\u738B \u7B2C1\u7AE0",
        text: "\u6587\u738B\u5728\u4E0A\uFF0C\u4E8E\u662D\u4E8E\u5929\u3002\u5468\u867D\u65E7\u90A6\uFF0C\u5176\u547D\u7EF4\u65B0\u3002\u6709\u5468\u4E0D\u663E\uFF0C\u5E1D\u547D\u4E0D\u65F6\u3002\u6587\u738B\u965F\u964D\uFF0C\u5728\u5E1D\u5DE6\u53F3\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5468\u867D\u65E7\u90A6\uFF0C\u5176\u547D\u7EF4\u65B0",
      extraction: "continuous",
      context: "\u539F\u8F9E\u5178\u7EF4\u65B0\u590D\u5408\u6761\u76F4\u5F15\u672C\u7BC7\uFF0C\u539F\u6307\u5468\u65BD\u884C\u5584\u653F\u800C\u65B0\u83B7\u5929\u547D\uFF0C\u540E\u6765\u6307\u9769\u65E7\u884C\u65B0\uFF1B\u4E0D\u4F5C\u4E2A\u4EBA\u547D\u8FD0\u9884\u6D4B\u3002 \u5BB6\u5EAD\u671F\u8BB8\u662F\u501F\u66F4\u65B0\u81EA\u52C9\u7684\u73B0\u4EE3\u53D6\u610F\uFF0C\u4E0D\u628A\u7EF4\u53E6\u9644\u4F1A\u6210\u7EF4\u7CFB\u3002",
      meaning: "\u501F\u66F4\u65B0\u81EA\u52C9\u7684\u8054\u60F3\uFF0C\u5BC4\u671B\u613F\u5B66\u3001\u613F\u6539\u8FDB\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u8BED\u5883\uFF1A\u539F\u8F9E\u5178\u7EF4\u65B0\u590D\u5408\u6761\u76F4\u5F15\u672C\u7BC7\uFF0C\u539F\u6307\u5468\u65BD\u884C\u5584\u653F\u800C\u65B0\u83B7\u5929\u547D\uFF0C\u540E\u6765\u6307\u9769\u65E7\u884C\u65B0\uFF1B\u4E0D\u4F5C\u4E2A\u4EBA\u547D\u8FD0\u9884\u6D4B\u3002\uFF09",
      sourceMeaning: "\u539F\u8F9E\u5178\u7EF4\u65B0\u590D\u5408\u6761\u76F4\u5F15\u672C\u7BC7\uFF0C\u539F\u6307\u5468\u65BD\u884C\u5584\u653F\u800C\u65B0\u83B7\u5929\u547D\uFF0C\u540E\u6765\u6307\u9769\u65E7\u884C\u65B0\uFF1B\u4E0D\u4F5C\u4E2A\u4EBA\u547D\u8FD0\u9884\u6D4B\u3002",
      projectWish: "\u501F\u66F4\u65B0\u81EA\u52C9\u7684\u8054\u60F3\uFF0C\u5BC4\u671B\u613F\u5B66\u3001\u613F\u6539\u8FDB\u3002",
      readings: [
        {
          char: "\u7EF4",
          pinyin: "w\xE9i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7DAD",
          dictionarySense: "\u7F6E\u65BC\u53E5\u9996\u6216\u53E5\u4E2D\u7684\u8A9E\u6C23\u8A5E\uFF0C\u7121\u7FA9\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 8
        },
        {
          char: "\u65B0",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u65B0",
          dictionarySense: "\u6539\u9032\u6216\u4F7F\u6539\u8B8A\uFF0C\u800C\u6210\u70BA\u65B0\u7684\u3001\u597D\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 7
        }
      ]
    },
    {
      name: "\u5B50\u4F69",
      ruleId: "naming-v5-proposal-shijing-91-2-5b504f69",
      citation: {
        id: "shijing-91-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u5B50\u887F \u7B2C2\u7AE0",
        text: "\u9752\u9752\u5B50\u4F69\uFF0C\u60A0\u60A0\u6211\u601D\u3002\u7EB5\u6211\u4E0D\u5F80\uFF0C\u5B50\u5B81\u4E0D\u6765\uFF1F",
        sourceId: "shijing"
      },
      excerpt: "\u9752\u9752\u5B50\u4F69\uFF0C\u60A0\u60A0\u6211\u601D",
      extraction: "continuous",
      context: "\u601D\u5FF5\u5BF9\u65B9\u7684\u4F69\u9970\uFF1B\u5B50\u5728\u6B64\u6307\u4F60\uFF0C\u4F69\u662F\u4F69\u9970\uFF0C\u4E0D\u662F\u5B50\u5973\u4E0E\u656C\u4F69\u7684\u5408\u4E49\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u628A\u5B50\u6539\u91CA\u6210\u7537\u5B69\u6216\u5723\u8D24\uFF0C\u4E0D\u628A\u4F69\u8BEF\u5F53\u539F\u53E5\u656C\u4F69\uFF1B\u4E0D\u4F5C\u6027\u522B\u9650\u5236\u3002",
      meaning: "\u501F\u4F69\u9970\u53EF\u73CD\u3001\u60C5\u8C0A\u53EF\u5FF5\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u73CD\u60DC\u4EBA\u4E0E\u7269\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u601D\u5FF5\u5BF9\u65B9\u7684\u4F69\u9970\uFF1B\u5B50\u5728\u6B64\u6307\u4F60\uFF0C\u4F69\u662F\u4F69\u9970\uFF0C\u4E0D\u662F\u5B50\u5973\u4E0E\u656C\u4F69\u7684\u5408\u4E49\u3002\uFF09",
      sourceMeaning: "\u601D\u5FF5\u5BF9\u65B9\u7684\u4F69\u9970\uFF1B\u5B50\u5728\u6B64\u6307\u4F60\uFF0C\u4F69\u662F\u4F69\u9970\uFF0C\u4E0D\u662F\u5B50\u5973\u4E0E\u656C\u4F69\u7684\u5408\u4E49\u3002",
      projectWish: "\u501F\u4F69\u9970\u53EF\u73CD\u3001\u60C5\u8C0A\u53EF\u5FF5\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u73CD\u60DC\u4EBA\u4E0E\u7269\u3002",
      readings: [
        {
          char: "\u5B50",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B50",
          dictionarySense: "\u4F60\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 13
        },
        {
          char: "\u4F69",
          pinyin: "p\xE8i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4F69",
          dictionarySense: "\u53E4\u4EBA\u7E6B\u5728\u8170\u5E36\u4E0A\u7684\u4E00\u7A2E\u88DD\u98FE\u54C1\u3002\u5982\uFF1A\u300C\u7389\u4F69\u300D\u3002\u300A\u8A69\u7D93\uFF0E\u912D\u98A8\uFF0E\u5973\u66F0\u96DE\u9CF4\u300B\uFF1A\u300C\u77E5\u5B50\u4E4B\u4F86  \u4E4B\uFF0C\u96DC\u4F69\u4EE5\u8D08\u4E4B\u3002\u300D\u4E5F\u4F5C\u300C\u73EE\u300D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u96CD\u96CD",
      ruleId: "naming-v5-proposal-shijing-240-3-96cd96cd",
      citation: {
        id: "shijing-240-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u6587\u738B\u4E4B\u4EC0\xB7\u601D\u9F50 \u7B2C3\u7AE0",
        text: "\u96CD\u96CD\u5728\u5BAB\uFF0C\u8083\u8083\u5728\u5E99\u3002\u4E0D\u663E\u4EA6\u4E34\uFF0C\u65E0\u5C04\u4EA6\u4FDD\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u96CD\u96CD\u5728\u5BAB\uFF0C\u8083\u8083\u5728\u5E99",
      extraction: "continuous",
      context: "\u4EE5\u96CD\u96CD\u5F62\u5BB9\u5728\u5BAB\u7684\u548C\u987A\uFF0C\u4E0E\u5728\u5E99\u8083\u8083\u7684\u606D\u656C\u5E76\u4E3E\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u53E0\u5B57\u540C\u97F3\u9700\u8FDE\u8BFB\u590D\u6838\uFF1B\u4E0D\u628A\u96CD\u96CD\u5F53\u5EB8\u5EB8\u6216\u4EE5\u53E4\u4EE3\u5BAB\u5E99\u8EAB\u4EFD\u4F5C\u5730\u4F4D\u4FDD\u8BC1\u3002",
      meaning: "\u613F\u5B69\u5B50\u6E29\u539A\u548C\u5584\u3001\u5F85\u4EBA\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u4EE5\u96CD\u96CD\u5F62\u5BB9\u5728\u5BAB\u7684\u548C\u987A\uFF0C\u4E0E\u5728\u5E99\u8083\u8083\u7684\u606D\u656C\u5E76\u4E3E\u3002\uFF09",
      sourceMeaning: "\u4EE5\u96CD\u96CD\u5F62\u5BB9\u5728\u5BAB\u7684\u548C\u987A\uFF0C\u4E0E\u5728\u5E99\u8083\u8083\u7684\u606D\u656C\u5E76\u4E3E\u3002",
      projectWish: "\u613F\u5B69\u5B50\u6E29\u539A\u548C\u5584\u3001\u5F85\u4EBA\u6709\u793C\u3002",
      readings: [
        {
          char: "\u96CD",
          pinyin: "y\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u96CD",
          dictionarySense: "\u548C\u8AE7\u7684\u3001\u548C\u7766\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u96CD",
          pinyin: "y\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u96CD",
          dictionarySense: "\u548C\u8AE7\u7684\u3001\u548C\u7766\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u514B\u660E",
      ruleId: "naming-v5-proposal-shijing-241-7-514b660e",
      citation: {
        id: "shijing-241-7",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u6587\u738B\u4E4B\u4EC0\xB7\u7687\u77E3 \u7B2C7\u7AE0",
        text: "\u7EF4\u6B64\u738B\u5B63\uFF0C\u5E1D\u5EA6\u5176\u5FC3\u3002\u8C8A\u5176\u5FB7\u97F3\uFF0C\u5176\u5FB7\u514B\u660E\u3002\u514B\u660E\u514B\u7C7B\uFF0C\u514B\u957F\u514B\u541B\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5176\u5FB7\u514B\u660E\u3002\u514B\u660E\u514B\u7C7B",
      extraction: "continuous",
      context: "\u539F\u8F9E\u5178\u590D\u5408\u6761\u514B\u660E\u76F4\u5F15\u672C\u7BC7\uFF0C\u91CA\u80FD\u591F\u660E\u5BDF\u662F\u975E\uFF1B\u514B\u53D6\u80FD\uFF0C\u660E\u53D6\u901A\u6653\u3001\u660E\u8FA8\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\uFF1B\u4E0D\u5C06\u514B\u89E3\u91CA\u4E3A\u653B\u514B\uFF0C\u4E0D\u7531\u541B\u5FB7\u63A8\u65AD\u5B69\u5B50\u8EAB\u4EFD\u6216\u547D\u8FD0\u3002",
      meaning: "\u613F\u5B69\u5B50\u8BA4\u771F\u6C42\u77E5\u3001\u660E\u8FA8\u662F\u975E\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u8F9E\u5178\u590D\u5408\u6761\u514B\u660E\u76F4\u5F15\u672C\u7BC7\uFF0C\u91CA\u80FD\u591F\u660E\u5BDF\u662F\u975E\uFF1B\u514B\u53D6\u80FD\uFF0C\u660E\u53D6\u901A\u6653\u3001\u660E\u8FA8\u3002\uFF09",
      sourceMeaning: "\u539F\u8F9E\u5178\u590D\u5408\u6761\u514B\u660E\u76F4\u5F15\u672C\u7BC7\uFF0C\u91CA\u80FD\u591F\u660E\u5BDF\u662F\u975E\uFF1B\u514B\u53D6\u80FD\uFF0C\u660E\u53D6\u901A\u6653\u3001\u660E\u8FA8\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8BA4\u771F\u6C42\u77E5\u3001\u660E\u8FA8\u662F\u975E\u3002",
      readings: [
        {
          char: "\u514B",
          pinyin: "k\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u524B",
          dictionarySense: "\u80FD\u5920\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 6
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E",
          dictionarySense: "\u901A\u66C9\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u9042\u5FD7",
      ruleId: "naming-v5-proposal-zhouyi-47-xiang-90425fd7",
      citation: {
        id: "zhouyi-47-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C47\u5366\xB7\u6CFD\u6C34\u56F0\xB7\u5927\u8C61",
        text: "\u6CFD\u65E0\u6C34\uFF0C\u56F0\u3002\u541B\u5B50\u4EE5\u81F4\u547D\u9042\u5FD7\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u81F4\u547D\u9042\u5FD7",
      extraction: "continuous",
      context: "\u539F\u5927\u8C61\u4EE5\u56F0\u5883\u4E2D\u7684\u547D\u4E0E\u5FD7\u7684\u53D6\u820D\u4E3A\u80CC\u666F\uFF0C\u9042\u5FD7\u53D6\u8FBE\u6210\u6240\u5FD7\uFF1B\u4E0D\u80FD\u7B80\u5316\u4E3A\u65E0\u6761\u4EF6\u6210\u529F\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\uFF0C\u4E0D\u4F5C\u6210\u529F\u3001\u4EBA\u683C\u6216\u8FD0\u52BF\u4FDD\u8BC1\u3002",
      meaning: "\u613F\u5B69\u5B50\u5728\u56F0\u96BE\u65F6\u5B88\u4F4F\u6240\u5FD7\u3001\u575A\u97E7\u81EA\u6301\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u8BED\u5883\uFF1A\u539F\u5927\u8C61\u4EE5\u56F0\u5883\u4E2D\u7684\u547D\u4E0E\u5FD7\u7684\u53D6\u820D\u4E3A\u80CC\u666F\uFF0C\u9042\u5FD7\u53D6\u8FBE\u6210\u6240\u5FD7\uFF1B\u4E0D\u80FD\u7B80\u5316\u4E3A\u65E0\u6761\u4EF6\u6210\u529F\u3002\uFF09",
      sourceMeaning: "\u539F\u5927\u8C61\u4EE5\u56F0\u5883\u4E2D\u7684\u547D\u4E0E\u5FD7\u7684\u53D6\u820D\u4E3A\u80CC\u666F\uFF0C\u9042\u5FD7\u53D6\u8FBE\u6210\u6240\u5FD7\uFF1B\u4E0D\u80FD\u7B80\u5316\u4E3A\u65E0\u6761\u4EF6\u6210\u529F\u3002",
      projectWish: "\u613F\u5B69\u5B50\u5728\u56F0\u96BE\u65F6\u5B88\u4F4F\u6240\u5FD7\u3001\u575A\u97E7\u81EA\u6301\u3002",
      readings: [
        {
          char: "\u9042",
          pinyin: "su\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9042",
          dictionarySense: "\u6210\u529F\u3001\u6210\u5C31\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u5FD7",
          pinyin: "zh\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FD7",
          dictionarySense: "\u610F\u5411\u3001\u62B1\u8CA0\u3001\u6C7A\u5FC3\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5BB6\u5B9C",
      ruleId: "naming-v5-proposal-shijing-6-3-5bb65b9c",
      citation: {
        id: "shijing-6-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u5468\u5357\xB7\u6843\u592D \u7B2C3\u7AE0",
        text: "\u6843\u4E4B\u592D\u592D\uFF0C\u5176\u53F6\u84C1\u84C1\u3002\u4E4B\u5B50\u4E8E\u5F52\uFF0C\u5B9C\u5176\u5BB6\u4EBA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u4E4B\u5B50\u4E8E\u5F52\uFF0C\u5B9C\u5176\u5BB6\u4EBA",
      extraction: "recombined",
      context: "\u5A5A\u5AC1\u8BD7\u4EE5\u53F6\u76DB\u8D77\u5174\uFF0C\u795D\u613F\u51FA\u5AC1\u8005\u4F7F\u5BB6\u4EBA\u76F8\u5904\u548C\u987A\uFF1B\u5BB6\u5B9C\u4E3A\u540C\u53E5\u9009\u5B57\u91CD\u7EC4\u3002 \u5BB6\u5B9C\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\uFF0C\u4E0D\u4F5C\u6210\u529F\u3001\u4EBA\u683C\u6216\u8FD0\u52BF\u4FDD\u8BC1\u3002",
      meaning: "\u613F\u5B69\u5B50\u73CD\u60DC\u5BB6\u5EAD\u60C5\u8C0A\u3001\u4E0E\u4EBA\u548C\u7766\u76F8\u5904\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u8BED\u5883\uFF1A\u5A5A\u5AC1\u8BD7\u4EE5\u53F6\u76DB\u8D77\u5174\uFF0C\u795D\u613F\u51FA\u5AC1\u8005\u4F7F\u5BB6\u4EBA\u76F8\u5904\u548C\u987A\uFF1B\u5BB6\u5B9C\u4E3A\u540C\u53E5\u9009\u5B57\u91CD\u7EC4\u3002\uFF09",
      sourceMeaning: "\u5A5A\u5AC1\u8BD7\u4EE5\u53F6\u76DB\u8D77\u5174\uFF0C\u795D\u613F\u51FA\u5AC1\u8005\u4F7F\u5BB6\u4EBA\u76F8\u5904\u548C\u987A\uFF1B\u5BB6\u5B9C\u4E3A\u540C\u53E5\u9009\u5B57\u91CD\u7EC4\u3002",
      projectWish: "\u613F\u5B69\u5B50\u73CD\u60DC\u5BB6\u5EAD\u60C5\u8C0A\u3001\u4E0E\u4EBA\u548C\u7766\u76F8\u5904\u3002",
      readings: [
        {
          char: "\u5BB6",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BB6",
          dictionarySense: "\u4E00\u9580\u4E4B\u5167\u5171\u540C\u751F\u6D3B\u7684\u4EBA\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u5B9C",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B9C",
          dictionarySense: "\u76F8\u5B89\u3001\u548C\u9806\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    }
  ],
  pendingQualityIssues: [
    {
      char: "\u54B8",
      dictionaryWord: "\u54B8",
      rawHeteronymIndex: 0,
      rawDefinitionIndex: 3,
      kind: "original-trigram-glyph-conflict",
      originalPreserved: true,
      usedForAutomaticTrigram: false
    }
  ]
};

// data/naming-editorial-v4.json
var naming_editorial_v4_default = {
  version: "naming-editorial-4.0.0",
  base: {
    version: "naming-editorial-3.0.0",
    sha256: "97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195",
    sourceId: "editorial-rules"
  },
  policy: "Mechanical reading constraints for existing project-authored interpretations and natural-expression preferences, anchored to actual published1.0.30 defaults. Not a claim that all779 dictionary meanings or naming choices received independent expert review. Nonmatching readings retain their true dictionary entries and do not borrow the project meaning or reviewed semantic/natural-expression preference.",
  characterReadings: {
    \u5B89: {
      pinyin: "\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B89"
    },
    \u6602: {
      pinyin: "\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6602"
    },
    \u50B2: {
      pinyin: "\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u50B2"
    },
    \u5965: {
      pinyin: "\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5967"
    },
    \u767D: {
      pinyin: "b\xE1i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u767D"
    },
    \u767E: {
      pinyin: "b\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u767E"
    },
    \u67CF: {
      pinyin: "b\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u67CF"
    },
    \u90A6: {
      pinyin: "b\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u90A6"
    },
    \u5B9D: {
      pinyin: "b\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BF6"
    },
    \u4FDD: {
      pinyin: "b\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u4FDD"
    },
    \u8D1D: {
      pinyin: "b\xE8i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8C9D"
    },
    \u84D3: {
      pinyin: "b\xE8i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u84D3"
    },
    \u78A7: {
      pinyin: "b\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u78A7"
    },
    \u5F6C: {
      pinyin: "b\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F6C"
    },
    \u658C: {
      pinyin: "b\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u658C"
    },
    \u6EE8: {
      pinyin: "b\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6FF1"
    },
    \u51B0: {
      pinyin: "b\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u51B0"
    },
    \u79C9: {
      pinyin: "b\u01D0ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u79C9"
    },
    \u535A: {
      pinyin: "b\xF3",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u535A"
    },
    \u6E24: {
      pinyin: "b\xF3",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6E24"
    },
    \u624D: {
      pinyin: "c\xE1i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7E94"
    },
    \u91C7: {
      pinyin: "c\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u63A1"
    },
    \u5F69: {
      pinyin: "c\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F69"
    },
    \u707F: {
      pinyin: "c\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u71E6"
    },
    \u82CD: {
      pinyin: "c\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u84BC"
    },
    \u7B56: {
      pinyin: "c\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B56"
    },
    \u5C91: {
      pinyin: "c\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C91"
    },
    \u66FE: {
      pinyin: "c\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u66FE"
    },
    \u957F: {
      pinyin: "ch\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9577"
    },
    \u7545: {
      pinyin: "ch\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u66A2"
    },
    \u8D85: {
      pinyin: "ch\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8D85"
    },
    \u671D: {
      pinyin: "zh\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u671D"
    },
    \u8FB0: {
      pinyin: "ch\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8FB0"
    },
    \u6668: {
      pinyin: "ch\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6668"
    },
    \u5BB8: {
      pinyin: "ch\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BB8"
    },
    \u741B: {
      pinyin: "ch\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u741B"
    },
    \u627F: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u627F"
    },
    \u5448: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5448"
    },
    \u8BDA: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8AA0"
    },
    \u6210: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6210"
    },
    \u6F84: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F84"
    },
    \u57CE: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u57CE"
    },
    \u7A0B: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A0B"
    },
    \u9A70: {
      pinyin: "ch\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u99B3"
    },
    \u695A: {
      pinyin: "ch\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u695A"
    },
    \u5DDD: {
      pinyin: "chu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5DDD"
    },
    \u4F20: {
      pinyin: "chu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u50B3"
    },
    \u6625: {
      pinyin: "ch\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6625"
    },
    \u6DF3: {
      pinyin: "ch\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DF3"
    },
    \u7EAF: {
      pinyin: "ch\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D14"
    },
    \u6148: {
      pinyin: "c\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6148"
    },
    \u806A: {
      pinyin: "c\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8070"
    },
    \u7FE0: {
      pinyin: "cu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FE0"
    },
    \u5B58: {
      pinyin: "c\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B58"
    },
    \u8FBE: {
      pinyin: "d\xE1",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9054"
    },
    \u5CB1: {
      pinyin: "d\xE0i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5CB1"
    },
    \u4E39: {
      pinyin: "d\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E39"
    },
    \u65E6: {
      pinyin: "d\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u65E6"
    },
    \u9053: {
      pinyin: "d\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9053"
    },
    \u5FB7: {
      pinyin: "d\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5FB7"
    },
    \u767B: {
      pinyin: "d\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u767B"
    },
    \u8FEA: {
      pinyin: "d\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8FEA"
    },
    \u7B1B: {
      pinyin: "d\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B1B"
    },
    \u5178: {
      pinyin: "di\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5178"
    },
    \u9F0E: {
      pinyin: "d\u01D0ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u9F0E"
    },
    \u4E1C: {
      pinyin: "d\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6771"
    },
    \u51AC: {
      pinyin: "d\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9F15"
    },
    \u680B: {
      pinyin: "d\xF2ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u68DF"
    },
    \u7AEF: {
      pinyin: "du\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7AEF"
    },
    \u6735: {
      pinyin: "du\u01D2",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6735"
    },
    \u6069: {
      pinyin: "\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6069"
    },
    \u5C14: {
      pinyin: "\u011Br",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u723E"
    },
    \u53D1: {
      pinyin: "f\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u767C"
    },
    \u5E06: {
      pinyin: "f\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E06"
    },
    \u51E1: {
      pinyin: "f\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u51E1"
    },
    \u65B9: {
      pinyin: "f\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u65B9"
    },
    \u82B3: {
      pinyin: "f\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u82B3"
    },
    \u98DE: {
      pinyin: "f\u0113i",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u98DB"
    },
    \u83F2: {
      pinyin: "f\u0113i",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u83F2"
    },
    \u6590: {
      pinyin: "f\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6590"
    },
    \u82AC: {
      pinyin: "f\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u82AC"
    },
    \u4E30: {
      pinyin: "f\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8C50"
    },
    \u5CF0: {
      pinyin: "f\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5CF0"
    },
    \u950B: {
      pinyin: "f\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u92D2"
    },
    \u67AB: {
      pinyin: "f\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6953"
    },
    \u51E4: {
      pinyin: "f\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9CF3"
    },
    \u8299: {
      pinyin: "f\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8299"
    },
    \u798F: {
      pinyin: "f\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u798F"
    },
    \u752B: {
      pinyin: "f\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u752B"
    },
    \u8D4B: {
      pinyin: "f\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8CE6"
    },
    \u99A5: {
      pinyin: "f\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u99A5"
    },
    \u7518: {
      pinyin: "g\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7518"
    },
    \u521A: {
      pinyin: "g\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u525B"
    },
    \u9AD8: {
      pinyin: "g\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9AD8"
    },
    \u6B4C: {
      pinyin: "g\u0113",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B4C"
    },
    \u9769: {
      pinyin: "g\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9769"
    },
    \u683C: {
      pinyin: "g\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u683C"
    },
    \u5E9A: {
      pinyin: "g\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E9A"
    },
    \u8015: {
      pinyin: "g\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8015"
    },
    \u803F: {
      pinyin: "g\u011Bng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u803F"
    },
    \u606D: {
      pinyin: "g\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u606D"
    },
    \u529F: {
      pinyin: "g\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u529F"
    },
    \u5DE9: {
      pinyin: "g\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u978F"
    },
    \u51A0: {
      pinyin: "gu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u51A0"
    },
    \u89C2: {
      pinyin: "gu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u89C0"
    },
    \u8D2F: {
      pinyin: "gu\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8CAB"
    },
    \u5149: {
      pinyin: "gu\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5149"
    },
    \u5E7F: {
      pinyin: "gu\u01CEng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5EE3"
    },
    \u8D35: {
      pinyin: "gu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8CB4"
    },
    \u6842: {
      pinyin: "gu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6842"
    },
    \u56FD: {
      pinyin: "gu\xF3",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u570B"
    },
    \u679C: {
      pinyin: "gu\u01D2",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u679C"
    },
    \u6D77: {
      pinyin: "h\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D77"
    },
    \u6DB5: {
      pinyin: "h\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DB5"
    },
    \u542B: {
      pinyin: "h\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u542B"
    },
    \u7FF0: {
      pinyin: "h\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FF0"
    },
    \u822A: {
      pinyin: "h\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u822A"
    },
    \u676D: {
      pinyin: "h\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u676D"
    },
    \u8C6A: {
      pinyin: "h\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8C6A"
    },
    \u660A: {
      pinyin: "h\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u660A"
    },
    \u6D69: {
      pinyin: "h\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D69"
    },
    \u7693: {
      pinyin: "h\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7693"
    },
    \u548C: {
      pinyin: "h\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u548C"
    },
    \u6CB3: {
      pinyin: "h\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CB3"
    },
    \u8D3A: {
      pinyin: "h\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8CC0"
    },
    \u8377: {
      pinyin: "h\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8377"
    },
    \u9E64: {
      pinyin: "h\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9DB4"
    },
    \u8D6B: {
      pinyin: "h\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8D6B"
    },
    \u8861: {
      pinyin: "h\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8861"
    },
    \u6052: {
      pinyin: "h\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6046"
    },
    \u5B8F: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B8F"
    },
    \u6CD3: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CD3"
    },
    \u5F18: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F18"
    },
    \u8679: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8679"
    },
    \u9E3F: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9D3B"
    },
    \u7EA2: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D05"
    },
    \u6D2A: {
      pinyin: "h\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D2A"
    },
    \u534E: {
      pinyin: "hu\xE1",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u83EF"
    },
    \u6866: {
      pinyin: "hu\xE0",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6A3A"
    },
    \u6000: {
      pinyin: "hu\xE1i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u61F7"
    },
    \u6B22: {
      pinyin: "hu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B61"
    },
    \u73AF: {
      pinyin: "hu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u74B0"
    },
    \u5BF0: {
      pinyin: "hu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BF0"
    },
    \u7115: {
      pinyin: "hu\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7165"
    },
    \u714C: {
      pinyin: "hu\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u714C"
    },
    \u6656: {
      pinyin: "hu\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6689"
    },
    \u8F89: {
      pinyin: "hu\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8F1D"
    },
    \u60E0: {
      pinyin: "hu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u60E0"
    },
    \u6167: {
      pinyin: "hu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6167"
    },
    \u5349: {
      pinyin: "hu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5349"
    },
    \u4F1A: {
      pinyin: "hu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6703"
    },
    \u835F: {
      pinyin: "hu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8588"
    },
    \u6C47: {
      pinyin: "hu\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u532F"
    },
    \u7EE7: {
      pinyin: "j\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7E7C"
    },
    \u7EAA: {
      pinyin: "j\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D00"
    },
    \u4F73: {
      pinyin: "ji\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F73"
    },
    \u5609: {
      pinyin: "ji\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5609"
    },
    \u73C8: {
      pinyin: "ji\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u73C8"
    },
    \u5BB6: {
      pinyin: "ji\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u50A2"
    },
    \u52A0: {
      pinyin: "ji\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u52A0"
    },
    \u7532: {
      pinyin: "ji\u01CE",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7532"
    },
    \u575A: {
      pinyin: "ji\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5805"
    },
    \u7B80: {
      pinyin: "ji\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7C21"
    },
    \u5EFA: {
      pinyin: "ji\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5EFA"
    },
    \u5065: {
      pinyin: "ji\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5065"
    },
    \u5251: {
      pinyin: "ji\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u528D"
    },
    \u5A07: {
      pinyin: "ji\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B0C"
    },
    \u9A84: {
      pinyin: "ji\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9A55"
    },
    \u6770: {
      pinyin: "ji\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5091"
    },
    \u6D01: {
      pinyin: "ji\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F54"
    },
    \u5A55: {
      pinyin: "ji\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5A55"
    },
    \u6377: {
      pinyin: "ji\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6377"
    },
    \u91D1: {
      pinyin: "j\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u91D1"
    },
    \u6D25: {
      pinyin: "j\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D25"
    },
    \u747E: {
      pinyin: "j\u01D0n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u747E"
    },
    \u9526: {
      pinyin: "j\u01D0n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u9326"
    },
    \u664B: {
      pinyin: "j\xECn",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6649"
    },
    \u52B2: {
      pinyin: "j\xECn",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u52C1"
    },
    \u9756: {
      pinyin: "j\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9756"
    },
    \u666F: {
      pinyin: "j\u01D0ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u666F"
    },
    \u656C: {
      pinyin: "j\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u656C"
    },
    \u9759: {
      pinyin: "j\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u975C"
    },
    \u6676: {
      pinyin: "j\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6676"
    },
    \u83C1: {
      pinyin: "j\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u83C1"
    },
    \u65CC: {
      pinyin: "j\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u65CC"
    },
    \u5883: {
      pinyin: "j\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5883"
    },
    \u70AF: {
      pinyin: "ji\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u70AF"
    },
    \u7085: {
      pinyin: "ji\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7085"
    },
    \u7396: {
      pinyin: "ji\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7396"
    },
    \u4E45: {
      pinyin: "ji\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E45"
    },
    \u4E5D: {
      pinyin: "ji\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E5D"
    },
    \u4E3E: {
      pinyin: "j\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u8209"
    },
    \u96BD: {
      pinyin: "ju\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u96CB"
    },
    \u4FCA: {
      pinyin: "j\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4FCA"
    },
    \u541B: {
      pinyin: "j\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u541B"
    },
    \u94A7: {
      pinyin: "j\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u921E"
    },
    \u5CFB: {
      pinyin: "j\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5CFB"
    },
    \u9A8F: {
      pinyin: "j\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u99FF"
    },
    \u6977: {
      pinyin: "k\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6977"
    },
    \u51EF: {
      pinyin: "k\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u51F1"
    },
    \u5F00: {
      pinyin: "k\u0101i",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u958B"
    },
    \u607A: {
      pinyin: "k\u01CEi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6137"
    },
    \u5EB7: {
      pinyin: "k\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5EB7"
    },
    \u73C2: {
      pinyin: "k\u0113",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u73C2"
    },
    \u67EF: {
      pinyin: "k\u0113",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u67EF"
    },
    \u79D1: {
      pinyin: "k\u0113",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u79D1"
    },
    \u53EF: {
      pinyin: "k\u011B",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u53EF"
    },
    \u514B: {
      pinyin: "k\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u524B"
    },
    \u606A: {
      pinyin: "k\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u606A"
    },
    \u7A7A: {
      pinyin: "k\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A7A"
    },
    \u5B54: {
      pinyin: "k\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B54"
    },
    \u5764: {
      pinyin: "k\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5764"
    },
    \u6606: {
      pinyin: "k\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6606"
    },
    \u5C9A: {
      pinyin: "l\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5D50"
    },
    \u84DD: {
      pinyin: "l\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u85CD"
    },
    \u6F9C: {
      pinyin: "l\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u703E"
    },
    \u5170: {
      pinyin: "l\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u862D"
    },
    \u6717: {
      pinyin: "l\u01CEng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6717"
    },
    \u6D6A: {
      pinyin: "l\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D6A"
    },
    \u4E50: {
      pinyin: "l\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6A02"
    },
    \u857E: {
      pinyin: "l\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u857E"
    },
    \u78CA: {
      pinyin: "l\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u78CA"
    },
    \u96F7: {
      pinyin: "l\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u96F7"
    },
    \u9ECE: {
      pinyin: "l\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9ECE"
    },
    \u793C: {
      pinyin: "l\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u79AE"
    },
    \u7406: {
      pinyin: "l\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7406"
    },
    \u4FD0: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4FD0"
    },
    \u8389: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8389"
    },
    \u4E3D: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9E97"
    },
    \u529B: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u529B"
    },
    \u7ACB: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7ACB"
    },
    \u52B1: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u52F5"
    },
    \u5229: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5229"
    },
    \u826F: {
      pinyin: "li\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u826F"
    },
    \u6881: {
      pinyin: "li\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6881"
    },
    \u51C9: {
      pinyin: "li\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DBC"
    },
    \u4EAE: {
      pinyin: "li\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4EAE"
    },
    \u8FBD: {
      pinyin: "li\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u907C"
    },
    \u71CE: {
      pinyin: "li\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u71CE"
    },
    \u6797: {
      pinyin: "l\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6797"
    },
    \u7433: {
      pinyin: "l\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7433"
    },
    \u9716: {
      pinyin: "l\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9716"
    },
    \u4E34: {
      pinyin: "l\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u81E8"
    },
    \u7075: {
      pinyin: "l\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9748"
    },
    \u73B2: {
      pinyin: "l\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u73B2"
    },
    \u51CC: {
      pinyin: "l\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u51CC"
    },
    \u9675: {
      pinyin: "l\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9675"
    },
    \u7FCE: {
      pinyin: "l\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FCE"
    },
    \u4EE4: {
      pinyin: "l\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4EE4"
    },
    \u67F3: {
      pinyin: "li\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u67F3"
    },
    \u516D: {
      pinyin: "li\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u516D"
    },
    \u9F99: {
      pinyin: "l\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9F8D"
    },
    \u9686: {
      pinyin: "l\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9686"
    },
    \u9732: {
      pinyin: "l\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9732"
    },
    \u7490: {
      pinyin: "l\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7490"
    },
    \u9646: {
      pinyin: "l\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9678"
    },
    \u8DEF: {
      pinyin: "l\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8DEF"
    },
    \u7984: {
      pinyin: "l\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u797F"
    },
    \u9E93: {
      pinyin: "l\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9E93"
    },
    \u4F26: {
      pinyin: "l\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u502B"
    },
    \u7EB6: {
      pinyin: "l\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DB8"
    },
    \u6D1B: {
      pinyin: "lu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D1B"
    },
    \u73DE: {
      pinyin: "lu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u73DE"
    },
    \u5F8B: {
      pinyin: "l\u01DC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F8B"
    },
    \u7EFF: {
      pinyin: "l\u01DC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DA0"
    },
    \u739B: {
      pinyin: "m\u01CE",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u746A"
    },
    \u6EE1: {
      pinyin: "m\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6EFF"
    },
    \u66FC: {
      pinyin: "m\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u66FC"
    },
    \u6F2B: {
      pinyin: "m\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F2B"
    },
    \u8302: {
      pinyin: "m\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8302"
    },
    \u6885: {
      pinyin: "m\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6885"
    },
    \u679A: {
      pinyin: "m\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u679A"
    },
    \u7F8E: {
      pinyin: "m\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7F8E"
    },
    \u840C: {
      pinyin: "m\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u840C"
    },
    \u5B5F: {
      pinyin: "m\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B5F"
    },
    \u68A6: {
      pinyin: "m\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5922"
    },
    \u68C9: {
      pinyin: "mi\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u68C9"
    },
    \u82D7: {
      pinyin: "mi\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u82D7"
    },
    \u5999: {
      pinyin: "mi\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5999"
    },
    \u654F: {
      pinyin: "m\u01D0n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u654F"
    },
    \u660E: {
      pinyin: "m\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u660E"
    },
    \u9E23: {
      pinyin: "m\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9CF4"
    },
    \u94ED: {
      pinyin: "m\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9298"
    },
    \u8317: {
      pinyin: "m\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8317"
    },
    \u58A8: {
      pinyin: "m\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u58A8"
    },
    \u6CAB: {
      pinyin: "m\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CAB"
    },
    \u9ED8: {
      pinyin: "m\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9ED8"
    },
    \u6C90: {
      pinyin: "m\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6C90"
    },
    \u7267: {
      pinyin: "m\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7267"
    },
    \u7A46: {
      pinyin: "m\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A46"
    },
    \u6155: {
      pinyin: "m\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6155"
    },
    \u6728: {
      pinyin: "m\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6728"
    },
    \u6960: {
      pinyin: "n\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6960"
    },
    \u5357: {
      pinyin: "n\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5357"
    },
    \u5B81: {
      pinyin: "n\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BE7"
    },
    \u51DD: {
      pinyin: "n\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u51DD"
    },
    \u5FF5: {
      pinyin: "ni\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5FF5"
    },
    \u5E74: {
      pinyin: "ni\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E74"
    },
    \u519C: {
      pinyin: "n\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8FB2"
    },
    \u8BFA: {
      pinyin: "nu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8AFE"
    },
    \u9E25: {
      pinyin: "\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9DD7"
    },
    \u76FC: {
      pinyin: "p\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u76FC"
    },
    \u6C9B: {
      pinyin: "p\xE8i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6C9B"
    },
    \u4F69: {
      pinyin: "p\xE8i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F69"
    },
    \u57F9: {
      pinyin: "p\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u57F9"
    },
    \u670B: {
      pinyin: "p\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u670B"
    },
    \u9E4F: {
      pinyin: "p\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9D6C"
    },
    \u5F6D: {
      pinyin: "p\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F6D"
    },
    \u54C1: {
      pinyin: "p\u01D0n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u54C1"
    },
    \u5E73: {
      pinyin: "p\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E73"
    },
    \u840D: {
      pinyin: "p\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u840D"
    },
    \u6734: {
      pinyin: "p\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6A38"
    },
    \u749E: {
      pinyin: "p\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u749E"
    },
    \u6D66: {
      pinyin: "p\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D66"
    },
    \u666E: {
      pinyin: "p\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u666E"
    },
    \u742A: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u742A"
    },
    \u5947: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5947"
    },
    \u797A: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u797A"
    },
    \u9F50: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9F4A"
    },
    \u68CB: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u68CB"
    },
    \u7426: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7426"
    },
    \u542F: {
      pinyin: "q\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u555F"
    },
    \u8D77: {
      pinyin: "q\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u8D77"
    },
    \u7EEE: {
      pinyin: "q\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DBA"
    },
    \u5343: {
      pinyin: "qi\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u97C6"
    },
    \u8FC1: {
      pinyin: "qi\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9077"
    },
    \u8C26: {
      pinyin: "qi\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8B19"
    },
    \u4E7E: {
      pinyin: "qi\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E7E"
    },
    \u524D: {
      pinyin: "qi\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u524D"
    },
    \u5029: {
      pinyin: "qi\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5029"
    },
    \u4E54: {
      pinyin: "qi\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u55AC"
    },
    \u4FA8: {
      pinyin: "qi\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u50D1"
    },
    \u6865: {
      pinyin: "qi\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6A4B"
    },
    \u5DE7: {
      pinyin: "qi\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5DE7"
    },
    \u7434: {
      pinyin: "q\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7434"
    },
    \u6C81: {
      pinyin: "q\xECn",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6C81"
    },
    \u79E6: {
      pinyin: "q\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u79E6"
    },
    \u82B9: {
      pinyin: "q\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u82B9"
    },
    \u9752: {
      pinyin: "q\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9752"
    },
    \u6E05: {
      pinyin: "q\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6E05"
    },
    \u537F: {
      pinyin: "q\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u537F"
    },
    \u5E86: {
      pinyin: "q\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6176"
    },
    \u6674: {
      pinyin: "q\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6674"
    },
    \u60C5: {
      pinyin: "q\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u60C5"
    },
    \u743C: {
      pinyin: "qi\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u74CA"
    },
    \u4E18: {
      pinyin: "qi\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E18"
    },
    \u79CB: {
      pinyin: "qi\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u97A6"
    },
    \u6C42: {
      pinyin: "qi\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6C42"
    },
    \u66F2: {
      pinyin: "q\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u66F2"
    },
    \u6743: {
      pinyin: "qu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B0A"
    },
    \u6CC9: {
      pinyin: "qu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CC9"
    },
    \u7FA4: {
      pinyin: "q\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FA4"
    },
    \u7136: {
      pinyin: "r\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7136"
    },
    \u5189: {
      pinyin: "r\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5189"
    },
    \u4EC1: {
      pinyin: "r\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u4EC1"
    },
    \u4EFB: {
      pinyin: "r\xE8n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4EFB"
    },
    \u8363: {
      pinyin: "r\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u69AE"
    },
    \u5BB9: {
      pinyin: "r\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BB9"
    },
    \u84C9: {
      pinyin: "r\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u84C9"
    },
    \u67D4: {
      pinyin: "r\xF3u",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u67D4"
    },
    \u5982: {
      pinyin: "r\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5982"
    },
    \u5112: {
      pinyin: "r\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5112"
    },
    \u6FE1: {
      pinyin: "r\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6FE1"
    },
    \u8339: {
      pinyin: "r\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8339"
    },
    \u854A: {
      pinyin: "ru\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u854A"
    },
    \u82AE: {
      pinyin: "ru\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u82AE"
    },
    \u9510: {
      pinyin: "ru\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u92B3"
    },
    \u777F: {
      pinyin: "ru\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u777F"
    },
    \u745E: {
      pinyin: "ru\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u745E"
    },
    \u6DA6: {
      pinyin: "r\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F64"
    },
    \u82E5: {
      pinyin: "ru\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u82E5"
    },
    \u6851: {
      pinyin: "s\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6851"
    },
    \u68EE: {
      pinyin: "s\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u68EE"
    },
    \u838E: {
      pinyin: "sh\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u838E"
    },
    \u6C99: {
      pinyin: "sh\u0101",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6C99"
    },
    \u5C71: {
      pinyin: "sh\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C71"
    },
    \u6749: {
      pinyin: "sh\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6749"
    },
    \u5584: {
      pinyin: "sh\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5584"
    },
    \u5C1A: {
      pinyin: "sh\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C1A"
    },
    \u97F6: {
      pinyin: "sh\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u97F6"
    },
    \u5C11: {
      pinyin: "sh\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C11"
    },
    \u7ECD: {
      pinyin: "sh\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D39"
    },
    \u90B5: {
      pinyin: "sh\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u90B5"
    },
    \u6DF1: {
      pinyin: "sh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DF1"
    },
    \u7533: {
      pinyin: "sh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7533"
    },
    \u6C88: {
      pinyin: "sh\u011Bn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u700B"
    },
    \u8398: {
      pinyin: "sh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8398"
    },
    \u7B19: {
      pinyin: "sh\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B19"
    },
    \u751F: {
      pinyin: "sh\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u751F"
    },
    \u5723: {
      pinyin: "sh\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8056"
    },
    \u80DC: {
      pinyin: "sh\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u52DD"
    },
    \u76DB: {
      pinyin: "sh\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u76DB"
    },
    \u665F: {
      pinyin: "ch\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u665F"
    },
    \u8BD7: {
      pinyin: "sh\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8A69"
    },
    \u65BD: {
      pinyin: "sh\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u65BD"
    },
    \u65F6: {
      pinyin: "sh\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6642"
    },
    \u8BC6: {
      pinyin: "sh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8B58"
    },
    \u5B9E: {
      pinyin: "sh\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BE6"
    },
    \u77F3: {
      pinyin: "sh\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u77F3"
    },
    \u4E16: {
      pinyin: "sh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E16"
    },
    \u58EB: {
      pinyin: "sh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u58EB"
    },
    \u9002: {
      pinyin: "sh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9069"
    },
    \u4ED5: {
      pinyin: "sh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4ED5"
    },
    \u6811: {
      pinyin: "sh\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6A39"
    },
    \u8212: {
      pinyin: "sh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8212"
    },
    \u6292: {
      pinyin: "sh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6292"
    },
    \u4E66: {
      pinyin: "sh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u66F8"
    },
    \u59DD: {
      pinyin: "sh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u59DD"
    },
    \u6DD1: {
      pinyin: "sh\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DD1"
    },
    \u6B8A: {
      pinyin: "sh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B8A"
    },
    \u7EBE: {
      pinyin: "sh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D13"
    },
    \u6714: {
      pinyin: "shu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6714"
    },
    \u7855: {
      pinyin: "shu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u78A9"
    },
    \u601D: {
      pinyin: "s\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u601D"
    },
    \u65AF: {
      pinyin: "s\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u65AF"
    },
    \u53F8: {
      pinyin: "s\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u53F8"
    },
    \u677E: {
      pinyin: "s\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u677E"
    },
    \u9882: {
      pinyin: "s\xF2ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u980C"
    },
    \u82CF: {
      pinyin: "s\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u56CC"
    },
    \u7D20: {
      pinyin: "s\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D20"
    },
    \u8083: {
      pinyin: "s\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8085"
    },
    \u7A57: {
      pinyin: "su\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A57"
    },
    \u5C81: {
      pinyin: "su\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B72"
    },
    \u968B: {
      pinyin: "su\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u968B"
    },
    \u9042: {
      pinyin: "su\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9042"
    },
    \u5B59: {
      pinyin: "s\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B6B"
    },
    \u7D22: {
      pinyin: "su\u01D2",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D22"
    },
    \u6CF0: {
      pinyin: "t\xE0i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CF0"
    },
    \u592A: {
      pinyin: "t\xE0i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u592A"
    },
    \u68E0: {
      pinyin: "t\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u68E0"
    },
    \u6D9B: {
      pinyin: "t\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6FE4"
    },
    \u97EC: {
      pinyin: "t\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u97DC"
    },
    \u9676: {
      pinyin: "t\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9676"
    },
    \u6843: {
      pinyin: "t\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6843"
    },
    \u7279: {
      pinyin: "t\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7279"
    },
    \u817E: {
      pinyin: "t\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9A30"
    },
    \u5929: {
      pinyin: "ti\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5929"
    },
    \u7530: {
      pinyin: "ti\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7530"
    },
    \u606C: {
      pinyin: "ti\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u606C"
    },
    \u751C: {
      pinyin: "ti\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u751C"
    },
    \u5EAD: {
      pinyin: "t\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5EAD"
    },
    \u5EF7: {
      pinyin: "t\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5EF7"
    },
    \u5A77: {
      pinyin: "t\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5A77"
    },
    \u9706: {
      pinyin: "t\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9706"
    },
    \u540C: {
      pinyin: "t\xF2ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8855"
    },
    \u5F64: {
      pinyin: "t\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F64"
    },
    \u6850: {
      pinyin: "t\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6850"
    },
    \u7AE5: {
      pinyin: "t\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7AE5"
    },
    \u77B3: {
      pinyin: "t\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u77B3"
    },
    \u5B9B: {
      pinyin: "w\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B9B"
    },
    \u5A49: {
      pinyin: "w\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5A49"
    },
    \u742C: {
      pinyin: "w\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u742C"
    },
    \u4E07: {
      pinyin: "w\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u842C"
    },
    \u671B: {
      pinyin: "w\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u671B"
    },
    \u65FA: {
      pinyin: "w\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u65FA"
    },
    \u5A01: {
      pinyin: "w\u0113i",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5A01"
    },
    \u5FAE: {
      pinyin: "w\u0113i",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5FAE"
    },
    \u8587: {
      pinyin: "w\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8587"
    },
    \u4F1F: {
      pinyin: "w\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5049"
    },
    \u7EAC: {
      pinyin: "w\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DEF"
    },
    \u73AE: {
      pinyin: "w\u011Bi",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u744B"
    },
    \u552F: {
      pinyin: "w\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u552F"
    },
    \u60DF: {
      pinyin: "w\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u60DF"
    },
    \u7EF4: {
      pinyin: "w\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DAD"
    },
    \u97E6: {
      pinyin: "w\xE9i",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u97CB"
    },
    \u536B: {
      pinyin: "w\xE8i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u885B"
    },
    \u851A: {
      pinyin: "w\xE8i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u851A"
    },
    \u6587: {
      pinyin: "w\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6587"
    },
    \u95FB: {
      pinyin: "w\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u805E"
    },
    \u7EB9: {
      pinyin: "w\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D0B"
    },
    \u6E29: {
      pinyin: "w\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6EAB"
    },
    \u96EF: {
      pinyin: "w\xE9n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u96EF"
    },
    \u95EE: {
      pinyin: "w\xE8n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u554F"
    },
    \u7A33: {
      pinyin: "w\u011Bn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A69"
    },
    \u6B66: {
      pinyin: "w\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B66"
    },
    \u821E: {
      pinyin: "w\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u821E"
    },
    \u4F0D: {
      pinyin: "w\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F0D"
    },
    \u609F: {
      pinyin: "w\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u609F"
    },
    \u897F: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u897F"
    },
    \u5E0C: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E0C"
    },
    \u6EAA: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6EAA"
    },
    \u7199: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7199"
    },
    \u66E6: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u66E6"
    },
    \u60DC: {
      pinyin: "x\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u60DC"
    },
    \u6670: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6670"
    },
    \u9521: {
      pinyin: "x\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u932B"
    },
    \u5915: {
      pinyin: "x\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5915"
    },
    \u4E60: {
      pinyin: "x\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FD2"
    },
    \u559C: {
      pinyin: "x\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u559C"
    },
    \u590F: {
      pinyin: "xi\xE0",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u590F"
    },
    \u971E: {
      pinyin: "xi\xE1",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u971E"
    },
    \u4ED9: {
      pinyin: "xi\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4ED9"
    },
    \u8D24: {
      pinyin: "xi\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8CE2"
    },
    \u54B8: {
      pinyin: "xi\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9E79"
    },
    \u5148: {
      pinyin: "xi\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5148"
    },
    \u732E: {
      pinyin: "xi\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u737B"
    },
    \u6E58: {
      pinyin: "xi\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6E58"
    },
    \u9999: {
      pinyin: "xi\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9999"
    },
    \u7965: {
      pinyin: "xi\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7965"
    },
    \u7FD4: {
      pinyin: "xi\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FD4"
    },
    \u60F3: {
      pinyin: "xi\u01CEng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u60F3"
    },
    \u5411: {
      pinyin: "xi\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u56AE"
    },
    \u9879: {
      pinyin: "xi\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9805"
    },
    \u8C61: {
      pinyin: "xi\xE0ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8C61"
    },
    \u6653: {
      pinyin: "xi\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u66C9"
    },
    \u8427: {
      pinyin: "xi\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u856D"
    },
    \u6F47: {
      pinyin: "xi\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u701F"
    },
    \u7BAB: {
      pinyin: "xi\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7C2B"
    },
    \u5C0F: {
      pinyin: "xi\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C0F"
    },
    \u7B11: {
      pinyin: "xi\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B11"
    },
    \u6B23: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B23"
    },
    \u5FC3: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5FC3"
    },
    \u8F9B: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8F9B"
    },
    \u65B0: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u65B0"
    },
    \u99A8: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u99A8"
    },
    \u946B: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u946B"
    },
    \u4FE1: {
      pinyin: "x\xECn",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4FE1"
    },
    \u661F: {
      pinyin: "x\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u661F"
    },
    \u5174: {
      pinyin: "x\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8208"
    },
    \u674F: {
      pinyin: "x\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u674F"
    },
    \u884C: {
      pinyin: "x\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u884C"
    },
    \u5E78: {
      pinyin: "x\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E78"
    },
    \u4FEE: {
      pinyin: "xi\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4FEE"
    },
    \u79C0: {
      pinyin: "xi\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u79C0"
    },
    \u65ED: {
      pinyin: "x\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u65ED"
    },
    \u5E8F: {
      pinyin: "x\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E8F"
    },
    \u53D9: {
      pinyin: "x\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6558"
    },
    \u7EEA: {
      pinyin: "x\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DD2"
    },
    \u8F69: {
      pinyin: "xu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8ED2"
    },
    \u5BA3: {
      pinyin: "xu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BA3"
    },
    \u8431: {
      pinyin: "xu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8431"
    },
    \u7384: {
      pinyin: "xu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7384"
    },
    \u65CB: {
      pinyin: "xu\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u93C7"
    },
    \u7487: {
      pinyin: "xu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7487"
    },
    \u9009: {
      pinyin: "xu\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u9078"
    },
    \u5B66: {
      pinyin: "xu\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B78"
    },
    \u96EA: {
      pinyin: "xu\u011B",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u96EA"
    },
    \u52CB: {
      pinyin: "x\u016Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u52DB"
    },
    \u5BFB: {
      pinyin: "x\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C0B"
    },
    \u900A: {
      pinyin: "x\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u905C"
    },
    \u8FC5: {
      pinyin: "x\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8FC5"
    },
    \u96C5: {
      pinyin: "y\u01CE",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u96C5"
    },
    \u4E9A: {
      pinyin: "y\xE0",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E9E"
    },
    \u5A05: {
      pinyin: "y\xE0",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5A6D"
    },
    \u5EF6: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5EF6"
    },
    \u708E: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u708E"
    },
    \u8A00: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8A00"
    },
    \u5CA9: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5CA9"
    },
    \u989C: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u984F"
    },
    \u884D: {
      pinyin: "y\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u884D"
    },
    \u5F66: {
      pinyin: "y\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F65"
    },
    \u7814: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7814"
    },
    \u598D: {
      pinyin: "y\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u598D"
    },
    \u664F: {
      pinyin: "y\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u664F"
    },
    \u71D5: {
      pinyin: "y\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u71D5"
    },
    \u96C1: {
      pinyin: "y\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u96C1"
    },
    \u626C: {
      pinyin: "y\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u63DA"
    },
    \u6768: {
      pinyin: "y\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u694A"
    },
    \u9633: {
      pinyin: "y\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u967D"
    },
    \u6D0B: {
      pinyin: "y\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D0B"
    },
    \u5C27: {
      pinyin: "y\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u582F"
    },
    \u9065: {
      pinyin: "y\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9059"
    },
    \u7476: {
      pinyin: "y\xE1o",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7464"
    },
    \u8000: {
      pinyin: "y\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8000"
    },
    \u66DC: {
      pinyin: "y\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u66DC"
    },
    \u53F6: {
      pinyin: "y\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8449"
    },
    \u70E8: {
      pinyin: "y\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u71C1"
    },
    \u6021: {
      pinyin: "y\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6021"
    },
    \u5B9C: {
      pinyin: "y\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B9C"
    },
    \u4F9D: {
      pinyin: "y\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F9D"
    },
    \u4EEA: {
      pinyin: "y\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5100"
    },
    \u4F0A: {
      pinyin: "y\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F0A"
    },
    \u9890: {
      pinyin: "y\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9824"
    },
    \u6BC5: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6BC5"
    },
    \u5955: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5955"
    },
    \u9038: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9038"
    },
    \u6613: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6613"
    },
    \u7FCA: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FCA"
    },
    \u610F: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u610F"
    },
    \u76CA: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u76CA"
    },
    \u4E49: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FA9"
    },
    \u827A: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u85DD"
    },
    \u4EA6: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4EA6"
    },
    \u8BD1: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8B6F"
    },
    \u7FCC: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FCC"
    },
    \u5FC6: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u61B6"
    },
    \u8335: {
      pinyin: "y\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8335"
    },
    \u6BB7: {
      pinyin: "y\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6BB7"
    },
    \u5BC5: {
      pinyin: "y\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BC5"
    },
    \u94F6: {
      pinyin: "y\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9280"
    },
    \u97F3: {
      pinyin: "y\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u97F3"
    },
    \u541F: {
      pinyin: "y\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u541F"
    },
    \u5C39: {
      pinyin: "y\u01D0n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C39"
    },
    \u5370: {
      pinyin: "y\xECn",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5370"
    },
    \u82F1: {
      pinyin: "y\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u82F1"
    },
    \u9896: {
      pinyin: "y\u01D0ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A4E"
    },
    \u83B9: {
      pinyin: "y\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7469"
    },
    \u83BA: {
      pinyin: "y\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9DAF"
    },
    \u76C8: {
      pinyin: "y\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u76C8"
    },
    \u8FCE: {
      pinyin: "y\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8FCE"
    },
    \u6620: {
      pinyin: "y\xECng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6620"
    },
    \u6A31: {
      pinyin: "y\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6AFB"
    },
    \u745B: {
      pinyin: "y\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u745B"
    },
    \u6EE2: {
      pinyin: "y\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7005"
    },
    \u6C38: {
      pinyin: "y\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6C38"
    },
    \u548F: {
      pinyin: "y\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u8A60"
    },
    \u52C7: {
      pinyin: "y\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u52C7"
    },
    \u6CF3: {
      pinyin: "y\u01D2ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CF3"
    },
    \u4F18: {
      pinyin: "y\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u512A"
    },
    \u60A0: {
      pinyin: "y\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u60A0"
    },
    \u5C24: {
      pinyin: "y\xF3u",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C24"
    },
    \u7531: {
      pinyin: "y\xF3u",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7531"
    },
    \u53CB: {
      pinyin: "y\u01D2u",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u53CB"
    },
    \u6709: {
      pinyin: "y\u01D2u",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6709"
    },
    \u5BA5: {
      pinyin: "y\xF2u",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5BA5"
    },
    \u4F51: {
      pinyin: "y\xF2u",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F51"
    },
    \u53C8: {
      pinyin: "y\xF2u",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u53C8"
    },
    \u5E7C: {
      pinyin: "y\xF2u",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5E7C"
    },
    \u745C: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u745C"
    },
    \u4E8E: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u65BC"
    },
    \u4E88: {
      pinyin: "y\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E88"
    },
    \u4F59: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9918"
    },
    \u4FDE: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u4FDE"
    },
    \u6E1D: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6E1D"
    },
    \u6109: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6109"
    },
    \u6986: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6986"
    },
    \u865E: {
      pinyin: "y\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u865E"
    },
    \u7FBD: {
      pinyin: "y\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FBD"
    },
    \u5B87: {
      pinyin: "y\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B87"
    },
    \u8BED: {
      pinyin: "y\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u8A9E"
    },
    \u96E8: {
      pinyin: "y\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u96E8"
    },
    \u79B9: {
      pinyin: "y\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u79B9"
    },
    \u7389: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7389"
    },
    \u80B2: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u80B2"
    },
    \u6631: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6631"
    },
    \u715C: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u715C"
    },
    \u8A89: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8B7D"
    },
    \u6BD3: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6BD3"
    },
    \u8C6B: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8C6B"
    },
    \u90C1: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9B31"
    },
    \u6E0A: {
      pinyin: "yu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DF5"
    },
    \u5143: {
      pinyin: "yu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5143"
    },
    \u6E90: {
      pinyin: "yu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6E90"
    },
    \u56ED: {
      pinyin: "yu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5712"
    },
    \u5706: {
      pinyin: "yu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5713"
    },
    \u5A9B: {
      pinyin: "yu\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5A9B"
    },
    \u7F18: {
      pinyin: "yu\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DE3"
    },
    \u8FDC: {
      pinyin: "yu\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u9060"
    },
    \u82D1: {
      pinyin: "yu\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u82D1"
    },
    \u613F: {
      pinyin: "yu\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9858"
    },
    \u5CB3: {
      pinyin: "yu\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5CB3"
    },
    \u60A6: {
      pinyin: "yu\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6085"
    },
    \u8D8A: {
      pinyin: "yu\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8D8A"
    },
    \u8DC3: {
      pinyin: "yu\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8E8D"
    },
    \u6708: {
      pinyin: "yu\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6708"
    },
    \u73A5: {
      pinyin: "yu\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u73A5"
    },
    \u4E91: {
      pinyin: "y\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u96F2"
    },
    \u82B8: {
      pinyin: "y\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8553"
    },
    \u6600: {
      pinyin: "y\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6600"
    },
    \u5141: {
      pinyin: "y\u01D4n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5141"
    },
    \u8FD0: {
      pinyin: "y\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u904B"
    },
    \u97F5: {
      pinyin: "y\xF9n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u97FB"
    },
    \u8018: {
      pinyin: "y\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8018"
    },
    \u6CFD: {
      pinyin: "z\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6FA4"
    },
    \u5219: {
      pinyin: "z\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5247"
    },
    \u589E: {
      pinyin: "z\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u589E"
    },
    \u5C55: {
      pinyin: "zh\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5C55"
    },
    \u6E5B: {
      pinyin: "zh\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6E5B"
    },
    \u7AE0: {
      pinyin: "zh\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7AE0"
    },
    \u748B: {
      pinyin: "zh\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u748B"
    },
    \u5F70: {
      pinyin: "zh\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F70"
    },
    \u6A1F: {
      pinyin: "zh\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6A1F"
    },
    \u662D: {
      pinyin: "zh\u0101o",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u662D"
    },
    \u5146: {
      pinyin: "zh\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5146"
    },
    \u7167: {
      pinyin: "zh\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7167"
    },
    \u54F2: {
      pinyin: "zh\xE9",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u54F2"
    },
    \u6D59: {
      pinyin: "zh\xE8",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D59"
    },
    \u73CD: {
      pinyin: "zh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u73CD"
    },
    \u771F: {
      pinyin: "zh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u771F"
    },
    \u8D1E: {
      pinyin: "zh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u8C9E"
    },
    \u81FB: {
      pinyin: "zh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u81FB"
    },
    \u7504: {
      pinyin: "zh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7504"
    },
    \u796F: {
      pinyin: "zh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u798E"
    },
    \u632F: {
      pinyin: "zh\xE8n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u632F"
    },
    \u9707: {
      pinyin: "zh\xE8n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9707"
    },
    \u9547: {
      pinyin: "zh\xE8n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u93AE"
    },
    \u6B63: {
      pinyin: "zh\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B63"
    },
    \u653F: {
      pinyin: "zh\xE8ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u653F"
    },
    \u4E4B: {
      pinyin: "zh\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E4B"
    },
    \u829D: {
      pinyin: "zh\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u829D"
    },
    \u77E5: {
      pinyin: "zh\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u77E5"
    },
    \u679D: {
      pinyin: "zh\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u679D"
    },
    \u76F4: {
      pinyin: "zh\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u76F4"
    },
    \u690D: {
      pinyin: "zh\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u690D"
    },
    \u82B7: {
      pinyin: "zh\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u82B7"
    },
    \u5FD7: {
      pinyin: "zh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8A8C"
    },
    \u81F3: {
      pinyin: "zh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u81F3"
    },
    \u667A: {
      pinyin: "zh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u667A"
    },
    \u81F4: {
      pinyin: "zh\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7DFB"
    },
    \u4EF2: {
      pinyin: "zh\xF2ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4EF2"
    },
    \u4E2D: {
      pinyin: "zh\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u4E2D"
    },
    \u5FE0: {
      pinyin: "zh\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5FE0"
    },
    \u949F: {
      pinyin: "zh\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u937E"
    },
    \u4F17: {
      pinyin: "zh\xF2ng",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u773E"
    },
    \u821F: {
      pinyin: "zh\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u821F"
    },
    \u6D32: {
      pinyin: "zh\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6D32"
    },
    \u5468: {
      pinyin: "zh\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5468"
    },
    \u5B99: {
      pinyin: "zh\xF2u",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B99"
    },
    \u73E0: {
      pinyin: "zh\u016B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u73E0"
    },
    \u7AF9: {
      pinyin: "zh\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7AF9"
    },
    \u7AFA: {
      pinyin: "zh\xFA",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7AFA"
    },
    \u5353: {
      pinyin: "zhu\xF3",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5353"
    },
    \u707C: {
      pinyin: "zhu\xF3",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u707C"
    },
    \u8301: {
      pinyin: "zhu\xF3",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8301"
    },
    \u6893: {
      pinyin: "z\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6893"
    },
    \u5B50: {
      pinyin: "z\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B50"
    },
    \u7D2B: {
      pinyin: "z\u01D0",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D2B"
    },
    \u59FF: {
      pinyin: "z\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u59FF"
    },
    \u5B97: {
      pinyin: "z\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5B97"
    },
    \u7956: {
      pinyin: "z\u01D4",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7956"
    },
    \u4F50: {
      pinyin: "zu\u01D2",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F50"
    },
    \u5DE6: {
      pinyin: "zu\u01D2",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u5DE6"
    },
    \u4F5C: {
      pinyin: "zu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u4F5C"
    },
    \u795A: {
      pinyin: "zu\xF2",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u795A"
    },
    \u8283: {
      pinyin: "p\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8283"
    },
    \u71CA: {
      pinyin: "sh\u0113n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u71CA"
    },
    \u794E: {
      pinyin: "y\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7995"
    },
    \u7444: {
      pinyin: "xu\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7444"
    },
    \u74A8: {
      pinyin: "c\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u74A8"
    },
    \u7CB2: {
      pinyin: "c\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u7CB2"
    },
    \u9EDB: {
      pinyin: "d\xE0i",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9EDB"
    },
    \u5072: {
      pinyin: "s\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5072"
    },
    \u8C27: {
      pinyin: "m\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u8B10"
    },
    \u9E92: {
      pinyin: "q\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u9E92"
    },
    \u9A9E: {
      pinyin: "qi\u0101n",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u9A2B"
    },
    \u7A79: {
      pinyin: "qi\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7A79"
    },
    \u8564: {
      pinyin: "ru\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8564"
    },
    \u83D8: {
      pinyin: "s\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u83D8"
    },
    \u6F8D: {
      pinyin: "sh\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F8D"
    },
    \u7EE5: {
      pinyin: "su\xED",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7D8F"
    },
    \u7B71: {
      pinyin: "xi\u01CEo",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B71"
    },
    \u6B46: {
      pinyin: "x\u012Bn",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6B46"
    },
    \u71B9: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u71B9"
    },
    \u7FB2: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7FB2"
    },
    \u5A34: {
      pinyin: "xi\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5AFB"
    },
    \u6CF1: {
      pinyin: "y\u0101ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6CF1"
    },
    \u6F2A: {
      pinyin: "y\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F2A"
    },
    \u5F08: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F08"
    },
    \u603F: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u61CC"
    },
    \u988D: {
      pinyin: "y\u01D0ng",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u6F41"
    },
    \u96CD: {
      pinyin: "y\u014Dng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u96CD"
    },
    \u6538: {
      pinyin: "y\u014Du",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u6538"
    },
    \u6DEF: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6DEF"
    },
    \u7F28: {
      pinyin: "y\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7E93"
    },
    \u82D2: {
      pinyin: "r\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u82D2"
    },
    \u73E9: {
      pinyin: "h\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u73E9"
    },
    \u8605: {
      pinyin: "h\xE9ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u8605"
    },
    \u83E1: {
      pinyin: "h\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u83E1"
    },
    \u98A2: {
      pinyin: "h\xE0o",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u9865"
    },
    \u7430: {
      pinyin: "y\u01CEn",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u7430"
    },
    \u71DA: {
      pinyin: "y\xEC",
      tone: 4,
      sourceId: "wiktionary-zh",
      dictionaryWord: "\u71DA"
    },
    \u6698: {
      pinyin: "y\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6698"
    },
    \u67E0: {
      pinyin: "n\xEDng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u6AB8"
    },
    \u6849: {
      pinyin: "\xE0n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6849"
    },
    \u69FF: {
      pinyin: "j\u01D0n",
      tone: 3,
      sourceId: "moe-revised",
      dictionaryWord: "\u69FF"
    },
    \u680E: {
      pinyin: "l\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u6ADF"
    },
    \u665E: {
      pinyin: "x\u012B",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u665E"
    },
    \u74A0: {
      pinyin: "f\xE1n",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u74A0"
    },
    \u7498: {
      pinyin: "l\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7498"
    },
    \u7B60: {
      pinyin: "y\xFAn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B60"
    },
    \u7B90: {
      pinyin: "j\u012Bng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u7B90"
    },
    \u807F: {
      pinyin: "y\xF9",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u807F"
    },
    \u742E: {
      pinyin: "c\xF3ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u742E"
    },
    \u73C9: {
      pinyin: "m\xEDn",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u73C9"
    },
    \u539A: {
      pinyin: "h\xF2u",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u539A"
    },
    \u81EA: {
      pinyin: "z\xEC",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u81EA"
    },
    \u5F3A: {
      pinyin: "qi\xE1ng",
      tone: 2,
      sourceId: "moe-revised",
      dictionaryWord: "\u5F37"
    },
    \u5347: {
      pinyin: "sh\u0113ng",
      tone: 1,
      sourceId: "moe-revised",
      dictionaryWord: "\u5347"
    },
    \u614E: {
      pinyin: "sh\xE8n",
      tone: 4,
      sourceId: "moe-revised",
      dictionaryWord: "\u614E"
    }
  },
  characters: {
    \u671D: {
      pinyin: "zh\u0101o",
      sense: "\u6668\u5149\u4E0E\u65B0\u751F",
      dictionarySense: "\u65E9\u6668\u3002",
      readings: [
        {
          char: "\u671D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u671D"
        }
      ],
      status: "bound-default-reading"
    },
    \u957F: {
      pinyin: "ch\xE1ng",
      sense: "\u957F\u8FDC\u4E0E\u6301\u4E45",
      dictionarySense: "\u6642\u9593\u4E45\u9060\u3002\u8207\u300C\u77ED\u300D\u76F8\u5C0D\u3002",
      readings: [
        {
          char: "\u957F",
          pinyin: "ch\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9577"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E50: {
      pinyin: "l\xE8",
      sense: "\u5FEB\u4E50",
      dictionarySense: "\u6B61\u559C\u3001\u6109\u6085\u3002",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        }
      ],
      status: "bound-default-reading"
    },
    \u884C: {
      pinyin: "x\xEDng",
      sense: "\u7B03\u884C",
      dictionarySense: "\u505A\u3001\u5F9E\u4E8B\u3002",
      readings: [
        {
          char: "\u884C",
          pinyin: "x\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u884C"
        }
      ],
      status: "bound-default-reading"
    },
    \u67CF: {
      pinyin: "b\u01CEi",
      sense: "\u575A\u97E7",
      readings: [
        {
          char: "\u67CF",
          pinyin: "b\u01CEi",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u67CF"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FAE: {
      pinyin: "w\u0113i",
      sense: "\u89C1\u5FAE\u77E5\u8457\u7684\u7EC6\u5BDF",
      dictionarySense: "\u7CBE\u5999\u5E7D\u6DF1\u3002",
      readings: [
        {
          char: "\u5FAE",
          pinyin: "w\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FAE"
        }
      ],
      status: "bound-default-reading"
    },
    \u7136: {
      sense: "\u4ECE\u5BB9\u81EA\u7136",
      dictionarySense: "\u5F62\u5BB9\u8A5E\u6216\u526F\u8A5E\u8A5E\u5C3E\u3002",
      readings: [
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E88: {
      pinyin: "y\u01D4",
      sense: "\u7ED9\u4E88",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    \u666F: {
      pinyin: "j\u01D0ng",
      sense: "\u5149\u660E\u4E0E\u666F\u81F4",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        }
      ],
      status: "bound-default-reading"
    },
    \u539A: {
      sense: "\u6566\u539A",
      pinyin: "h\xF2u",
      dictionaryWord: "\u539A",
      dictionarySense: "\u4E0D\u523B\u8584\u7684\u3002",
      readings: [
        {
          char: "\u539A",
          pinyin: "h\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u539A"
        }
      ],
      status: "bound-default-reading"
    },
    \u5F3A: {
      pinyin: "qi\xE1ng",
      sense: "\u81EA\u5F3A",
      dictionaryWord: "\u5F37",
      dictionarySense: "\u52A0\u5F37\u3002",
      readings: [
        {
          char: "\u5F3A",
          pinyin: "qi\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5F37"
        }
      ],
      status: "bound-default-reading"
    },
    \u80B2: {
      sense: "\u6DB5\u80B2",
      readings: [
        {
          char: "\u80B2",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u80B2"
        }
      ],
      status: "bound-default-reading"
    },
    \u61FF: {
      sense: "\u7F8E\u5FB7",
      readings: [
        {
          char: "\u61FF"
        }
      ],
      status: "pending-missing-character"
    },
    \u542B: {
      sense: "\u8574\u85CF",
      readings: [
        {
          char: "\u542B",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u542B"
        }
      ],
      status: "bound-default-reading"
    },
    \u7AE0: {
      sense: "\u6587\u91C7",
      readings: [
        {
          char: "\u7AE0",
          pinyin: "zh\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AE0"
        }
      ],
      status: "bound-default-reading"
    },
    \u5347: {
      sense: "\u5411\u4E0A\u6210\u957F",
      pinyin: "sh\u0113ng",
      dictionaryWord: "\u5347",
      dictionarySense: "\u7531\u4E0B\u800C\u4E0A\u3002",
      readings: [
        {
          char: "\u5347",
          pinyin: "sh\u0113ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5347"
        }
      ],
      status: "bound-default-reading"
    },
    \u6052: {
      sense: "\u6052\u5FC3",
      readings: [
        {
          char: "\u6052",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6046"
        }
      ],
      status: "bound-default-reading"
    },
    \u76CA: {
      sense: "\u589E\u76CA",
      readings: [
        {
          char: "\u76CA",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u76CA"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FC3: {
      sense: "\u8BDA\u5FC3",
      readings: [
        {
          char: "\u5FC3",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FC3"
        }
      ],
      status: "bound-default-reading"
    },
    \u614E: {
      sense: "\u8C28\u614E",
      pinyin: "sh\xE8n",
      dictionaryWord: "\u614E",
      dictionarySense: "\u5C0F\u5FC3\u3002",
      readings: [
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E"
        }
      ],
      status: "bound-default-reading"
    },
    \u6DD1: {
      sense: "\u5584\u7F8E",
      readings: [
        {
          char: "\u6DD1",
          pinyin: "sh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DD1"
        }
      ],
      status: "bound-default-reading"
    },
    \u656C: {
      sense: "\u656C\u614E",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C"
        }
      ],
      status: "bound-default-reading"
    },
    \u67D4: {
      sense: "\u67D4\u548C",
      readings: [
        {
          char: "\u67D4",
          pinyin: "r\xF3u",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u67D4"
        }
      ],
      status: "bound-default-reading"
    },
    \u5409: {
      sense: "\u7F8E\u597D",
      readings: [
        {
          char: "\u5409"
        }
      ],
      status: "pending-missing-character"
    },
    \u8D1E: {
      sense: "\u5B88\u6B63",
      readings: [
        {
          char: "\u8D1E",
          pinyin: "zh\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8C9E"
        }
      ],
      status: "bound-default-reading"
    },
    \u677E: {
      pinyin: "s\u014Dng",
      sense: "\u575A\u97E7",
      dictionaryWord: "\u677E",
      dictionarySense: "\u677E\u79D1\u690D\u7269\u7684\u7E3D\u7A31\u3002\u7A2E\u985E\u6975\u591A\uFF0C\u4E00\u822C\u70BA\u5E38\u7DA0\u55AC\u6728\u3002\u5E79\u8073\u76F4\uFF0C\u76AE\u7C97\u539A\uFF0C\u8449\u5982\u91DD\uFF0C\u82B1\u55AE\u6027\uFF0C\u7D50\u6BEC\u679C\uFF0C\u6728\u6750\u7528\u9014\u751A\u5EE3\uFF0C\u53EF\u4F9B\u91AB\u85E5\u548C\u5DE5\u85DD\u7528\u3002",
      readings: [
        {
          char: "\u677E",
          pinyin: "s\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u677E"
        }
      ],
      status: "bound-default-reading"
    },
    \u81EA: {
      pinyin: "z\xEC",
      sense: "\u81EA\u7701\u81EA\u52C9",
      dictionaryWord: "\u81EA",
      dictionarySense: "\u5DF1\u8EAB\u3002",
      readings: [
        {
          char: "\u81EA",
          pinyin: "z\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u81EA"
        }
      ],
      status: "bound-default-reading"
    }
  },
  defaultSenseMap: {
    \u4EC1: {
      meaning: "\u4EC1\u7231",
      readings: [
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        }
      ],
      status: "bound-default-reading"
    },
    \u548C: {
      meaning: "\u548C\u7F8E",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    \u5B81: {
      meaning: "\u5B89\u5B81",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    \u5B89: {
      meaning: "\u5E73\u5B89",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    \u5609: {
      meaning: "\u7F8E\u597D",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        }
      ],
      status: "bound-default-reading"
    },
    \u77E5: {
      meaning: "\u6C42\u77E5",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    \u660E: {
      meaning: "\u660E\u6717",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    \u6E05: {
      meaning: "\u6E05\u6F88",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    \u6F84: {
      meaning: "\u6F84\u660E",
      readings: [
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    \u8FDC: {
      meaning: "\u5FD7\u5411",
      readings: [
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FD7: {
      meaning: "\u5FD7\u5411",
      readings: [
        {
          char: "\u5FD7",
          pinyin: "zh\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A8C"
        }
      ],
      status: "bound-default-reading"
    },
    \u6000: {
      meaning: "\u80F8\u6000",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FB7: {
      meaning: "\u54C1\u5FB7",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    \u793C: {
      meaning: "\u793C\u4EEA",
      readings: [
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    \u6587: {
      meaning: "\u6587\u91C7",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    \u96C5: {
      meaning: "\u5178\u96C5",
      readings: [
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E66: {
      meaning: "\u4E66\u9999",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        }
      ],
      status: "bound-default-reading"
    },
    \u8A00: {
      meaning: "\u8BDA\u4FE1",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    \u8BDA: {
      meaning: "\u8BDA\u4FE1",
      readings: [
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        }
      ],
      status: "bound-default-reading"
    },
    \u4FE1: {
      meaning: "\u8BDA\u4FE1",
      readings: [
        {
          char: "\u4FE1",
          pinyin: "x\xECn",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FE1"
        }
      ],
      status: "bound-default-reading"
    },
    \u4FEE: {
      meaning: "\u4FEE\u517B",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        }
      ],
      status: "bound-default-reading"
    },
    \u601D: {
      meaning: "\u601D\u8FA8",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        }
      ],
      status: "bound-default-reading"
    },
    \u777F: {
      meaning: "\u777F\u667A",
      readings: [
        {
          char: "\u777F",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u777F"
        }
      ],
      status: "bound-default-reading"
    },
    \u6167: {
      meaning: "\u667A\u6167",
      readings: [
        {
          char: "\u6167",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6167"
        }
      ],
      status: "bound-default-reading"
    },
    \u667A: {
      meaning: "\u667A\u6167",
      readings: [
        {
          char: "\u667A",
          pinyin: "zh\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u667A"
        }
      ],
      status: "bound-default-reading"
    },
    \u6717: {
      meaning: "\u5F00\u6717",
      readings: [
        {
          char: "\u6717",
          pinyin: "l\u01CEng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6717"
        }
      ],
      status: "bound-default-reading"
    },
    \u60A6: {
      meaning: "\u559C\u60A6",
      readings: [
        {
          char: "\u60A6",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6085"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E50: {
      meaning: "\u5FEB\u4E50",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        }
      ],
      status: "bound-default-reading"
    },
    \u6B23: {
      meaning: "\u6B23\u60A6",
      readings: [
        {
          char: "\u6B23",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6B23"
        }
      ],
      status: "bound-default-reading"
    },
    \u6615: {
      meaning: "\u6668\u5149",
      readings: [
        {
          char: "\u6615"
        }
      ],
      status: "pending-missing-character"
    },
    \u6668: {
      meaning: "\u6668\u5149",
      readings: [
        {
          char: "\u6668",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6668"
        }
      ],
      status: "bound-default-reading"
    },
    \u66E6: {
      meaning: "\u6668\u5149",
      readings: [
        {
          char: "\u66E6",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66E6"
        }
      ],
      status: "bound-default-reading"
    },
    \u662D: {
      meaning: "\u5149\u660E",
      readings: [
        {
          char: "\u662D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u662D"
        }
      ],
      status: "bound-default-reading"
    },
    \u666F: {
      meaning: "\u5149\u660E\u4E0E\u666F\u81F4",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        }
      ],
      status: "bound-default-reading"
    },
    \u9701: {
      meaning: "\u6674\u6717",
      readings: [
        {
          char: "\u9701"
        }
      ],
      status: "pending-missing-character"
    },
    \u6674: {
      meaning: "\u6674\u6717",
      readings: [
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "bound-default-reading"
    },
    \u96E8: {
      meaning: "\u6DA6\u6CFD",
      readings: [
        {
          char: "\u96E8",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96E8"
        }
      ],
      status: "bound-default-reading"
    },
    \u6CFD: {
      meaning: "\u6DA6\u6CFD",
      readings: [
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        }
      ],
      status: "bound-default-reading"
    },
    \u6DA6: {
      meaning: "\u6DA6\u6CFD",
      readings: [
        {
          char: "\u6DA6",
          pinyin: "r\xF9n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F64"
        }
      ],
      status: "bound-default-reading"
    },
    \u6DB5: {
      meaning: "\u6DB5\u517B",
      readings: [
        {
          char: "\u6DB5",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DB5"
        }
      ],
      status: "bound-default-reading"
    },
    \u6EAA: {
      meaning: "\u6E05\u6D41",
      readings: [
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        }
      ],
      status: "bound-default-reading"
    },
    \u5DDD: {
      meaning: "\u5F00\u9614",
      readings: [
        {
          char: "\u5DDD",
          pinyin: "chu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5DDD"
        }
      ],
      status: "bound-default-reading"
    },
    \u5C71: {
      meaning: "\u6C89\u7A33",
      readings: [
        {
          char: "\u5C71",
          pinyin: "sh\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5C71"
        }
      ],
      status: "bound-default-reading"
    },
    \u5CB3: {
      meaning: "\u6C89\u7A33",
      readings: [
        {
          char: "\u5CB3",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5CB3"
        }
      ],
      status: "bound-default-reading"
    },
    \u677E: {
      meaning: "\u575A\u97E7",
      readings: [
        {
          char: "\u677E",
          pinyin: "s\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u677E"
        }
      ],
      status: "bound-default-reading"
    },
    \u67CF: {
      meaning: "\u575A\u97E7",
      readings: [
        {
          char: "\u67CF",
          pinyin: "b\u01CEi",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u67CF"
        }
      ],
      status: "bound-default-reading"
    },
    \u7AF9: {
      meaning: "\u6C14\u8282",
      readings: [
        {
          char: "\u7AF9",
          pinyin: "zh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AF9"
        }
      ],
      status: "bound-default-reading"
    },
    \u5170: {
      meaning: "\u6E05\u96C5",
      readings: [
        {
          char: "\u5170",
          pinyin: "l\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u862D"
        }
      ],
      status: "bound-default-reading"
    },
    \u82B7: {
      meaning: "\u82B3\u6D01",
      readings: [
        {
          char: "\u82B7",
          pinyin: "zh\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u82B7"
        }
      ],
      status: "bound-default-reading"
    },
    \u82E5: {
      meaning: "\u4ECE\u5BB9",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E88: {
      meaning: "\u7ED9\u4E88",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    \u4EE5: {
      meaning: "\u6301\u5B88",
      readings: [
        {
          char: "\u4EE5"
        }
      ],
      status: "pending-missing-character"
    },
    \u5141: {
      meaning: "\u516C\u5141",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        }
      ],
      status: "bound-default-reading"
    },
    \u6538: {
      meaning: "\u60A0\u7136",
      readings: [
        {
          char: "\u6538",
          pinyin: "y\u014Du",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6538"
        }
      ],
      status: "bound-default-reading"
    },
    \u884C: {
      meaning: "\u7B03\u884C",
      readings: [
        {
          char: "\u884C",
          pinyin: "x\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u884C"
        }
      ],
      status: "bound-default-reading"
    },
    \u5E8F: {
      meaning: "\u6709\u5E8F",
      readings: [
        {
          char: "\u5E8F",
          pinyin: "x\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5E8F"
        }
      ],
      status: "bound-default-reading"
    },
    \u8861: {
      meaning: "\u5E73\u8861",
      readings: [
        {
          char: "\u8861",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8861"
        }
      ],
      status: "bound-default-reading"
    },
    \u749F: {
      meaning: "\u7389\u5149",
      readings: [
        {
          char: "\u749F"
        }
      ],
      status: "pending-missing-character"
    },
    \u747E: {
      meaning: "\u7F8E\u5FB7",
      readings: [
        {
          char: "\u747E",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u747E"
        }
      ],
      status: "bound-default-reading"
    },
    \u745C: {
      meaning: "\u7F8E\u7389",
      readings: [
        {
          char: "\u745C",
          pinyin: "y\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u745C"
        }
      ],
      status: "bound-default-reading"
    },
    \u73E9: {
      meaning: "\u7389\u4F69",
      readings: [
        {
          char: "\u73E9",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u73E9"
        }
      ],
      status: "bound-default-reading"
    },
    \u73A5: {
      meaning: "\u73CD\u7231",
      readings: [
        {
          char: "\u73A5",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u73A5"
        }
      ],
      status: "bound-default-reading"
    },
    \u58EB: {
      meaning: "\u4FEE\u8EAB\u5FD7\u4E1A",
      readings: [
        {
          char: "\u58EB",
          pinyin: "sh\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u58EB"
        }
      ],
      status: "bound-default-reading"
    },
    \u5149: {
      meaning: "\u5149\u660E",
      readings: [
        {
          char: "\u5149",
          pinyin: "gu\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5149"
        }
      ],
      status: "bound-default-reading"
    },
    \u6708: {
      meaning: "\u6E05\u8F89",
      readings: [
        {
          char: "\u6708",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6708"
        }
      ],
      status: "bound-default-reading"
    },
    \u5915: {
      meaning: "\u5B81\u9759\u65F6\u5149",
      readings: [
        {
          char: "\u5915",
          pinyin: "x\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5915"
        }
      ],
      status: "bound-default-reading"
    },
    \u5DE7: {
      meaning: "\u806A\u6167",
      readings: [
        {
          char: "\u5DE7",
          pinyin: "qi\u01CEo",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5DE7"
        }
      ],
      status: "bound-default-reading"
    },
    \u661F: {
      meaning: "\u661F\u5149",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        }
      ],
      status: "bound-default-reading"
    },
    \u9633: {
      meaning: "\u5411\u9633",
      readings: [
        {
          char: "\u9633",
          pinyin: "y\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u967D"
        }
      ],
      status: "bound-default-reading"
    },
    \u6850: {
      meaning: "\u633A\u62D4",
      readings: [
        {
          char: "\u6850",
          pinyin: "t\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6850"
        }
      ],
      status: "bound-default-reading"
    },
    \u6893: {
      meaning: "\u751F\u957F",
      readings: [
        {
          char: "\u6893",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6893"
        }
      ],
      status: "bound-default-reading"
    },
    \u6797: {
      meaning: "\u84EC\u52C3",
      readings: [
        {
          char: "\u6797",
          pinyin: "l\xEDn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6797"
        }
      ],
      status: "bound-default-reading"
    },
    \u68EE: {
      meaning: "\u751F\u673A",
      readings: [
        {
          char: "\u68EE",
          pinyin: "s\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u68EE"
        }
      ],
      status: "bound-default-reading"
    },
    \u6960: {
      meaning: "\u575A\u5B9E",
      readings: [
        {
          char: "\u6960",
          pinyin: "n\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6960"
        }
      ],
      status: "bound-default-reading"
    },
    \u6986: {
      meaning: "\u575A\u97E7",
      readings: [
        {
          char: "\u6986",
          pinyin: "y\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6986"
        }
      ],
      status: "bound-default-reading"
    },
    \u67AB: {
      meaning: "\u4E30\u8302",
      readings: [
        {
          char: "\u67AB",
          pinyin: "f\u0113ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6953"
        }
      ],
      status: "bound-default-reading"
    },
    \u69FF: {
      meaning: "\u751F\u673A",
      readings: [
        {
          char: "\u69FF",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u69FF"
        }
      ],
      status: "bound-default-reading"
    },
    \u6995: {
      meaning: "\u836B\u5E87",
      readings: [
        {
          char: "\u6995"
        }
      ],
      status: "pending-missing-character"
    },
    \u67F3: {
      meaning: "\u67D4\u97E7",
      readings: [
        {
          char: "\u67F3",
          pinyin: "li\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u67F3"
        }
      ],
      status: "bound-default-reading"
    },
    \u6843: {
      meaning: "\u751F\u673A",
      readings: [
        {
          char: "\u6843",
          pinyin: "t\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6843"
        }
      ],
      status: "bound-default-reading"
    },
    \u6885: {
      meaning: "\u575A\u8D1E",
      readings: [
        {
          char: "\u6885",
          pinyin: "m\xE9i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6885"
        }
      ],
      status: "bound-default-reading"
    },
    \u674F: {
      meaning: "\u6625\u610F",
      readings: [
        {
          char: "\u674F",
          pinyin: "x\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u674F"
        }
      ],
      status: "bound-default-reading"
    },
    \u8377: {
      meaning: "\u6E05\u96C5",
      readings: [
        {
          char: "\u8377",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8377"
        }
      ],
      status: "bound-default-reading"
    },
    \u83B2: {
      meaning: "\u82B3\u6D01",
      readings: [
        {
          char: "\u83B2"
        }
      ],
      status: "pending-missing-character"
    },
    \u82D2: {
      meaning: "\u751F\u957F",
      readings: [
        {
          char: "\u82D2",
          pinyin: "r\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u82D2"
        }
      ],
      status: "bound-default-reading"
    },
    \u8335: {
      meaning: "\u82B3\u8349",
      readings: [
        {
          char: "\u8335",
          pinyin: "y\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8335"
        }
      ],
      status: "bound-default-reading"
    },
    \u8309: {
      meaning: "\u82B3\u9999",
      readings: [
        {
          char: "\u8309"
        }
      ],
      status: "pending-missing-character"
    },
    \u83F2: {
      meaning: "\u82B3\u83F2",
      readings: [
        {
          char: "\u83F2",
          pinyin: "f\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u83F2"
        }
      ],
      status: "bound-default-reading"
    },
    \u83C1: {
      meaning: "\u7CBE\u534E",
      readings: [
        {
          char: "\u83C1",
          pinyin: "j\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u83C1"
        }
      ],
      status: "bound-default-reading"
    },
    \u8431: {
      meaning: "\u559C\u60A6",
      readings: [
        {
          char: "\u8431",
          pinyin: "xu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8431"
        }
      ],
      status: "bound-default-reading"
    },
    \u8587: {
      meaning: "\u6E05\u65B0",
      readings: [
        {
          char: "\u8587",
          pinyin: "w\xE9i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8587"
        }
      ],
      status: "bound-default-reading"
    },
    \u8299: {
      meaning: "\u79C0\u96C5",
      readings: [
        {
          char: "\u8299",
          pinyin: "f\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8299"
        }
      ],
      status: "bound-default-reading"
    },
    \u828A: {
      meaning: "\u8471\u830F",
      readings: [
        {
          char: "\u828A"
        }
      ],
      status: "pending-missing-character"
    },
    \u82B3: {
      meaning: "\u82B3\u6D01",
      readings: [
        {
          char: "\u82B3",
          pinyin: "f\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u82B3"
        }
      ],
      status: "bound-default-reading"
    },
    \u82B8: {
      meaning: "\u4E66\u9999",
      readings: [
        {
          char: "\u82B8",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8553"
        }
      ],
      status: "bound-default-reading"
    },
    \u82AE: {
      meaning: "\u521D\u751F",
      readings: [
        {
          char: "\u82AE",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82AE"
        }
      ],
      status: "bound-default-reading"
    },
    \u8559: {
      meaning: "\u5170\u5FC3",
      readings: [
        {
          char: "\u8559"
        }
      ],
      status: "pending-missing-character"
    },
    \u84C9: {
      meaning: "\u6E05\u96C5",
      readings: [
        {
          char: "\u84C9",
          pinyin: "r\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u84C9"
        }
      ],
      status: "bound-default-reading"
    },
    \u7A57: {
      meaning: "\u4E30\u6536",
      readings: [
        {
          char: "\u7A57",
          pinyin: "su\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7A57"
        }
      ],
      status: "bound-default-reading"
    },
    \u79BE: {
      meaning: "\u751F\u957F",
      readings: [
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character"
    },
    \u7A37: {
      meaning: "\u4E30\u8DB3",
      readings: [
        {
          char: "\u7A37"
        }
      ],
      status: "pending-missing-character"
    },
    \u79CB: {
      meaning: "\u6536\u83B7",
      readings: [
        {
          char: "\u79CB",
          pinyin: "qi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u97A6"
        }
      ],
      status: "bound-default-reading"
    },
    \u6625: {
      meaning: "\u65B0\u751F",
      readings: [
        {
          char: "\u6625",
          pinyin: "ch\u016Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6625"
        }
      ],
      status: "bound-default-reading"
    },
    \u51AC: {
      meaning: "\u575A\u97E7",
      readings: [
        {
          char: "\u51AC",
          pinyin: "d\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u9F15"
        }
      ],
      status: "bound-default-reading"
    },
    \u590F: {
      meaning: "\u70ED\u5FF1",
      readings: [
        {
          char: "\u590F",
          pinyin: "xi\xE0",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u590F"
        }
      ],
      status: "bound-default-reading"
    },
    \u96EA: {
      meaning: "\u6F84\u51C0",
      readings: [
        {
          char: "\u96EA",
          pinyin: "xu\u011B",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96EA"
        }
      ],
      status: "bound-default-reading"
    },
    \u9716: {
      meaning: "\u7518\u9716",
      readings: [
        {
          char: "\u9716",
          pinyin: "l\xEDn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9716"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E91: {
      meaning: "\u9AD8\u8FDC",
      readings: [
        {
          char: "\u4E91",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u96F2"
        }
      ],
      status: "bound-default-reading"
    },
    \u971E: {
      meaning: "\u660E\u4E3D",
      readings: [
        {
          char: "\u971E",
          pinyin: "xi\xE1",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u971E"
        }
      ],
      status: "bound-default-reading"
    },
    \u9732: {
      meaning: "\u6E05\u6DA6",
      readings: [
        {
          char: "\u9732",
          pinyin: "l\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9732"
        }
      ],
      status: "bound-default-reading"
    },
    \u6C50: {
      meaning: "\u6F6E\u6C50",
      readings: [
        {
          char: "\u6C50"
        }
      ],
      status: "pending-missing-character"
    },
    \u6C90: {
      meaning: "\u6DA6\u6CFD",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        }
      ],
      status: "bound-default-reading"
    },
    \u6C85: {
      meaning: "\u6E05\u6D41",
      readings: [
        {
          char: "\u6C85"
        }
      ],
      status: "pending-missing-character"
    },
    \u6C40: {
      meaning: "\u6C34\u5CB8",
      readings: [
        {
          char: "\u6C40"
        }
      ],
      status: "pending-missing-character"
    },
    \u6C9B: {
      meaning: "\u5145\u6C9B",
      readings: [
        {
          char: "\u6C9B",
          pinyin: "p\xE8i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C9B"
        }
      ],
      status: "bound-default-reading"
    },
    \u6D69: {
      meaning: "\u6D69\u7136",
      readings: [
        {
          char: "\u6D69",
          pinyin: "h\xE0o",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6D69"
        }
      ],
      status: "bound-default-reading"
    },
    \u6D0B: {
      meaning: "\u5F00\u9614",
      readings: [
        {
          char: "\u6D0B",
          pinyin: "y\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6D0B"
        }
      ],
      status: "bound-default-reading"
    },
    \u6D9B: {
      meaning: "\u6C14\u5EA6",
      readings: [
        {
          char: "\u6D9B",
          pinyin: "t\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FE4"
        }
      ],
      status: "bound-default-reading"
    },
    \u6D77: {
      meaning: "\u5BBD\u5E7F",
      readings: [
        {
          char: "\u6D77",
          pinyin: "h\u01CEi",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6D77"
        }
      ],
      status: "bound-default-reading"
    },
    \u6F9C: {
      meaning: "\u6CE2\u6F9C",
      readings: [
        {
          char: "\u6F9C",
          pinyin: "l\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u703E"
        }
      ],
      status: "bound-default-reading"
    },
    \u6CC9: {
      meaning: "\u6E05\u6DA6",
      readings: [
        {
          char: "\u6CC9",
          pinyin: "qu\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6CC9"
        }
      ],
      status: "bound-default-reading"
    },
    \u6E0A: {
      meaning: "\u6DF1\u539A",
      readings: [
        {
          char: "\u6E0A",
          pinyin: "yu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DF5"
        }
      ],
      status: "bound-default-reading"
    },
    \u6CD3: {
      meaning: "\u6DF1\u5E7F",
      readings: [
        {
          char: "\u6CD3",
          pinyin: "h\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6CD3"
        }
      ],
      status: "bound-default-reading"
    },
    \u6C81: {
      meaning: "\u6E05\u65B0",
      readings: [
        {
          char: "\u6C81",
          pinyin: "q\xECn",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C81"
        }
      ],
      status: "bound-default-reading"
    },
    \u6DF3: {
      meaning: "\u6566\u539A",
      readings: [
        {
          char: "\u6DF3",
          pinyin: "ch\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DF3"
        }
      ],
      status: "bound-default-reading"
    },
    \u6DC7: {
      meaning: "\u6E05\u6D41",
      readings: [
        {
          char: "\u6DC7"
        }
      ],
      status: "pending-missing-character"
    },
    \u6DD1: {
      meaning: "\u5584\u7F8E",
      readings: [
        {
          char: "\u6DD1",
          pinyin: "sh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DD1"
        }
      ],
      status: "bound-default-reading"
    },
    \u6D2A: {
      meaning: "\u5BBD\u5E7F",
      readings: [
        {
          char: "\u6D2A",
          pinyin: "h\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6D2A"
        }
      ],
      status: "bound-default-reading"
    },
    \u6E90: {
      meaning: "\u672C\u6E90",
      readings: [
        {
          char: "\u6E90",
          pinyin: "yu\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E90"
        }
      ],
      status: "bound-default-reading"
    },
    \u9038: {
      meaning: "\u4ECE\u5BB9",
      readings: [
        {
          char: "\u9038",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9038"
        }
      ],
      status: "bound-default-reading"
    },
    \u8FBE: {
      meaning: "\u901A\u8FBE",
      readings: [
        {
          char: "\u8FBE",
          pinyin: "d\xE1",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9054"
        }
      ],
      status: "bound-default-reading"
    },
    \u8C26: {
      meaning: "\u8C26\u548C",
      readings: [
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        }
      ],
      status: "bound-default-reading"
    },
    \u8C28: {
      meaning: "\u8C28\u614E",
      readings: [
        {
          char: "\u8C28"
        }
      ],
      status: "pending-missing-character"
    },
    \u654F: {
      meaning: "\u806A\u654F",
      readings: [
        {
          char: "\u654F",
          pinyin: "m\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u654F"
        }
      ],
      status: "bound-default-reading"
    },
    \u9896: {
      meaning: "\u9896\u609F",
      readings: [
        {
          char: "\u9896",
          pinyin: "y\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u7A4E"
        }
      ],
      status: "bound-default-reading"
    },
    \u52E4: {
      meaning: "\u52E4\u52C9",
      readings: [
        {
          char: "\u52E4"
        }
      ],
      status: "pending-missing-character"
    },
    \u575A: {
      meaning: "\u575A\u5B9A",
      readings: [
        {
          char: "\u575A",
          pinyin: "ji\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5805"
        }
      ],
      status: "bound-default-reading"
    },
    \u6BC5: {
      meaning: "\u575A\u6BC5",
      readings: [
        {
          char: "\u6BC5",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6BC5"
        }
      ],
      status: "bound-default-reading"
    },
    \u52C7: {
      meaning: "\u52C7\u6C14",
      readings: [
        {
          char: "\u52C7",
          pinyin: "y\u01D2ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u52C7"
        }
      ],
      status: "bound-default-reading"
    },
    \u5584: {
      meaning: "\u5584\u610F",
      readings: [
        {
          char: "\u5584",
          pinyin: "sh\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5584"
        }
      ],
      status: "bound-default-reading"
    },
    \u6069: {
      meaning: "\u611F\u6069",
      readings: [
        {
          char: "\u6069",
          pinyin: "\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6069"
        }
      ],
      status: "bound-default-reading"
    },
    \u607A: {
      meaning: "\u548C\u4E50",
      readings: [
        {
          char: "\u607A",
          pinyin: "k\u01CEi",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6137"
        }
      ],
      status: "bound-default-reading"
    },
    \u606C: {
      meaning: "\u5B89\u7136",
      readings: [
        {
          char: "\u606C",
          pinyin: "ti\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u606C"
        }
      ],
      status: "bound-default-reading"
    },
    \u6021: {
      meaning: "\u6109\u60A6",
      readings: [
        {
          char: "\u6021",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6021"
        }
      ],
      status: "bound-default-reading"
    },
    \u60A0: {
      meaning: "\u4ECE\u5BB9",
      readings: [
        {
          char: "\u60A0",
          pinyin: "y\u014Du",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u60A0"
        }
      ],
      status: "bound-default-reading"
    },
    \u4EA6: {
      meaning: "\u76F8\u627F",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        }
      ],
      status: "bound-default-reading"
    },
    \u53EF: {
      meaning: "\u53EF\u671F",
      readings: [
        {
          char: "\u53EF",
          pinyin: "k\u011B",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u53EF"
        }
      ],
      status: "bound-default-reading"
    },
    \u5982: {
      meaning: "\u5982\u613F",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982"
        }
      ],
      status: "bound-default-reading"
    },
    \u516E: {
      meaning: "\u53E4\u5178\u97F3\u97F5",
      readings: [
        {
          char: "\u516E"
        }
      ],
      status: "pending-missing-character"
    },
    \u4E4B: {
      meaning: "\u76F8\u627F",
      readings: [
        {
          char: "\u4E4B",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E4B"
        }
      ],
      status: "bound-default-reading"
    },
    \u6210: {
      meaning: "\u6210\u5C31",
      readings: [
        {
          char: "\u6210",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6210"
        }
      ],
      status: "bound-default-reading"
    },
    \u7ACB: {
      meaning: "\u81EA\u7ACB",
      readings: [
        {
          char: "\u7ACB",
          pinyin: "l\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7ACB"
        }
      ],
      status: "bound-default-reading"
    },
    \u5EFA: {
      meaning: "\u5EFA\u6811",
      readings: [
        {
          char: "\u5EFA",
          pinyin: "ji\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5EFA"
        }
      ],
      status: "bound-default-reading"
    },
    \u542F: {
      meaning: "\u542F\u8FEA",
      readings: [
        {
          char: "\u542F",
          pinyin: "q\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u555F"
        }
      ],
      status: "bound-default-reading"
    },
    \u65B0: {
      meaning: "\u521B\u65B0",
      readings: [
        {
          char: "\u65B0",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u65B0"
        }
      ],
      status: "bound-default-reading"
    },
    \u627F: {
      meaning: "\u627F\u7EE7",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        }
      ],
      status: "bound-default-reading"
    },
    \u7ECD: {
      meaning: "\u4F20\u627F",
      readings: [
        {
          char: "\u7ECD",
          pinyin: "sh\xE0o",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7D39"
        }
      ],
      status: "bound-default-reading"
    },
    \u7EE7: {
      meaning: "\u63A5\u7EED",
      readings: [
        {
          char: "\u7EE7",
          pinyin: "j\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7E7C"
        }
      ],
      status: "bound-default-reading"
    },
    \u7EF4: {
      meaning: "\u7EF4\u7CFB",
      readings: [
        {
          char: "\u7EF4",
          pinyin: "w\xE9i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7DAD"
        }
      ],
      status: "bound-default-reading"
    },
    \u5BA5: {
      meaning: "\u5BBD\u5BB9",
      readings: [
        {
          char: "\u5BA5",
          pinyin: "y\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BA5"
        }
      ],
      status: "bound-default-reading"
    },
    \u5BB8: {
      meaning: "\u6DF1\u9083",
      readings: [
        {
          char: "\u5BB8",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BB8"
        }
      ],
      status: "bound-default-reading"
    },
    \u5B87: {
      meaning: "\u6C14\u5EA6",
      readings: [
        {
          char: "\u5B87",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B87"
        }
      ],
      status: "bound-default-reading"
    },
    \u5B99: {
      meaning: "\u8FBD\u8FDC",
      readings: [
        {
          char: "\u5B99",
          pinyin: "zh\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B99"
        }
      ],
      status: "bound-default-reading"
    },
    \u5B8F: {
      meaning: "\u5B8F\u9614",
      readings: [
        {
          char: "\u5B8F",
          pinyin: "h\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B8F"
        }
      ],
      status: "bound-default-reading"
    },
    \u535A: {
      meaning: "\u535A\u5B66",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        }
      ],
      status: "bound-default-reading"
    },
    \u7855: {
      meaning: "\u4E30\u5B9E",
      readings: [
        {
          char: "\u7855",
          pinyin: "shu\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u78A9"
        }
      ],
      status: "bound-default-reading"
    },
    \u9E3F: {
      meaning: "\u9AD8\u8FDC",
      readings: [
        {
          char: "\u9E3F",
          pinyin: "h\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9D3B"
        }
      ],
      status: "bound-default-reading"
    },
    \u9E4F: {
      meaning: "\u8FDC\u5FD7",
      readings: [
        {
          char: "\u9E4F",
          pinyin: "p\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9D6C"
        }
      ],
      status: "bound-default-reading"
    },
    \u9E64: {
      meaning: "\u9AD8\u6D01",
      readings: [
        {
          char: "\u9E64",
          pinyin: "h\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9DB4"
        }
      ],
      status: "bound-default-reading"
    },
    \u9E7F: {
      meaning: "\u7075\u52A8",
      readings: [
        {
          char: "\u9E7F"
        }
      ],
      status: "pending-missing-character"
    },
    \u9E9F: {
      meaning: "\u7965\u745E",
      readings: [
        {
          char: "\u9E9F"
        }
      ],
      status: "pending-missing-character"
    },
    \u9E92: {
      meaning: "\u7965\u745E",
      readings: [
        {
          char: "\u9E92",
          pinyin: "q\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9E92"
        }
      ],
      status: "bound-default-reading"
    },
    \u745E: {
      meaning: "\u7965\u745E",
      readings: [
        {
          char: "\u745E",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u745E"
        }
      ],
      status: "bound-default-reading"
    },
    \u797A: {
      meaning: "\u5B89\u5409",
      readings: [
        {
          char: "\u797A",
          pinyin: "q\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u797A"
        }
      ],
      status: "bound-default-reading"
    },
    \u798F: {
      meaning: "\u798F\u6CFD",
      readings: [
        {
          char: "\u798F",
          pinyin: "f\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u798F"
        }
      ],
      status: "bound-default-reading"
    },
    \u6CF0: {
      meaning: "\u5B89\u6CF0",
      readings: [
        {
          char: "\u6CF0",
          pinyin: "t\xE0i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6CF0"
        }
      ],
      status: "bound-default-reading"
    },
    \u5EB7: {
      meaning: "\u5B89\u5EB7",
      readings: [
        {
          char: "\u5EB7",
          pinyin: "k\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5EB7"
        }
      ],
      status: "bound-default-reading"
    },
    \u5065: {
      meaning: "\u5065\u5EB7",
      readings: [
        {
          char: "\u5065",
          pinyin: "ji\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5065"
        }
      ],
      status: "bound-default-reading"
    },
    \u6148: {
      meaning: "\u4EC1\u6148",
      readings: [
        {
          char: "\u6148",
          pinyin: "c\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6148"
        }
      ],
      status: "bound-default-reading"
    },
    \u6D4E: {
      meaning: "\u6D4E\u4EBA",
      readings: [
        {
          char: "\u6D4E"
        }
      ],
      status: "pending-missing-character"
    },
    \u7389: {
      meaning: "\u6E29\u6DA6",
      readings: [
        {
          char: "\u7389",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7389"
        }
      ],
      status: "bound-default-reading"
    },
    \u743C: {
      meaning: "\u7F8E\u7389",
      readings: [
        {
          char: "\u743C",
          pinyin: "qi\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u74CA"
        }
      ],
      status: "bound-default-reading"
    },
    \u7433: {
      meaning: "\u7F8E\u7389",
      readings: [
        {
          char: "\u7433",
          pinyin: "l\xEDn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7433"
        }
      ],
      status: "bound-default-reading"
    },
    \u7476: {
      meaning: "\u7F8E\u7389",
      readings: [
        {
          char: "\u7476",
          pinyin: "y\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7464"
        }
      ],
      status: "bound-default-reading"
    },
    \u742C: {
      meaning: "\u6E29\u6DA6",
      readings: [
        {
          char: "\u742C",
          pinyin: "w\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u742C"
        }
      ],
      status: "bound-default-reading"
    },
    \u7430: {
      meaning: "\u7389\u5149",
      readings: [
        {
          char: "\u7430",
          pinyin: "y\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u7430"
        }
      ],
      status: "bound-default-reading"
    },
    \u742A: {
      meaning: "\u73CD\u7F8E",
      readings: [
        {
          char: "\u742A",
          pinyin: "q\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u742A"
        }
      ],
      status: "bound-default-reading"
    },
    \u73C2: {
      meaning: "\u7389\u58F0",
      readings: [
        {
          char: "\u73C2",
          pinyin: "k\u0113",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u73C2"
        }
      ],
      status: "bound-default-reading"
    },
    \u73DE: {
      meaning: "\u73E0\u7389",
      readings: [
        {
          char: "\u73DE",
          pinyin: "lu\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u73DE"
        }
      ],
      status: "bound-default-reading"
    },
    \u7457: {
      meaning: "\u7F8E\u7389",
      readings: [
        {
          char: "\u7457"
        }
      ],
      status: "pending-missing-character"
    },
    \u73CD: {
      meaning: "\u73CD\u7231",
      readings: [
        {
          char: "\u73CD",
          pinyin: "zh\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u73CD"
        }
      ],
      status: "bound-default-reading"
    },
    \u73E0: {
      meaning: "\u73CD\u7F8E",
      readings: [
        {
          char: "\u73E0",
          pinyin: "zh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u73E0"
        }
      ],
      status: "bound-default-reading"
    },
    \u94B0: {
      meaning: "\u73CD\u5B9D",
      readings: [
        {
          char: "\u94B0"
        }
      ],
      status: "pending-missing-character"
    },
    \u9526: {
      meaning: "\u7F8E\u597D\u524D\u7A0B",
      readings: [
        {
          char: "\u9526",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9326"
        }
      ],
      status: "bound-default-reading"
    },
    \u94ED: {
      meaning: "\u94ED\u8BB0",
      readings: [
        {
          char: "\u94ED",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9298"
        }
      ],
      status: "bound-default-reading"
    },
    \u94EE: {
      meaning: "\u6B63\u76F4",
      readings: [
        {
          char: "\u94EE"
        }
      ],
      status: "pending-missing-character"
    },
    \u94A7: {
      meaning: "\u516C\u6B63",
      readings: [
        {
          char: "\u94A7",
          pinyin: "j\u016Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u921E"
        }
      ],
      status: "bound-default-reading"
    },
    \u9510: {
      meaning: "\u8FDB\u53D6",
      readings: [
        {
          char: "\u9510",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u92B3"
        }
      ],
      status: "bound-default-reading"
    },
    \u950B: {
      meaning: "\u9510\u610F",
      readings: [
        {
          char: "\u950B",
          pinyin: "f\u0113ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u92D2"
        }
      ],
      status: "bound-default-reading"
    },
    \u9547: {
      meaning: "\u5B89\u5B9A",
      readings: [
        {
          char: "\u9547",
          pinyin: "zh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u93AE"
        }
      ],
      status: "bound-default-reading"
    },
    \u5764: {
      meaning: "\u539A\u5FB7",
      readings: [
        {
          char: "\u5764",
          pinyin: "k\u016Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5764"
        }
      ],
      status: "bound-default-reading"
    },
    \u579A: {
      meaning: "\u539A\u91CD",
      readings: [
        {
          char: "\u579A"
        }
      ],
      status: "pending-missing-character"
    },
    \u57CE: {
      meaning: "\u575A\u5B9E",
      readings: [
        {
          char: "\u57CE",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u57CE"
        }
      ],
      status: "bound-default-reading"
    },
    \u57A3: {
      meaning: "\u5B88\u62A4",
      readings: [
        {
          char: "\u57A3"
        }
      ],
      status: "pending-missing-character"
    },
    \u5807: {
      meaning: "\u8D28\u6734",
      readings: [
        {
          char: "\u5807"
        }
      ],
      status: "pending-missing-character"
    },
    \u57F9: {
      meaning: "\u57F9\u80B2",
      readings: [
        {
          char: "\u57F9",
          pinyin: "p\xE9i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u57F9"
        }
      ],
      status: "bound-default-reading"
    },
    \u660A: {
      meaning: "\u5E7F\u9614",
      readings: [
        {
          char: "\u660A",
          pinyin: "h\xE0o",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u660A"
        }
      ],
      status: "bound-default-reading"
    },
    \u6657: {
      meaning: "\u6668\u5149",
      readings: [
        {
          char: "\u6657"
        }
      ],
      status: "pending-missing-character"
    },
    \u6684: {
      meaning: "\u548C\u6696",
      readings: [
        {
          char: "\u6684"
        }
      ],
      status: "pending-missing-character"
    },
    \u7166: {
      meaning: "\u548C\u6696",
      readings: [
        {
          char: "\u7166"
        }
      ],
      status: "pending-missing-character"
    },
    \u7199: {
      meaning: "\u5149\u660E",
      readings: [
        {
          char: "\u7199",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7199"
        }
      ],
      status: "bound-default-reading"
    },
    \u71B9: {
      meaning: "\u5FAE\u660E",
      readings: [
        {
          char: "\u71B9",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u71B9"
        }
      ],
      status: "bound-default-reading"
    },
    \u709C: {
      meaning: "\u5149\u5F69",
      readings: [
        {
          char: "\u709C"
        }
      ],
      status: "pending-missing-character"
    },
    \u70E8: {
      meaning: "\u5149\u534E",
      readings: [
        {
          char: "\u70E8",
          pinyin: "y\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u71C1"
        }
      ],
      status: "bound-default-reading"
    },
    \u707F: {
      meaning: "\u707F\u7136",
      readings: [
        {
          char: "\u707F",
          pinyin: "c\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u71E6"
        }
      ],
      status: "bound-default-reading"
    },
    \u70AB: {
      meaning: "\u5149\u5F69",
      readings: [
        {
          char: "\u70AB"
        }
      ],
      status: "pending-missing-character"
    },
    \u66DC: {
      meaning: "\u5149\u8000",
      readings: [
        {
          char: "\u66DC",
          pinyin: "y\xE0o",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u66DC"
        }
      ],
      status: "bound-default-reading"
    },
    \u715C: {
      meaning: "\u7167\u8000",
      readings: [
        {
          char: "\u715C",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u715C"
        }
      ],
      status: "bound-default-reading"
    },
    \u7115: {
      meaning: "\u7115\u7136",
      readings: [
        {
          char: "\u7115",
          pinyin: "hu\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7165"
        }
      ],
      status: "bound-default-reading"
    },
    \u70C1: {
      meaning: "\u95EA\u8000",
      readings: [
        {
          char: "\u70C1"
        }
      ],
      status: "pending-missing-character"
    },
    \u71A0: {
      meaning: "\u660E\u4EAE",
      readings: [
        {
          char: "\u71A0"
        }
      ],
      status: "pending-missing-character"
    },
    \u54F2: {
      meaning: "\u660E\u54F2",
      readings: [
        {
          char: "\u54F2",
          pinyin: "zh\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u54F2"
        }
      ],
      status: "bound-default-reading"
    },
    \u5353: {
      meaning: "\u5353\u7136",
      readings: [
        {
          char: "\u5353",
          pinyin: "zhu\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5353"
        }
      ],
      status: "bound-default-reading"
    },
    \u4FCA: {
      meaning: "\u624D\u4FCA",
      readings: [
        {
          char: "\u4FCA",
          pinyin: "j\xF9n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FCA"
        }
      ],
      status: "bound-default-reading"
    },
    \u6770: {
      meaning: "\u6770\u51FA",
      readings: [
        {
          char: "\u6770",
          pinyin: "ji\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5091"
        }
      ],
      status: "bound-default-reading"
    },
    \u82F1: {
      meaning: "\u82F1\u534E",
      readings: [
        {
          char: "\u82F1",
          pinyin: "y\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u82F1"
        }
      ],
      status: "bound-default-reading"
    },
    \u96C4: {
      meaning: "\u96C4\u5065",
      readings: [
        {
          char: "\u96C4"
        }
      ],
      status: "pending-missing-character"
    },
    \u79C0: {
      meaning: "\u79C0\u96C5",
      readings: [
        {
          char: "\u79C0",
          pinyin: "xi\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u79C0"
        }
      ],
      status: "bound-default-reading"
    },
    \u5C1A: {
      meaning: "\u5D07\u5C1A",
      readings: [
        {
          char: "\u5C1A",
          pinyin: "sh\xE0ng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5C1A"
        }
      ],
      status: "bound-default-reading"
    },
    \u6B63: {
      meaning: "\u6B63\u76F4",
      readings: [
        {
          char: "\u6B63",
          pinyin: "zh\xE8ng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6B63"
        }
      ],
      status: "bound-default-reading"
    },
    \u76F4: {
      meaning: "\u6B63\u76F4",
      readings: [
        {
          char: "\u76F4",
          pinyin: "zh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u76F4"
        }
      ],
      status: "bound-default-reading"
    },
    \u7AEF: {
      meaning: "\u7AEF\u6B63",
      readings: [
        {
          char: "\u7AEF",
          pinyin: "du\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AEF"
        }
      ],
      status: "bound-default-reading"
    },
    \u65B9: {
      meaning: "\u65B9\u6B63",
      readings: [
        {
          char: "\u65B9",
          pinyin: "f\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u65B9"
        }
      ],
      status: "bound-default-reading"
    },
    \u5E73: {
      meaning: "\u5E73\u548C",
      readings: [
        {
          char: "\u5E73",
          pinyin: "p\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5E73"
        }
      ],
      status: "bound-default-reading"
    },
    \u671D: {
      meaning: "\u6668\u5149\u4E0E\u65B0\u751F",
      readings: [
        {
          char: "\u671D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u671D"
        }
      ],
      status: "bound-default-reading"
    },
    \u957F: {
      meaning: "\u957F\u8FDC\u4E0E\u6301\u4E45",
      readings: [
        {
          char: "\u957F",
          pinyin: "ch\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9577"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FAE: {
      meaning: "\u89C1\u5FAE\u77E5\u8457\u7684\u7EC6\u5BDF",
      readings: [
        {
          char: "\u5FAE",
          pinyin: "w\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FAE"
        }
      ],
      status: "bound-default-reading"
    },
    \u7136: {
      meaning: "\u4ECE\u5BB9\u81EA\u7136",
      readings: [
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    \u539A: {
      meaning: "\u6566\u539A",
      readings: [
        {
          char: "\u539A",
          pinyin: "h\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u539A"
        }
      ],
      status: "bound-default-reading"
    },
    \u5F3A: {
      meaning: "\u81EA\u5F3A",
      readings: [
        {
          char: "\u5F3A",
          pinyin: "qi\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5F37"
        }
      ],
      status: "bound-default-reading"
    },
    \u80B2: {
      meaning: "\u6DB5\u80B2",
      readings: [
        {
          char: "\u80B2",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u80B2"
        }
      ],
      status: "bound-default-reading"
    },
    \u61FF: {
      meaning: "\u7F8E\u5FB7",
      readings: [
        {
          char: "\u61FF"
        }
      ],
      status: "pending-missing-character"
    },
    \u542B: {
      meaning: "\u8574\u85CF",
      readings: [
        {
          char: "\u542B",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u542B"
        }
      ],
      status: "bound-default-reading"
    },
    \u7AE0: {
      meaning: "\u6587\u91C7",
      readings: [
        {
          char: "\u7AE0",
          pinyin: "zh\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AE0"
        }
      ],
      status: "bound-default-reading"
    },
    \u5347: {
      meaning: "\u5411\u4E0A\u6210\u957F",
      readings: [
        {
          char: "\u5347",
          pinyin: "sh\u0113ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5347"
        }
      ],
      status: "bound-default-reading"
    },
    \u6052: {
      meaning: "\u6052\u5FC3",
      readings: [
        {
          char: "\u6052",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6046"
        }
      ],
      status: "bound-default-reading"
    },
    \u76CA: {
      meaning: "\u589E\u76CA",
      readings: [
        {
          char: "\u76CA",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u76CA"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FC3: {
      meaning: "\u8BDA\u5FC3",
      readings: [
        {
          char: "\u5FC3",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FC3"
        }
      ],
      status: "bound-default-reading"
    },
    \u614E: {
      meaning: "\u8C28\u614E",
      readings: [
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E"
        }
      ],
      status: "bound-default-reading"
    },
    \u656C: {
      meaning: "\u656C\u614E",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C"
        }
      ],
      status: "bound-default-reading"
    },
    \u67D4: {
      meaning: "\u67D4\u548C",
      readings: [
        {
          char: "\u67D4",
          pinyin: "r\xF3u",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u67D4"
        }
      ],
      status: "bound-default-reading"
    },
    \u5409: {
      meaning: "\u7F8E\u597D",
      readings: [
        {
          char: "\u5409"
        }
      ],
      status: "pending-missing-character"
    },
    \u8D1E: {
      meaning: "\u5B88\u6B63",
      readings: [
        {
          char: "\u8D1E",
          pinyin: "zh\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8C9E"
        }
      ],
      status: "bound-default-reading"
    },
    \u81EA: {
      meaning: "\u81EA\u7701\u81EA\u52C9",
      readings: [
        {
          char: "\u81EA",
          pinyin: "z\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u81EA"
        }
      ],
      status: "bound-default-reading"
    }
  },
  combinations: {
    \u5B89\u7136: {
      meaning: "\u613F\u5B69\u5B50\u5E73\u5B89\u81EA\u5728\uFF0C\u9762\u5BF9\u751F\u6D3B\u65F6\u4ECE\u5BB9\u5766\u7136\u3002\u8FD9\u91CC\u7684\u201C\u7136\u201D\u7528\u4E8E\u8868\u8FBE\u72B6\u6001\uFF0C\u53D6\u81EA\u7136\u8212\u5C55\u7684\u8BED\u611F\u3002",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    \u77E5\u5FAE: {
      meaning: "\u5BC4\u6258\u7EC6\u5FC3\u89C2\u5BDF\u3001\u7531\u7EC6\u8282\u7406\u89E3\u4E8B\u7406\u7684\u6C42\u77E5\u6001\u5EA6\uFF1B\u201C\u5FAE\u201D\u53D6\u7CBE\u5999\u5E7D\u6DF1\u7684\u4E49\u9879\uFF0C\u4E0D\u53D6\u9690\u85CF\u6216\u5351\u5FAE\u4E4B\u4E49\u3002",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u5FAE",
          pinyin: "w\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FAE"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E50\u5B89: {
      meaning: "\u613F\u5B69\u5B50\u5E38\u6000\u559C\u60A6\u3001\u8EAB\u5FC3\u5B89\u9002\uFF0C\u662F\u6309\u73B0\u4EE3\u6C49\u8BED\u610F\u8C61\u5F62\u6210\u7684\u7EC4\u5408\u3002",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E88\u548C: {
      meaning: "\u4EE5\u4E50\u4E8E\u7ED9\u4E88\u3001\u4E0E\u4EBA\u548C\u5584\u5BC4\u6258\u5BB6\u5EAD\u671F\u8BB8\uFF0C\u5C5E\u4E8E\u73B0\u4EE3\u7EC4\u5408\uFF1B\u4E0D\u628A\u53E4\u6587\u4E2D\u8BFB y\xFA \u7684\u4EE3\u8BCD\u201C\u4E88\u201D\u89E3\u91CA\u6210\u7ED9\u4E88\u3002",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    \u4EE4\u5FB7: {
      meaning: "\u539F\u6587\u201C\u4EE4\u5FB7\u201D\u6307\u7F8E\u597D\u7684\u54C1\u5FB7\uFF1B\u613F\u5B69\u5B50\u54C1\u884C\u7AEF\u6B63\u3001\u5F85\u4EBA\u539A\u9053\u3002\u201C\u4EE4\u201D\u53D6\u5584\u7F8E\u4E49\u3002",
      readings: [
        {
          char: "\u4EE4",
          pinyin: "l\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EE4"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    \u4EE4\u4EEA: {
      meaning: "\u539F\u6587\u201C\u4EE4\u4EEA\u201D\u8D5E\u7F8E\u4EEA\u5BB9\u4E3E\u6B62\uFF1B\u613F\u5B69\u5B50\u4E3E\u6B62\u5F97\u4F53\u3001\u5F85\u4EBA\u6709\u793C\u3002\u201C\u4EE4\u201D\u53D6\u7F8E\u597D\u4E49\u3002",
      readings: [
        {
          char: "\u4EE4",
          pinyin: "l\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EE4"
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100"
        }
      ],
      status: "bound-default-reading"
    },
    \u6538\u5B81: {
      meaning: "\u539F\u6587\u201C\u541B\u5B50\u6538\u5B81\u201D\u5199\u6709\u6240\u5B89\u5C45\uFF1B\u613F\u5B69\u5B50\u751F\u6D3B\u5B89\u5B9A\u3001\u5185\u5FC3\u5B89\u9002\u3002\u201C\u6538\u201D\u5728\u539F\u53E5\u76F8\u5F53\u4E8E\u201C\u6240\u201D\u3002",
      readings: [
        {
          char: "\u6538",
          pinyin: "y\u014Du",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6538"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    \u660E\u54F2: {
      meaning: "\u7531\u201C\u65E2\u660E\u4E14\u54F2\u201D\u53D6\u660E\u3001\u54F2\u7EC4\u5408\uFF0C\u613F\u5B69\u5B50\u660E\u5BDF\u4E8B\u7406\u3001\u9047\u4E8B\u5BA1\u614E\uFF1B\u4E0D\u662F\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u54F2",
          pinyin: "zh\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u54F2"
        }
      ],
      status: "bound-default-reading"
    },
    \u67D4\u5609: {
      meaning: "\u539F\u6587\u201C\u67D4\u5609\u201D\u8D5E\u6E29\u548C\u5584\u7F8E\u7684\u54C1\u5FB7\uFF1B\u613F\u5B69\u5B50\u6E29\u539A\u5584\u826F\uFF0C\u540C\u65F6\u5B88\u4F4F\u81EA\u5DF1\u7684\u539F\u5219\u3002",
      readings: [
        {
          char: "\u67D4",
          pinyin: "r\xF3u",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u67D4"
        },
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FB7\u97F3: {
      meaning: "\u539F\u6587\u201C\u5FB7\u97F3\u5B54\u662D\u201D\u8D5E\u7F8E\u597D\u7684\u5FB7\u884C\u4E0E\u58F0\u8A89\uFF1B\u613F\u5B69\u5B50\u4EE5\u826F\u597D\u54C1\u884C\u4E3A\u4EBA\u6240\u77E5\uFF0C\u4E0D\u6307\u55D3\u97F3\u5929\u8D4B\u3002",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u97F3",
          pinyin: "y\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u97F3"
        }
      ],
      status: "bound-default-reading"
    },
    \u662D\u660E: {
      meaning: "\u539F\u6587\u796D\u5BB4\u795D\u8F9E\u4E2D\u7684\u201C\u662D\u660E\u201D\u6709\u662D\u8457\u5149\u660E\u4E4B\u610F\uFF1B\u613F\u5B69\u5B50\u5FC3\u5730\u660E\u6717\u3001\u6240\u884C\u5766\u8361\uFF0C\u662F\u5BB6\u5EAD\u671F\u8BB8\u3002",
      readings: [
        {
          char: "\u662D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u662D"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    \u666F\u798F: {
      meaning: "\u539F\u6587\u201C\u666F\u798F\u201D\u6307\u76DB\u5927\u7684\u798F\u7949\uFF1B\u5BC4\u6258\u5BB6\u5EAD\u5BF9\u7F8E\u597D\u751F\u6D3B\u7684\u795D\u613F\u3002\u201C\u666F\u201D\u5728\u539F\u53E5\u53D6\u201C\u5927\u201D\uFF0C\u4E0D\u662F\u98CE\u666F\u3002",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u798F",
          pinyin: "f\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u798F"
        }
      ],
      status: "bound-default-reading"
    },
    \u5982\u5C71: {
      meaning: "\u539F\u6587\u4EE5\u201C\u5982\u5C71\u201D\u6BD4\u55BB\u575A\u5B9E\u4E30\u539A\uFF0C\u201C\u5982\u201D\u6307\u5982\u540C\uFF1B\u613F\u5B69\u5B50\u7A33\u5065\u8E0F\u5B9E\uFF0C\u9762\u5BF9\u751F\u6D3B\u6709\u81EA\u5DF1\u7684\u652F\u6491\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982"
        },
        {
          char: "\u5C71",
          pinyin: "sh\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5C71"
        }
      ],
      status: "bound-default-reading"
    },
    \u6E29\u606D: {
      meaning: "\u539F\u6587\u201C\u6E29\u606D\u671D\u5915\u201D\u5199\u6E29\u548C\u606D\u656C\u7684\u5904\u4E8B\u6001\u5EA6\uFF1B\u613F\u5B69\u5B50\u5F85\u4EBA\u6E29\u539A\u3001\u77E5\u793C\u6709\u5EA6\u3002",
      readings: [
        {
          char: "\u6E29",
          pinyin: "w\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAB"
        },
        {
          char: "\u606D",
          pinyin: "g\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u606D"
        }
      ],
      status: "bound-default-reading"
    },
    \u7EAF\u7199: {
      meaning: "\u539F\u8BD7\u201C\u65F6\u7EAF\u7199\u77E3\u201D\u5199\u5149\u660E\u5145\u76DB\uFF1B\u613F\u5B69\u5B50\u5E38\u6000\u660E\u6717\uFF0C\u8E0F\u5B9E\u6210\u957F\u3002\u201C\u7EAF\u201D\u5728\u539F\u53E5\u4E0D\u662F\u7EAF\u6D01\u4E49\u3002",
      readings: [
        {
          char: "\u7EAF",
          pinyin: "ch\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7D14"
        },
        {
          char: "\u7199",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7199"
        }
      ],
      status: "bound-default-reading"
    },
    \u5FB7\u7EAF: {
      meaning: "\u7531\u201C\u6587\u738B\u4E4B\u5FB7\u4E4B\u7EAF\u201D\u53D6\u5FB7\u3001\u7EAF\u7EC4\u5408\uFF1B\u613F\u5B69\u5B50\u54C1\u5FB7\u7EAF\u6B63\u3001\u5F85\u4EBA\u771F\u8BDA\uFF0C\u4E0D\u662F\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u7EAF",
          pinyin: "ch\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7D14"
        }
      ],
      status: "bound-default-reading"
    },
    \u67D4\u60E0: {
      meaning: "\u539F\u6587\u201C\u67D4\u60E0\u4E14\u76F4\u201D\u517C\u8D5E\u6E29\u548C\u4EC1\u60E0\u4E0E\u6B63\u76F4\uFF1B\u613F\u5B69\u5B50\u6E29\u539A\u4F53\u8D34\uFF0C\u4E5F\u80FD\u575A\u6301\u539F\u5219\u3002",
      readings: [
        {
          char: "\u67D4",
          pinyin: "r\xF3u",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u67D4"
        },
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0"
        }
      ],
      status: "bound-default-reading"
    },
    \u60E0\u76F4: {
      meaning: "\u7531\u201C\u67D4\u60E0\u4E14\u76F4\u201D\u53D6\u60E0\u3001\u76F4\u7EC4\u5408\uFF1B\u613F\u5B69\u5B50\u5F85\u4EBA\u4EC1\u539A\u3001\u5904\u4E8B\u6B63\u76F4\uFF0C\u4E0D\u662F\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: [
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0"
        },
        {
          char: "\u76F4",
          pinyin: "zh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u76F4"
        }
      ],
      status: "bound-default-reading"
    },
    \u4FEE\u5FB7: {
      meaning: "\u539F\u6587\u201C\u53CD\u8EAB\u4FEE\u5FB7\u201D\u529D\u4EBA\u5728\u9047\u963B\u65F6\u53CD\u7701\u4FEE\u517B\uFF1B\u613F\u5B69\u5B50\u61C2\u5F97\u81EA\u7701\uFF0C\u4EE5\u65E5\u5E38\u884C\u52A8\u517B\u6210\u826F\u597D\u54C1\u5FB7\u3002",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    \u7EE7\u660E: {
      meaning: "\u539F\u6587\u201C\u7EE7\u660E\u7167\u4E8E\u56DB\u65B9\u201D\u5199\u5149\u660E\u76F8\u7EE7\uFF1B\u613F\u5B69\u5B50\u6301\u7EED\u6C42\u77E5\uFF0C\u628A\u7406\u89E3\u4E0E\u5584\u610F\u4F20\u9012\u7ED9\u8EAB\u8FB9\u7684\u4EBA\u3002",
      readings: [
        {
          char: "\u7EE7",
          pinyin: "j\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7E7C"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    \u8D24\u5FB7: {
      meaning: "\u539F\u6587\u201C\u5C45\u8D24\u5FB7\u5584\u4FD7\u201D\u529D\u52C9\u4FEE\u517B\u8D24\u7F8E\u4E4B\u5FB7\uFF1B\u613F\u5B69\u5B50\u91CD\u89C6\u5FB7\u884C\uFF0C\u5F85\u4EBA\u5904\u4E8B\u6709\u826F\u5584\u7684\u51C6\u5219\u3002",
      readings: [
        {
          char: "\u8D24",
          pinyin: "xi\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8CE2"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    \u660E\u65F6: {
      meaning: "\u539F\u6587\u201C\u6CBB\u5386\u660E\u65F6\u201D\u8BB2\u660E\u8FA8\u65F6\u5E8F\uFF1B\u613F\u5B69\u5B50\u660E\u5BDF\u89C4\u5F8B\u3001\u73CD\u60DC\u65F6\u5149\uFF0C\u4E0D\u7528\u6765\u9884\u6D4B\u4E2A\u4EBA\u65F6\u8FD0\u3002",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u65F6",
          pinyin: "sh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6642"
        }
      ],
      status: "bound-default-reading"
    },
    \u4E3D\u6CFD: {
      meaning: "\u539F\u6587\u201C\u4E3D\u6CFD\u201D\u6307\u76F8\u8FDE\u7684\u6C34\u6CFD\uFF0C\u5E76\u5F15\u51FA\u670B\u53CB\u8BB2\u4E60\uFF1B\u613F\u5B69\u5B50\u4E0E\u826F\u53CB\u76F8\u4E92\u542F\u53D1\u3001\u5171\u540C\u5B66\u4E60\u3002",
      readings: [
        {
          char: "\u4E3D",
          pinyin: "l\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9E97"
        },
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        }
      ],
      status: "bound-default-reading"
    },
    \u8C26\u8C26: {
      meaning: "\u539F\u6587\u201C\u8C26\u8C26\u541B\u5B50\u201D\u8D5E\u8C26\u900A\u6709\u793C\uFF1B\u613F\u5B69\u5B50\u656C\u8BA9\u800C\u4E0D\u81EA\u5927\uFF0C\u4FDD\u6709\u6C42\u77E5\u4E0E\u81EA\u7701\u7684\u5FC3\u3002",
      readings: [
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        },
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        }
      ],
      status: "bound-default-reading"
    },
    \u9E23\u8C26: {
      meaning: "\u91C7\u7528\u8C26\u5366\u516D\u4E8C\u7684\u201C\u9E23\u8C26\u201D\uFF0C\u53D6\u8C26\u5FB7\u4E3A\u4EBA\u6240\u77E5\u7684\u4FEE\u8EAB\u610F\u8C61\uFF1B\u613F\u5B69\u5B50\u6709\u6210\u4E0D\u9A84\u3001\u8A00\u884C\u8C26\u548C\uFF0C\u4E0D\u4F5C\u58F0\u540D\u4FDD\u8BC1\u3002",
      readings: [
        {
          char: "\u9E23",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9CF4"
        },
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        }
      ],
      status: "bound-default-reading"
    },
    \u884C\u5065: {
      meaning: "\u539F\u6587\u201C\u5929\u884C\u5065\u201D\u5199\u5929\u9053\u8FD0\u884C\u521A\u5065\uFF0C\u201C\u884C\u201D\u6307\u8FD0\u884C\u3001\u8BFB x\xEDng\uFF0C\u201C\u5065\u201D\u53D6\u521A\u5065\uFF1B\u613F\u5B69\u5B50\u6301\u7EED\u884C\u52A8\u3001\u81EA\u52C9\u8FDB\u53D6\u3002",
      readings: [
        {
          char: "\u884C",
          pinyin: "x\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u884C"
        },
        {
          char: "\u5065",
          pinyin: "ji\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5065"
        }
      ],
      status: "bound-default-reading"
    },
    \u743C\u7476: {
      meaning: "\u539F\u6587\u4EE5\u7F8E\u7389\u56DE\u8D60\u5199\u73CD\u91CD\u60C5\u8C0A\uFF1B\u613F\u5B69\u5B50\u73CD\u7231\u7F8E\u597D\u3001\u61C2\u5F97\u611F\u6069\uFF0C\u743C\u3001\u7476\u5747\u53D6\u7F8E\u7389\u610F\u8C61\u3002",
      readings: [
        {
          char: "\u743C",
          pinyin: "qi\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u74CA"
        },
        {
          char: "\u7476",
          pinyin: "y\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7464"
        }
      ],
      status: "bound-default-reading"
    },
    \u9759\u59DD: {
      meaning: "\u539F\u8BD7\u5199\u7537\u5973\u76F8\u7EA6\u4E0E\u8D60\u7269\uFF1B\u7531\u201C\u9759\u5973\u5176\u59DD\u201D\u53D6\u9759\u3001\u59DD\u7EC4\u5408\uFF0C\u613F\u5B69\u5B50\u5A34\u9759\u7F8E\u597D\u3001\u8212\u5C55\u81EA\u5982\uFF0C\u4E0D\u662F\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: [
        {
          char: "\u9759",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u975C"
        },
        {
          char: "\u59DD",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u59DD"
        }
      ],
      status: "bound-default-reading"
    },
    \u4F69\u7389: {
      meaning: "\u539F\u6587\u5199\u5973\u5B50\u4F69\u7389\u3001\u4EEA\u5BB9\u7F8E\u597D\uFF1B\u613F\u5B69\u5B50\u73CD\u7231\u7F8E\u597D\u3001\u4E3E\u6B62\u7AEF\u96C5\uFF0C\u662F\u7531\u539F\u53E5\u5F62\u6210\u7684\u547D\u540D\u671F\u8BB8\u3002",
      readings: [
        {
          char: "\u4F69",
          pinyin: "p\xE8i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4F69"
        },
        {
          char: "\u7389",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7389"
        }
      ],
      status: "bound-default-reading"
    },
    \u548C\u9E23: {
      meaning: "\u539F\u6587\u201C\u8083\u96CD\u548C\u9E23\u201D\u5199\u793C\u4E50\u548C\u8C10\u76F8\u5E94\uFF1B\u613F\u5B69\u5B50\u5584\u4E8E\u503E\u542C\u4E0E\u6C9F\u901A\uFF0C\u548C\u4ED6\u4EBA\u76F8\u4E92\u7406\u89E3\u3002",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u9E23",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9CF4"
        }
      ],
      status: "bound-default-reading"
    },
    \u90A6\u5F66: {
      meaning: "\u7531\u201C\u90A6\u4E4B\u5F66\u516E\u201D\u53D6\u90A6\u3001\u5F66\u7EC4\u5408\uFF0C\u539F\u53E5\u6307\u4E00\u56FD\u624D\u5FB7\u4E4B\u58EB\uFF1B\u613F\u5B69\u5B50\u624D\u5FB7\u517C\u4FEE\uFF0C\u80FD\u6709\u6240\u62C5\u5F53\u3002",
      readings: [
        {
          char: "\u90A6",
          pinyin: "b\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u90A6"
        },
        {
          char: "\u5F66",
          pinyin: "y\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5F65"
        }
      ],
      status: "bound-default-reading"
    }
  },
  naturalPairs: [
    {
      name: "\u5B89\u5B81",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u7136",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u548C",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u4E88",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u6F84",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u6674",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u60A6",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u60A6",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6085"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u606C",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u606C",
          pinyin: "ti\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u606C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B89\u96C5",
      readings: [
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u5B89",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u5B81",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u5B89",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u5B81",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u6674",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u548C",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B81\u8FDC",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B81\u548C",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B81\u6E05",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B81\u4E66",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        },
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B81\u77E5",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E66\u5B81",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E66\u5B89",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u5B81",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u5B89",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u5B89",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u5B81",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u5B89",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u5B89",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EE5\u5B81",
      readings: [
        {
          char: "\u4EE5"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4EE5"
      ]
    },
    {
      name: "\u4EE5\u5B89",
      readings: [
        {
          char: "\u4EE5"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4EE5"
      ]
    },
    {
      name: "\u4E00\u5B81",
      readings: [
        {
          char: "\u4E00"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4E00"
      ]
    },
    {
      name: "\u4E00\u5B89",
      readings: [
        {
          char: "\u4E00"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4E00"
      ]
    },
    {
      name: "\u5141\u5B89",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u5B81",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u5B89",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u5B81",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u5B81",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u5B89",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u548C",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u9756\u5B89",
      readings: [
        {
          char: "\u9756",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9756"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u9756\u5B81",
      readings: [
        {
          char: "\u9756",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9756"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5BA5\u5B81",
      readings: [
        {
          char: "\u5BA5",
          pinyin: "y\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BA5"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5BA5\u5B89",
      readings: [
        {
          char: "\u5BA5",
          pinyin: "y\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BA5"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E50\u5B89",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E50\u5B81",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u606C\u5B81",
      readings: [
        {
          char: "\u606C",
          pinyin: "ti\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u606C"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u5B81",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u548C",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u5B89",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5E73\u5B89",
      readings: [
        {
          char: "\u5E73",
          pinyin: "p\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5E73"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u5B81",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u5B89",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6CF0\u5B89",
      readings: [
        {
          char: "\u6CF0",
          pinyin: "t\xE0i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6CF0"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5EB7\u5B81",
      readings: [
        {
          char: "\u5EB7",
          pinyin: "k\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5EB7"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u8FDC",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u65B0",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u65B0",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u65B0"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u884C",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u884C",
          pinyin: "x\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u884C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u793C",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u8A00",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u5FAE",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u5FAE",
          pinyin: "w\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FAE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u8861",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u8861",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8861"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u590F",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u590F",
          pinyin: "xi\xE0",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u590F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u4E66",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u7136",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u660E",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u77E5\u4E88",
      readings: [
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u9F50",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u9F50",
          pinyin: "q\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9F4A"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u8FDC",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u6E90",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u6E90",
          pinyin: "yu\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E90"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u777F",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u777F",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u777F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u6F84",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u660E",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u8A00",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u4E88",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u793C",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u6210",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u6210",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6210"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u54F2",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u54F2",
          pinyin: "zh\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u54F2"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u548C",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u601D\u4E50",
      readings: [
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        },
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u54F2",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u54F2",
          pinyin: "zh\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u54F2"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u777F",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u777F",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u777F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u8FDC",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u793C",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u77E5",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u6F84",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u6717",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u6717",
          pinyin: "l\u01CEng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6717"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u8F69",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u8F69",
          pinyin: "xu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8ED2"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u535A\u6587",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u535A\u96C5",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u535A\u77E5",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u535A\u8A00",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u535A\u8FDC",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u535A\u5B81",
      readings: [
        {
          char: "\u535A",
          pinyin: "b\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u535A"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u777F\u77E5",
      readings: [
        {
          char: "\u777F",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u777F"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u777F\u601D",
      readings: [
        {
          char: "\u777F",
          pinyin: "ru\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u777F"
        },
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6167\u5B81",
      readings: [
        {
          char: "\u6167",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6167"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6167\u8A00",
      readings: [
        {
          char: "\u6167",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6167"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E66\u8A00",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E66\u79BE",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u4E66\u8FDC",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E66\u4E88",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E66\u96C5",
      readings: [
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u77E5",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u8FDC",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u6E05",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u96C5",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u5B81",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u793C",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B66\u601D",
      readings: [
        {
          char: "\u5B66",
          pinyin: "xu\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B78"
        },
        {
          char: "\u601D",
          pinyin: "s\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u601D"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u542F\u660E",
      readings: [
        {
          char: "\u542F",
          pinyin: "q\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u555F"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u542F\u77E5",
      readings: [
        {
          char: "\u542F",
          pinyin: "q\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u555F"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u542F\u6587",
      readings: [
        {
          char: "\u542F",
          pinyin: "q\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u555F"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u542F\u5B81",
      readings: [
        {
          char: "\u542F",
          pinyin: "q\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u555F"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u81F4\u8FDC",
      readings: [
        {
          char: "\u81F4",
          pinyin: "zh\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7DFB"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FEE\u8FDC",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FEE\u9F50",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        },
        {
          char: "\u9F50",
          pinyin: "q\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9F4A"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FEE\u6587",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FEE\u5B81",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u77E5",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u5B89",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u4EC1",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u8A00",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u79BE",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u5609\u6811",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u6811",
          pinyin: "sh\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A39"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u6728",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u6728",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6728"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u6CFD",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u6F84",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u60A6",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u60A6",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6085"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u4EEA",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u793C",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u6587",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u77E5",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5609\u666F",
      readings: [
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        },
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u548C",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u77E5",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u6587",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u793C",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u8BDA",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u8A00",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u6CFD",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u77E5",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u6587",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u8FDC",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u627F\u8A00",
      readings: [
        {
          char: "\u627F",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u627F"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u548C",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u6F84",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u6674",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u77E5",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u4E66",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u4E66",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u66F8"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E88\u5609",
      readings: [
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        },
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u666F\u660E",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u666F\u548C",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u666F\u5B81",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u666F\u884C",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u884C",
          pinyin: "x\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u884C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u666F\u521D",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u521D"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D"
      ]
    },
    {
      name: "\u666F\u6F84",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u626C",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u626C",
          pinyin: "y\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u63DA"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u8D8A",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u8D8A",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u8D8A"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u6717",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u6717",
          pinyin: "l\u01CEng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6717"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u96C5",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u8A00",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E05\u77E5",
      readings: [
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6F84\u660E",
      readings: [
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6F84\u5B81",
      readings: [
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6F84\u5FC3",
      readings: [
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        },
        {
          char: "\u5FC3",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FC3"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u5B81",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u77E5",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u6E05",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u7136",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u548C",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EA6\u5609",
      readings: [
        {
          char: "\u4EA6",
          pinyin: "y\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EA6"
        },
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EE5\u6587",
      readings: [
        {
          char: "\u4EE5"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4EE5"
      ]
    },
    {
      name: "\u4EE5\u77E5",
      readings: [
        {
          char: "\u4EE5"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4EE5"
      ]
    },
    {
      name: "\u4EE5\u8BDA",
      readings: [
        {
          char: "\u4EE5"
        },
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4EE5"
      ]
    },
    {
      name: "\u4EE5\u548C",
      readings: [
        {
          char: "\u4EE5"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u4EE5"
      ]
    },
    {
      name: "\u6000\u747E",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u747E",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u747E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u745C",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u745C",
          pinyin: "y\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u745C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u5FB7",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u8FDC",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u4FE1",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u4FE1",
          pinyin: "x\xECn",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FE1"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6000\u8C26",
      readings: [
        {
          char: "\u6000",
          pinyin: "hu\xE1i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u61F7"
        },
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EC1\u5B89",
      readings: [
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EC1\u548C",
      readings: [
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EC1\u77E5",
      readings: [
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EC1\u793C",
      readings: [
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        },
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EC1\u96C5",
      readings: [
        {
          char: "\u4EC1",
          pinyin: "r\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EC1"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u793C\u5B89",
      readings: [
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u793C\u77E5",
      readings: [
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u793C\u548C",
      readings: [
        {
          char: "\u793C",
          pinyin: "l\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u79AE"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8A00\u77E5",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8A00\u5B89",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8A00\u5B81",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8A00\u6E05",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8A00\u548C",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8A00\u8BDA",
      readings: [
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        },
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u5B81",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u5B89",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u8A00",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u77E5",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8C26\u548C",
      readings: [
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8C26\u5B81",
      readings: [
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8C26\u8FDC",
      readings: [
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8C28\u8A00",
      readings: [
        {
          char: "\u8C28"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u8C28"
      ]
    },
    {
      name: "\u8C28\u5B81",
      readings: [
        {
          char: "\u8C28"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u8C28"
      ]
    },
    {
      name: "\u8C28\u77E5",
      readings: [
        {
          char: "\u8C28"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u8C28"
      ]
    },
    {
      name: "\u8BDA\u5B89",
      readings: [
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8BDA\u77E5",
      readings: [
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8BDA\u5B81",
      readings: [
        {
          char: "\u8BDA",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8AA0"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FE1\u5B89",
      readings: [
        {
          char: "\u4FE1",
          pinyin: "x\xECn",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FE1"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FE1\u8A00",
      readings: [
        {
          char: "\u4FE1",
          pinyin: "x\xECn",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FE1"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u5149",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u5149",
          pinyin: "gu\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5149"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u96C5",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u96C5",
          pinyin: "y\u01CE",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96C5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u7545",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u7545",
          pinyin: "ch\xE0ng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u66A2"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u60A6",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u60A6",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6085"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u6F84",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u5B81",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u8A00",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u4E88",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u79BE",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u661F\u7136",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u7136",
          pinyin: "r\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7136"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u77E5",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u661F\u8FDC",
      readings: [
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        },
        {
          char: "\u8FDC",
          pinyin: "yu\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u9060"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6668\u5B89",
      readings: [
        {
          char: "\u6668",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6668"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6668\u5B81",
      readings: [
        {
          char: "\u6668",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6668"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6668\u77E5",
      readings: [
        {
          char: "\u6668",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6668"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6668\u6F84",
      readings: [
        {
          char: "\u6668",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6668"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6668\u4E88",
      readings: [
        {
          char: "\u6668",
          pinyin: "ch\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6668"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6674\u5DDD",
      readings: [
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        },
        {
          char: "\u5DDD",
          pinyin: "chu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5DDD"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6674\u5B89",
      readings: [
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6674\u5B81",
      readings: [
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6674\u77E5",
      readings: [
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u9701\u6708",
      readings: [
        {
          char: "\u9701"
        },
        {
          char: "\u6708",
          pinyin: "yu\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6708"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u9701"
      ]
    },
    {
      name: "\u9701\u5B81",
      readings: [
        {
          char: "\u9701"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u9701"
      ]
    },
    {
      name: "\u9701\u6674",
      readings: [
        {
          char: "\u9701"
        },
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u9701"
      ]
    },
    {
      name: "\u4E91\u8212",
      readings: [
        {
          char: "\u4E91",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u96F2"
        },
        {
          char: "\u8212",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8212"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E91\u77E5",
      readings: [
        {
          char: "\u4E91",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u96F2"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E91\u6F84",
      readings: [
        {
          char: "\u4E91",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u96F2"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E91\u5B81",
      readings: [
        {
          char: "\u4E91",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u96F2"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E91\u821F",
      readings: [
        {
          char: "\u4E91",
          pinyin: "y\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u96F2"
        },
        {
          char: "\u821F",
          pinyin: "zh\u014Du",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u821F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u96E8\u79BE",
      readings: [
        {
          char: "\u96E8",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96E8"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u96E8\u6674",
      readings: [
        {
          char: "\u96E8",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96E8"
        },
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u96E8\u9701",
      readings: [
        {
          char: "\u96E8",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96E8"
        },
        {
          char: "\u9701"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u9701"
      ]
    },
    {
      name: "\u96E8\u6F84",
      readings: [
        {
          char: "\u96E8",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u96E8"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C90\u5B89",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C90\u5B81",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C90\u8A00",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C90\u77E5",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C90\u6674",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        },
        {
          char: "\u6674",
          pinyin: "q\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6674"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C90\u79BE",
      readings: [
        {
          char: "\u6C90",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C90"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u6CFD\u5B89",
      readings: [
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6CFD\u5B81",
      readings: [
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6CFD\u77E5",
      readings: [
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6CFD\u8A00",
      readings: [
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6DB5\u77E5",
      readings: [
        {
          char: "\u6DB5",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DB5"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6DB5\u5B81",
      readings: [
        {
          char: "\u6DB5",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DB5"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6DB5\u6587",
      readings: [
        {
          char: "\u6DB5",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DB5"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6EAA\u5B81",
      readings: [
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6EAA\u8A00",
      readings: [
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6EAA\u77E5",
      readings: [
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6EAA\u79BE",
      readings: [
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u5DDD\u5B81",
      readings: [
        {
          char: "\u5DDD",
          pinyin: "chu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5DDD"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5DDD\u77E5",
      readings: [
        {
          char: "\u5DDD",
          pinyin: "chu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5DDD"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5DDD\u548C",
      readings: [
        {
          char: "\u5DDD",
          pinyin: "chu\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5DDD"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6797\u6EAA",
      readings: [
        {
          char: "\u6797",
          pinyin: "l\xEDn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6797"
        },
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6797\u77E5",
      readings: [
        {
          char: "\u6797",
          pinyin: "l\xEDn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6797"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6797\u5B81",
      readings: [
        {
          char: "\u6797",
          pinyin: "l\xEDn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6797"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u677E\u5B81",
      readings: [
        {
          char: "\u677E",
          pinyin: "s\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u677E"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u677E\u8A00",
      readings: [
        {
          char: "\u677E",
          pinyin: "s\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u677E"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u67CF\u5B81",
      readings: [
        {
          char: "\u67CF",
          pinyin: "b\u01CEi",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u67CF"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u67CF\u8A00",
      readings: [
        {
          char: "\u67CF",
          pinyin: "b\u01CEi",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u67CF"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6893\u5B81",
      readings: [
        {
          char: "\u6893",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6893"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6893\u5B89",
      readings: [
        {
          char: "\u6893",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6893"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6893\u8A00",
      readings: [
        {
          char: "\u6893",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6893"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6893\u77E5",
      readings: [
        {
          char: "\u6893",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6893"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6850\u5B81",
      readings: [
        {
          char: "\u6850",
          pinyin: "t\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6850"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6850\u5B89",
      readings: [
        {
          char: "\u6850",
          pinyin: "t\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6850"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6850\u77E5",
      readings: [
        {
          char: "\u6850",
          pinyin: "t\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6850"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u79BE\u5B81",
      readings: [
        {
          char: "\u79BE"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u79BE\u5B89",
      readings: [
        {
          char: "\u79BE"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u79BE\u77E5",
      readings: [
        {
          char: "\u79BE"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u79BE\u8A00",
      readings: [
        {
          char: "\u79BE"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u79BE"
      ]
    },
    {
      name: "\u7AF9\u5B81",
      readings: [
        {
          char: "\u7AF9",
          pinyin: "zh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AF9"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7AF9\u5B89",
      readings: [
        {
          char: "\u7AF9",
          pinyin: "zh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AF9"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7AF9\u77E5",
      readings: [
        {
          char: "\u7AF9",
          pinyin: "zh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AF9"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7AF9\u8A00",
      readings: [
        {
          char: "\u7AF9",
          pinyin: "zh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AF9"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5170\u5B81",
      readings: [
        {
          char: "\u5170",
          pinyin: "l\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u862D"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5170\u77E5",
      readings: [
        {
          char: "\u5170",
          pinyin: "l\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u862D"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5170\u6E05",
      readings: [
        {
          char: "\u5170",
          pinyin: "l\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u862D"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82B7\u5B81",
      readings: [
        {
          char: "\u82B7",
          pinyin: "zh\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u82B7"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82B7\u5B89",
      readings: [
        {
          char: "\u82B7",
          pinyin: "zh\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u82B7"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82B7\u8A00",
      readings: [
        {
          char: "\u82B7",
          pinyin: "zh\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u82B7"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u6EAA",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u6EAA",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAA"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u6F84",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u6F84",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6F84"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u77E5",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u8A00",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u82E5\u521D",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u521D"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D"
      ]
    },
    {
      name: "\u82E5\u821F",
      readings: [
        {
          char: "\u82E5",
          pinyin: "ru\xF2",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u82E5"
        },
        {
          char: "\u821F",
          pinyin: "zh\u014Du",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u821F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u521D\u5B81",
      readings: [
        {
          char: "\u521D"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D"
      ]
    },
    {
      name: "\u521D\u5B89",
      readings: [
        {
          char: "\u521D"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D"
      ]
    },
    {
      name: "\u521D\u8A00",
      readings: [
        {
          char: "\u521D"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D"
      ]
    },
    {
      name: "\u521D\u77E5",
      readings: [
        {
          char: "\u521D"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D"
      ]
    },
    {
      name: "\u521D\u79BE",
      readings: [
        {
          char: "\u521D"
        },
        {
          char: "\u79BE"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u521D",
        "\u79BE"
      ]
    },
    {
      name: "\u5357\u77E5",
      readings: [
        {
          char: "\u5357",
          pinyin: "n\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5357"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5357\u5B81",
      readings: [
        {
          char: "\u5357",
          pinyin: "n\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5357"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5357\u661F",
      readings: [
        {
          char: "\u5357",
          pinyin: "n\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5357"
        },
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5357\u4E54",
      readings: [
        {
          char: "\u5357",
          pinyin: "n\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5357"
        },
        {
          char: "\u4E54",
          pinyin: "qi\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u55AC"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u65F6\u5B89",
      readings: [
        {
          char: "\u65F6",
          pinyin: "sh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6642"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u65F6\u5B81",
      readings: [
        {
          char: "\u65F6",
          pinyin: "sh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6642"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u65F6\u77E5",
      readings: [
        {
          char: "\u65F6",
          pinyin: "sh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6642"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u65F6\u4E88",
      readings: [
        {
          char: "\u65F6",
          pinyin: "sh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6642"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6615\u5B81",
      readings: [
        {
          char: "\u6615"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u6615"
      ]
    },
    {
      name: "\u6615\u77E5",
      readings: [
        {
          char: "\u6615"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u6615"
      ]
    },
    {
      name: "\u6615\u4E88",
      readings: [
        {
          char: "\u6615"
        },
        {
          char: "\u4E88",
          pinyin: "y\u01D4",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u4E88"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u6615"
      ]
    },
    {
      name: "\u662D\u5B81",
      readings: [
        {
          char: "\u662D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u662D"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u662D\u77E5",
      readings: [
        {
          char: "\u662D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u662D"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u662D\u8A00",
      readings: [
        {
          char: "\u662D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u662D"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6717\u5B81",
      readings: [
        {
          char: "\u6717",
          pinyin: "l\u01CEng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6717"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6717\u77E5",
      readings: [
        {
          char: "\u6717",
          pinyin: "l\u01CEng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6717"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660A\u5B81",
      readings: [
        {
          char: "\u660A",
          pinyin: "h\xE0o",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u660A"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660A\u6587",
      readings: [
        {
          char: "\u660A",
          pinyin: "h\xE0o",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u660A"
        },
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7199\u5B81",
      readings: [
        {
          char: "\u7199",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7199"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7199\u548C",
      readings: [
        {
          char: "\u7199",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7199"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7199\u77E5",
      readings: [
        {
          char: "\u7199",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7199"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7166\u5B81",
      readings: [
        {
          char: "\u7166"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u7166"
      ]
    },
    {
      name: "\u7166\u77E5",
      readings: [
        {
          char: "\u7166"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "pending-missing-character",
      missingCharacters: [
        "\u7166"
      ]
    },
    {
      name: "\u747E\u5B81",
      readings: [
        {
          char: "\u747E",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u747E"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u747E\u8A00",
      readings: [
        {
          char: "\u747E",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u747E"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u747E\u77E5",
      readings: [
        {
          char: "\u747E",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u747E"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u747E\u5B89",
      readings: [
        {
          char: "\u747E",
          pinyin: "j\u01D0n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u747E"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u745C\u5B81",
      readings: [
        {
          char: "\u745C",
          pinyin: "y\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u745C"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u745C\u5B89",
      readings: [
        {
          char: "\u745C",
          pinyin: "y\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u745C"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u745C\u77E5",
      readings: [
        {
          char: "\u745C",
          pinyin: "y\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u745C"
        },
        {
          char: "\u77E5",
          pinyin: "zh\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u77E5"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u742C\u5B81",
      readings: [
        {
          char: "\u742C",
          pinyin: "w\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u742C"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u742C\u8A00",
      readings: [
        {
          char: "\u742C",
          pinyin: "w\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u742C"
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u742C\u6E05",
      readings: [
        {
          char: "\u742C",
          pinyin: "w\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u742C"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u5FB7",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u660E",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u539A\u5FB7",
      readings: [
        {
          char: "\u539A",
          pinyin: "h\xF2u",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u539A"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u81EA\u5F3A",
      readings: [
        {
          char: "\u81EA",
          pinyin: "z\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u81EA"
        },
        {
          char: "\u5F3A",
          pinyin: "qi\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5F37"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u80B2\u5FB7",
      readings: [
        {
          char: "\u80B2",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u80B2"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6587\u5FB7",
      readings: [
        {
          char: "\u6587",
          pinyin: "w\xE9n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6587"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u542B\u7AE0",
      readings: [
        {
          char: "\u542B",
          pinyin: "h\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u542B"
        },
        {
          char: "\u7AE0",
          pinyin: "zh\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7AE0"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5141\u5347",
      readings: [
        {
          char: "\u5141",
          pinyin: "y\u01D4n",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5141"
        },
        {
          char: "\u5347",
          pinyin: "sh\u0113ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5347"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u60E0\u5FC3",
      readings: [
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0"
        },
        {
          char: "\u5FC3",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FC3"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6C38\u8D1E",
      readings: [
        {
          char: "\u6C38",
          pinyin: "y\u01D2ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6C38"
        },
        {
          char: "\u8D1E",
          pinyin: "zh\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8C9E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5A49\u6E05",
      readings: [
        {
          char: "\u5A49",
          pinyin: "w\u01CEn",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5A49"
        },
        {
          char: "\u6E05",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6E05"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5B81\u5B89",
      readings: [
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        },
        {
          char: "\u5B89",
          pinyin: "\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B89"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u4E50",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E50\u548C",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02"
        },
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6DD1\u614E",
      readings: [
        {
          char: "\u6DD1",
          pinyin: "sh\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6DD1"
        },
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EE4\u5FB7",
      readings: [
        {
          char: "\u4EE4",
          pinyin: "l\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EE4"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4EE4\u4EEA",
      readings: [
        {
          char: "\u4EE4",
          pinyin: "l\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EE4"
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6538\u5B81",
      readings: [
        {
          char: "\u6538",
          pinyin: "y\u014Du",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6538"
        },
        {
          char: "\u5B81",
          pinyin: "n\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BE7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u67D4\u5609",
      readings: [
        {
          char: "\u67D4",
          pinyin: "r\xF3u",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u67D4"
        },
        {
          char: "\u5609",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5609"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u97F3",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u97F3",
          pinyin: "y\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u97F3"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u662D\u660E",
      readings: [
        {
          char: "\u662D",
          pinyin: "zh\u0101o",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u662D"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u666F\u798F",
      readings: [
        {
          char: "\u666F",
          pinyin: "j\u01D0ng",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u666F"
        },
        {
          char: "\u798F",
          pinyin: "f\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u798F"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5982\u5C71",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982"
        },
        {
          char: "\u5C71",
          pinyin: "sh\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5C71"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u6E29\u606D",
      readings: [
        {
          char: "\u6E29",
          pinyin: "w\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAB"
        },
        {
          char: "\u606D",
          pinyin: "g\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u606D"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7EAF\u7199",
      readings: [
        {
          char: "\u7EAF",
          pinyin: "ch\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7D14"
        },
        {
          char: "\u7199",
          pinyin: "x\u012B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u7199"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u5FB7\u7EAF",
      readings: [
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        },
        {
          char: "\u7EAF",
          pinyin: "ch\xFAn",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7D14"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u67D4\u60E0",
      readings: [
        {
          char: "\u67D4",
          pinyin: "r\xF3u",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u67D4"
        },
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u60E0\u76F4",
      readings: [
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0"
        },
        {
          char: "\u76F4",
          pinyin: "zh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u76F4"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4FEE\u5FB7",
      readings: [
        {
          char: "\u4FEE",
          pinyin: "xi\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u4FEE"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u7EE7\u660E",
      readings: [
        {
          char: "\u7EE7",
          pinyin: "j\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7E7C"
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8D24\u5FB7",
      readings: [
        {
          char: "\u8D24",
          pinyin: "xi\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8CE2"
        },
        {
          char: "\u5FB7",
          pinyin: "d\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FB7"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u660E\u65F6",
      readings: [
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E"
        },
        {
          char: "\u65F6",
          pinyin: "sh\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6642"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4E3D\u6CFD",
      readings: [
        {
          char: "\u4E3D",
          pinyin: "l\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9E97"
        },
        {
          char: "\u6CFD",
          pinyin: "z\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6FA4"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u8C26\u8C26",
      readings: [
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        },
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u9E23\u8C26",
      readings: [
        {
          char: "\u9E23",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9CF4"
        },
        {
          char: "\u8C26",
          pinyin: "qi\u0101n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u8B19"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u884C\u5065",
      readings: [
        {
          char: "\u884C",
          pinyin: "x\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u884C"
        },
        {
          char: "\u5065",
          pinyin: "ji\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5065"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u743C\u7476",
      readings: [
        {
          char: "\u743C",
          pinyin: "qi\xF3ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u74CA"
        },
        {
          char: "\u7476",
          pinyin: "y\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7464"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u9759\u59DD",
      readings: [
        {
          char: "\u9759",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u975C"
        },
        {
          char: "\u59DD",
          pinyin: "sh\u016B",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u59DD"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u4F69\u7389",
      readings: [
        {
          char: "\u4F69",
          pinyin: "p\xE8i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4F69"
        },
        {
          char: "\u7389",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7389"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u548C\u9E23",
      readings: [
        {
          char: "\u548C",
          pinyin: "h\xE9",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u548C"
        },
        {
          char: "\u9E23",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9CF4"
        }
      ],
      status: "bound-default-reading"
    },
    {
      name: "\u90A6\u5F66",
      readings: [
        {
          char: "\u90A6",
          pinyin: "b\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u90A6"
        },
        {
          char: "\u5F66",
          pinyin: "y\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5F65"
        }
      ],
      status: "bound-default-reading"
    }
  ],
  citations: [
    {
      names: [
        "\u660E\u5FB7",
        "\u5FB7\u660E"
      ],
      id: "zhouyi-35-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u81EA\u662D\u660E\u5FB7",
      context: "\u5927\u8C61\u529D\u4EBA\u663E\u660E\u7F8E\u5FB7\uFF1B\u660E\u53D6\u663E\u660E\uFF0C\u5FB7\u53D6\u54C1\u5FB7\u3002\u5FB7\u660E\u662F\u91CD\u65B0\u7EC4\u5408\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u8BCD\u3002",
      readings: {
        \u660E: "m\xEDng",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "zhouyi-35-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C35\u5366\xB7\u706B\u5730\u664B\xB7\u5927\u8C61",
        text: "\u660E\u51FA\u5730\u4E0A\uFF0C\u664B\u3002\u541B\u5B50\u4EE5\u81EA\u662D\u660E\u5FB7\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u539A\u5FB7"
      ],
      id: "zhouyi-2-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u539A\u5FB7\u8F7D\u7269",
      context: "\u53D6\u6566\u539A\u54C1\u5FB7\u4E0E\u5305\u5BB9\u7684\u4FEE\u8EAB\u610F\u8C61\uFF0C\u4E0D\u5F15\u7533\u4E3A\u4FDD\u8BC1\u798F\u8FD0\u3002",
      readings: {
        \u539A: "h\xF2u",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "zhouyi-2-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C2\u5366\xB7\u5764\u4E3A\u5730\xB7\u5927\u8C61",
        text: "\u5730\u52BF\u5764\uFF0C\u541B\u5B50\u4EE5\u539A\u5FB7\u8F7D\u7269\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u81EA\u5F3A"
      ],
      id: "zhouyi-1-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u81EA\u5F3A\u4E0D\u606F",
      context: "\u53D6\u6301\u7EED\u81EA\u52C9\u7684\u4FEE\u8EAB\u6001\u5EA6\u3002",
      readings: {
        \u81EA: "z\xEC",
        \u5F3A: "qi\xE1ng"
      },
      citation: {
        id: "zhouyi-1-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C1\u5366\xB7\u4E7E\u4E3A\u5929\xB7\u5927\u8C61",
        text: "\u5929\u884C\u5065\uFF0C\u541B\u5B50\u4EE5\u81EA\u5F3A\u4E0D\u606F\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u80B2\u5FB7"
      ],
      id: "zhouyi-4-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u679C\u884C\u80B2\u5FB7",
      context: "\u53D6\u8DF5\u5C65\u884C\u52A8\u3001\u6DB5\u80B2\u54C1\u5FB7\uFF1B\u4E0D\u628A\u679C\u884C\u89E3\u91CA\u4E3A\u679C\u6811\u3002",
      readings: {
        \u80B2: "y\xF9",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "zhouyi-4-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C4\u5366\xB7\u5C71\u6C34\u8499\xB7\u5927\u8C61",
        text: "\u5C71\u4E0B\u51FA\u6CC9\uFF0C\u8499\u3002\u541B\u5B50\u4EE5\u679C\u884C\u80B2\u5FB7\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u6587\u5FB7"
      ],
      id: "zhouyi-9-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u61FF\u6587\u5FB7",
      context: "\u53D6\u4FEE\u517B\u6587\u5FB7\u7684\u610F\u8C61\uFF1B\u6587\u6307\u6587\u5FB7\u4FEE\u517B\uFF0C\u4E0D\u662F\u6587\u4E66\u3002",
      readings: {
        \u6587: "w\xE9n",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "zhouyi-9-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C9\u5366\xB7\u98CE\u5929\u5C0F\u755C\xB7\u5927\u8C61",
        text: "\u98CE\u884C\u5929\u4E0A\uFF0C\u5C0F\u755C\u3002\u541B\u5B50\u4EE5\u61FF\u6587\u5FB7\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u542B\u7AE0"
      ],
      id: "zhouyi-2-yao-3",
      excerpt: "\u542B\u7AE0\u53EF\u8D1E",
      context: "\u53D6\u5185\u8574\u6587\u91C7\u3001\u5B88\u6B63\u7684\u4F20\u7EDF\u89E3\u91CA\uFF1B\u539F\u53E5\u6D89\u53CA\u5904\u4E8B\u6001\u5EA6\uFF0C\u4E0D\u89C6\u4E3A\u547D\u8FD0\u65AD\u8A00\u3002",
      readings: {
        \u542B: "h\xE1n",
        \u7AE0: "zh\u0101ng"
      },
      citation: {
        id: "zhouyi-2-yao-3",
        title: "\u5468\u6613",
        chapter: "\u7B2C2\u5366\xB7\u5764\u4E3A\u5730\xB7\u516D\u4E09",
        text: "\u542B\u7AE0\u53EF\u8D1E\u3002\u6216\u4ECE\u738B\u4E8B\uFF0C\u65E0\u6210\u6709\u7EC8\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u5141\u5347"
      ],
      id: "zhouyi-46-yao-1",
      excerpt: "\u5141\u5347",
      context: "\u53D6\u8BDA\u4FE1\u800C\u5411\u4E0A\u8FDB\u53D6\u7684\u547D\u540D\u5F15\u7533\uFF1B\u4E0D\u5F15\u7528\u5927\u5409\u6765\u4FDD\u8BC1\u4EBA\u751F\u7ED3\u679C\u3002",
      readings: {
        \u5141: "y\u01D4n",
        \u5347: "sh\u0113ng"
      },
      citation: {
        id: "zhouyi-46-yao-1",
        title: "\u5468\u6613",
        chapter: "\u7B2C46\u5366\xB7\u5730\u98CE\u5347\xB7\u521D\u516D",
        text: "\u5141\u5347\uFF0C\u5927\u5409\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u60E0\u5FC3"
      ],
      id: "zhouyi-42-yao-5",
      excerpt: "\u6709\u5B5A\u60E0\u5FC3",
      context: "\u53D6\u8BDA\u5FC3\u60E0\u4EBA\u3001\u4EC1\u7231\u5F85\u4EBA\u7684\u610F\u8C61\u3002",
      readings: {
        \u60E0: "hu\xEC",
        \u5FC3: "x\u012Bn"
      },
      citation: {
        id: "zhouyi-42-yao-5",
        title: "\u5468\u6613",
        chapter: "\u7B2C42\u5366\xB7\u98CE\u96F7\u76CA\xB7\u4E5D\u4E94",
        text: "\u6709\u5B5A\u60E0\u5FC3\uFF0C\u52FF\u95EE\u5143\u5409\u3002\u6709\u5B5A\u60E0\u6211\u5FB7\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u6C38\u8D1E"
      ],
      id: "zhouyi-2-yong",
      excerpt: "\u5229\u6C38\u8D1E",
      context: "\u53D6\u957F\u4E45\u5B88\u6B63\u7684\u4FEE\u8EAB\u671F\u8BB8\uFF0C\u4E0D\u4F5C\u5409\u51F6\u4FDD\u8BC1\u3002",
      readings: {
        \u6C38: "y\u01D2ng",
        \u8D1E: "zh\u0113n"
      },
      citation: {
        id: "zhouyi-2-yong",
        title: "\u5468\u6613",
        chapter: "\u7B2C2\u5366\xB7\u5764\u4E3A\u5730\xB7\u7528\u516D",
        text: "\u5229\u6C38\u8D1E\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u6E05\u626C"
      ],
      id: "shijing-94-1",
      excerpt: "\u6709\u7F8E\u4E00\u4EBA\uFF0C\u6E05\u626C\u5A49\u516E",
      context: "\u539F\u53E5\u8D5E\u5199\u76F8\u9047\u4E4B\u4EBA\u7684\u7709\u76EE\u6E05\u79C0\uFF1B\u547D\u540D\u53D6\u6E05\u6717\u795E\u91C7\u3002",
      readings: {
        \u6E05: "q\u012Bng",
        \u626C: "y\xE1ng"
      },
      citation: {
        id: "shijing-94-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u91CE\u6709\u8513\u8349 \u7B2C1\u7AE0",
        text: "\u91CE\u6709\u8513\u8349\uFF0C\u96F6\u9732\u6F19\u516E\u3002\u6709\u7F8E\u4E00\u4EBA\uFF0C\u6E05\u626C\u5A49\u516E\u3002\u9082\u9005\u76F8\u9047\uFF0C\u9002\u6211\u613F\u516E\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u5A49\u6E05"
      ],
      id: "shijing-94-2",
      excerpt: "\u6709\u7F8E\u4E00\u4EBA\uFF0C\u5A49\u5982\u6E05\u626C",
      context: "\u7531\u8D5E\u7F8E\u7709\u76EE\u4E0E\u795E\u6001\u7684\u5A49\u3001\u6E05\u91CD\u65B0\u7EC4\u5408\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u8BCD\u3002",
      readings: {
        \u5A49: "w\u01CEn",
        \u6E05: "q\u012Bng"
      },
      citation: {
        id: "shijing-94-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u91CE\u6709\u8513\u8349 \u7B2C2\u7AE0",
        text: "\u91CE\u6709\u8513\u8349\uFF0C\u96F6\u9732\u703C\u703C\u3002\u6709\u7F8E\u4E00\u4EBA\uFF0C\u5A49\u5982\u6E05\u626C\u3002\u9082\u9005\u76F8\u9047\uFF0C\u4E0E\u5B50\u5055\u81E7\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u5B89\u5B81",
        "\u5B81\u5B89"
      ],
      id: "shijing-164-5",
      excerpt: "\u4E27\u4E71\u65E2\u5E73\uFF0C\u65E2\u5B89\u4E14\u5B81",
      context: "\u539F\u7AE0\u5199\u7EB7\u4E71\u7ED3\u675F\u540E\u7684\u5B89\u5B9A\uFF0C\u5E76\u8BA8\u8BBA\u5144\u5F1F\u60C5\u8C0A\uFF1B\u53D6\u5B89\u5B9A\u3001\u5B81\u9759\u4E49\uFF0C\u5B89\u5B81\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E24\u5B57\u3002",
      readings: {
        \u5B89: "\u0101n",
        \u5B81: "n\xEDng"
      },
      citation: {
        id: "shijing-164-5",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E7F\u9E23\u4E4B\u4EC0\xB7\u68E0\u68E3 \u7B2C5\u7AE0",
        text: "\u4E27\u4E71\u65E2\u5E73\uFF0C\u65E2\u5B89\u4E14\u5B81\u3002\u867D\u6709\u5144\u5F1F\uFF0C\u4E0D\u5982\u53CB\u751F\uFF1F",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u548C\u4E50",
        "\u4E50\u548C"
      ],
      id: "shijing-161-3",
      excerpt: "\u9F13\u745F\u9F13\u7434\uFF0C\u548C\u4E50\u4E14\u6E5B",
      context: "\u539F\u7AE0\u5199\u5BB4\u5BBE\u76F8\u805A\u4E4B\u4E50\uFF0C\u53D6\u548C\u60A6\u559C\u4E50\uFF1B\u201C\u4E50\u201D\u53D6\u5FEB\u4E50\u8BFB l\xE8\u3002\u4E50\u548C\u4E3A\u91CD\u65B0\u7EC4\u5408\u3002",
      readings: {
        \u548C: "h\xE9",
        \u4E50: "l\xE8"
      },
      citation: {
        id: "shijing-161-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E7F\u9E23\u4E4B\u4EC0\xB7\u9E7F\u9E23 \u7B2C3\u7AE0",
        text: "\u5466\u5466\u9E7F\u9E23\uFF0C\u98DF\u91CE\u4E4B\u82A9\u3002\u6211\u6709\u5609\u5BBE\uFF0C\u9F13\u745F\u9F13\u7434\u3002\u9F13\u745F\u9F13\u7434\uFF0C\u548C\u4E50\u4E14\u6E5B\u3002\u6211\u6709\u65E8\u9152\uFF0C\u4EE5\u71D5\u4E50\u5609\u5BBE\u4E4B\u5FC3\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u6DD1\u614E"
      ],
      id: "shijing-28-4",
      excerpt: "\u7EC8\u6E29\u4E14\u60E0\uFF0C\u6DD1\u614E\u5176\u8EAB",
      context: "\u539F\u7AE0\u8D5E\u7F8E\u5FB7\u884C\u6E29\u60E0\u3001\u5584\u826F\u8C28\u614E\uFF1B\u4E0D\u622A\u53D6\u60B2\u522B\u8BED\u53E5\u4E3A\u798F\u8FD0\u4FDD\u8BC1\u3002",
      readings: {
        \u6DD1: "sh\xFA",
        \u614E: "sh\xE8n"
      },
      citation: {
        id: "shijing-28-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90B6\u98CE\xB7\u71D5\u71D5 \u7B2C4\u7AE0",
        text: "\u4EF2\u6C0F\u4EFB\u53EA\uFF0C\u5176\u5FC3\u585E\u6E0A\u3002\u7EC8\u6E29\u4E14\u60E0\uFF0C\u6DD1\u614E\u5176\u8EAB\u3002\u5148\u541B\u4E4B\u601D\uFF0C\u4EE5\u52D6\u5BE1\u4EBA\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u4EE4\u5FB7"
      ],
      id: "shijing-174-3",
      excerpt: "\u663E\u5141\u541B\u5B50\uFF0C\u83AB\u4E0D\u4EE4\u5FB7",
      context: "\u539F\u7AE0\u4EE5\u4EE4\u5FB7\u8D5E\u8BB8\u541B\u5B50\u7F8E\u597D\u7684\u54C1\u5FB7\uFF1B\u4EE4\u8BFB l\xECng\uFF0C\u53D6\u5584\u7F8E\u4E49\uFF0C\u4E0D\u89E3\u91CA\u4E3A\u547D\u4EE4\u3002",
      readings: {
        \u4EE4: "l\xECng",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "shijing-174-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u6E5B\u9732 \u7B2C3\u7AE0",
        text: "\u6E5B\u6E5B\u9732\u65AF\uFF0C\u5728\u5F7C\u675E\u68D8\u3002\u663E\u5141\u541B\u5B50\uFF0C\u83AB\u4E0D\u4EE4\u5FB7\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u4EE4\u4EEA"
      ],
      id: "shijing-174-4",
      excerpt: "\u5C82\u5F1F\u541B\u5B50\uFF0C\u83AB\u4E0D\u4EE4\u4EEA",
      context: "\u539F\u7AE0\u8D5E\u8BB8\u541B\u5B50\u7F8E\u597D\u7684\u4EEA\u5BB9\u4E3E\u6B62\uFF1B\u547D\u540D\u53D6\u4E3E\u6B62\u6709\u5EA6\u3001\u5F85\u4EBA\u6709\u793C\u7684\u671F\u8BB8\u3002",
      readings: {
        \u4EE4: "l\xECng",
        \u4EEA: "y\xED"
      },
      citation: {
        id: "shijing-174-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u6E5B\u9732 \u7B2C4\u7AE0",
        text: "\u5176\u6850\u5176\u6905\uFF0C\u5176\u5B9E\u79BB\u79BB\u3002\u5C82\u5F1F\u541B\u5B50\uFF0C\u83AB\u4E0D\u4EE4\u4EEA\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u6538\u5B81"
      ],
      id: "shijing-189-5",
      excerpt: "\u541B\u5B50\u6538\u5B81",
      context: "\u539F\u7AE0\u5199\u5C45\u5BA4\u843D\u6210\u540E\u6709\u6240\u5B89\u5C45\uFF1B\u6538\u662F\u6240\u7684\u8BED\u6CD5\u7528\u5B57\uFF0C\u5B81\u53D6\u5B89\u5B9A\uFF0C\u4E0D\u628A\u6538\u89E3\u91CA\u4E3A\u6C34\u6D41\u3002",
      readings: {
        \u6538: "y\u014Du",
        \u5B81: "n\xEDng"
      },
      citation: {
        id: "shijing-189-5",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E3F\u96C1\u4E4B\u4EC0\xB7\u65AF\u5E72 \u7B2C5\u7AE0",
        text: "\u6B96\u6B96\u5176\u5EAD\uFF0C\u6709\u89C9\u5176\u6979\u3002\u54D9\u54D9\u5176\u6B63\uFF0C\u54D5\u54D5\u5176\u51A5\u3002\u541B\u5B50\u6538\u5B81\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u660E\u54F2"
      ],
      id: "shijing-260-4",
      excerpt: "\u65E2\u660E\u4E14\u54F2\uFF0C\u4EE5\u4FDD\u5176\u8EAB",
      context: "\u539F\u7AE0\u79F0\u8D5E\u4EF2\u5C71\u752B\u660E\u5BDF\u800C\u6709\u667A\u6167\uFF1B\u660E\u54F2\u4E3A\u62BD\u53D6\u7EC4\u5408\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: {
        \u660E: "m\xEDng",
        \u54F2: "zh\xE9"
      },
      citation: {
        id: "shijing-260-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u8361\u4E4B\u4EC0\xB7\u70DD\u6C11 \u7B2C4\u7AE0",
        text: "\u8083\u8083\u738B\u547D\uFF0C\u4EF2\u5C71\u752B\u5C06\u4E4B\u3002\u90A6\u56FD\u82E5\u5426\uFF0C\u4EF2\u5C71\u752B\u660E\u4E4B\u3002\u65E2\u660E\u4E14\u54F2\uFF0C\u4EE5\u4FDD\u5176\u8EAB\u3002\u5919\u591C\u532A\u89E3\uFF0C\u4EE5\u4E8B\u4E00\u4EBA\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u67D4\u5609"
      ],
      id: "shijing-260-2",
      excerpt: "\u4EF2\u5C71\u752B\u4E4B\u5FB7\uFF0C\u67D4\u5609\u7EF4\u5219",
      context: "\u539F\u7AE0\u79F0\u8D5E\u4EF2\u5C71\u752B\u6E29\u548C\u5584\u7F8E\u7684\u5FB7\u884C\uFF1B\u53D6\u6E29\u539A\u800C\u6709\u539F\u5219\u7684\u671F\u8BB8\uFF0C\u4E0D\u628A\u67D4\u7406\u89E3\u4E3A\u8F6F\u5F31\u3002",
      readings: {
        \u67D4: "r\xF3u",
        \u5609: "ji\u0101"
      },
      citation: {
        id: "shijing-260-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u8361\u4E4B\u4EC0\xB7\u70DD\u6C11 \u7B2C2\u7AE0",
        text: "\u4EF2\u5C71\u752B\u4E4B\u5FB7\uFF0C\u67D4\u5609\u7EF4\u5219\u3002\u4EE4\u4EEA\u4EE4\u8272\u3002\u5C0F\u5FC3\u7FFC\u7FFC\u3002\u53E4\u8BAD\u662F\u5F0F\u3002\u5A01\u4EEA\u662F\u529B\u3002\u5929\u5B50\u662F\u82E5\uFF0C\u660E\u547D\u4F7F\u8D4B\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u5FB7\u97F3"
      ],
      id: "shijing-161-2",
      excerpt: "\u6211\u6709\u5609\u5BBE\uFF0C\u5FB7\u97F3\u5B54\u662D",
      context: "\u539F\u7AE0\u8D5E\u8BB8\u5609\u5BBE\u7684\u7F8E\u597D\u5FB7\u884C\u4E0E\u58F0\u8A89\uFF1B\u547D\u540D\u53D6\u5FB7\u884C\u53EF\u79F0\uFF0C\u4E0D\u628A\u5FB7\u97F3\u89E3\u91CA\u6210\u5929\u751F\u55D3\u97F3\u597D\u3002",
      readings: {
        \u5FB7: "d\xE9",
        \u97F3: "y\u012Bn"
      },
      citation: {
        id: "shijing-161-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E7F\u9E23\u4E4B\u4EC0\xB7\u9E7F\u9E23 \u7B2C2\u7AE0",
        text: "\u5466\u5466\u9E7F\u9E23\uFF0C\u98DF\u91CE\u4E4B\u84BF\u3002\u6211\u6709\u5609\u5BBE\uFF0C\u5FB7\u97F3\u5B54\u662D\u3002\u89C6\u6C11\u4E0D\u604C\uFF0C\u541B\u5B50\u662F\u5219\u662F\u6548\u3002\u6211\u6709\u65E8\u9152\uFF0C\u5609\u5BBE\u5F0F\u71D5\u4EE5\u6556\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u662D\u660E"
      ],
      id: "shijing-247-2",
      excerpt: "\u541B\u5B50\u4E07\u5E74\uFF0C\u4ECB\u5C14\u662D\u660E",
      context: "\u539F\u7AE0\u4E3A\u796D\u5BB4\u795D\u8F9E\uFF0C\u53D6\u662D\u8457\u5149\u660E\u7684\u6587\u5316\u610F\u8C61\uFF1B\u8FD9\u91CC\u7684\u795D\u8F9E\u4E0D\u6784\u6210\u5BFF\u547D\u3001\u798F\u8FD0\u4FDD\u8BC1\u3002",
      readings: {
        \u662D: "zh\u0101o",
        \u660E: "m\xEDng"
      },
      citation: {
        id: "shijing-247-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u65E2\u9189 \u7B2C2\u7AE0",
        text: "\u65E2\u9189\u4EE5\u9152\uFF0C\u5C14\u80B4\u65E2\u5C06\u3002\u541B\u5B50\u4E07\u5E74\uFF0C\u4ECB\u5C14\u662D\u660E\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u666F\u798F"
      ],
      id: "shijing-247-1",
      excerpt: "\u541B\u5B50\u4E07\u5E74\uFF0C\u4ECB\u5C14\u666F\u798F",
      context: "\u539F\u7AE0\u4EE5\u666F\u798F\u8868\u793A\u76DB\u5927\u7684\u798F\u7949\uFF1B\u547D\u540D\u53D6\u5BB6\u5EAD\u7F8E\u597D\u795D\u613F\uFF0C\u666F\u5728\u6B64\u53D6\u5927\uFF0C\u4E0D\u89E3\u91CA\u4E3A\u98CE\u666F\u6216\u666F\u89C2\u3002",
      readings: {
        \u666F: "j\u01D0ng",
        \u798F: "f\xFA"
      },
      citation: {
        id: "shijing-247-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u65E2\u9189 \u7B2C1\u7AE0",
        text: "\u65E2\u9189\u4EE5\u9152\uFF0C\u65E2\u9971\u4EE5\u5FB7\u3002\u541B\u5B50\u4E07\u5E74\uFF0C\u4ECB\u5C14\u666F\u798F\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u5982\u5C71"
      ],
      id: "shijing-166-3",
      excerpt: "\u5982\u5C71\u5982\u961C\uFF0C\u5982\u5188\u5982\u9675",
      context: "\u539F\u7AE0\u4EE5\u5C71\u961C\u5188\u9675\u4F5C\u575A\u5B9E\u4E30\u539A\u7684\u6BD4\u55BB\uFF1B\u547D\u540D\u53D6\u7A33\u5065\u8E0F\u5B9E\u7684\u6587\u5316\u8054\u60F3\uFF0C\u4E0D\u8BB8\u8BFA\u957F\u5BFF\u4E0D\u8870\u3002",
      readings: {
        \u5982: "r\xFA",
        \u5C71: "sh\u0101n"
      },
      citation: {
        id: "shijing-166-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E7F\u9E23\u4E4B\u4EC0\xB7\u5929\u4FDD \u7B2C3\u7AE0",
        text: "\u5929\u4FDD\u5B9A\u5C14\uFF0C\u4EE5\u83AB\u4E0D\u5174\u3002\u5982\u5C71\u5982\u961C\uFF0C\u5982\u5188\u5982\u9675\uFF0C\u5982\u5DDD\u4E4B\u65B9\u81F3\uFF0C\u4EE5\u83AB\u4E0D\u589E\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u6E29\u606D"
      ],
      id: "shijing-301-4",
      excerpt: "\u6E29\u606D\u671D\u5915\uFF0C\u6267\u4E8B\u6709\u606A",
      context: "\u539F\u7AE0\u5199\u6267\u4E8B\u8005\u6E29\u548C\u606D\u656C\u3001\u671D\u5915\u656C\u614E\uFF1B\u53D6\u5F85\u4EBA\u6E29\u539A\u6709\u793C\uFF0C\u4E0D\u5F15\u7533\u4E3A\u804C\u4E1A\u6216\u547D\u8FD0\u4FDD\u8BC1\u3002",
      readings: {
        \u6E29: "w\u0113n",
        \u606D: "g\u014Dng"
      },
      citation: {
        id: "shijing-301-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u5546\u9882\xB7\u90A3\u4E4B\u4EC0\xB7\u90A3 \u7B2C4\u7AE0",
        text: "\u6E29\u606D\u671D\u5915\uFF0C\u6267\u4E8B\u6709\u606A\uFF0C\u987E\u4E88\u70DD\u5C1D\uFF0C\u6C64\u5B59\u4E4B\u5C06\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u7EAF\u7199"
      ],
      id: "shijing-293-1",
      excerpt: "\u65F6\u7EAF\u7199\u77E3",
      context: "\u539F\u8BD7\u9882\u5199\u529F\u4E1A\u5149\u660E\u5145\u76DB\uFF1B\u547D\u540D\u53D6\u5149\u660E\u3001\u5145\u76DB\u7684\u6587\u5316\u610F\u8C61\uFF0C\u7EAF\u5728\u6B64\u4E0D\u89E3\u91CA\u6210\u7EAF\u6D01\u65E0\u6742\u3002",
      readings: {
        \u7EAF: "ch\xFAn",
        \u7199: "x\u012B"
      },
      citation: {
        id: "shijing-293-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5468\u9882\xB7\u95F5\u4E88\u5C0F\u5B50\u4E4B\u4EC0\xB7\u914C \u7B2C1\u7AE0",
        text: "\u4E8E\u94C4\u738B\u5E08\uFF0C\u9075\u517B\u65F6\u6666\u3002\u65F6\u7EAF\u7199\u77E3\uFF0C\u662F\u7528\u5927\u4ECB\u3002\u6211\u9F99\u53D7\u4E4B\uFF0C\u8E7B\u8E7B\u738B\u4E4B\u9020\u3002\u8F7D\u7528\u6709\u55E3\uFF0C\u5B9E\u7EF4\u5C14\u516C\u5141\u5E08\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u5FB7\u7EAF"
      ],
      id: "shijing-267-1",
      excerpt: "\u6587\u738B\u4E4B\u5FB7\u4E4B\u7EAF",
      context: "\u7531\u6587\u738B\u4E4B\u5FB7\u4E4B\u7EAF\u53D6\u5FB7\u3001\u7EAF\u91CD\u65B0\u7EC4\u5408\uFF0C\u53D6\u54C1\u5FB7\u7EAF\u6B63\u7684\u4FEE\u8EAB\u671F\u8BB8\uFF1B\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: {
        \u5FB7: "d\xE9",
        \u7EAF: "ch\xFAn"
      },
      citation: {
        id: "shijing-267-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5468\u9882\xB7\u6E05\u5E99\u4E4B\u4EC0\xB7\u7EF4\u5929\u4E4B\u547D \u7B2C1\u7AE0",
        text: "\u7EF4\u5929\u4E4B\u547D\uFF0C\u4E8E\u7A46\u4E0D\u5DF2\u3002\u4E8E\u4E4E\u4E0D\u663E\uFF0C\u6587\u738B\u4E4B\u5FB7\u4E4B\u7EAF\u3002\u5047\u4EE5\u6EA2\u6211\uFF0C\u6211\u5176\u6536\u4E4B\u3002\u9A8F\u60E0\u6211\u6587\u738B\uFF0C\u66FE\u5B59\u7B03\u4E4B\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u67D4\u60E0",
        "\u60E0\u76F4"
      ],
      id: "shijing-259-8",
      excerpt: "\u7533\u4F2F\u4E4B\u5FB7\uFF0C\u67D4\u60E0\u4E14\u76F4",
      context: "\u539F\u7AE0\u8D5E\u7533\u4F2F\u6E29\u548C\u4EC1\u60E0\u800C\u6B63\u76F4\uFF1B\u67D4\u60E0\u4E3A\u539F\u6587\u8FDE\u7EED\u8BCD\uFF0C\u60E0\u76F4\u4E3A\u4ECE\u60E0\u3001\u76F4\u91CD\u65B0\u7EC4\u5408\uFF0C\u4E0D\u4EE5\u67D4\u60E0\u8868\u793A\u8F6F\u5F31\u9022\u8FCE\u3002",
      readings: {
        \u67D4: "r\xF3u",
        \u60E0: "hu\xEC",
        \u76F4: "zh\xED"
      },
      citation: {
        id: "shijing-259-8",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u8361\u4E4B\u4EC0\xB7\u5D27\u9AD8 \u7B2C8\u7AE0",
        text: "\u7533\u4F2F\u4E4B\u5FB7\uFF0C\u67D4\u60E0\u4E14\u76F4\u3002\u63C9\u6B64\u4E07\u90A6\uFF0C\u95FB\u4E8E\u56DB\u56FD\u3002\u5409\u752B\u4F5C\u8BF5\uFF0C\u5176\u8BD7\u5B54\u7855\u3002\u5176\u98CE\u56DB\u597D\uFF0C\u4EE5\u8D60\u7533\u4F2F\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u4FEE\u5FB7"
      ],
      id: "zhouyi-39-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u53CD\u8EAB\u4FEE\u5FB7",
      context: "\u539F\u5927\u8C61\u529D\u4EBA\u5728\u9047\u963B\u65F6\u53CD\u7701\u81EA\u8EAB\u3001\u4FEE\u517B\u54C1\u5FB7\uFF1B\u547D\u540D\u53D6\u4FEE\u8EAB\u81EA\u7701\u7684\u6001\u5EA6\uFF0C\u4E0D\u5C06\u8E47\u7684\u963B\u96BE\u6539\u8BF4\u6210\u5409\u8FD0\u3002",
      readings: {
        \u4FEE: "xi\u016B",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "zhouyi-39-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C39\u5366\xB7\u6C34\u5C71\u8E47\xB7\u5927\u8C61",
        text: "\u5C71\u4E0A\u6709\u6C34\uFF0C\u8E47\u3002\u541B\u5B50\u4EE5\u53CD\u8EAB\u4FEE\u5FB7\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u7EE7\u660E"
      ],
      id: "zhouyi-30-xiang",
      excerpt: "\u5927\u4EBA\u4EE5\u7EE7\u660E\u7167\u4E8E\u56DB\u65B9",
      context: "\u539F\u5927\u8C61\u5199\u5149\u660E\u76F8\u7EE7\u3001\u7167\u4E34\u56DB\u65B9\uFF1B\u547D\u540D\u53D6\u6301\u7EED\u6C42\u660E\u7684\u6587\u5316\u610F\u8C61\uFF0C\u4E0D\u5C06\u7167\u56DB\u65B9\u89E3\u91CA\u6210\u6CE8\u5B9A\u663E\u8D35\u3002",
      readings: {
        \u7EE7: "j\xEC",
        \u660E: "m\xEDng"
      },
      citation: {
        id: "zhouyi-30-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C30\u5366\xB7\u79BB\u4E3A\u706B\xB7\u5927\u8C61",
        text: "\u660E\u4E24\u4F5C\uFF0C\u79BB\u3002\u5927\u4EBA\u4EE5\u7EE7\u660E\u7167\u4E8E\u56DB\u65B9\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u8D24\u5FB7"
      ],
      id: "zhouyi-53-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u5C45\u8D24\u5FB7\u5584\u4FD7",
      context: "\u539F\u5927\u8C61\u529D\u4EBA\u79EF\u5C45\u8D24\u7F8E\u4E4B\u5FB7\u3001\u6539\u5584\u98CE\u4FD7\uFF1B\u547D\u540D\u53D6\u5FB7\u884C\u4E0E\u4FEE\u517B\u7684\u671F\u8BB8\uFF0C\u4E0D\u4F5C\u8D24\u8FBE\u5730\u4F4D\u4FDD\u8BC1\u3002",
      readings: {
        \u8D24: "xi\xE1n",
        \u5FB7: "d\xE9"
      },
      citation: {
        id: "zhouyi-53-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C53\u5366\xB7\u98CE\u5C71\u6E10\xB7\u5927\u8C61",
        text: "\u5C71\u4E0A\u6709\u6728\uFF0C\u6E10\u3002\u541B\u5B50\u4EE5\u5C45\u8D24\u5FB7\u5584\u4FD7\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u660E\u65F6"
      ],
      id: "zhouyi-49-xiang",
      excerpt: "\u541B\u5B50\u4EE5\u6CBB\u5386\u660E\u65F6",
      context: "\u539F\u5927\u8C61\u8BB2\u4FEE\u6CBB\u5386\u6CD5\u3001\u660E\u8FA8\u65F6\u5E8F\uFF1B\u547D\u540D\u53D6\u660E\u5BDF\u65F6\u5E8F\u3001\u5C0A\u91CD\u89C4\u5F8B\u7684\u6C42\u77E5\u671F\u8BB8\uFF0C\u4E0D\u91CA\u4E3A\u9884\u6D4B\u4E2A\u4EBA\u65F6\u8FD0\u3002",
      readings: {
        \u660E: "m\xEDng",
        \u65F6: "sh\xED"
      },
      citation: {
        id: "zhouyi-49-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C49\u5366\xB7\u6CFD\u706B\u9769\xB7\u5927\u8C61",
        text: "\u6CFD\u4E2D\u6709\u706B\uFF0C\u9769\u3002\u541B\u5B50\u4EE5\u6CBB\u5386\u660E\u65F6\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u4E3D\u6CFD"
      ],
      id: "zhouyi-58-xiang",
      excerpt: "\u4E3D\u6CFD\uFF0C\u5151",
      context: "\u539F\u5927\u8C61\u4EE5\u4E24\u6CFD\u76F8\u8FDE\u5F15\u51FA\u670B\u53CB\u8BB2\u4E60\uFF1B\u4E3D\u53D6\u76F8\u9644\u76F8\u8FDE\uFF0C\u6CFD\u6307\u6C34\u6CFD\uFF0C\u547D\u540D\u53D6\u76F8\u4E92\u542F\u53D1\u7684\u6587\u5316\u8054\u60F3\u3002",
      readings: {
        \u4E3D: "l\xEC",
        \u6CFD: "z\xE9"
      },
      citation: {
        id: "zhouyi-58-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C58\u5366\xB7\u5151\u4E3A\u6CFD\xB7\u5927\u8C61",
        text: "\u4E3D\u6CFD\uFF0C\u5151\u3002\u541B\u5B50\u4EE5\u670B\u53CB\u8BB2\u4E60\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u8C26\u8C26"
      ],
      id: "zhouyi-15-yao-1",
      excerpt: "\u8C26\u8C26\u541B\u5B50",
      context: "\u539F\u723B\u8F9E\u4EE5\u8C26\u8C26\u5F62\u5BB9\u8C26\u900A\u7684\u541B\u5B50\uFF1B\u547D\u540D\u53D6\u656C\u8BA9\u800C\u4E0D\u81EA\u5927\u7684\u6001\u5EA6\uFF0C\u4E0D\u4EE5\u539F\u723B\u5409\u5B57\u627F\u8BFA\u798F\u8FD0\u3002",
      readings: {
        \u8C26: "qi\u0101n"
      },
      citation: {
        id: "zhouyi-15-yao-1",
        title: "\u5468\u6613",
        chapter: "\u7B2C15\u5366\xB7\u5730\u5C71\u8C26\xB7\u521D\u516D",
        text: "\u8C26\u8C26\u541B\u5B50\uFF0C\u7528\u6D89\u5927\u5DDD\uFF0C\u5409\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u9E23\u8C26"
      ],
      id: "zhouyi-15-yao-2",
      excerpt: "\u9E23\u8C26",
      context: "\u9009\u516D\u4E8C\u9E23\u8C26\uFF0C\u53D6\u8C26\u5FB7\u4E3A\u4EBA\u6240\u77E5\u7684\u4FEE\u8EAB\u610F\u8C61\uFF1B\u4E0D\u501F\u8D1E\u5409\u5224\u65AD\u5B69\u5B50\u672A\u6765\uFF0C\u4E5F\u4E0D\u628A\u547D\u540D\u5F53\u6210\u58F0\u540D\u4FDD\u8BC1\u3002",
      readings: {
        \u9E23: "m\xEDng",
        \u8C26: "qi\u0101n"
      },
      citation: {
        id: "zhouyi-15-yao-2",
        title: "\u5468\u6613",
        chapter: "\u7B2C15\u5366\xB7\u5730\u5C71\u8C26\xB7\u516D\u4E8C",
        text: "\u9E23\u8C26\uFF0C\u8D1E\u5409\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u884C\u5065"
      ],
      id: "zhouyi-1-xiang",
      excerpt: "\u5929\u884C\u5065",
      context: "\u539F\u5927\u8C61\u4EE5\u5929\u7684\u8FD0\u884C\u521A\u5065\u5F15\u51FA\u81EA\u5F3A\u4E0D\u606F\uFF1B\u547D\u540D\u53D6\u6301\u7EED\u884C\u52A8\u3001\u81EA\u52C9\u8FDB\u53D6\u7684\u671F\u8BB8\uFF0C\u884C\u91C7\u7528 x\xEDng\u3002",
      readings: {
        \u884C: "x\xEDng",
        \u5065: "ji\xE0n"
      },
      citation: {
        id: "zhouyi-1-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C1\u5366\xB7\u4E7E\u4E3A\u5929\xB7\u5927\u8C61",
        text: "\u5929\u884C\u5065\uFF0C\u541B\u5B50\u4EE5\u81EA\u5F3A\u4E0D\u606F\u3002",
        sourceId: "zhouyi"
      }
    },
    {
      names: [
        "\u743C\u7476"
      ],
      id: "shijing-64-2",
      excerpt: "\u6295\u6211\u4EE5\u6728\u6843\uFF0C\u62A5\u4E4B\u4EE5\u743C\u7476",
      context: "\u539F\u7AE0\u4EE5\u7F8E\u7389\u56DE\u8D60\u5199\u73CD\u91CD\u60C5\u8C0A\uFF1B\u743C\u3001\u7476\u7686\u53D6\u7F8E\u7389\uFF0C\u4E0D\u628A\u7389\u77F3\u4EF7\u503C\u7B49\u540C\u5B69\u5B50\u8EAB\u4EF7\u6216\u798F\u8FD0\u3002",
      readings: {
        \u743C: "qi\xF3ng",
        \u7476: "y\xE1o"
      },
      citation: {
        id: "shijing-64-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u536B\u98CE\xB7\u6728\u74DC \u7B2C2\u7AE0",
        text: "\u6295\u6211\u4EE5\u6728\u6843\uFF0C\u62A5\u4E4B\u4EE5\u743C\u7476\u3002\u532A\u62A5\u4E5F\uFF0C\u6C38\u4EE5\u4E3A\u597D\u4E5F\uFF01",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u9759\u59DD"
      ],
      id: "shijing-42-1",
      excerpt: "\u9759\u5973\u5176\u59DD",
      context: "\u539F\u8BD7\u5199\u7537\u5973\u76F8\u7EA6\u4E0E\u8D60\u7269\uFF1B\u7531\u9759\u5973\u5176\u59DD\u53D6\u9759\u3001\u59DD\u91CD\u65B0\u7EC4\u5408\uFF0C\u53D6\u5A34\u9759\u7F8E\u597D\u7684\u610F\u8C61\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: {
        \u9759: "j\xECng",
        \u59DD: "sh\u016B"
      },
      citation: {
        id: "shijing-42-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90B6\u98CE\xB7\u9759\u5973 \u7B2C1\u7AE0",
        text: "\u9759\u5973\u5176\u59DD\uFF0C\u4FDF\u6211\u4E8E\u57CE\u9685\u3002\u7231\u800C\u4E0D\u89C1\uFF0C\u6414\u9996\u8E1F\u8E70\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u4F69\u7389"
      ],
      id: "shijing-83-1",
      excerpt: "\u5C06\u7FF1\u5C06\u7FD4\uFF0C\u4F69\u7389\u743C\u741A",
      context: "\u539F\u7AE0\u5199\u5973\u5B50\u4F69\u7389\u3001\u4E3E\u6B62\u7F8E\u597D\uFF1B\u547D\u540D\u53D6\u73CD\u7231\u7F8E\u597D\u3001\u4EEA\u5BB9\u7AEF\u96C5\u7684\u6587\u5316\u8054\u60F3\uFF0C\u4E0D\u8BB8\u8BFA\u5BCC\u8D35\u3002",
      readings: {
        \u4F69: "p\xE8i",
        \u7389: "y\xF9"
      },
      citation: {
        id: "shijing-83-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u6709\u5973\u540C\u8F66 \u7B2C1\u7AE0",
        text: "\u6709\u5973\u540C\u8F66\uFF0C\u989C\u5982\u821C\u534E\u3002\u5C06\u7FF1\u5C06\u7FD4\uFF0C\u4F69\u7389\u743C\u741A\u3002\u5F7C\u7F8E\u5B5F\u59DC\uFF0C\u6D35\u7F8E\u4E14\u90FD\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u548C\u9E23"
      ],
      id: "shijing-280-2",
      excerpt: "\u55A4\u55A4\u53A5\u58F0\uFF0C\u8083\u96CD\u548C\u9E23",
      context: "\u539F\u7AE0\u5199\u793C\u4E50\u8BF8\u58F0\u548C\u8C10\u76F8\u9E23\uFF1B\u547D\u540D\u53D6\u548C\u8C10\u6709\u5E94\u7684\u6587\u5316\u610F\u8C61\uFF0C\u4E0D\u4FDD\u8BC1\u58F0\u97F3\u5929\u8D4B\u6216\u4EBA\u9645\u7ED3\u679C\u3002",
      readings: {
        \u548C: "h\xE9",
        \u9E23: "m\xEDng"
      },
      citation: {
        id: "shijing-280-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u5468\u9882\xB7\u81E3\u5DE5\u4E4B\u4EC0\xB7\u6709\u77BD \u7B2C2\u7AE0",
        text: "\u4E43\u594F\uFF0C\u7BAB\u7BA1\u5907\u4E3E\u3002\u55A4\u55A4\u53A5\u58F0\uFF0C\u8083\u96CD\u548C\u9E23\uFF0C\u5148\u7956\u662F\u542C\u3002\u6211\u5BA2\u623E\u6B62\uFF0C\u6C38\u89C2\u53A5\u6210\u3002",
        sourceId: "shijing"
      }
    },
    {
      names: [
        "\u90A6\u5F66"
      ],
      id: "shijing-80-3",
      excerpt: "\u5F7C\u5176\u4E4B\u5B50\uFF0C\u90A6\u4E4B\u5F66\u516E",
      context: "\u7531\u90A6\u4E4B\u5F66\u53D6\u90A6\u3001\u5F66\u91CD\u65B0\u7EC4\u5408\uFF0C\u539F\u53E5\u8D5E\u4E00\u56FD\u7684\u624D\u5FB7\u4E4B\u58EB\uFF1B\u53D6\u624D\u5FB7\u517C\u4FEE\u7684\u671F\u8BB8\uFF0C\u5E76\u975E\u8FDE\u7EED\u4E8C\u5B57\u3002",
      readings: {
        \u90A6: "b\u0101ng",
        \u5F66: "y\xE0n"
      },
      citation: {
        id: "shijing-80-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u7F94\u88D8 \u7B2C3\u7AE0",
        text: "\u7F94\u88D8\u664F\u516E\uFF0C\u4E09\u82F1\u7CB2\u516E\u3002\u5F7C\u5176\u4E4B\u5B50\uFF0C\u90A6\u4E4B\u5F66\u516E\u3002",
        sourceId: "shijing"
      }
    }
  ],
  variantGroups: [
    "\u8FDC\u9060",
    "\u5B81\u5BE7\u752F",
    "\u4E50\u6A02",
    "\u957F\u9577",
    "\u9648\u9673",
    "\u5F20\u5F35",
    "\u5218\u5289",
    "\u8D75\u8D99",
    "\u94B1\u9322",
    "\u5B59\u5B6B",
    "\u5434\u5433",
    "\u90D1\u912D",
    "\u51AF\u99AE",
    "\u6768\u694A",
    "\u8BB8\u8A31",
    "\u5415\u5442",
    "\u4E25\u56B4",
    "\u8C22\u8B1D",
    "\u90B9\u9112",
    "\u82CF\u8607",
    "\u9A6C\u99AC",
    "\u97E6\u97CB",
    "\u9C8D\u9B91",
    "\u8D3A\u8CC0",
    "\u6C64\u6E6F",
    "\u7F57\u7F85",
    "\u6BD5\u7562",
    "\u90AC\u9114",
    "\u9F50\u9F4A",
    "\u987E\u9867",
    "\u9EC4\u9EC3",
    "\u8427\u856D",
    "\u8D1D\u8C9D",
    "\u5E9E\u9F90",
    "\u9879\u9805",
    "\u5355\u55AE",
    "\u4E07\u842C",
    "\u6B27\u6B50",
    "\u536B\u885B",
    "\u8BF8\u8AF8",
    "\u853A\u85FA",
    "\u9C9C\u9BAE",
    "\u949F\u937E\u9418",
    "\u8F69\u8ED2",
    "\u8F95\u8F45",
    "\u95FB\u805E",
    "\u4E66\u66F8",
    "\u4E91\u96F2",
    "\u6CFD\u6FA4",
    "\u5FB7\u5FB3",
    "\u6797\uF9F4",
    "\u6E05\u6DF8",
    "\u5F66\u5F65",
    "\u4F1F\u5049",
    "\u534E\u83EF",
    "\u9F99\u9F8D",
    "\u53F6\u8449",
    "\u84DD\u85CD"
  ],
  pending: [
    {
      char: "\u61FF",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u5409",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6615",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u9701",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u4EE5",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u749F",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6995",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u83B2",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u8309",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u828A",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u8559",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u79BE",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u7A37",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6C50",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6C85",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6C40",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6DC7",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u8C28",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u52E4",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u516E",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u9E7F",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u9E9F",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6D4E",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u7457",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u94B0",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u94EE",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u579A",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u57A3",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u5807",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6657",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u6684",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u7166",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u709C",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u70AB",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u70C1",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u71A0",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u96C4",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u4E00",
      reason: "not-present-in-published130-dictionary"
    },
    {
      char: "\u521D",
      reason: "not-present-in-published130-dictionary"
    }
  ],
  projectTags: [
    "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009",
    "\u660E\u6717",
    "\u7389\u77F3\u73CD\u5B9D",
    "\u7F8E\u5FB7",
    "\u81EA\u7136\u8349\u6728"
  ]
};

// data/naming-editorial-v5.json
var naming_editorial_v5_default = {
  version: "naming-editorial-5.0.0",
  dataVersion: "2026.10.20.1",
  base: {
    version: "naming-editorial-4.0.0",
    sourceId: "naming-editorial-readings-v4-fixed",
    sha256: "d24898eb63438d7b24262668eb3b36770f211fade015b28eeb361700a58ca6ce",
    sourceLockSha256: "33d1cac2da2ec2dc6705ecbaa160900f20e6c71ec10c52d065a0b631199f6d43",
    dataVersion: "2026.10.18.1",
    datasetSha256: "c5e6934fab8892e2f162cb584c0869c253b838b5f41d7087d9e7630f648fe6ae",
    knowledgeSqliteSha256: "f264eb26f631441a31324e9be14058f38d02d444070e00e9e0690b4f0b9ff7cc"
  },
  newDataset: {
    file: "data/dataset-v5.json",
    sha256: "0799bd0b5088bb99f3ab34ac02340fbcfc5a8a4072cee46caa41ab963b1d56af",
    sqliteFile: "data/knowledge-v5.sqlite",
    sqliteSha256: "21bcc3b2e60f4051bdb220c126db6121259ead36947109974b01cc386d87c1df",
    version: "2026.10.20.1"
  },
  policy: "Add27 specifically reviewed source names only. Two original-MOE-word corrections for\u5FD7/\u5BB6 preserve779 chars, their defaults and Unicode variants;\u5BB6g\u016B is retained. Original3.0/4.0 interpretations,40rules/44names and old packs are not rewritten. New-name stories do not confer standalone character approval.",
  characterOverrides: [
    {
      char: "\u5FD7",
      before: {
        char: "\u5FD7",
        pinyin: "zh\xEC",
        tone: 4,
        meaning: "\u8A18\u4F4F\u3001\u8A18\u61B6\u3002\uFF1B\u8A18\u9304\u3001\u8A18\u8F09\u3002\uFF1B\u8868\u793A\u3002",
        traditional: "\u8A8C",
        strokes: 7,
        radical: "\u5FC3",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u8A8C\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u5FD7\u3001\u8A8C\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "zh\xEC",
            tone: 4,
            meanings: [
              "\u8A18\u4F4F\u3001\u8A18\u61B6\u3002",
              "\u8A18\u9304\u3001\u8A18\u8F09\u3002",
              "\u8868\u793A\u3002",
              "\u6587\u9AD4\u540D\u3002\u4E00\u7A2E\u8A18\u4E8B\u6587\u3002",
              "\u6A19\u8B58\u3001\u8A18\u865F\u3002",
              "\u76AE\u819A\u4E0A\u6240\u751F\u7684\u5FAE\u51F8\u5C0F\u9EDE\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u8A8C"
          }
        ],
        polyphonic: false,
        variants: [
          "\u5FD7",
          "\u8A8C",
          "\u{30D67}"
        ]
      },
      after: {
        char: "\u5FD7",
        pinyin: "zh\xEC",
        tone: 4,
        meaning: "\u610F\u5411\u3001\u62B1\u8CA0\u3001\u6C7A\u5FC3\u3002\uFF1B\u8A18\u9304\u4E8B\u7269\u7684\u66F8\u3002\uFF1B\u59D3\u3002\u5982\u5143\u4EE3\u6709\u5FD7\u80FD\u3002",
        traditional: "\u5FD7",
        strokes: 7,
        radical: "\u5FC3",
        elements: [],
        elementBasis: "\u4E94\u884C\u5C5E\u6027\u5F85\u8D77\u540D\u5E08\u6307\u5B9A\uFF1B\u4E0D\u4ECE\u666E\u901A\u7B14\u753B\u6570\u63A8\u5B9A\u4E94\u884C",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u5FD7\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "zh\xEC",
            tone: 4,
            meanings: [
              "\u610F\u5411\u3001\u62B1\u8CA0\u3001\u6C7A\u5FC3\u3002",
              "\u8A18\u9304\u4E8B\u7269\u7684\u66F8\u3002",
              "\u59D3\u3002\u5982\u5143\u4EE3\u6709\u5FD7\u80FD\u3002",
              "\u8A18\u8F09\u3001\u8A18\u9304\u3002",
              "\u7262\u8A18\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u5FD7"
          }
        ],
        polyphonic: false,
        variants: [
          "\u5FD7",
          "\u8A8C",
          "\u{30D67}"
        ]
      },
      sourceEvidence: {
        rawFile: "data/raw/moe-revised.json.gz",
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u8A8C",
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3113\u02CB",
              definitions: [
                {
                  def: "\u8A18\u4F4F\u3001\u8A18\u61B6\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u6C38\u8A8C\u4E0D\u5FD8\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u65B0\u5510\u66F8\uFF0E\u5377\u4E00\u25CB\u4E8C\uFF0E\u891A\u4EAE\u50B3\u300B\uFF1A\u300C\u4EAE\u5C11\u8B66\u654F\uFF0C\u535A\u898B\u5716\u53F2\uFF0C\u4E00\u7D93\u76EE\u8F12\u8A8C\u4E8E\u5FC3\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u8A18\u9304\u3001\u8A18\u8F09\u3002",
                  quote: [
                    "\u300A\u5217\u5B50\uFF0E\u694A\u6731\u300B\uFF1A\u300C\u592A\u53E4\u4E4B\u4E8B\u6EC5\u77E3\uFF0C\u5B70\u8A8C\u4E4B\u54C9\uFF1F\u300D",
                    "\u300A\u804A\u9F4B\u5FD7\u7570\uFF0E\u5377\u4E5D\uFF0E\u90B5\u81E8\u6DC4\u300B\uFF1A\u300C\u9091\u6709\u8CE2\u5BB0\uFF0C\u91CC\u7121\u608D\u5A66\u77E3\u3002\u8A8C\u4E4B\uFF0C\u4EE5\u88DC\u5FAA\u540F\u50B3\u4E4B\u6240\u4E0D\u53CA\u8005\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u8868\u793A\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u8A8C\u54C0\u300D\u3001\u300C\u8A8C\u6176\u300D\u3002"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u6587\u9AD4\u540D\u3002\u4E00\u7A2E\u8A18\u4E8B\u6587\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u7891\u8A8C\u300D\u3001\u300C\u8B80\u66F8\u8A8C\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u6A19\u8B58\u3001\u8A18\u865F\u3002",
                  quote: [
                    "\u300A\u5357\u9F4A\u66F8\uFF0E\u5377\u4E94\u4E94\uFF0E\u5B5D\u7FA9\u50B3\uFF0E\u97D3\u4FC2\u4F2F\u50B3\u300B\uFF1A\u300C\u8944\u967D\u571F\u4FD7\uFF0C\u9130\u5C45\u7A2E\u6851\u6A39\u65BC\u754C\u4E0A\u70BA\u8A8C\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u76AE\u819A\u4E0A\u6240\u751F\u7684\u5FAE\u51F8\u5C0F\u9EDE\u3002",
                  link: [
                    "\u901A\u300C\u75E3\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u5357\u9F4A\u66F8\uFF0E\u5377\u56DB\u4E8C\uFF0E\u6C5F\u7950\u50B3\u300B\uFF1A\u300C\u9AD8\u5B97\u80DB\u4E0A\u6709\u8D64\u8A8C\u3002\u300D",
                    "\u5510\uFF0E\u6BB5\u6210\u5F0F\u300A\u9149\u967D\u96DC\u4FCE\uFF0E\u5377\u4E8C\uFF0E\u7389\u683C\u300B\uFF1A\u300C\u984D\u4E09\u7406\uFF0C\u8179\u4E09\u8A8C\u3002\u300D"
                  ],
                  type: "\u540D"
                }
              ],
              pinyin: "zh\xEC"
            }
          ],
          non_radical_stroke_count: 7,
          radical: "\u8A00",
          stroke_count: 14,
          title: "\u8A8C"
        },
        beforeRawEntryIndex: 132332,
        afterDictionaryWord: "\u5FD7",
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3113\u02CB",
              definitions: [
                {
                  def: "\u610F\u5411\u3001\u62B1\u8CA0\u3001\u6C7A\u5FC3\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u610F\u5FD7\u300D\u3001\u300C\u5FD7\u540C\u9053\u5408\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8AD6\u8A9E\uFF0E\u516C\u51B6\u9577\u300B\uFF1A\u300C\u76CD\u5404\u8A00\u723E\u5FD7\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u8A18\u9304\u4E8B\u7269\u7684\u66F8\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5E9C\u5FD7\u300D\u3001\u300C\u4E09\u570B\u5FD7\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u5468\u79AE\uFF0E\u6625\u5B98\uFF0E\u5C0F\u53F2\u300B\uFF1A\u300C\u5C0F\u53F2\u638C\u90A6\u570B\u4E4B\u5FD7\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u59D3\u3002\u5982\u5143\u4EE3\u6709\u5FD7\u80FD\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u8A18\u8F09\u3001\u8A18\u9304\u3002",
                  link: [
                    "\u901A\u300C\u8A8C\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u5468\u79AE\uFF0E\u6625\u5B98\uFF0E\u4FDD\u7AE0\u6C0F\u300B\uFF1A\u300C\u638C\u5929\u661F\uFF0C\u4EE5\u5FD7\u65E5\u6708\u661F\u8FB0\u4E4B\u8B8A\u52D5\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u7262\u8A18\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u6C38\u5FD7\u4E0D\u5FD8\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u8340\u5B50\uFF0E\u5B50\u9053\u300B\uFF1A\u300C\u5B54\u5B50\u66F0\uFF1A\u300E\u7531\u5FD7\u4E4B\uFF0C\u543E\u8A9E\u6C5D\u3002\u300F\u300D"
                  ],
                  type: "\u52D5"
                }
              ],
              pinyin: "zh\xEC"
            }
          ],
          non_radical_stroke_count: 3,
          radical: "\u5FC3",
          stroke_count: 7,
          title: "\u5FD7"
        },
        afterRawEntryIndex: 53447,
        rootCause: "Unicode traditional variants precede the original char; the old builder selects the first usable MOE word. A two-character explicit exception is used; the other777 entries are not reordered.",
        builderLocators: [
          "scripts/build-data.mjs:96",
          "scripts/build-data.mjs:139",
          "scripts/build-data.mjs:140"
        ]
      },
      changedFields: [
        "meaning",
        "traditional",
        "warning",
        "readings"
      ],
      heteronymPinyinsBefore: [
        "zh\xEC"
      ],
      heteronymPinyinsAfter: [
        "zh\xEC"
      ]
    },
    {
      char: "\u5BB6",
      before: {
        char: "\u5BB6",
        pinyin: "ji\u0101",
        tone: 1,
        meaning: "\u53C3\u898B\u300C\u50A2\u4F19\u300D\u3001\u300C\u50A2\u4F19\u5EA7\u5152\u300D\u7B49\u689D\u3002",
        traditional: "\u50A2",
        strokes: 10,
        radical: "\u5B80",
        elements: [
          "\u571F"
        ],
        elementBasis: "\u5B57\u5F62\uFF0F\u5B57\u4E49\u610F\u8C61\u53C2\u8003 v1\uFF08\u9879\u76EE\u81EA\u7F16\u6807\u7B7E\uFF0C\u975E\u552F\u4E00\u6C49\u5B57\u4E94\u884C\u5B9A\u8BBA\uFF1B\u4E0D\u5F97\u5F53\u4F5C\u5EB7\u7199\u7B14\u753B\u4E94\u884C\uFF09",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u7E41\u4F53\u5BF9\u5E94\u201C\u50A2\u201D\uFF0C\u7B80\u7E41\u4E0E\u5F02\u4F53\u987B\u6309\u6237\u7C4D\u7528\u5B57\u786E\u8BA4\u3002 Unicode \u8BB0\u6709\u591A\u4E2A\u7B80\u7E41\u5BF9\u5E94\uFF1A\u50A2\u3001\u5BB6\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "ji\u0101",
            tone: 1,
            meanings: [
              "\u53C3\u898B\u300C\u50A2\u4F19\u300D\u3001\u300C\u50A2\u4F19\u5EA7\u5152\u300D\u7B49\u689D\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u50A2"
          }
        ],
        polyphonic: false,
        variants: [
          "\u5BB6",
          "\u50A2"
        ]
      },
      after: {
        char: "\u5BB6",
        pinyin: "ji\u0101",
        tone: 1,
        meaning: "\u7737\u5C6C\u5171\u540C\u751F\u6D3B\u7684\u5834\u6240\u3002\uFF1B\u4E00\u9580\u4E4B\u5167\u5171\u540C\u751F\u6D3B\u7684\u4EBA\u3002\uFF1B\u5B78\u8853\u6D41\u6D3E\u3002",
        traditional: "\u5BB6",
        strokes: 10,
        radical: "\u5B80",
        elements: [
          "\u571F"
        ],
        elementBasis: "\u5B57\u5F62\uFF0F\u5B57\u4E49\u610F\u8C61\u53C2\u8003 v1\uFF08\u9879\u76EE\u81EA\u7F16\u6807\u7B7E\uFF0C\u975E\u552F\u4E00\u6C49\u5B57\u4E94\u884C\u5B9A\u8BBA\uFF1B\u4E0D\u5F97\u5F53\u4F5C\u5EB7\u7199\u7B14\u753B\u4E94\u884C\uFF09",
        tags: [
          "\u5E38\u7528\u547D\u540D\u5B57\u5019\u9009"
        ],
        warning: "\u591A\u97F3\u5B57\uFF1A\u672C\u65B9\u6848\u91C7\u7528 ji\u0101\uFF0C\u8BF7\u6309\u59D3\u540D\u7528\u6CD5\u786E\u8BA4\uFF1B\u5404\u8BFB\u97F3\u4E49\u9879\u5206\u522B\u4FDD\u5B58\u3002 \u672C\u6761\u5B57\u4E49\u5BF9\u5E94\u539F\u8BCD\u6761\u201C\u5BB6\u201D\uFF1BUnicode \u7B80\u7E41\u4E0E\u5F02\u4F53\u5BF9\u5E94\u4FDD\u7559\uFF0C\u8BF7\u6309\u5B9E\u9645\u5B57\u4E49\u786E\u8BA4\u3002",
        sourceId: "moe-revised",
        readings: [
          {
            pinyin: "ji\u0101",
            tone: 1,
            meanings: [
              "\u7737\u5C6C\u5171\u540C\u751F\u6D3B\u7684\u5834\u6240\u3002",
              "\u4E00\u9580\u4E4B\u5167\u5171\u540C\u751F\u6D3B\u7684\u4EBA\u3002",
              "\u5B78\u8853\u6D41\u6D3E\u3002",
              "\u7D93\u71DF\u67D0\u7A2E\u884C\u696D\u6216\u5177\u6709\u67D0\u7A2E\u8EAB\u5206\u7684\u4EBA\u3002",
              "\u5C0A\u7A31\u5B78\u6709\u5C08\u9577\u6216\u6709\u5C08\u9580\u6280\u8853\u7684\u4EBA\u3002",
              "\u81EA\u7A31\u6216\u7A31\u5225\u4EBA\u3002",
              "\u53E4\u4EE3\u5927\u592B\u6240\u7D71\u6CBB\u7684\u653F\u6CBB\u5340\u57DF\u3002\u8207\u300C\u570B\u300D\u76F8\u5C0D\u3002",
              "\u79C1\u6709\u8CA1\u7522\u3002",
              "\u91CF\u8A5E\u3002\u8A08\u7B97\u5BB6\u5EAD\u3001\u5E97\u92EA\u3001\u5927\u578B\u4F01\u696D\u7B49\u7684\u55AE\u4F4D\u3002",
              " \u59D3\u3002\u5982\u5468\u4EE3\u6709\u5BB6\u4F2F\u3002",
              "\u5C45\u4F4F\u3002",
              "\u5C0D\u4EBA\u8B19\u7A31\u81EA\u5DF1\u7684\u89AA\u9577\u3002",
              "\u5BB6\u4E2D\u7684\u3002",
              "\u5BB6\u4E2D\u98FC\u990A\u7684\u3002",
              "\u7F6E\u65BC\u53E5\u4E2D\u3002\u76F8\u7576\u65BC\u300C\u5730\u300D\u3001\u300C\u7684\u300D\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u5BB6"
          },
          {
            pinyin: "g\u016B",
            tone: 1,
            meanings: [
              "\u5C0D\u5973\u5B50\u7684\u5C0A\u7A31\u3002"
            ],
            sourceId: "moe-revised",
            word: "\u5BB6"
          }
        ],
        polyphonic: true,
        variants: [
          "\u5BB6",
          "\u50A2"
        ]
      },
      sourceEvidence: {
        rawFile: "data/raw/moe-revised.json.gz",
        rawSha256: "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e",
        beforeDictionaryWord: "\u50A2",
        beforeEntry: {
          heteronyms: [
            {
              bopomofo: "\u3110\u3127\u311A",
              definitions: [
                {
                  def: "\u53C3\u898B\u300C\u50A2\u4F19\u300D\u3001\u300C\u50A2\u4F19\u5EA7\u5152\u300D\u7B49\u689D\u3002"
                }
              ],
              pinyin: "ji\u0101"
            }
          ],
          non_radical_stroke_count: 10,
          radical: "\u4EBA",
          stroke_count: 12,
          title: "\u50A2"
        },
        beforeRawEntryIndex: 13967,
        afterDictionaryWord: "\u5BB6",
        afterEntry: {
          heteronyms: [
            {
              bopomofo: "\u3110\u3127\u311A",
              definitions: [
                {
                  def: "\u7737\u5C6C\u5171\u540C\u751F\u6D3B\u7684\u5834\u6240\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5BB6\u5EAD\u300D\u3001\u300C\u56DE\u5BB6\u300D\u3002"
                  ],
                  quote: [
                    "\u5510\uFF0E\u8CC0\u77E5\u7AE0\u3008\u56DE\u9109\u5076\u66F8\u3009\u8A69\u4E8C\u9996\u4E4B\u4E00\uFF1A\u300C\u5C11\u5C0F\u96E2\u5BB6\u8001\u5927\u56DE\uFF0C\u9109\u97F3\u7121\u6539\u9B22\u6BDB\u8870\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u4E00\u9580\u4E4B\u5167\u5171\u540C\u751F\u6D3B\u7684\u4EBA\u3002",
                  quote: [
                    "\u300A\u5442\u6C0F\u6625\u79CB\uFF0E\u5148\u8B58\u89BD\uFF0E\u5BDF\u5FAE\u300B\uFF1A\u300C\u5433\u4EBA\u61C9\u4E4B\u4E0D\u606D\uFF0C\u6012\u6BBA\u800C\u53BB\u4E4B\uFF0C\u5433\u4EBA\u5F80\u5831\u4E4B\uFF0C\u76E1\u5C60\u5176\u5BB6\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u5B78\u8853\u6D41\u6D3E\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5112\u5BB6\u300D\u3001\u300C\u9053\u5BB6\u300D\u3001\u300C\u767E\u5BB6\u722D\u9CF4\u300D\u3001\u300C\u4E00\u5BB6\u4E4B\u8A00\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u7D93\u71DF\u67D0\u7A2E\u884C\u696D\u6216\u5177\u6709\u67D0\u7A2E\u8EAB\u5206\u7684\u4EBA\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u8FB2\u5BB6\u300D\u3001\u300C\u5546\u5BB6\u300D\u3001\u300C\u5E97\u5BB6\u300D\u3001\u300C\u5C11\u6771\u5BB6\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u5C0A\u7A31\u5B78\u6709\u5C08\u9577\u6216\u6709\u5C08\u9580\u6280\u8853\u7684\u4EBA\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5C08\u5BB6\u300D\u3001\u300C\u6587\u5B78\u5BB6\u300D\u3001\u300C\u79D1\u5B78\u5BB6\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u81EA\u7A31\u6216\u7A31\u5225\u4EBA\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u81EA\u5BB6\u300D\u3001\u300C\u54B1\u5BB6\u300D\u3001\u300C\u54C0\u5BB6\u300D\u3001\u300C\u59D1\u5A18\u5BB6\u300D\u3001\u300C\u5C0F\u5B69\u5B50\u5BB6\u300D\u3001\u300C\u5A66\u9053\u4EBA\u5BB6\u300D\u3002"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u53E4\u4EE3\u5927\u592B\u6240\u7D71\u6CBB\u7684\u653F\u6CBB\u5340\u57DF\u3002\u8207\u300C\u570B\u300D\u76F8\u5C0D\u3002",
                  quote: [
                    "\u300A\u8AD6\u8A9E\uFF0E\u5B63\u6C0F\u300B\uFF1A\u300C\u4E18\u4E5F\u805E\u6709\u570B\u6709\u5BB6\u8005\uFF0C\u4E0D\u60A3\u5BE1\u800C\u60A3\u4E0D\u5747\uFF0C\u4E0D\u60A3\u8CA7\u800C\u60A3\u4E0D\u5B89\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u79C1\u6709\u8CA1\u7522\u3002",
                  quote: [
                    "\u300A\u97D3\u975E\u5B50\uFF0E\u5916\u5132\u8AAA\u5DE6\u4E0A\u300B\uFF1A\u300C\u592B\u8CE3\u5EB8\u800C\u64AD\u8015\u8005\uFF0C\u4E3B\u4EBA\u8CBB\u5BB6\u800C\u7F8E\u98DF\u3002\u300D",
                    "\u300A\u53F2\u8A18\uFF0E\u5377\u516B\u4E94\uFF0E\u5442\u4E0D\u97CB\u50B3\u300B\uFF1A\u300C\u8AF8\u5AEA\u6BD0\u820D\u4EBA\u7686\u6C92\u5176\u5BB6\u800C\u9077\u4E4B\u8700\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: "\u91CF\u8A5E\u3002\u8A08\u7B97\u5BB6\u5EAD\u3001\u5E97\u92EA\u3001\u5927\u578B\u4F01\u696D\u7B49\u7684\u55AE\u4F4D\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u4F4F\u6236\u4E0D\u6EFF\u5341\u5BB6\u300D\u3001\u300C\u4E09\u5BB6\u5831\u793E\u300D\u3001\u300C\u53EA\u6B64\u4E00\u5BB6\uFF0C\u5225\u7121\u5206\u865F\u3002\u300D\u3001\u300C\u958B\u4E86\u4E09\u5BB6\u5206\u516C\u53F8\u3002\u300D"
                  ],
                  type: "\u540D"
                },
                {
                  def: " \u59D3\u3002\u5982\u5468\u4EE3\u6709\u5BB6\u4F2F\u3002",
                  type: "\u540D"
                },
                {
                  def: "\u5C45\u4F4F\u3002",
                  quote: [
                    "\u300A\u6587\u9078\uFF0E\u6C5F\u6DF9\uFF0E\u5225\u8CE6\u300B\uFF1A\u300C\u53C8\u82E5\u541B\u5C45\u6DC4\u53F3\uFF0C\u59BE\u5BB6\u6CB3\u967D\u3002\u300D"
                  ],
                  type: "\u52D5"
                },
                {
                  def: "\u5C0D\u4EBA\u8B19\u7A31\u81EA\u5DF1\u7684\u89AA\u9577\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5BB6\u7236\u300D\u3001\u300C\u5BB6\u6BCD\u300D\u3001\u300C\u5BB6\u5144\u300D\u3002"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u5BB6\u4E2D\u7684\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5BB6\u4E8B\u300D\u3001\u300C\u5BB6\u4EBA\u300D\u3001\u300C\u5BB6\u7522\u300D\u3001\u300C\u5BB6\u696D\u300D\u3001\u300C\u5BB6\u50EE\u300D\u3002"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u5BB6\u4E2D\u98FC\u990A\u7684\u3002",
                  example: [
                    "\u5982\uFF1A\u300C\u5BB6\u755C\u300D\u3001\u300C\u5BB6\u79BD\u300D\u3002"
                  ],
                  type: "\u5F62"
                },
                {
                  def: "\u7F6E\u65BC\u53E5\u4E2D\u3002\u76F8\u7576\u65BC\u300C\u5730\u300D\u3001\u300C\u7684\u300D\u3002",
                  quote: [
                    "\u5143\uFF0E\u856D\u5FB7\u7965\u300A\u6BBA\u72D7\u52F8\u592B\uFF0E\u7B2C\u4E8C\u6298\u300B\uFF1A\u300C\u4ED6\u9053\u4FFA\u54E5\u54E5\u5341\u5206\u5BB6\u6C89\u9189\uFF0C\u4E14\u5403\u4E9B\u5152\u71B1\u6E6F\u71B1\u6C34\u3002\u300D",
                    "\u300A\u897F\u904A\u8A18\uFF0E\u7B2C\u4E94\u4E00\u56DE\u300B\uFF1A\u300C\u5927\u7897\u5BB6\u5BEC\u61F7\u66A2\u98F2\u3002\u300D"
                  ],
                  type: "\u52A9"
                }
              ],
              pinyin: "ji\u0101"
            },
            {
              bopomofo: "\u310D\u3128",
              definitions: [
                {
                  def: "\u5C0D\u5973\u5B50\u7684\u5C0A\u7A31\u3002",
                  link: [
                    "\u540C\u300C\u59D1\u300D\u3002"
                  ],
                  quote: [
                    "\u300A\u5F8C\u6F22\u66F8\uFF0E\u5377\u516B\u56DB\uFF0E\u5217\u5973\u50B3\uFF0E\u66F9\u4E16\u53D4\u59BB\u50B3\u300B\uFF1A\u300C\u6276\u98A8\u66F9\u4E16\u53D4\u59BB\u8005\uFF0C\u540C\u90E1\u73ED\u5F6A\u4E4B\u5973\u4E5F\uFF0C\u540D\u662D\u2026\u2026\u3002\u5E1D\u6578\u53EC\u5165\u5BAE\uFF0C\u4EE4\u7687\u540E\u8AF8\u8CB4\u4EBA\u5E2B\u4E8B\u7109\uFF0C\u865F\u66F0\u5927\u5BB6\u3002\u3000\u300D"
                  ],
                  type: "\u540D"
                }
              ],
              pinyin: "g\u016B"
            }
          ],
          non_radical_stroke_count: 7,
          radical: "\u5B80",
          stroke_count: 10,
          title: "\u5BB6"
        },
        afterRawEntryIndex: 42901,
        rootCause: "Unicode traditional variants precede the original char; the old builder selects the first usable MOE word. A two-character explicit exception is used; the other777 entries are not reordered.",
        builderLocators: [
          "scripts/build-data.mjs:96",
          "scripts/build-data.mjs:139",
          "scripts/build-data.mjs:140"
        ]
      },
      changedFields: [
        "meaning",
        "traditional",
        "warning",
        "readings",
        "polyphonic"
      ],
      heteronymPinyinsBefore: [
        "ji\u0101"
      ],
      heteronymPinyinsAfter: [
        "ji\u0101",
        "g\u016B"
      ]
    }
  ],
  nameRules: [
    {
      name: "\u626C\u5584",
      ruleId: "naming-v5-proposal-zhouyi-14-xiang-626c5584",
      citation: {
        id: "zhouyi-14-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C14\u5366\xB7\u706B\u5929\u5927\u6709\xB7\u5927\u8C61",
        text: "\u706B\u5728\u5929\u4E0A\uFF0C\u5927\u6709\u3002\u541B\u5B50\u4EE5\u904F\u6076\u626C\u5584\uFF0C\u987A\u5929\u4F11\u547D\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u904F\u6076\u626C\u5584",
      extraction: "continuous",
      context: "\u5927\u8C61\u8981\u6C42\u904F\u6B62\u6076\u4E8B\u3001\u5F70\u626C\u5584\u4E8B\uFF1B\u626C\u4E3A\u5F70\u663E\uFF0C\u5584\u4E3A\u7F8E\u597D\u7684\u4E8B\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4FDD\u7559\u904F\u6076\u4E0E\u987A\u5929\u4F11\u547D\u7684\u539F\u6587\uFF0C\u4E0D\u628A\u5927\u6709\u5366\u540D\u89E3\u91CA\u6210\u4E2A\u4EBA\u5FC5\u7136\u5BCC\u6709\u3002",
      meaning: "\u613F\u5B69\u5B50\u8FA8\u522B\u662F\u975E\u3001\u4E50\u4E8E\u80AF\u5B9A\u4E0E\u8DF5\u884C\u5584\u610F\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5927\u8C61\u8981\u6C42\u904F\u6B62\u6076\u4E8B\u3001\u5F70\u626C\u5584\u4E8B\uFF1B\u626C\u4E3A\u5F70\u663E\uFF0C\u5584\u4E3A\u7F8E\u597D\u7684\u4E8B\u3002\uFF09",
      sourceMeaning: "\u5927\u8C61\u8981\u6C42\u904F\u6B62\u6076\u4E8B\u3001\u5F70\u626C\u5584\u4E8B\uFF1B\u626C\u4E3A\u5F70\u663E\uFF0C\u5584\u4E3A\u7F8E\u597D\u7684\u4E8B\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8FA8\u522B\u662F\u975E\u3001\u4E50\u4E8E\u80AF\u5B9A\u4E0E\u8DF5\u884C\u5584\u610F\u3002",
      readings: [
        {
          char: "\u626C",
          pinyin: "y\xE1ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u63DA",
          dictionarySense: "\u5F70\u986F\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u5584",
          pinyin: "sh\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5584",
          dictionarySense: "\u7F8E\u597D\u7684\u4E8B\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u614E\u8A00",
      ruleId: "naming-v5-proposal-zhouyi-27-xiang-614e8a00",
      citation: {
        id: "zhouyi-27-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C27\u5366\xB7\u5C71\u96F7\u9890\xB7\u5927\u8C61",
        text: "\u5C71\u4E0B\u6709\u96F7\uFF0C\u9890\u3002\u541B\u5B50\u4EE5\u614E\u8A00\u8BED\uFF0C\u8282\u996E\u98DF\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u614E\u8A00\u8BED\uFF0C\u8282\u996E\u98DF",
      extraction: "continuous",
      context: "\u5927\u8C61\u5C06\u8C28\u614E\u8A00\u8BED\u4E0E\u8282\u5236\u996E\u98DF\u5E76\u5217\uFF0C\u662F\u4FEE\u8EAB\u529D\u6212\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u614E\u8A00\u662F\u614E\u8A00\u8BED\u7684\u8FDE\u7EED\u6458\u5B57\uFF1B\u4E0D\u662F\u8981\u6C42\u5B69\u5B50\u6C89\u9ED8\u6216\u6027\u683C\u5185\u5411\u3002",
      meaning: "\u613F\u5B69\u5B50\u8868\u8FBE\u8BA4\u771F\u3001\u8BF4\u8BDD\u6709\u5206\u5BF8\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5927\u8C61\u5C06\u8C28\u614E\u8A00\u8BED\u4E0E\u8282\u5236\u996E\u98DF\u5E76\u5217\uFF0C\u662F\u4FEE\u8EAB\u529D\u6212\u3002\uFF09",
      sourceMeaning: "\u5927\u8C61\u5C06\u8C28\u614E\u8A00\u8BED\u4E0E\u8282\u5236\u996E\u98DF\u5E76\u5217\uFF0C\u662F\u4FEE\u8EAB\u529D\u6212\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8868\u8FBE\u8BA4\u771F\u3001\u8BF4\u8BDD\u6709\u5206\u5BF8\u3002",
      readings: [
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E",
          dictionarySense: "\u5C0F\u5FC3\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u8A00",
          pinyin: "y\xE1n",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u8A00",
          dictionarySense: "\u8A71\u8A9E\u3001\u6240\u8AAA\u7684\u8A71\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 5
        }
      ]
    },
    {
      name: "\u6709\u6052",
      ruleId: "naming-v5-proposal-zhouyi-37-xiang-67096052",
      citation: {
        id: "zhouyi-37-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C37\u5366\xB7\u98CE\u706B\u5BB6\u4EBA\xB7\u5927\u8C61",
        text: "\u98CE\u81EA\u706B\u51FA\uFF0C\u5BB6\u4EBA\u3002\u541B\u5B50\u4EE5\u8A00\u6709\u7269\u800C\u884C\u6709\u6052\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u8A00\u6709\u7269\u800C\u884C\u6709\u6052",
      extraction: "continuous",
      context: "\u5927\u8C61\u8BB2\u8A00\u8BED\u6709\u5185\u5BB9\u3001\u884C\u52A8\u6709\u6052\u5E38\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4FDD\u7559\u8A00\u3001\u884C\u5E76\u4E3E\u7684\u8BED\u5883\uFF1B\u4E0D\u628A\u6052\u89E3\u91CA\u6210\u4E00\u751F\u72B6\u6001\u6C38\u4E0D\u53D8\u5316\u3002",
      meaning: "\u613F\u5B69\u5B50\u505A\u4E8B\u6709\u59CB\u6709\u7EC8\u3001\u4FDD\u6301\u8010\u5FC3\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5927\u8C61\u8BB2\u8A00\u8BED\u6709\u5185\u5BB9\u3001\u884C\u52A8\u6709\u6052\u5E38\u3002\uFF09",
      sourceMeaning: "\u5927\u8C61\u8BB2\u8A00\u8BED\u6709\u5185\u5BB9\u3001\u884C\u52A8\u6709\u6052\u5E38\u3002",
      projectWish: "\u613F\u5B69\u5B50\u505A\u4E8B\u6709\u59CB\u6709\u7EC8\u3001\u4FDD\u6301\u8010\u5FC3\u3002",
      readings: [
        {
          char: "\u6709",
          pinyin: "y\u01D2u",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6709",
          dictionarySense: "\u8868\u4E8B\u5BE6\u3001\u72C0\u6CC1\u7684\u6B63\u9762\u5B58\u5728\uFF0C\u8207\u300C\u7121\u300D\u76F8\u5C0D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u6052",
          pinyin: "h\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6046",
          dictionarySense: "\u9577\u4E45\u7684\u3001\u4E0D\u8B8A\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u9E64\u9E23",
      ruleId: "naming-v5-proposal-shijing-184-1-9e649e23",
      citation: {
        id: "shijing-184-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E3F\u96C1\u4E4B\u4EC0\xB7\u9E64\u9E23 \u7B2C1\u7AE0",
        text: "\u9E64\u9E23\u4E8E\u4E5D\u768B\uFF0C\u58F0\u95FB\u4E8E\u91CE\u3002\u9C7C\u6F5C\u5728\u6E0A\uFF0C\u6216\u5728\u4E8E\u6E1A\u3002\u4E50\u5F7C\u4E4B\u56ED\uFF0C\u7230\u6709\u6811\u6A80\uFF0C\u5176\u4E0B\u7EF4\u841A\u3002\u4ED6\u5C71\u4E4B\u77F3\uFF0C\u53EF\u4EE5\u4E3A\u9519\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u9E64\u9E23\u4E8E\u4E5D\u768B\uFF0C\u58F0\u95FB\u4E8E\u91CE",
      extraction: "continuous",
      context: "\u539F\u8BD7\u5199\u9E64\u5728\u4E5D\u768B\u9E23\u53EB\u3001\u58F0\u97F3\u4F20\u5230\u91CE\u5916\uFF1B\u5168\u7BC7\u8FD8\u5199\u9C7C\u3001\u56ED\u6797\u4E0E\u4ED6\u5C71\u4E4B\u77F3\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u9884\u8BBE\u6574\u8BD7\u5BD3\u610F\u7684\u4E89\u8BAE\u6027\u4EBA\u7269\u6620\u5C04\uFF1B\u4E0D\u7531\u9E64\u7684\u4F20\u7EDF\u8C61\u5F81\u63A8\u65AD\u5BFF\u547D\u6216\u58F0\u540D\u3002",
      meaning: "\u501F\u6E05\u8D8A\u6709\u5E94\u7684\u81EA\u7136\u610F\u8C61\uFF0C\u5BC4\u671B\u5766\u8BDA\u8868\u8FBE\u3001\u5584\u4E8E\u503E\u542C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u8BD7\u5199\u9E64\u5728\u4E5D\u768B\u9E23\u53EB\u3001\u58F0\u97F3\u4F20\u5230\u91CE\u5916\uFF1B\u5168\u7BC7\u8FD8\u5199\u9C7C\u3001\u56ED\u6797\u4E0E\u4ED6\u5C71\u4E4B\u77F3\u3002\uFF09",
      sourceMeaning: "\u539F\u8BD7\u5199\u9E64\u5728\u4E5D\u768B\u9E23\u53EB\u3001\u58F0\u97F3\u4F20\u5230\u91CE\u5916\uFF1B\u5168\u7BC7\u8FD8\u5199\u9C7C\u3001\u56ED\u6797\u4E0E\u4ED6\u5C71\u4E4B\u77F3\u3002",
      projectWish: "\u501F\u6E05\u8D8A\u6709\u5E94\u7684\u81EA\u7136\u610F\u8C61\uFF0C\u5BC4\u671B\u5766\u8BDA\u8868\u8FBE\u3001\u5584\u4E8E\u503E\u542C\u3002",
      readings: [
        {
          char: "\u9E64",
          pinyin: "h\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9DB4",
          dictionarySense: "\u9CE5\u7DB1\u9DB4\u5F62\u76EE\u52D5\u7269\u7684\u901A\u7A31\u3002\u982D\u5C0F\uFF0C\u9838\u3001\u5599\u3001\u8173\u7686\u7D30\u9577\uFF0C\u9AD8\u4E09\u5C3A\u9918\u3002\u7FBD\u6BDB\u767D\u8272\u6216\u7070\u8272\uFF0C\u7FFC\u5927\u5584\u98DB\uFF0C\u9CF4\u8072\u9AD8\u6717\u3002\u591A\u751F\u6D3B\u65BC\u6CBC\u6FA4\u6216\u5E73\u539F\u6C34\u969B\uFF0C\u4EE5\u5C0F\u9B5A\u3001\u6606\u87F2\u53CA\u7A40\u985E\u70BA\u98DF\u3002\u7A2E\u985E\u751A\u591A\uFF0C\u5927\u9678\u5730\u5340\u5E38\u898B\u7684\u6709\u767D\u9DB4\u3001\u7070\u9DB4\u3001\u4E39\u9802\u9DB4\u3001\u84D1\u7FBD\u9DB4\u7B49\u3002\u9DB4\u5728\u50B3\u8AAA\u4E2D\u662F\u795E\u4ED9\u7684\u5750\u9A0E\uFF0C\u4E5F\u662F\u9577\u58FD\u7684\u8C61\u5FB5\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u9E23",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u9CF4",
          dictionarySense: "\u6606\u87F2\u9CE5\u7378\u767C\u8072\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u6E29\u60E0",
      ruleId: "naming-v5-proposal-shijing-28-4-6e2960e0",
      citation: {
        id: "shijing-28-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90B6\u98CE\xB7\u71D5\u71D5 \u7B2C4\u7AE0",
        text: "\u4EF2\u6C0F\u4EFB\u53EA\uFF0C\u5176\u5FC3\u585E\u6E0A\u3002\u7EC8\u6E29\u4E14\u60E0\uFF0C\u6DD1\u614E\u5176\u8EAB\u3002\u5148\u541B\u4E4B\u601D\uFF0C\u4EE5\u52D6\u5BE1\u4EBA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u7EC8\u6E29\u4E14\u60E0\uFF0C\u6DD1\u614E\u5176\u8EAB",
      extraction: "recombined",
      context: "\u9001\u522B\u8BD7\u672B\u6BB5\u79F0\u8D5E\u4EF2\u6C0F\u6E29\u548C\u3001\u548C\u987A\u4E14\u614E\u4E8E\u81EA\u8EAB\uFF1B\u6E29\u4E0E\u60E0\u9694\u7740\u4E14\u5B57\u3002 \u672C\u540D\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u8BCD\uFF1B\u5168\u7BC7\u6709\u9001\u522B\u3001\u6D95\u6CE3\uFF0C\u4E0D\u80FD\u79F0\u6574\u8BD7\u4E3A\u5409\u5E86\u795D\u8F9E\u3002",
      meaning: "\u613F\u5B69\u5B50\u6E29\u539A\u5F85\u4EBA\uFF0C\u540C\u65F6\u73CD\u91CD\u81EA\u6211\u4FEE\u517B\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u9001\u522B\u8BD7\u672B\u6BB5\u79F0\u8D5E\u4EF2\u6C0F\u6E29\u548C\u3001\u548C\u987A\u4E14\u614E\u4E8E\u81EA\u8EAB\uFF1B\u6E29\u4E0E\u60E0\u9694\u7740\u4E14\u5B57\u3002\uFF09",
      sourceMeaning: "\u9001\u522B\u8BD7\u672B\u6BB5\u79F0\u8D5E\u4EF2\u6C0F\u6E29\u548C\u3001\u548C\u987A\u4E14\u614E\u4E8E\u81EA\u8EAB\uFF1B\u6E29\u4E0E\u60E0\u9694\u7740\u4E14\u5B57\u3002",
      projectWish: "\u613F\u5B69\u5B50\u6E29\u539A\u5F85\u4EBA\uFF0C\u540C\u65F6\u73CD\u91CD\u81EA\u6211\u4FEE\u517B\u3002",
      readings: [
        {
          char: "\u6E29",
          pinyin: "w\u0113n",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u6EAB",
          dictionarySense: "\u67D4\u548C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u60E0",
          pinyin: "hu\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u60E0",
          dictionarySense: "\u67D4\u9806\u3001\u548C\u9806\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 4
        }
      ]
    },
    {
      name: "\u8083\u96CD",
      ruleId: "naming-v5-proposal-shijing-266-1-808396cd",
      citation: {
        id: "shijing-266-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5468\u9882\xB7\u6E05\u5E99\u4E4B\u4EC0\xB7\u6E05\u5E99 \u7B2C1\u7AE0",
        text: "\u4E8E\u7A46\u6E05\u5E99\uFF0C\u8083\u96CD\u663E\u76F8\u3002\u6D4E\u6D4E\u591A\u58EB\uFF0C\u79C9\u6587\u4E4B\u5FB7\u3002\u5BF9\u8D8A\u5728\u5929\uFF0C\u9A8F\u5954\u8D70\u5728\u5E99\u3002\u4E0D\u663E\u4E0D\u627F\uFF0C\u65E0\u5C04\u4E8E\u4EBA\u65AF\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u4E8E\u7A46\u6E05\u5E99\uFF0C\u8083\u96CD\u663E\u76F8",
      extraction: "continuous",
      context: "\u6E05\u5E99\u796D\u7940\u8BED\u5883\u4E2D\u7684\u606D\u656C\u3001\u548C\u8C10\uFF1B\u4E0D\u662F\u60E9\u7F5A\u4E25\u8083\u6216\u5730\u7406\u96CD\u5DDE\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u660E\u786E\u5176\u796D\u7940\u793C\u4EEA\u80CC\u666F\uFF1B\u4E0D\u4EE5\u5E99\u5802\u8EAB\u4EFD\u4FDD\u8BC1\u5730\u4F4D\u3002",
      meaning: "\u613F\u5B69\u5B50\u656C\u91CD\u4ED6\u4EBA\u3001\u5904\u4E8B\u548C\u800C\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u6E05\u5E99\u796D\u7940\u8BED\u5883\u4E2D\u7684\u606D\u656C\u3001\u548C\u8C10\uFF1B\u4E0D\u662F\u60E9\u7F5A\u4E25\u8083\u6216\u5730\u7406\u96CD\u5DDE\u3002\uFF09",
      sourceMeaning: "\u6E05\u5E99\u796D\u7940\u8BED\u5883\u4E2D\u7684\u606D\u656C\u3001\u548C\u8C10\uFF1B\u4E0D\u662F\u60E9\u7F5A\u4E25\u8083\u6216\u5730\u7406\u96CD\u5DDE\u3002",
      projectWish: "\u613F\u5B69\u5B50\u656C\u91CD\u4ED6\u4EBA\u3001\u5904\u4E8B\u548C\u800C\u6709\u793C\u3002",
      readings: [
        {
          char: "\u8083",
          pinyin: "s\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u8085",
          dictionarySense: "\u606D\u656C\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u96CD",
          pinyin: "y\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u96CD",
          dictionarySense: "\u548C\u8AE7\u7684\u3001\u548C\u7766\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5982\u748B",
      ruleId: "naming-v5-proposal-shijing-252-6-5982748b",
      citation: {
        id: "shijing-252-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u5377\u963F \u7B2C6\u7AE0",
        text: "\u9899\u9899\u536C\u536C\uFF0C\u5982\u572D\u5982\u748B\uFF0C\u4EE4\u95FB\u4EE4\u671B\u3002\u5C82\u5F1F\u541B\u5B50\uFF0C\u56DB\u65B9\u4E3A\u7EB2\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u9899\u9899\u536C\u536C\uFF0C\u5982\u572D\u5982\u748B\uFF0C\u4EE4\u95FB\u4EE4\u671B",
      extraction: "continuous",
      context: "\u4EE5\u572D\u748B\u8FD9\u6837\u7684\u7389\u5668\u6BD4\u55BB\u53D7\u8D5E\u4EBA\u7269\u7684\u98CE\u91C7\uFF1B\u748B\u662F\u5F62\u5982\u534A\u572D\u7684\u7389\u5668\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u539F\u7BC7\u6709\u738B\u8005\u3001\u8D24\u58EB\u548C\u795D\u9882\u80CC\u666F\uFF1B\u4E0D\u5C06\u793C\u5668\u8EAB\u4EF7\u6216\u7B49\u7EA7\u8D4B\u7ED9\u5B69\u5B50\u3002",
      meaning: "\u501F\u7389\u5668\u7AEF\u6574\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u81EA\u6301\u6709\u5EA6\u3001\u73CD\u60DC\u54C1\u683C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u4EE5\u572D\u748B\u8FD9\u6837\u7684\u7389\u5668\u6BD4\u55BB\u53D7\u8D5E\u4EBA\u7269\u7684\u98CE\u91C7\uFF1B\u748B\u662F\u5F62\u5982\u534A\u572D\u7684\u7389\u5668\u3002\uFF09",
      sourceMeaning: "\u4EE5\u572D\u748B\u8FD9\u6837\u7684\u7389\u5668\u6BD4\u55BB\u53D7\u8D5E\u4EBA\u7269\u7684\u98CE\u91C7\uFF1B\u748B\u662F\u5F62\u5982\u534A\u572D\u7684\u7389\u5668\u3002",
      projectWish: "\u501F\u7389\u5668\u7AEF\u6574\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u81EA\u6301\u6709\u5EA6\u3001\u73CD\u60DC\u54C1\u683C\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982",
          dictionarySense: "\u5982\u540C\u3001\u597D\u50CF\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u748B",
          pinyin: "zh\u0101ng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u748B",
          dictionarySense: "\u7389\u5668\uFF0C\u5F62\u5982\u534A\u572D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u71D5\u559C",
      ruleId: "naming-v5-proposal-shijing-177-6-71d5559c",
      citation: {
        id: "shijing-177-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u516D\u6708 \u7B2C6\u7AE0",
        text: "\u5409\u752B\u71D5\u559C\uFF0C\u65E2\u591A\u53D7\u7949\u3002\u6765\u5F52\u81EA\u9550\uFF0C\u6211\u884C\u6C38\u4E45\u3002\u996E\u5FA1\u8BF8\u53CB\uFF0C\u70B0\u9CD6\u810D\u9CA4\u3002\u4FAF\u8C01\u5728\u77E3\uFF1F\u5F20\u4EF2\u5B5D\u53CB\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5409\u752B\u71D5\u559C\uFF0C\u65E2\u591A\u53D7\u7949",
      extraction: "continuous",
      context: "\u539F\u7BC7\u5199\u51FA\u5F81\uFF0C\u672B\u6BB5\u8F6C\u4E3A\u5409\u752B\u5F52\u6765\u4E0E\u670B\u53CB\u5BB4\u996E\u6B22\u559C\uFF1B\u71D5\u5728\u672C\u53E5\u662F\u5BB4\u996E\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u628A\u672C\u53E5\u71D5\u89E3\u91CA\u4E3A\u71D5\u5B50\uFF1B\u539F\u8BD7\u7684\u6218\u4E89\u4E0E\u795D\u7949\u5747\u4FDD\u7559\uFF0C\u4E0D\u8F6C\u6210\u672A\u6765\u6210\u5C31\u4FDD\u8BC1\u3002",
      meaning: "\u501F\u76F8\u805A\u6B22\u559C\u7684\u573A\u9762\uFF0C\u5BC4\u671B\u73CD\u91CD\u53CB\u8C0A\u3001\u61C2\u5F97\u5206\u4EAB\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u7BC7\u5199\u51FA\u5F81\uFF0C\u672B\u6BB5\u8F6C\u4E3A\u5409\u752B\u5F52\u6765\u4E0E\u670B\u53CB\u5BB4\u996E\u6B22\u559C\uFF1B\u71D5\u5728\u672C\u53E5\u662F\u5BB4\u996E\u3002\uFF09",
      sourceMeaning: "\u539F\u7BC7\u5199\u51FA\u5F81\uFF0C\u672B\u6BB5\u8F6C\u4E3A\u5409\u752B\u5F52\u6765\u4E0E\u670B\u53CB\u5BB4\u996E\u6B22\u559C\uFF1B\u71D5\u5728\u672C\u53E5\u662F\u5BB4\u996E\u3002",
      projectWish: "\u501F\u76F8\u805A\u6B22\u559C\u7684\u573A\u9762\uFF0C\u5BC4\u671B\u73CD\u91CD\u53CB\u8C0A\u3001\u61C2\u5F97\u5206\u4EAB\u3002",
      readings: [
        {
          char: "\u71D5",
          pinyin: "y\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u71D5",
          dictionarySense: "\u5BB4\u98F2\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u559C",
          pinyin: "x\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u559C",
          dictionarySense: "\u611F\u5230\u6B61\u6A02\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        }
      ]
    },
    {
      name: "\u656C\u4EEA",
      ruleId: "naming-v5-proposal-shijing-253-6-656c4eea",
      citation: {
        id: "shijing-253-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u6C11\u52B3 \u7B2C6\u7AE0",
        text: "\u5F0F\u904F\u5BC7\u8650\uFF0C\u65E0\u4FFE\u4F5C\u615D\u3002\u656C\u614E\u5A01\u4EEA\uFF0C\u4EE5\u8FD1\u6709\u5FB7\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u656C\u614E\u5A01\u4EEA\uFF0C\u4EE5\u8FD1\u6709\u5FB7",
      extraction: "recombined",
      context: "\u529D\u6212\u6CBB\u7406\u8005\u656C\u614E\u4E3E\u6B62\u3001\u4EB2\u8FD1\u6709\u5FB7\u8005\uFF1B\u53D6\u656C\u4E0E\u4EEA\uFF0C\u7701\u53BB\u614E\u5A01\u3002 \u672C\u540D\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u540C\u4E00\u53E5\u62BD\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u8FDE\u7EED\u539F\u8BCD\uFF1B\u4E0D\u628A\u5A01\u4EEA\u91CA\u6210\u5BB9\u8C8C\u6216\u4EBA\u683C\u6D4B\u8BC4\u3002",
      meaning: "\u613F\u5B69\u5B50\u5F85\u4EBA\u6709\u793C\u3001\u4E3E\u6B62\u8BA4\u771F\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u529D\u6212\u6CBB\u7406\u8005\u656C\u614E\u4E3E\u6B62\u3001\u4EB2\u8FD1\u6709\u5FB7\u8005\uFF1B\u53D6\u656C\u4E0E\u4EEA\uFF0C\u7701\u53BB\u614E\u5A01\u3002\uFF09",
      sourceMeaning: "\u529D\u6212\u6CBB\u7406\u8005\u656C\u614E\u4E3E\u6B62\u3001\u4EB2\u8FD1\u6709\u5FB7\u8005\uFF1B\u53D6\u656C\u4E0E\u4EEA\uFF0C\u7701\u53BB\u614E\u5A01\u3002",
      projectWish: "\u613F\u5B69\u5B50\u5F85\u4EBA\u6709\u793C\u3001\u4E3E\u6B62\u8BA4\u771F\u3002",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C",
          dictionarySense: "\u614E\u91CD\u3001\u606D\u656C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100",
          dictionarySense: "\u8209\u6B62\u5BB9\u8C8C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 3
        }
      ]
    },
    {
      name: "\u4E54\u6728",
      ruleId: "naming-v5-proposal-shijing-165-1-4e546728",
      citation: {
        id: "shijing-165-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9E7F\u9E23\u4E4B\u4EC0\xB7\u4F10\u6728 \u7B2C1\u7AE0",
        text: "\u4F10\u6728\u4E01\u4E01\uFF0C\u9E1F\u9E23\u5624\u5624\u3002\u51FA\u81EA\u5E7D\u8C37\uFF0C\u8FC1\u4E8E\u4E54\u6728\u3002\u5624\u5176\u9E23\u77E3\uFF0C\u6C42\u5176\u53CB\u58F0\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u51FA\u81EA\u5E7D\u8C37\uFF0C\u8FC1\u4E8E\u4E54\u6728",
      extraction: "continuous",
      context: "\u5199\u9E1F\u4ECE\u5E7D\u8C37\u8FC1\u5230\u9AD8\u5927\u7684\u6811\u6728\uFF0C\u7EE7\u800C\u5199\u6C42\u53CB\u3001\u8BBE\u5BB4\u5F85\u4EB2\u53CB\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u91C7\u7528\u4F10\u6728\u800C\u975E\u4E0D\u53EF\u4F11\u606F\u7684\u6C49\u5E7F\uFF1B\u4E0D\u628A\u4E54\u6728\u76F4\u63A5\u6539\u91CA\u4E3A\u5347\u8FC1\u6216\u663E\u8D35\u3002",
      meaning: "\u501F\u6811\u6728\u633A\u7ACB\u7684\u81EA\u7136\u5F62\u8C61\uFF0C\u5BC4\u671B\u7A33\u5065\u6210\u957F\u3001\u73CD\u60DC\u53CB\u8C0A\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5199\u9E1F\u4ECE\u5E7D\u8C37\u8FC1\u5230\u9AD8\u5927\u7684\u6811\u6728\uFF0C\u7EE7\u800C\u5199\u6C42\u53CB\u3001\u8BBE\u5BB4\u5F85\u4EB2\u53CB\u3002\uFF09",
      sourceMeaning: "\u5199\u9E1F\u4ECE\u5E7D\u8C37\u8FC1\u5230\u9AD8\u5927\u7684\u6811\u6728\uFF0C\u7EE7\u800C\u5199\u6C42\u53CB\u3001\u8BBE\u5BB4\u5F85\u4EB2\u53CB\u3002",
      projectWish: "\u501F\u6811\u6728\u633A\u7ACB\u7684\u81EA\u7136\u5F62\u8C61\uFF0C\u5BC4\u671B\u7A33\u5065\u6210\u957F\u3001\u73CD\u60DC\u53CB\u8C0A\u3002",
      readings: [
        {
          char: "\u4E54",
          pinyin: "qi\xE1o",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u55AC",
          dictionarySense: "\u5F62\u5BB9\u6A39\u5E79\u9AD8\u5927\u4E14\u6A39\u679D\u5F80\u4E0A\u76E4\u65CB\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u6728",
          pinyin: "m\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6728",
          dictionarySense: "\u6A39\u3001\u6728\u672C\u690D\u7269\u7684\u901A\u7A31\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5982\u7389",
      ruleId: "naming-v5-proposal-shijing-128-2-59827389",
      citation: {
        id: "shijing-128-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u79E6\u98CE\xB7\u5C0F\u620E \u7B2C2\u7AE0",
        text: "\u8A00\u5FF5\u541B\u5B50\uFF0C\u6E29\u5176\u5982\u7389\u3002\u5728\u5176\u677F\u5C4B\uFF0C\u4E71\u6211\u5FC3\u66F2\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u8A00\u5FF5\u541B\u5B50\uFF0C\u6E29\u5176\u5982\u7389",
      extraction: "continuous",
      context: "\u601D\u5FF5\u8005\u4EE5\u7389\u6E29\u6DA6\u7684\u5F62\u8C61\u8D5E\u5199\u541B\u5B50\uFF1B\u5168\u7BC7\u4EA4\u66FF\u5199\u8F66\u9A6C\u519B\u5907\u4E0E\u601D\u5FF5\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u4ECE\u522B\u7BC7\u62FC\u63A5\u6709\u5973\u5982\u7389\uFF1B\u4E0D\u628A\u539F\u8BD7\u601D\u5FF5\u7684\u8EAB\u4EFD\u7EC6\u8282\u4F5C\u672A\u7ECF\u6838\u5B9E\u7684\u5386\u53F2\u7ED3\u8BBA\u3002",
      meaning: "\u613F\u5B69\u5B50\u6E29\u539A\u81EA\u6301\uFF0C\u4FDD\u6709\u53EF\u8D35\u54C1\u683C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u601D\u5FF5\u8005\u4EE5\u7389\u6E29\u6DA6\u7684\u5F62\u8C61\u8D5E\u5199\u541B\u5B50\uFF1B\u5168\u7BC7\u4EA4\u66FF\u5199\u8F66\u9A6C\u519B\u5907\u4E0E\u601D\u5FF5\u3002\uFF09",
      sourceMeaning: "\u601D\u5FF5\u8005\u4EE5\u7389\u6E29\u6DA6\u7684\u5F62\u8C61\u8D5E\u5199\u541B\u5B50\uFF1B\u5168\u7BC7\u4EA4\u66FF\u5199\u8F66\u9A6C\u519B\u5907\u4E0E\u601D\u5FF5\u3002",
      projectWish: "\u613F\u5B69\u5B50\u6E29\u539A\u81EA\u6301\uFF0C\u4FDD\u6709\u53EF\u8D35\u54C1\u683C\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982",
          dictionarySense: "\u5982\u540C\u3001\u597D\u50CF\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u7389",
          pinyin: "y\xF9",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7389",
          dictionarySense: "\u8CEA\u5730\u6EAB\u6F64\u5805\u786C\u800C\u6709\u5149\u6FA4\u7684\u7F8E\u77F3\uFF0C\u5448\u534A\u900F\u660E\u72C0\uFF0C\u4E00\u822C\u7528\u4F5C\u88DD\u98FE\u54C1\u6216\u96D5\u523B\u6750\u6599\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5982\u661F",
      ruleId: "naming-v5-proposal-shijing-55-2-5982661f",
      citation: {
        id: "shijing-55-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u536B\u98CE\xB7\u6DC7\u5965 \u7B2C2\u7AE0",
        text: "\u77BB\u5F7C\u6DC7\u5965\uFF0C\u7EFF\u7AF9\u9752\u9752\u3002\u6709\u532A\u541B\u5B50\uFF0C\u5145\u8033\u79C0\u83B9\uFF0C\u4F1A\u5F01\u5982\u661F\u3002\u745F\u516E\u50F4\u516E\u3002\u8D6B\u516E\u54BA\u516E\uFF0C\u6709\u532A\u541B\u5B50\uFF0C\u7EC8\u4E0D\u53EF\u8C16\u516E\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5145\u8033\u79C0\u83B9\uFF0C\u4F1A\u5F01\u5982\u661F",
      extraction: "continuous",
      context: "\u539F\u53E5\u4EE5\u661F\u5149\u6BD4\u62DF\u51A0\u9970\u7684\u4EAE\u70B9\uFF1B\u6574\u7BC7\u8D5E\u541B\u5B50\u98CE\u91C7\u5E76\u6D89\u53CA\u4FEE\u517B\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u5982\u661F\u5728\u6B64\u662F\u51A0\u9970\u6BD4\u55BB\uFF0C\u4E0D\u662F\u5929\u8C61\u5360\u9A8C\uFF1B\u56FA\u5B9A\u6E90\u4F5C\u79C0\u83B9\uFF0C\u4FDD\u7559\u539F\u5B57\uFF0C\u4E0D\u81EA\u52A8\u6539\u4E3A\u7407\u83B9\u3002",
      meaning: "\u501F\u661F\u5149\u660E\u4EAE\u7684\u5F62\u8C61\uFF0C\u5BC4\u671B\u6E05\u6717\u81EA\u6301\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u53E5\u4EE5\u661F\u5149\u6BD4\u62DF\u51A0\u9970\u7684\u4EAE\u70B9\uFF1B\u6574\u7BC7\u8D5E\u541B\u5B50\u98CE\u91C7\u5E76\u6D89\u53CA\u4FEE\u517B\u3002\uFF09",
      sourceMeaning: "\u539F\u53E5\u4EE5\u661F\u5149\u6BD4\u62DF\u51A0\u9970\u7684\u4EAE\u70B9\uFF1B\u6574\u7BC7\u8D5E\u541B\u5B50\u98CE\u91C7\u5E76\u6D89\u53CA\u4FEE\u517B\u3002",
      projectWish: "\u501F\u661F\u5149\u660E\u4EAE\u7684\u5F62\u8C61\uFF0C\u5BC4\u671B\u6E05\u6717\u81EA\u6301\u3002",
      readings: [
        {
          char: "\u5982",
          pinyin: "r\xFA",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5982",
          dictionarySense: "\u5982\u540C\u3001\u597D\u50CF\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u661F",
          pinyin: "x\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u661F",
          dictionarySense: "\u5B87\u5B99\u4E2D\u6703\u767C\u5149\u6216\u53CD\u5C04\u5149\u7684\u5929\u9AD4\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u6709\u4EEA",
      ruleId: "naming-v5-proposal-shijing-176-1-67094eea",
      citation: {
        id: "shijing-176-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u83C1\u83C1\u8005\u83AA \u7B2C1\u7AE0",
        text: "\u83C1\u83C1\u8005\u83AA\uFF0C\u5728\u5F7C\u4E2D\u963F\u3002\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA",
      extraction: "continuous",
      context: "\u76F8\u89C1\u800C\u559C\u4E50\uFF0C\u4ECD\u6709\u5F97\u4F53\u7684\u4E3E\u6B62\u793C\u4EEA\uFF1B\u4E0B\u6587\u91CD\u590D\u5199\u89C1\u541B\u5B50\u540E\u7684\u559C\u3001\u4F11\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4FDD\u7559\u89C1\u541B\u5B50\u7684\u76F8\u805A\u8BED\u5883\uFF0C\u4E0D\u5C06\u793C\u4EEA\u7B49\u540C\u5916\u8C8C\u6216\u670D\u4ECE\u3002",
      meaning: "\u613F\u5B69\u5B50\u81EA\u7136\u5F00\u6717\u3001\u5F85\u4EBA\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u76F8\u89C1\u800C\u559C\u4E50\uFF0C\u4ECD\u6709\u5F97\u4F53\u7684\u4E3E\u6B62\u793C\u4EEA\uFF1B\u4E0B\u6587\u91CD\u590D\u5199\u89C1\u541B\u5B50\u540E\u7684\u559C\u3001\u4F11\u3002\uFF09",
      sourceMeaning: "\u76F8\u89C1\u800C\u559C\u4E50\uFF0C\u4ECD\u6709\u5F97\u4F53\u7684\u4E3E\u6B62\u793C\u4EEA\uFF1B\u4E0B\u6587\u91CD\u590D\u5199\u89C1\u541B\u5B50\u540E\u7684\u559C\u3001\u4F11\u3002",
      projectWish: "\u613F\u5B69\u5B50\u81EA\u7136\u5F00\u6717\u3001\u5F85\u4EBA\u6709\u793C\u3002",
      readings: [
        {
          char: "\u6709",
          pinyin: "y\u01D2u",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6709",
          dictionarySense: "\u8868\u4E8B\u5BE6\u3001\u72C0\u6CC1\u7684\u6B63\u9762\u5B58\u5728\uFF0C\u8207\u300C\u7121\u300D\u76F8\u5C0D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100",
          dictionarySense: "\u8209\u6B62\u5BB9\u8C8C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 3
        }
      ]
    },
    {
      name: "\u4E50\u4EEA",
      ruleId: "naming-v5-proposal-shijing-176-1-4e504eea",
      citation: {
        id: "shijing-176-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u5357\u6709\u5609\u9C7C\u4E4B\u4EC0\xB7\u83C1\u83C1\u8005\u83AA \u7B2C1\u7AE0",
        text: "\u83C1\u83C1\u8005\u83AA\uFF0C\u5728\u5F7C\u4E2D\u963F\u3002\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u65E2\u89C1\u541B\u5B50\uFF0C\u4E50\u4E14\u6709\u4EEA",
      extraction: "recombined",
      context: "\u7531\u4E50\u4E14\u6709\u4EEA\u9009\u4E50\u3001\u4EEA\u91CD\u7EC4\uFF1B\u4E50\u5728\u53E5\u4E2D\u53D6\u559C\u60A6\uFF0C\u4EEA\u53D6\u5F97\u4F53\u4E3E\u6B62\u3002 \u672C\u540D\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u975E\u539F\u6587\u8FDE\u7EED\u8BCD\uFF1B\u4E50\u9650\u5B9Al\xE8\uFF0C\u4E0D\u80FD\u4EE5yu\xE8\u97F3\u4E50\u4E49\u590D\u7528\u672C\u89E3\u91CA\u3002",
      meaning: "\u613F\u5B69\u5B50\u559C\u4E50\u6709\u5EA6\u3001\u5F85\u4EBA\u4ECE\u5BB9\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u7531\u4E50\u4E14\u6709\u4EEA\u9009\u4E50\u3001\u4EEA\u91CD\u7EC4\uFF1B\u4E50\u5728\u53E5\u4E2D\u53D6\u559C\u60A6\uFF0C\u4EEA\u53D6\u5F97\u4F53\u4E3E\u6B62\u3002\uFF09",
      sourceMeaning: "\u7531\u4E50\u4E14\u6709\u4EEA\u9009\u4E50\u3001\u4EEA\u91CD\u7EC4\uFF1B\u4E50\u5728\u53E5\u4E2D\u53D6\u559C\u60A6\uFF0C\u4EEA\u53D6\u5F97\u4F53\u4E3E\u6B62\u3002",
      projectWish: "\u613F\u5B69\u5B50\u559C\u4E50\u6709\u5EA6\u3001\u5F85\u4EBA\u4ECE\u5BB9\u6709\u793C\u3002",
      readings: [
        {
          char: "\u4E50",
          pinyin: "l\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u6A02",
          dictionarySense: "\u6B61\u559C\u3001\u6109\u6085\u3002",
          rawHeteronymIndex: 2,
          rawDefinitionIndex: 0
        },
        {
          char: "\u4EEA",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5100",
          dictionarySense: "\u8209\u6B62\u5BB9\u8C8C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 3
        }
      ]
    },
    {
      name: "\u656C\u660E",
      ruleId: "naming-v5-proposal-shijing-299-4-656c660e",
      citation: {
        id: "shijing-299-4",
        title: "\u8BD7\u7ECF",
        chapter: "\u9C81\u9882\xB7\u99C9\u4E4B\u4EC0\xB7\u6CEE\u6C34 \u7B2C4\u7AE0",
        text: "\u7A46\u7A46\u9C81\u4FAF\uFF0C\u656C\u660E\u5176\u5FB7\u3002\u656C\u614E\u5A01\u4EEA\uFF0C\u7EF4\u6C11\u4E4B\u5219\u3002\u5141\u6587\u5141\u6B66\uFF0C\u662D\u5047\u70C8\u7956\u3002\u9761\u6709\u4E0D\u5B5D\uFF0C\u81EA\u6C42\u4F0A\u795C\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u7A46\u7A46\u9C81\u4FAF\uFF0C\u656C\u660E\u5176\u5FB7",
      extraction: "continuous",
      context: "\u8BD7\u4E2D\u79F0\u5199\u9C81\u4FAF\u656C\u614E\u662D\u660E\u5176\u5FB7\uFF1B\u4E0A\u4E0B\u6587\u5E76\u53CA\u5A01\u4EEA\u3001\u6587\u6B66\u4E0E\u796D\u7956\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u5C06\u9C81\u4FAF\u653F\u6CBB\u3001\u519B\u4E8B\u8EAB\u4EFD\u79FB\u7ED9\u5B69\u5B50\uFF0C\u4E0D\u628A\u660E\u53EA\u5F53\u4EAE\u5149\u3002",
      meaning: "\u613F\u5B69\u5B50\u656C\u614E\u4FEE\u8EAB\u3001\u660E\u767D\u5904\u4E8B\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u8BD7\u4E2D\u79F0\u5199\u9C81\u4FAF\u656C\u614E\u662D\u660E\u5176\u5FB7\uFF1B\u4E0A\u4E0B\u6587\u5E76\u53CA\u5A01\u4EEA\u3001\u6587\u6B66\u4E0E\u796D\u7956\u3002\uFF09",
      sourceMeaning: "\u8BD7\u4E2D\u79F0\u5199\u9C81\u4FAF\u656C\u614E\u662D\u660E\u5176\u5FB7\uFF1B\u4E0A\u4E0B\u6587\u5E76\u53CA\u5A01\u4EEA\u3001\u6587\u6B66\u4E0E\u796D\u7956\u3002",
      projectWish: "\u613F\u5B69\u5B50\u656C\u614E\u4FEE\u8EAB\u3001\u660E\u767D\u5904\u4E8B\u3002",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C",
          dictionarySense: "\u614E\u91CD\u3001\u606D\u656C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E",
          dictionarySense: "\u662D\u793A\u3001\u5F70\u986F\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        }
      ]
    },
    {
      name: "\u656C\u614E",
      ruleId: "naming-v5-proposal-shijing-256-3-656c614e",
      citation: {
        id: "shijing-256-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u8361\u4E4B\u4EC0\xB7\u6291 \u7B2C3\u7AE0",
        text: "\u8A0F\u8C1F\u5B9A\u547D\uFF0C\u8FDC\u72B9\u8FB0\u544A\u3002\u656C\u614E\u5A01\u4EEA\uFF0C\u7EF4\u6C11\u4E4B\u5219\u3002\u5176\u5728\u4E8E\u4ECA\uFF0C\u5174\u8FF7\u4E71\u4E8E\u653F\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u656C\u614E\u5A01\u4EEA\uFF0C\u7EF4\u6C11\u4E4B\u5219",
      extraction: "continuous",
      context: "\u6291\u662F\u544A\u8BEB\u3001\u529D\u6212\u7684\u8BED\u5883\uFF0C\u8981\u6C42\u656C\u614E\u4E3E\u6B62\uFF1B\u4E0B\u6587\u6279\u8BC4\u653F\u4E8B\u8FF7\u4E71\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u9690\u53BB\u540E\u6587\u6279\u8BC4\u800C\u79F0\u6574\u7BC7\u6B4C\u9882\u592A\u5E73\uFF1B\u4E0D\u4EE5\u8C28\u614E\u6807\u7B7E\u65AD\u8A00\u5B69\u5B50\u5FC3\u7406\u7279\u5F81\u3002",
      meaning: "\u613F\u5B69\u5B50\u8C28\u8A00\u614E\u884C\u3001\u5C0A\u91CD\u4ED6\u4EBA\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u6291\u662F\u544A\u8BEB\u3001\u529D\u6212\u7684\u8BED\u5883\uFF0C\u8981\u6C42\u656C\u614E\u4E3E\u6B62\uFF1B\u4E0B\u6587\u6279\u8BC4\u653F\u4E8B\u8FF7\u4E71\u3002\uFF09",
      sourceMeaning: "\u6291\u662F\u544A\u8BEB\u3001\u529D\u6212\u7684\u8BED\u5883\uFF0C\u8981\u6C42\u656C\u614E\u4E3E\u6B62\uFF1B\u4E0B\u6587\u6279\u8BC4\u653F\u4E8B\u8FF7\u4E71\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8C28\u8A00\u614E\u884C\u3001\u5C0A\u91CD\u4ED6\u4EBA\u3002",
      readings: [
        {
          char: "\u656C",
          pinyin: "j\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u656C",
          dictionarySense: "\u614E\u91CD\u3001\u606D\u656C\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u614E",
          pinyin: "sh\xE8n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u614E",
          dictionarySense: "\u5C0F\u5FC3\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u6709\u6210",
      ruleId: "naming-v5-proposal-shijing-227-5-67096210",
      citation: {
        id: "shijing-227-5",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u9C7C\u85FB\u4E4B\u4EC0\xB7\u9ECD\u82D7 \u7B2C5\u7AE0",
        text: "\u539F\u96B0\u65E2\u5E73\uFF0C\u6CC9\u6D41\u65E2\u6E05\u3002\u53EC\u4F2F\u6709\u6210\uFF0C\u738B\u5FC3\u5219\u5B81\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u53EC\u4F2F\u6709\u6210\uFF0C\u738B\u5FC3\u5219\u5B81",
      extraction: "continuous",
      context: "\u524D\u6587\u5199\u8425\u5EFA\u3001\u52B3\u4F5C\u548C\u6574\u6CBB\uFF0C\u672B\u6BB5\u79F0\u53EC\u4F2F\u5DE5\u4F5C\u6709\u6240\u5B8C\u6210\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u53D6\u505A\u4E8B\u6709\u6210\u7684\u5BB6\u5EAD\u671F\u8BB8\uFF0C\u4E0D\u4FDD\u8BC1\u6210\u529F\u3001\u529F\u4E1A\u6216\u5B98\u4F4D\u3002",
      meaning: "\u613F\u5B69\u5B50\u8E0F\u5B9E\u505A\u4E8B\u3001\u91CD\u89C6\u5B8C\u6210\u4E0E\u79EF\u7D2F\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u524D\u6587\u5199\u8425\u5EFA\u3001\u52B3\u4F5C\u548C\u6574\u6CBB\uFF0C\u672B\u6BB5\u79F0\u53EC\u4F2F\u5DE5\u4F5C\u6709\u6240\u5B8C\u6210\u3002\uFF09",
      sourceMeaning: "\u524D\u6587\u5199\u8425\u5EFA\u3001\u52B3\u4F5C\u548C\u6574\u6CBB\uFF0C\u672B\u6BB5\u79F0\u53EC\u4F2F\u5DE5\u4F5C\u6709\u6240\u5B8C\u6210\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8E0F\u5B9E\u505A\u4E8B\u3001\u91CD\u89C6\u5B8C\u6210\u4E0E\u79EF\u7D2F\u3002",
      readings: [
        {
          char: "\u6709",
          pinyin: "y\u01D2u",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u6709",
          dictionarySense: "\u8868\u4E8B\u5BE6\u3001\u72C0\u6CC1\u7684\u6B63\u9762\u5B58\u5728\uFF0C\u8207\u300C\u7121\u300D\u76F8\u5C0D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u6210",
          pinyin: "ch\xE9ng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u6210",
          dictionarySense: "\u505A\u597D\u4E8B\u60C5\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u707C\u707C",
      ruleId: "naming-v5-proposal-shijing-6-1-707c707c",
      citation: {
        id: "shijing-6-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u5468\u5357\xB7\u6843\u592D \u7B2C1\u7AE0",
        text: "\u6843\u4E4B\u592D\u592D\uFF0C\u707C\u707C\u5176\u534E\u3002\u4E4B\u5B50\u4E8E\u5F52\uFF0C\u5B9C\u5176\u5BA4\u5BB6\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u6843\u4E4B\u592D\u592D\uFF0C\u707C\u707C\u5176\u534E",
      extraction: "continuous",
      context: "\u6843\u592D\u5A5A\u5AC1\u8BED\u5883\u4E2D\u5199\u6843\u82B1\u660E\u8273\uFF1B\u707C\u707C\u63CF\u5199\u82B1\u7684\u660E\u4EAE\u9C9C\u660E\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u5C06\u707C\u89E3\u91CA\u6210\u706B\u70E7\u800C\u63A8\u4E94\u884C\u8865\u706B\uFF0C\u4E5F\u4E0D\u4FDD\u8BC1\u5A5A\u604B\uFF1B\u53E0\u5B57\u9002\u914D\u9700\u7531\u5BB6\u5EAD\u9009\u62E9\u3002",
      meaning: "\u501F\u82B1\u5F00\u660E\u8273\u7684\u610F\u8C61\uFF0C\u5BC4\u671B\u660E\u6717\u3001\u73CD\u60DC\u751F\u6D3B\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u6843\u592D\u5A5A\u5AC1\u8BED\u5883\u4E2D\u5199\u6843\u82B1\u660E\u8273\uFF1B\u707C\u707C\u63CF\u5199\u82B1\u7684\u660E\u4EAE\u9C9C\u660E\u3002\uFF09",
      sourceMeaning: "\u6843\u592D\u5A5A\u5AC1\u8BED\u5883\u4E2D\u5199\u6843\u82B1\u660E\u8273\uFF1B\u707C\u707C\u63CF\u5199\u82B1\u7684\u660E\u4EAE\u9C9C\u660E\u3002",
      projectWish: "\u501F\u82B1\u5F00\u660E\u8273\u7684\u610F\u8C61\uFF0C\u5BC4\u671B\u660E\u6717\u3001\u73CD\u60DC\u751F\u6D3B\u3002",
      readings: [
        {
          char: "\u707C",
          pinyin: "zhu\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u707C",
          dictionarySense: "\u660E\u986F\u3001\u660E\u4EAE\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u707C",
          pinyin: "zhu\xF3",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u707C",
          dictionarySense: "\u660E\u986F\u3001\u660E\u4EAE\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        }
      ]
    },
    {
      name: "\u9752\u9752",
      ruleId: "naming-v5-proposal-shijing-91-1-97529752",
      citation: {
        id: "shijing-91-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u5B50\u887F \u7B2C1\u7AE0",
        text: "\u9752\u9752\u5B50\u887F\uFF0C\u60A0\u60A0\u6211\u5FC3\u3002\u7EB5\u6211\u4E0D\u5F80\uFF0C\u5B50\u5B81\u4E0D\u55E3\u97F3\uFF1F",
        sourceId: "shijing"
      },
      excerpt: "\u9752\u9752\u5B50\u887F\uFF0C\u60A0\u60A0\u6211\u5FC3",
      extraction: "continuous",
      context: "\u63CF\u5199\u5BF9\u65B9\u8863\u9886\u7684\u9752\u8272\uFF0C\u7EE7\u800C\u5199\u7EF5\u957F\u601D\u5FF5\uFF1B\u5168\u7BC7\u542B\u672A\u89C1\u5BF9\u65B9\u7684\u60C6\u6005\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u8BF4\u539F\u53E5\u5C31\u662F\u9752\u6625\u3001\u5E0C\u671B\u6216\u6027\u683C\u5F00\u6717\uFF1B\u4E0D\u5F3A\u884C\u65AD\u5B9A\u56FA\u5B9A\u9752\u8272\u5FC5\u662F\u54EA\u79CD\u73B0\u4EE3\u8272\u53F7\u3002",
      meaning: "\u501F\u9752\u8272\u6E05\u65B0\u7684\u5BA1\u7F8E\u8054\u60F3\uFF0C\u5BC4\u671B\u771F\u8BDA\u3001\u73CD\u91CD\u60C5\u8C0A\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u63CF\u5199\u5BF9\u65B9\u8863\u9886\u7684\u9752\u8272\uFF0C\u7EE7\u800C\u5199\u7EF5\u957F\u601D\u5FF5\uFF1B\u5168\u7BC7\u542B\u672A\u89C1\u5BF9\u65B9\u7684\u60C6\u6005\u3002\uFF09",
      sourceMeaning: "\u63CF\u5199\u5BF9\u65B9\u8863\u9886\u7684\u9752\u8272\uFF0C\u7EE7\u800C\u5199\u7EF5\u957F\u601D\u5FF5\uFF1B\u5168\u7BC7\u542B\u672A\u89C1\u5BF9\u65B9\u7684\u60C6\u6005\u3002",
      projectWish: "\u501F\u9752\u8272\u6E05\u65B0\u7684\u5BA1\u7F8E\u8054\u60F3\uFF0C\u5BC4\u671B\u771F\u8BDA\u3001\u73CD\u91CD\u60C5\u8C0A\u3002",
      readings: [
        {
          char: "\u9752",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u9752",
          dictionarySense: "\u984F\u8272\uFF1A(1) \u7DA0\u8272\u3002\u5510\uFF0E\u5289\u79B9\u932B\u3008\u964B\u5BA4\u9298\u3009\uFF1A\u300C\u8349\u8272\u5165\u7C3E\u9752\u3002\u300D(2) \u85CD\u8272\u3002\u300A\u8340\u5B50\uFF0E\u52F8\u5B78\u300B\uFF1A\u300C\u9752\u53D6\u4E4B\u65BC\u85CD\uFF0C\u800C\u9752\u65BC\u85CD\u3002\u300D(3) \u9ED1\u8272\u3002\u5982\uFF1A\u300C\u7384\u9752\u300D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u9752",
          pinyin: "q\u012Bng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u9752",
          dictionarySense: "\u984F\u8272\uFF1A(1) \u7DA0\u8272\u3002\u5510\uFF0E\u5289\u79B9\u932B\u3008\u964B\u5BA4\u9298\u3009\uFF1A\u300C\u8349\u8272\u5165\u7C3E\u9752\u3002\u300D(2) \u85CD\u8272\u3002\u300A\u8340\u5B50\uFF0E\u52F8\u5B78\u300B\uFF1A\u300C\u9752\u53D6\u4E4B\u65BC\u85CD\uFF0C\u800C\u9752\u65BC\u85CD\u3002\u300D(3) \u9ED1\u8272\u3002\u5982\uFF1A\u300C\u7384\u9752\u300D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u7FF0\u98DE",
      ruleId: "naming-v5-proposal-shijing-196-1-7ff098de",
      citation: {
        id: "shijing-196-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5C0F\u96C5\xB7\u8282\u5357\u5C71\u4E4B\u4EC0\xB7\u5C0F\u5B9B \u7B2C1\u7AE0",
        text: "\u5B9B\u5F7C\u9E23\u9E20\uFF0C\u7FF0\u98DE\u623E\u5929\u3002\u6211\u5FC3\u5FE7\u4F24\uFF0C\u5FF5\u6614\u5148\u4EBA\u3002\u660E\u53D1\u4E0D\u5BD0\uFF0C\u6709\u6000\u4E8C\u4EBA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5B9B\u5F7C\u9E23\u9E20\uFF0C\u7FF0\u98DE\u623E\u5929",
      extraction: "continuous",
      context: "\u5148\u5199\u9E23\u9E20\u9AD8\u98DE\uFF0C\u968F\u5373\u5199\u5FE7\u4F24\u5FF5\u5148\u4EBA\uFF1B\u5168\u7BC7\u8FD8\u529D\u8282\u996E\u3001\u656C\u4EEA\u3001\u6BCB\u5FDD\u6240\u751F\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u7FF0\u53D6\u672C\u53E5\u9AD8\u98DE\u4E49\uFF0C\u4E0D\u6539\u6210\u6587\u7AE0\u6216\u6BDB\u7B14\uFF1B\u4E0D\u628A\u5168\u7BC7\u5FE7\u6212\u5305\u88C5\u6210\u5E86\u529F\u6216\u4FDD\u8BC1\u817E\u8FBE\u3002",
      meaning: "\u501F\u9AD8\u98DE\u7684\u52A8\u6001\u5F62\u8C61\uFF0C\u5BC4\u671B\u5F00\u9614\u773C\u754C\u5E76\u81EA\u52C9\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u5148\u5199\u9E23\u9E20\u9AD8\u98DE\uFF0C\u968F\u5373\u5199\u5FE7\u4F24\u5FF5\u5148\u4EBA\uFF1B\u5168\u7BC7\u8FD8\u529D\u8282\u996E\u3001\u656C\u4EEA\u3001\u6BCB\u5FDD\u6240\u751F\u3002\uFF09",
      sourceMeaning: "\u5148\u5199\u9E23\u9E20\u9AD8\u98DE\uFF0C\u968F\u5373\u5199\u5FE7\u4F24\u5FF5\u5148\u4EBA\uFF1B\u5168\u7BC7\u8FD8\u529D\u8282\u996E\u3001\u656C\u4EEA\u3001\u6BCB\u5FDD\u6240\u751F\u3002",
      projectWish: "\u501F\u9AD8\u98DE\u7684\u52A8\u6001\u5F62\u8C61\uFF0C\u5BC4\u671B\u5F00\u9614\u773C\u754C\u5E76\u81EA\u52C9\u3002",
      readings: [
        {
          char: "\u7FF0",
          pinyin: "h\xE0n",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u7FF0",
          dictionarySense: "\u9AD8\u98DB\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 8
        },
        {
          char: "\u98DE",
          pinyin: "f\u0113i",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u98DB",
          dictionarySense: "\u9CE5\u985E\u53CA\u6606\u87F2\u985E\u6216\u822A\u7A7A\u6A5F\u68B0\u9A30\u884C\u65BC\u7A7A\u4E2D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u4EE4\u671B",
      ruleId: "naming-v5-proposal-shijing-252-6-4ee4671b",
      citation: {
        id: "shijing-252-6",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u751F\u6C11\u4E4B\u4EC0\xB7\u5377\u963F \u7B2C6\u7AE0",
        text: "\u9899\u9899\u536C\u536C\uFF0C\u5982\u572D\u5982\u748B\uFF0C\u4EE4\u95FB\u4EE4\u671B\u3002\u5C82\u5F1F\u541B\u5B50\uFF0C\u56DB\u65B9\u4E3A\u7EB2\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u4EE4\u95FB\u4EE4\u671B",
      extraction: "continuous",
      context: "\u4EE4\u671B\u79F0\u7F8E\u597D\u7684\u540D\u671B\uFF0C\u4E0E\u5982\u572D\u5982\u748B\u7B49\u8D5E\u5199\u5E76\u5217\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u671B\u53D6\u540D\u671B\uFF0C\u4E0D\u8BF4\u672C\u53E5\u662F\u8FDC\u671B\u6216\u613F\u671B\uFF1B\u4E0D\u4FDD\u8BC1\u5C06\u6765\u6709\u540D\u3002",
      meaning: "\u613F\u5B69\u5B50\u73CD\u60DC\u58F0\u8A89\uFF0C\u4EE5\u5B9E\u5728\u7684\u54C1\u884C\u5F85\u4EBA\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u4EE4\u671B\u79F0\u7F8E\u597D\u7684\u540D\u671B\uFF0C\u4E0E\u5982\u572D\u5982\u748B\u7B49\u8D5E\u5199\u5E76\u5217\u3002\uFF09",
      sourceMeaning: "\u4EE4\u671B\u79F0\u7F8E\u597D\u7684\u540D\u671B\uFF0C\u4E0E\u5982\u572D\u5982\u748B\u7B49\u8D5E\u5199\u5E76\u5217\u3002",
      projectWish: "\u613F\u5B69\u5B50\u73CD\u60DC\u58F0\u8A89\uFF0C\u4EE5\u5B9E\u5728\u7684\u54C1\u884C\u5F85\u4EBA\u3002",
      readings: [
        {
          char: "\u4EE4",
          pinyin: "l\xECng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4EE4",
          dictionarySense: "\u597D\u7684\u3001\u5584\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 6
        },
        {
          char: "\u671B",
          pinyin: "w\xE0ng",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u671B",
          dictionarySense: "\u540D\u8B7D\u3001\u540D\u8072\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 6
        }
      ]
    },
    {
      name: "\u7EF4\u65B0",
      ruleId: "naming-v5-proposal-shijing-235-1-7ef465b0",
      citation: {
        id: "shijing-235-1",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u6587\u738B\u4E4B\u4EC0\xB7\u6587\u738B \u7B2C1\u7AE0",
        text: "\u6587\u738B\u5728\u4E0A\uFF0C\u4E8E\u662D\u4E8E\u5929\u3002\u5468\u867D\u65E7\u90A6\uFF0C\u5176\u547D\u7EF4\u65B0\u3002\u6709\u5468\u4E0D\u663E\uFF0C\u5E1D\u547D\u4E0D\u65F6\u3002\u6587\u738B\u965F\u964D\uFF0C\u5728\u5E1D\u5DE6\u53F3\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5468\u867D\u65E7\u90A6\uFF0C\u5176\u547D\u7EF4\u65B0",
      extraction: "continuous",
      context: "\u539F\u8F9E\u5178\u7EF4\u65B0\u590D\u5408\u6761\u76F4\u5F15\u672C\u7BC7\uFF0C\u539F\u6307\u5468\u65BD\u884C\u5584\u653F\u800C\u65B0\u83B7\u5929\u547D\uFF0C\u540E\u6765\u6307\u9769\u65E7\u884C\u65B0\uFF1B\u4E0D\u4F5C\u4E2A\u4EBA\u547D\u8FD0\u9884\u6D4B\u3002 \u5BB6\u5EAD\u671F\u8BB8\u662F\u501F\u66F4\u65B0\u81EA\u52C9\u7684\u73B0\u4EE3\u53D6\u610F\uFF0C\u4E0D\u628A\u7EF4\u53E6\u9644\u4F1A\u6210\u7EF4\u7CFB\u3002",
      meaning: "\u501F\u66F4\u65B0\u81EA\u52C9\u7684\u8054\u60F3\uFF0C\u5BC4\u671B\u613F\u5B66\u3001\u613F\u6539\u8FDB\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u8BED\u5883\uFF1A\u539F\u8F9E\u5178\u7EF4\u65B0\u590D\u5408\u6761\u76F4\u5F15\u672C\u7BC7\uFF0C\u539F\u6307\u5468\u65BD\u884C\u5584\u653F\u800C\u65B0\u83B7\u5929\u547D\uFF0C\u540E\u6765\u6307\u9769\u65E7\u884C\u65B0\uFF1B\u4E0D\u4F5C\u4E2A\u4EBA\u547D\u8FD0\u9884\u6D4B\u3002\uFF09",
      sourceMeaning: "\u539F\u8F9E\u5178\u7EF4\u65B0\u590D\u5408\u6761\u76F4\u5F15\u672C\u7BC7\uFF0C\u539F\u6307\u5468\u65BD\u884C\u5584\u653F\u800C\u65B0\u83B7\u5929\u547D\uFF0C\u540E\u6765\u6307\u9769\u65E7\u884C\u65B0\uFF1B\u4E0D\u4F5C\u4E2A\u4EBA\u547D\u8FD0\u9884\u6D4B\u3002",
      projectWish: "\u501F\u66F4\u65B0\u81EA\u52C9\u7684\u8054\u60F3\uFF0C\u5BC4\u671B\u613F\u5B66\u3001\u613F\u6539\u8FDB\u3002",
      readings: [
        {
          char: "\u7EF4",
          pinyin: "w\xE9i",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u7DAD",
          dictionarySense: "\u7F6E\u65BC\u53E5\u9996\u6216\u53E5\u4E2D\u7684\u8A9E\u6C23\u8A5E\uFF0C\u7121\u7FA9\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 8
        },
        {
          char: "\u65B0",
          pinyin: "x\u012Bn",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u65B0",
          dictionarySense: "\u6539\u9032\u6216\u4F7F\u6539\u8B8A\uFF0C\u800C\u6210\u70BA\u65B0\u7684\u3001\u597D\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 7
        }
      ]
    },
    {
      name: "\u5B50\u4F69",
      ruleId: "naming-v5-proposal-shijing-91-2-5b504f69",
      citation: {
        id: "shijing-91-2",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u90D1\u98CE\xB7\u5B50\u887F \u7B2C2\u7AE0",
        text: "\u9752\u9752\u5B50\u4F69\uFF0C\u60A0\u60A0\u6211\u601D\u3002\u7EB5\u6211\u4E0D\u5F80\uFF0C\u5B50\u5B81\u4E0D\u6765\uFF1F",
        sourceId: "shijing"
      },
      excerpt: "\u9752\u9752\u5B50\u4F69\uFF0C\u60A0\u60A0\u6211\u601D",
      extraction: "continuous",
      context: "\u601D\u5FF5\u5BF9\u65B9\u7684\u4F69\u9970\uFF1B\u5B50\u5728\u6B64\u6307\u4F60\uFF0C\u4F69\u662F\u4F69\u9970\uFF0C\u4E0D\u662F\u5B50\u5973\u4E0E\u656C\u4F69\u7684\u5408\u4E49\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u4E0D\u628A\u5B50\u6539\u91CA\u6210\u7537\u5B69\u6216\u5723\u8D24\uFF0C\u4E0D\u628A\u4F69\u8BEF\u5F53\u539F\u53E5\u656C\u4F69\uFF1B\u4E0D\u4F5C\u6027\u522B\u9650\u5236\u3002",
      meaning: "\u501F\u4F69\u9970\u53EF\u73CD\u3001\u60C5\u8C0A\u53EF\u5FF5\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u73CD\u60DC\u4EBA\u4E0E\u7269\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u601D\u5FF5\u5BF9\u65B9\u7684\u4F69\u9970\uFF1B\u5B50\u5728\u6B64\u6307\u4F60\uFF0C\u4F69\u662F\u4F69\u9970\uFF0C\u4E0D\u662F\u5B50\u5973\u4E0E\u656C\u4F69\u7684\u5408\u4E49\u3002\uFF09",
      sourceMeaning: "\u601D\u5FF5\u5BF9\u65B9\u7684\u4F69\u9970\uFF1B\u5B50\u5728\u6B64\u6307\u4F60\uFF0C\u4F69\u662F\u4F69\u9970\uFF0C\u4E0D\u662F\u5B50\u5973\u4E0E\u656C\u4F69\u7684\u5408\u4E49\u3002",
      projectWish: "\u501F\u4F69\u9970\u53EF\u73CD\u3001\u60C5\u8C0A\u53EF\u5FF5\u7684\u6587\u5316\u8054\u60F3\uFF0C\u5BC4\u671B\u73CD\u60DC\u4EBA\u4E0E\u7269\u3002",
      readings: [
        {
          char: "\u5B50",
          pinyin: "z\u01D0",
          tone: 3,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B50",
          dictionarySense: "\u4F60\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 13
        },
        {
          char: "\u4F69",
          pinyin: "p\xE8i",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u4F69",
          dictionarySense: "\u53E4\u4EBA\u7E6B\u5728\u8170\u5E36\u4E0A\u7684\u4E00\u7A2E\u88DD\u98FE\u54C1\u3002\u5982\uFF1A\u300C\u7389\u4F69\u300D\u3002\u300A\u8A69\u7D93\uFF0E\u912D\u98A8\uFF0E\u5973\u66F0\u96DE\u9CF4\u300B\uFF1A\u300C\u77E5\u5B50\u4E4B\u4F86  \u4E4B\uFF0C\u96DC\u4F69\u4EE5\u8D08\u4E4B\u3002\u300D\u4E5F\u4F5C\u300C\u73EE\u300D\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u96CD\u96CD",
      ruleId: "naming-v5-proposal-shijing-240-3-96cd96cd",
      citation: {
        id: "shijing-240-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u6587\u738B\u4E4B\u4EC0\xB7\u601D\u9F50 \u7B2C3\u7AE0",
        text: "\u96CD\u96CD\u5728\u5BAB\uFF0C\u8083\u8083\u5728\u5E99\u3002\u4E0D\u663E\u4EA6\u4E34\uFF0C\u65E0\u5C04\u4EA6\u4FDD\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u96CD\u96CD\u5728\u5BAB\uFF0C\u8083\u8083\u5728\u5E99",
      extraction: "continuous",
      context: "\u4EE5\u96CD\u96CD\u5F62\u5BB9\u5728\u5BAB\u7684\u548C\u987A\uFF0C\u4E0E\u5728\u5E99\u8083\u8083\u7684\u606D\u656C\u5E76\u4E3E\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\u3002\u53E0\u5B57\u540C\u97F3\u9700\u8FDE\u8BFB\u590D\u6838\uFF1B\u4E0D\u628A\u96CD\u96CD\u5F53\u5EB8\u5EB8\u6216\u4EE5\u53E4\u4EE3\u5BAB\u5E99\u8EAB\u4EFD\u4F5C\u5730\u4F4D\u4FDD\u8BC1\u3002",
      meaning: "\u613F\u5B69\u5B50\u6E29\u539A\u548C\u5584\u3001\u5F85\u4EBA\u6709\u793C\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u4EE5\u96CD\u96CD\u5F62\u5BB9\u5728\u5BAB\u7684\u548C\u987A\uFF0C\u4E0E\u5728\u5E99\u8083\u8083\u7684\u606D\u656C\u5E76\u4E3E\u3002\uFF09",
      sourceMeaning: "\u4EE5\u96CD\u96CD\u5F62\u5BB9\u5728\u5BAB\u7684\u548C\u987A\uFF0C\u4E0E\u5728\u5E99\u8083\u8083\u7684\u606D\u656C\u5E76\u4E3E\u3002",
      projectWish: "\u613F\u5B69\u5B50\u6E29\u539A\u548C\u5584\u3001\u5F85\u4EBA\u6709\u793C\u3002",
      readings: [
        {
          char: "\u96CD",
          pinyin: "y\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u96CD",
          dictionarySense: "\u548C\u8AE7\u7684\u3001\u548C\u7766\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        },
        {
          char: "\u96CD",
          pinyin: "y\u014Dng",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u96CD",
          dictionarySense: "\u548C\u8AE7\u7684\u3001\u548C\u7766\u7684\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u514B\u660E",
      ruleId: "naming-v5-proposal-shijing-241-7-514b660e",
      citation: {
        id: "shijing-241-7",
        title: "\u8BD7\u7ECF",
        chapter: "\u5927\u96C5\xB7\u6587\u738B\u4E4B\u4EC0\xB7\u7687\u77E3 \u7B2C7\u7AE0",
        text: "\u7EF4\u6B64\u738B\u5B63\uFF0C\u5E1D\u5EA6\u5176\u5FC3\u3002\u8C8A\u5176\u5FB7\u97F3\uFF0C\u5176\u5FB7\u514B\u660E\u3002\u514B\u660E\u514B\u7C7B\uFF0C\u514B\u957F\u514B\u541B\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u5176\u5FB7\u514B\u660E\u3002\u514B\u660E\u514B\u7C7B",
      extraction: "continuous",
      context: "\u539F\u8F9E\u5178\u590D\u5408\u6761\u514B\u660E\u76F4\u5F15\u672C\u7BC7\uFF0C\u91CA\u80FD\u591F\u660E\u5BDF\u662F\u975E\uFF1B\u514B\u53D6\u80FD\uFF0C\u660E\u53D6\u901A\u6653\u3001\u660E\u8FA8\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\uFF1B\u4E0D\u5C06\u514B\u89E3\u91CA\u4E3A\u653B\u514B\uFF0C\u4E0D\u7531\u541B\u5FB7\u63A8\u65AD\u5B69\u5B50\u8EAB\u4EFD\u6216\u547D\u8FD0\u3002",
      meaning: "\u613F\u5B69\u5B50\u8BA4\u771F\u6C42\u77E5\u3001\u660E\u8FA8\u662F\u975E\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u9009\u4E49\uFF1A\u539F\u8F9E\u5178\u590D\u5408\u6761\u514B\u660E\u76F4\u5F15\u672C\u7BC7\uFF0C\u91CA\u80FD\u591F\u660E\u5BDF\u662F\u975E\uFF1B\u514B\u53D6\u80FD\uFF0C\u660E\u53D6\u901A\u6653\u3001\u660E\u8FA8\u3002\uFF09",
      sourceMeaning: "\u539F\u8F9E\u5178\u590D\u5408\u6761\u514B\u660E\u76F4\u5F15\u672C\u7BC7\uFF0C\u91CA\u80FD\u591F\u660E\u5BDF\u662F\u975E\uFF1B\u514B\u53D6\u80FD\uFF0C\u660E\u53D6\u901A\u6653\u3001\u660E\u8FA8\u3002",
      projectWish: "\u613F\u5B69\u5B50\u8BA4\u771F\u6C42\u77E5\u3001\u660E\u8FA8\u662F\u975E\u3002",
      readings: [
        {
          char: "\u514B",
          pinyin: "k\xE8",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u524B",
          dictionarySense: "\u80FD\u5920\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 6
        },
        {
          char: "\u660E",
          pinyin: "m\xEDng",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u660E",
          dictionarySense: "\u901A\u66C9\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u9042\u5FD7",
      ruleId: "naming-v5-proposal-zhouyi-47-xiang-90425fd7",
      citation: {
        id: "zhouyi-47-xiang",
        title: "\u5468\u6613\xB7\u8C61\u4F20",
        chapter: "\u7B2C47\u5366\xB7\u6CFD\u6C34\u56F0\xB7\u5927\u8C61",
        text: "\u6CFD\u65E0\u6C34\uFF0C\u56F0\u3002\u541B\u5B50\u4EE5\u81F4\u547D\u9042\u5FD7\u3002",
        sourceId: "zhouyi"
      },
      excerpt: "\u541B\u5B50\u4EE5\u81F4\u547D\u9042\u5FD7",
      extraction: "continuous",
      context: "\u539F\u5927\u8C61\u4EE5\u56F0\u5883\u4E2D\u7684\u547D\u4E0E\u5FD7\u7684\u53D6\u820D\u4E3A\u80CC\u666F\uFF0C\u9042\u5FD7\u53D6\u8FBE\u6210\u6240\u5FD7\uFF1B\u4E0D\u80FD\u7B80\u5316\u4E3A\u65E0\u6761\u4EF6\u6210\u529F\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\uFF0C\u4E0D\u4F5C\u6210\u529F\u3001\u4EBA\u683C\u6216\u8FD0\u52BF\u4FDD\u8BC1\u3002",
      meaning: "\u613F\u5B69\u5B50\u5728\u56F0\u96BE\u65F6\u5B88\u4F4F\u6240\u5FD7\u3001\u575A\u97E7\u81EA\u6301\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u8BED\u5883\uFF1A\u539F\u5927\u8C61\u4EE5\u56F0\u5883\u4E2D\u7684\u547D\u4E0E\u5FD7\u7684\u53D6\u820D\u4E3A\u80CC\u666F\uFF0C\u9042\u5FD7\u53D6\u8FBE\u6210\u6240\u5FD7\uFF1B\u4E0D\u80FD\u7B80\u5316\u4E3A\u65E0\u6761\u4EF6\u6210\u529F\u3002\uFF09",
      sourceMeaning: "\u539F\u5927\u8C61\u4EE5\u56F0\u5883\u4E2D\u7684\u547D\u4E0E\u5FD7\u7684\u53D6\u820D\u4E3A\u80CC\u666F\uFF0C\u9042\u5FD7\u53D6\u8FBE\u6210\u6240\u5FD7\uFF1B\u4E0D\u80FD\u7B80\u5316\u4E3A\u65E0\u6761\u4EF6\u6210\u529F\u3002",
      projectWish: "\u613F\u5B69\u5B50\u5728\u56F0\u96BE\u65F6\u5B88\u4F4F\u6240\u5FD7\u3001\u575A\u97E7\u81EA\u6301\u3002",
      readings: [
        {
          char: "\u9042",
          pinyin: "su\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u9042",
          dictionarySense: "\u6210\u529F\u3001\u6210\u5C31\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 2
        },
        {
          char: "\u5FD7",
          pinyin: "zh\xEC",
          tone: 4,
          sourceId: "moe-revised",
          dictionaryWord: "\u5FD7",
          dictionarySense: "\u610F\u5411\u3001\u62B1\u8CA0\u3001\u6C7A\u5FC3\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    },
    {
      name: "\u5BB6\u5B9C",
      ruleId: "naming-v5-proposal-shijing-6-3-5bb65b9c",
      citation: {
        id: "shijing-6-3",
        title: "\u8BD7\u7ECF",
        chapter: "\u56FD\u98CE\xB7\u5468\u5357\xB7\u6843\u592D \u7B2C3\u7AE0",
        text: "\u6843\u4E4B\u592D\u592D\uFF0C\u5176\u53F6\u84C1\u84C1\u3002\u4E4B\u5B50\u4E8E\u5F52\uFF0C\u5B9C\u5176\u5BB6\u4EBA\u3002",
        sourceId: "shijing"
      },
      excerpt: "\u4E4B\u5B50\u4E8E\u5F52\uFF0C\u5B9C\u5176\u5BB6\u4EBA",
      extraction: "recombined",
      context: "\u5A5A\u5AC1\u8BD7\u4EE5\u53F6\u76DB\u8D77\u5174\uFF0C\u795D\u613F\u51FA\u5AC1\u8005\u4F7F\u5BB6\u4EBA\u76F8\u5904\u548C\u987A\uFF1B\u5BB6\u5B9C\u4E3A\u540C\u53E5\u9009\u5B57\u91CD\u7EC4\u3002 \u5BB6\u5B9C\u662F\u540C\u4E00\u53E5\u9009\u5B57\u91CD\u7EC4\uFF0C\u5E76\u975E\u539F\u6587\u8FDE\u7EED\u4E8C\u5B57\u3002 \u5BB6\u5EAD\u671F\u8BB8\u5C5E\u4E8E\u9879\u76EE\u539F\u521B\u5F15\u7533\uFF0C\u4E0D\u4F5C\u6210\u529F\u3001\u4EBA\u683C\u6216\u8FD0\u52BF\u4FDD\u8BC1\u3002",
      meaning: "\u613F\u5B69\u5B50\u73CD\u60DC\u5BB6\u5EAD\u60C5\u8C0A\u3001\u4E0E\u4EBA\u548C\u7766\u76F8\u5904\u3002\uFF08\u9879\u76EE\u539F\u521B\u5BB6\u5EAD\u671F\u8BB8\uFF1B\u539F\u6587\u8BED\u5883\uFF1A\u5A5A\u5AC1\u8BD7\u4EE5\u53F6\u76DB\u8D77\u5174\uFF0C\u795D\u613F\u51FA\u5AC1\u8005\u4F7F\u5BB6\u4EBA\u76F8\u5904\u548C\u987A\uFF1B\u5BB6\u5B9C\u4E3A\u540C\u53E5\u9009\u5B57\u91CD\u7EC4\u3002\uFF09",
      sourceMeaning: "\u5A5A\u5AC1\u8BD7\u4EE5\u53F6\u76DB\u8D77\u5174\uFF0C\u795D\u613F\u51FA\u5AC1\u8005\u4F7F\u5BB6\u4EBA\u76F8\u5904\u548C\u987A\uFF1B\u5BB6\u5B9C\u4E3A\u540C\u53E5\u9009\u5B57\u91CD\u7EC4\u3002",
      projectWish: "\u613F\u5B69\u5B50\u73CD\u60DC\u5BB6\u5EAD\u60C5\u8C0A\u3001\u4E0E\u4EBA\u548C\u7766\u76F8\u5904\u3002",
      readings: [
        {
          char: "\u5BB6",
          pinyin: "ji\u0101",
          tone: 1,
          sourceId: "moe-revised",
          dictionaryWord: "\u5BB6",
          dictionarySense: "\u4E00\u9580\u4E4B\u5167\u5171\u540C\u751F\u6D3B\u7684\u4EBA\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 1
        },
        {
          char: "\u5B9C",
          pinyin: "y\xED",
          tone: 2,
          sourceId: "moe-revised",
          dictionaryWord: "\u5B9C",
          dictionarySense: "\u76F8\u5B89\u3001\u548C\u9806\u3002",
          rawHeteronymIndex: 0,
          rawDefinitionIndex: 0
        }
      ]
    }
  ]
};

// src/shared/character-reading.ts
function selectedMeaningBelongsToReading(meaning, definitions) {
  const matches = (remaining, used, depth) => depth < 3 && definitions.some((definition) => !used.has(definition) && (remaining === definition || remaining.startsWith(definition + "\uFF1B") && matches(remaining.slice(definition.length + 1), /* @__PURE__ */ new Set([...used, definition]), depth + 1)));
  return typeof meaning === "string" && definitions.every((definition) => typeof definition === "string") && matches(meaning, /* @__PURE__ */ new Set(), 0);
}

// src/domain/naming-semantics-v5.ts
function hasReviewedReadingFromBindings(entry, bindings2) {
  return matchesReviewedReading(entry, bindings2[entry.char]);
}
function createCitationReadingGateV5(v4Table, ownedV5) {
  const overrides3 = ownedV5.characterOverrides;
  const corrected2 = new Map(overrides3.map(({ char, after }) => {
    const reading = after.readings?.find((reading2) => reading2.pinyin === after.pinyin && reading2.tone === after.tone && reading2.sourceId === after.sourceId && selectedMeaningBelongsToReading(after.meaning, reading2.meanings));
    if (!reading) throw new Error("5.0\u56FA\u5B9A\u7EA0\u9519\u7F3A\u5C11\u540C\u8BCD\u6761\u7684\u5B8C\u6574\u8BFB\u97F3\u4E49\u9879\u3002");
    return [char, { char, pinyin: reading.pinyin, tone: reading.tone, sourceId: reading.sourceId, dictionaryWord: reading.word }];
  }));
  const bindings2 = { ...v4Table.characterReadings, ...Object.fromEntries(corrected2) };
  return {
    matchesReviewedReading,
    hasReviewedProjectReading: (entry) => hasReviewedReadingFromBindings(entry, bindings2),
    readDependencies: () => ({ v4Table, v5Table: ownedV5, overrides: overrides3, corrected: corrected2, bindings: bindings2 })
  };
}
var liveCitationReadingGate5 = createCitationReadingGateV5(naming_editorial_v4_default, naming_editorial_v5_default);
var { overrides, corrected, bindings } = liveCitationReadingGate5.readDependencies();
var rewrite = (values) => values.map((binding) => corrected.has(binding.char ?? "") ? { ...binding, ...corrected.get(binding.char) } : binding);
function readLiveCitationReadingDependenciesV5() {
  return liveCitationReadingGate5.readDependencies();
}
var senses = Object.fromEntries(Object.entries(naming_editorial_v4_default.defaultSenseMap).map(([char, value]) => [char, { ...value, readings: rewrite(value.readings) }]));
var combinations = Object.fromEntries(Object.entries(naming_editorial_v4_default.combinations).map(([name, value]) => [name, { ...value, readings: rewrite(value.readings) }]));
var pairs = new Map(naming_editorial_v4_default.naturalPairs.map((pair) => [pair.name, { ...pair, readings: rewrite(pair.readings) }]));
var projectTags = new Set(naming_editorial_v4_default.projectTags);
function matchesReviewedReading(entry, binding) {
  return !!binding && !!binding.pinyin && binding.pinyin === entry.pinyin && binding.tone === entry.tone && binding.sourceId === entry.sourceId && !!binding.dictionaryWord && !!entry.readings?.some((reading) => reading.pinyin === binding.pinyin && reading.tone === binding.tone && reading.sourceId === binding.sourceId && reading.word === binding.dictionaryWord && selectedMeaningBelongsToReading(entry.meaning, reading.meanings) && (binding.dictionarySense === void 0 || reading.meanings.includes(binding.dictionarySense)));
}
function hasReviewedProjectReading(entry) {
  return liveCitationReadingGate5.hasReviewedProjectReading(entry);
}
function hasBaselinePronunciation(entry) {
  return bindings[entry.char]?.pinyin === entry.pinyin && bindings[entry.char]?.tone === entry.tone;
}
function allReadings(readings, entries) {
  return readings.length === entries.length && readings.every((binding, index) => binding.char === entries[index].char && matchesReviewedReading(entries[index], binding));
}
function reviewedNamingSense(entry) {
  const sense = senses[entry.char];
  return sense?.status === "bound-default-reading" && allReadings(sense.readings, [entry]) ? sense.meaning : void 0;
}
function reviewedNamingCombination(name, entries) {
  const combination = combinations[name];
  return combination?.status === "bound-default-reading" && allReadings(combination.readings, entries) ? combination.meaning : void 0;
}
function hasReviewedNaturalPair(name, entries) {
  const pair = pairs.get(name);
  return pair?.status === "bound-default-reading" && allReadings(pair.readings, entries);
}
function semanticTagsForReading(entry) {
  return hasReviewedProjectReading(entry) ? entry.tags : entry.tags.filter((tag) => !projectTags.has(tag));
}
function currentCharacterWarning(entry) {
  if (hasReviewedProjectReading(entry)) return entry.warning;
  const warning = entry.warning.replace(/多音字：本方案采用\s+[^，。；;]+[，,]请按姓名用法确认[；;]各读音义项分别保存[。.]?/gu, "").trim();
  return /本方案采用|本方案读/u.test(warning) ? `\u5B57\u5E93\u539F\u5907\u6CE8\uFF08\u5F53\u524D\u8BFB\u97F3\u4E3A${entry.pinyin}\uFF0C\u539F\u9ED8\u8BA4\u8BFB\u97F3\u65AD\u8A00\u4E0D\u9002\u7528\uFF09\uFF1A${warning}` : warning;
}

// src/shared/character-reading-reference.ts
function validReadingReferenceMetadata(reading) {
  try {
    if (!reading || typeof reading !== "object" || Array.isArray(reading)) return false;
    const flag = Object.getOwnPropertyDescriptor(reading, "referenceOnly"), reference = Object.getOwnPropertyDescriptor(reading, "sourceReference");
    if (!flag && !reference) return true;
    if (!flag || !reference || !("value" in flag) || !("value" in reference) || !flag.enumerable || !reference.enumerable || flag.value !== true) return false;
    const value = reference.value;
    if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== 3) return false;
    const values = {};
    for (const key of ["kind", "rawDefinitionIndex", "text"]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return false;
      values[key] = descriptor.value;
    }
    const meanings = Object.getOwnPropertyDescriptor(reading, "meanings");
    const definitions = meanings && "value" in meanings ? meanings.value : void 0;
    if (!Array.isArray(definitions) || Object.getPrototypeOf(definitions) !== Array.prototype || definitions.length !== 1 || Reflect.ownKeys(definitions).length !== 2) return false;
    const definition = Object.getOwnPropertyDescriptor(definitions, "0");
    return values.kind === "dictionary-cross-reference" && Number.isSafeInteger(values.rawDefinitionIndex) && values.rawDefinitionIndex >= 0 && typeof values.text === "string" && values.text.trim().length > 0 && values.text.length <= 2e3 && !/[\u0000-\u001f]/u.test(values.text) && !!definition && "value" in definition && definition.enumerable === true && definition.value === "\u8F9E\u5178\u53C2\u7167\uFF1A" + values.text;
  } catch {
    return false;
  }
}

// src/domain/naming-semantics-v6.ts
function matchesReviewedReadingWithGate5(entry, binding, gate5) {
  if (entry.meaning.trimStart().startsWith("\u8F9E\u5178\u53C2\u7167\uFF1A")) return false;
  return gate5.matchesReviewedReading({ ...entry, readings: entry.readings?.filter((reading) => validReadingReferenceMetadata(reading) && reading.referenceOnly !== true) }, binding);
}
function hasReviewedReadingWithGate5(entry, overrides3, gate5) {
  return !overrides3.has(entry.char) && gate5.hasReviewedProjectReading(entry);
}
function createCitationReadingGateV6(ownedV6, gate5) {
  const overrides3 = new Map(ownedV6.characterOverrides.map((row) => [row.char, row.after]));
  return {
    matchesReviewedReading: (entry, binding) => matchesReviewedReadingWithGate5(entry, binding, gate5),
    hasReviewedProjectReading: (entry) => hasReviewedReadingWithGate5(entry, overrides3, gate5),
    readDependencies: () => ({ v6Table: ownedV6, overrides: overrides3, gate5: gate5.readDependencies() })
  };
}
var liveCitationReadingGate6 = createCitationReadingGateV6(naming_editorial_v6_default, {
  matchesReviewedReading: (entry, binding) => matchesReviewedReading(entry, binding),
  hasReviewedProjectReading: (entry) => hasReviewedProjectReading(entry),
  readDependencies: () => readLiveCitationReadingDependenciesV5()
});
var { overrides: overrides2 } = liveCitationReadingGate6.readDependencies();
function readLiveCitationReadingDependenciesV6() {
  return liveCitationReadingGate6.readDependencies();
}
var projectTags2 = new Set(naming_editorial_v4_default.projectTags);
var senseMigrations = naming_editorial_v6_default.semanticMigrations.defaultSenseMap;
var pairMigrations = new Map(naming_editorial_v6_default.semanticMigrations.naturalPairs.map((row) => [row.name, row.after]));
function matchesReviewedReading2(entry, binding) {
  return liveCitationReadingGate6.matchesReviewedReading(entry, binding);
}
function hasFixedDefaultDictionaryIdentity(entry) {
  const expected = overrides2.get(entry.char);
  if (!expected) return hasReviewedProjectReading(entry);
  const reading = expected.readings?.find((row) => row.pinyin === expected.pinyin && row.tone === expected.tone && row.sourceId === expected.sourceId && selectedMeaningBelongsToReading(expected.meaning, row.meanings));
  return !!reading && matchesReviewedReading2(entry, { char: expected.char, pinyin: expected.pinyin, tone: expected.tone, sourceId: expected.sourceId, dictionaryWord: reading.word });
}
function hasReviewedProjectReading2(entry) {
  return liveCitationReadingGate6.hasReviewedProjectReading(entry);
}
function hasBaselinePronunciation2(entry) {
  const expected = overrides2.get(entry.char);
  return expected ? expected.pinyin === entry.pinyin && expected.tone === entry.tone : hasBaselinePronunciation(entry);
}
function allReadings2(readings, entries) {
  return readings.length === entries.length && readings.every((binding, index) => binding.char === entries[index].char && matchesReviewedReading2(entries[index], binding));
}
function reviewedNamingSense2(entry) {
  if (!overrides2.has(entry.char)) return reviewedNamingSense(entry);
  const reviewed = senseMigrations[entry.char]?.after;
  return reviewed?.status === "bound-default-reading" && allReadings2(reviewed.readings, [entry]) ? reviewed.meaning : void 0;
}
function reviewedNamingSenseConcept(entry) {
  const reviewed = reviewedNamingSense2(entry);
  if (!reviewed) return void 0;
  const migration = naming_editorial_v6_default.semanticMigrations.defaultSenseMap;
  return overrides2.has(entry.char) ? migration[entry.char]?.before.meaning : reviewed;
}
function reviewedNamingCombination2(name, entries) {
  return entries.some((entry) => overrides2.has(entry.char)) ? void 0 : reviewedNamingCombination(name, entries);
}
function hasReviewedNaturalPair2(name, entries) {
  if (!entries.some((entry) => overrides2.has(entry.char))) return hasReviewedNaturalPair(name, entries);
  const reviewed = pairMigrations.get(name);
  return reviewed?.status === "bound-default-reading" && allReadings2(reviewed.readings, entries);
}
function semanticTagsForReading2(entry) {
  return overrides2.has(entry.char) ? entry.tags.filter((tag) => !projectTags2.has(tag)) : semanticTagsForReading(entry);
}
function currentCharacterWarning2(entry) {
  return hasFixedDefaultDictionaryIdentity(entry) ? entry.warning : currentCharacterWarning(entry);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCitationReadingGateV6,
  currentCharacterWarning,
  hasBaselinePronunciation,
  hasFixedDefaultDictionaryIdentity,
  hasReviewedNaturalPair,
  hasReviewedProjectReading,
  matchesReviewedReading,
  readLiveCitationReadingDependenciesV6,
  reviewedNamingCombination,
  reviewedNamingSense,
  reviewedNamingSenseConcept,
  semanticTagsForReading
});
