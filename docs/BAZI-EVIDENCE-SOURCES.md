# 八字事实证据来源与复现

资料配置版本：`bazi-evidence-profile/1.0.0`。这份登记支持藏干、十神以及干支成员关系的核对；不表示月令分日司权、从格、合化或完整调候体系已经实现。

## 固定外部资料

| 来源 ID | 固定来源与提交 | 本次使用范围 |
| --- | --- | --- |
| `bazi-evidence-lunar186` | [6tail/lunar-typescript](https://github.com/6tail/lunar-typescript)，`0f3e95d15e31f1a7c7b93d624542649347328a20`，v1.8.6，MIT | `src/lib/LunarUtil.ts` 的 `ZHI_HIDE_GAN`、`SHI_SHEN`、`HE_GAN_5`、`HE_ZHI_6`；`src/lib/Lunar.ts` 的 `getPrevJie` / `getNextJie` |
| `bazi-evidence-go-ganzhi` | [deminzhang/qimen-go](https://github.com/deminzhang/qimen-go)，`4d3f58fa0f401b5b3a337f119138e99e90685dda`，MIT | `xuan/ganzhi.go` 的 `HeGan`、`HeZhi`、`ChongZhi`、`He3Zhi`、`Hui3Zhi` |

三份源文件及各自完整 MIT 声明按原字节保存在 `data/raw/bazi-evidence-lunar-*` 和 `data/raw/bazi-evidence-go-*`。LunarUtil 的国际化 token 由验证脚本中明确的中文对应表还原，未执行整个源模块，也未复制它的其他宜忌判断。Lunar.ts 固定归档既有十二节区间接口实现；源码字节一致不代表天文交节精度已经由独立算法验证。

来源清单 `data/bazi-evidence-source-lock.json` 记录上游提交、每文件 SHA-256、许可及定位。每来源的汇总哈希为：将按相对路径排序的 `fileHashes` 对象做 `JSON.stringify`，再取 SHA-256。安装时 `loadBaziSources` 先检查固定清单哈希，再验证七个原始文件／规则资料／许可文件的字节及完整许可标志；缺失或改动会阻止把它们登记为当前有效来源。

## 列序、关系与采用边界

- 藏干按 LunarUtil 的原始列序展示。巳为 **丙、庚、戊**；该列序不命名为“当前司权比例”，不直接转换成强弱权重。
- 旧扶抑启发式独立保留 **丙、戊、庚** 和既有权重。新证据层不能因为选定了另一来源列序就暗中改变旧方案或姓名排序；口径差异必须明示。
- 五合为甲己、乙庚、丙辛、丁壬、戊癸；六合仅核成员。两个固定源码的成员表相符，但“出现合”不等于满足化气条件。
- 六冲成员表为子午、丑未、寅申、卯酉、辰戌、巳亥。
- 三合采用申子辰（水组）、寅午戌（火组）、亥卯未（木组）、巳酉丑（金组）；三会采用亥子丑（水组）、寅卯辰（木组）、巳午未（火组）、申酉戌（金组）。括号内是所选表的组属性，不是命局已成化的判断。
- 三合／三会必须具备该组全部不同成员；重复某一支不能补缺项。该核查不判断远近、争合、破合、得令或权重。
- Go 的六合化行注释存在与其他常见表不同的读法，本版不把这些注释拼成化气标准，也不输出五合／六合成化结论。
- 本来源包未取得六害显式表，故不启用六害。三刑、破、神煞与五行纯格亦未从此文件启用。

## 项目原创意见登记

第三个来源 `bazi-evidence-project-heuristic` 仅登记项目原创规则资料：

- 主文件 `data/bazi-evidence-project-profile.json`；固定修订 `project-fuyi-seasonal/1.0.0`。
- 完整声明 `data/raw/bazi-evidence-project-NOTICE.md`。这两份资料按 MIT 分发，不改变应用其他代码或第三方资料的许可。
- JSON 稳定保存既有扶抑权重、38%／55%阈值、巳旧列序和季节寒暖意象；不使用源码行号或格式化后的代码作为资料哈希。
- 季节意象与扶抑分别呈现。冬火／夏水仅为项目粗略参考，不是《穷通宝鉴》的十日干×十二月调候表，也不构成唯一喜用神。

未经原典页码校勘的候选调候资料、没有可靠分日边界的司权表和没有完整正反例的从格／合化研究继续留在 `.local`，不进入这个已启用来源清单。

## 独立例证与命令

`tests/fixtures/bazi-evidence-examples.json` 从固定外部源码字面表独立提取期望值，不导入应用领域函数或历法库，包括：

- 12 个地支藏干列序；
- 10 日干×10 对象天干，共100项十神；
- 五合5组、六合6组、六冲6组、三合4组、三会4组。每组有完整、倒序重复和缺项三类，共75例。

验证脚本另有12支藏干和8个十神人工转录锚点，并交叉两份源码的五合／六合成员表。例证证明本产品是否忠实执行所选表的成员与算术约定，不证明传统术数能决定命运，亦不证明所有流派一致。

```powershell
node scripts/verify-bazi-evidence-sources.mjs
npx vitest run tests/bazi-data.test.ts
```

普通验证不使用网络或 `.local` 研究目录。首次归档研究原件使用 `--archive --write`；明确修订规则与来源后才使用 `--write` 更新固定例证，不能从应用输出反向生成期望值。来源版本或固定清单变化时还需同步审阅运行时的固定清单哈希并执行集成验收。
