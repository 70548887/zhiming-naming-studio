# M752-r2 机器契约修订

接收 M762 两项 P2 与一项 P3。原 M752、M740 文件保留；本目录仅替换验收契约表达。

- 资格评估只使用 assess/status。拒绝加分和未经审阅断语使用 output-assertion/assertionKind。旧版保留使用 legacy-replay/assertionKind，7.1 不进入7.2评估。
- 叶合法输入六阶段统一 pending-source-identity，真实caseId、themeIds=[]。null主题/伪造caseId另列完整性负例。
- 条件字段定义为精确读音/声调/义项/给名字位/长度/显式主题与source pending。conflictIds 分类为来源/读音关联、展示联想、禁止扩大解释；不是不明的全名语义识别器。
- 3通用、6主题、叶pending的逐字审阅数据原样复制，SHA保持不变。明确所有阶段使用同一评估，但pool不伪造已保存receipt。
- 43基础用例与122阶段预期只是合同数据；原49条阶段预期有缺陷，不能说49产品测试通过。验证器只证明契约结构/枚举/引用/原件完整性及可重建，不是运行M751产品。

主文件：generation-admission-contract.json、acceptance-cases.json、generation-admission-v72.d.ts、conflict-registry.json；verification.json记录本轮真实检查。
