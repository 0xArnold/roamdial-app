# GeoNames 适用性核验（2026-10-22）

结论：可用作地名解析、城市级定位、行政区约束和时区信息，不能单独证明电台发射台/办公地址。

## 当前项目实际用法

`web/src/assets/city-anchors.json` 已从 cities15000 提取城市锚点，`data.js` 为缺精确坐标的电台选择城市作示意散布。现有裁剪数据只保留城市名称和经纬度，国家内按 ID 哈希选择；state 仅作有限名称匹配。因此“落在某城市”不能当作真实定位，尤其州省名不等于城市名。

## 本次只读核验

下载 https://download.geonames.org/export/dump/cities15000.zip ，读取全量城市名称、别名、国家、admin1、经纬度、人口、时区。当前下载有 34,179 个地点，244 个国家/地区代码（这是本次文件统计，不是文档近似数字）。

对本地 17,328 条缺精确坐标记录，仅匹配国家 + state 完全等于城市名称/别名：
- 2,481 条得到唯一城市候选；
- 100 条有多个城市候选，未选择；
- 其余没有命中，不能据此宣称已覆盖。

见 `candidates.json`，每项均为 `precision=city`、`verified=false`；未修改 SQLite 或线上布局。州省与同名城市仍可能混淆，所以唯一名称匹配也需要行政区/电台信息交叉核验。示例：Prague→布拉格、Kiev→Kyiv，说明别名比当前简化锚点有效。

重跑：`python3 research/geonames/audit.py /path/to/cities15000.zip`。记录中包含下载文件 SHA-256 和分析时间。

## 适合下一步使用的字段和数据

- `admin1CodesASCII.txt`、`admin2Codes.txt`：解析州/省/市/县编码，限制匹配范围。
- 主表 `alternatenames` 已含常见别名；需精确语言、历史名称时再用 `alternateNamesV2.zip`。
- `cities5000.zip`、`cities1000.zip` 或国家 `XX.zip`：补充小城/县，先限定国家和 feature class=P，避免山河等同名地物。
- `timezone`：城市实际时区，优于按经度或国家推测。
- 与 Radio Garden 的 station→place 关联联合使用，官网/频率/国家辅助同名消歧；原精确坐标优先。

官方数据说明与许可：https://download.geonames.org/export/dump/readme.txt ，CC BY 4.0，需署名。本项目已有 attribution，应保留来源、版本和 geonameid。GeoNames 不提供数据准确性/完整性保证。
