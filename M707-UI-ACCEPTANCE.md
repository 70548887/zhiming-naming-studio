# M707 UI 文本验收

基线：`04c527eb37c4ff017681bcbccac112af01af4e44`

实现位置：现有 `ModernNamePopularityReferencePanel` 的结果区；没有新增 RPC、Service、SQL、写库或主线接线。

手动展开并成功读取“沐宸”后，结果区直接显示：

- `证据状态`：例如 `尚未生成并保存现代实用性说明`；该标签沿用已有 `modernRecordView`，不表示重新认证。
- `统计年份`：`2021 年`。
- `样本范围`：`2021 年出生、截至 2021-12-31 已登记新生儿；给名不含姓氏`。
- `当前全国全名重名率／频率：不可由本历史给名榜推导。`
- 男榜列出 `22,958` 人；女榜显示 `人数未公布`，没有 0 人、罕见或唯一推断。

展开“查看年份、统计群体与来源”后仍显示报告标题、发布日、登记截止、统计群体、地域口径、资料版本、原报告未声明开放许可的限制和官方报告链接。

Focused command：

```text
node node_modules/vitest/vitest.mjs run tests/modern-name-popularity-reference-panel.test.tsx --maxWorkers=1
```

结果：8/8 通过。`tsc --noEmit --pretty false` 通过。未生成截图；本批采用 SSR 文本验收与 focused renderer tests。未执行全 suite、浏览器/桌面、SQL、Worker、server、fullbuild。
