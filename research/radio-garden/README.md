# Radio Garden 坐标可行性核验（2026-10-22）

正常浏览器访问 https://radio.garden/ 后，从页面实际请求中确认：

- `/api/ara/content/places-core-columnar?s=1&hl=en`：地点 ID、lngs、lats。
- `/api/ara/content/places-details-columnar?s=1&hl=en`：同版本、相同索引的地点名称、国家索引。
- `/api/ara/content/page/{placeId}?s=1&hl=en`：该地点的电台列表；注意列表中也包含邻近地区推荐，不能全部归到当前城市，须检查每个 `page.place.id`。
- `/api/ara/content/channel/{channelId}?hl=en`：电台名称、所属地点、主页、音源域名。

本次版本 04e0ece，有 11,796 个地点、227 个国家/地区标签，其中 China 为 95 个地点。接口是网页内部接口，没有验证长期稳定性。旧 `/api/ara/content/places` 直接请求返回 403；没有绕过该响应，改为检查正常网页实际使用的数据请求，成功取得 HTTP 200。

`yangquan-sample.json` 保存阳泉 4 个电台与城市坐标（113.58047, 37.856678）。这属于城市级定位，不是发射台或演播室精确地址。`local-candidates.json` 是现有库中阳泉/平定名称搜索的结果，当前没有匹配项。因此本轮证明可获取并关联城市坐标，没有把示例写入应用数据。

后续补标应保存 source、sourceId、precision=city、匹配依据和检索时间，优先以国家 + 名称 + 官网/频率交叉匹配。音源域名（例如 qingting.fm）不能单独作为身份匹配依据。同名或低置信度候选保留人工复核；已有精确坐标优先，不要把城市坐标写成 exact=1。适合先按缺坐标电台所在国家/城市分批匹配，缓存结果，避免逐台重复请求城市列表。
