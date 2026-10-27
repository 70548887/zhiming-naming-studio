# 奇门测试参考来源

- `constants.js`、`calculations.js`、`utils.js`、`qimen.js`、`test.js`、`verify-citations.mjs`：
  https://github.com/arc119226/qimen_dunjia/tree/7d941031d685d818d9fd234edf891dba5bd6a323
  原始路径分别为同名根文件，`verify-citations.mjs` 原在 scripts/。通过 jsDelivr 的固定提交 URL 获取；许可证见 LICENSE。
- `independent-qimendunjia.py`：https://github.com/MarkChenXY163/qimendunjia_mcp/blob/d5941f477f6aa7df6caba66f3cac80e824f6bc89/qimendunjia.py
  用于交叉检查局数表与 `日甲子序号 % 15 // 5` 三元规则。其原实现交节只到日期，甲干及中宫分支存在不足，不作为整盘标准。
- `lunar-api.d.ts`：https://cdn.jsdelivr.net/npm/lunar-typescript@1.8.6/dist/index.d.ts ，仅供 API 接口核对。

engine.test.ts 两张逐格黄金盘取自上游 test.js 的 chartTestCases，原作者说明按传统规则人工计算。
另有《图书集成》〈释时悖格〉及《元灵经》例题的**上游转录**，并非本项目已查到原典影印件。
本项目检验独立实现与这些固定外部期望值相符，不能据此宣称已穷尽所有流派或逐字核验原典。
上游“拆补”默认使用交节后每 120 小时换元；本项目按目标选择甲己符头、实际节气拆补，不继承该上游的定元实现。

完整复制的源码仅作开发测试证据，不被应用运行时导入，不随安装包分发。完整项目数据来源由 data/sources 管理。
