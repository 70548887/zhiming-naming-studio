# 未随公开源码提供的历史测试材料

下列两份历史测试数据库及配套 JSON 暂未发布，因为这两份精确历史文件的合成样例来源说明尚未补齐：

- `tests/fixtures/naming-session-1.0.32.sqlite`
- `tests/fixtures/naming-session-1.0.32.json`
- `tests/fixtures/dictionary-session-1.0.32-probe.sqlite`
- `tests/fixtures/dictionary-session-1.0.32-probe.json`

本地原件与开发历史保持不变。本次 GitHub 首次发布采用经过筛选的源码快照，不上传会重新包含这些材料的原 Git 历史。产品源码及其余已跟踪文件来自发布说明标明的集成基线；后续同步也应从此公开快照分支更新。

引用上述文件的回归测试及来源预检会报告材料缺失。原测试断言、完整性检查和 CI 工作流均保留，没有创建虚假的替代测试数据或跳过检查。需要在来源依据补齐后，通过明确的后续提交恢复这些材料；缺少它们时不能声称完整验证通过。
