# 企业 AI 内容营销与智能接待：二次开发可行性与实施计划

依据：[需求基线 R01～R10](requirements.md)。代码快照：`3581f511293236044e56fad67958cfcea0def6b5`；外部资料核查：2026-10-17。本文交付方案与开发任务，不代表已完成业务开发、真实账号联调或客户报价。

后续范围补充：首期以小红书为主，企业工作台 UI/UX 与浏览器扩展执行保障分别补充为 R11、R12。本文原有工作量估算未单独计入完整 UI 改版和自建扩展，不能直接沿用为新增范围后的总工期。

## 1. 建议与可行性结论

**可以基于 AiToEarn 二次开发，优先补“企业事实约束、地域行业选题、咨询与销售闭环”。发布和生成模块优先复用。小红书普通私信自动接待必须取得相应权限后再承诺。**

三条可选落地路线：

- **路线 A：低成本试点，建议先做。** 人工录入并确认热点 → 企业知识约束生成 → 审核 → 插件辅助或人工发布 → 小红书原生工作台人工接待、AI 提供建议 → 线索入库与销售提醒。自动机器人先在自有网站接待运行；不计为小红书私信机器人交付。无需等待小红书新增 API 权限，代价是有人值守和录入。
- **路线 B：小红书小程序客服闭环。** 在 A 的创作链路上，增加已审核小程序及平台允许的入口 → 官方客服消息回调 → 知识问答 → 销售接管。官方发送消息接口已经找到，但服务对象是小程序客服会话。需要小程序资质、上线审核、入口和调用权限。
- **路线 C：普通私信自动化。** 申请小红书 Marketing 私信 API，或采购有明确平台授权及开放接口的服务商；获得文档与测试账号后实现消息适配器。官方确有私信 API 产品，但本次未取得具体收发端点、权限清单和配额，当前只能列为有条件扩展；申请期间执行 A，不能拿 B 冒充 C。

首期平台已明确为小红书。其余采用规划假设：一家企业、一个行业、一个城市、一个账号、图文内容；无锡只作示例。每月 1,000～2,000 元暂按“每企业服务费”测算，开发费、广告费和平台服务商费用单列。若预算实际为整个项目总预算，仅适合人工辅助试点，无法覆盖完整定制开发。

## 2. 源码核查：哪些可复用

已先查询知识图谱，当前没有本仓库索引，随后回退到文件检索和源码阅读。以下为定点核查结论，不把 README 宣传当成已运行能力。

- **图文规划与批量生成已有实现。** [draft-generation-planner.service.ts](../../project/aitoearn-backend/apps/aitoearn-ai/src/core/draft-generation/draft-generation-planner.service.ts) 的 `planImageText` 输出标题、正文、话题和配图提示词，支持参考图与记忆。可扩展企业资料注入；现有记忆不能替代带审核、版本和证据的企业知识库。
- **素材与用户归属已有基础。** [material.schema.ts](../../project/aitoearn-backend/libs/mongodb/src/schemas/material.schema.ts)、[draft-generation-memory.schema.ts](../../project/aitoearn-backend/libs/mongodb/src/schemas/draft-generation-memory.schema.ts) 以 `userId` 关联数据。素材的 `SUCCESS` 表示处理状态，不能视为企业内容审核通过。
- **发布排期与状态机可复用。** [publish-state.service.ts](../../project/aitoearn-backend/apps/aitoearn-server/src/core/channels/publish/tasks/publish-state.service.ts) 有排队、发布中、等待用户操作、平台排期等状态；需要额外的企业审核门禁和结果核验。
- **小红书实际依赖浏览器插件。** [rednote.constants.ts](../../project/aitoearn-backend/apps/aitoearn-server/src/core/channels/platforms/rednote/rednote.constants.ts) 声明 `AuthType.Plugin`；[plugin/store.ts](../../project/aitoearn-web/src/store/plugin/store.ts) 调用 `window.AIToEarnPlugin.publish` 后登记记录。[rednote-publish.provider.ts](../../project/aitoearn-backend/apps/aitoearn-server/src/core/channels/platforms/rednote/rednote-publish.provider.ts) 解析 `workLink` 并返回作品信息，没有直接上传并发布笔记。
- **小红书评论有插件调用，私信未实现。** [xhs/index.ts](../../project/aitoearn-web/src/store/plugin/plats/xhs/index.ts) 包含评论及回复；未实现 `sendDirectMessage`，作品详情返回“抓取能力已移除”。[rednote.module.ts](../../project/aitoearn-backend/apps/aitoearn-server/src/core/channels/platforms/rednote/rednote.module.ts) 注册发布与作品 provider，没有小红书 engagement 或客服消息 provider。
- **数据展示不等于数据可取得。** [rednote-work.provider.ts](../../project/aitoearn-backend/apps/aitoearn-server/src/core/channels/platforms/rednote/rednote-work.provider.ts) 返回 `snapshots: []`，并把媒体类型写为视频；图文接入需修正。`PostInsightCrawler` 元数据及抓取 skill 的存在，不能证明开源部署已具备曝光采集服务。
- **企业隔离需补充。** [account-group.schema.ts](../../project/aitoearn-backend/libs/mongodb/src/schemas/account-group.schema.ts) 是用户下的账号分组；[认证守卫](../../project/aitoearn-backend/libs/aitoearn-auth/src/aitoearn-auth.guard.ts) 负责认证，不能直接提供企业成员权限。核查范围内未找到完整的销售分配、客服接管、跟进和企业套餐实现，按新增模块估算。

插件安装包不等于插件源码已包含在本仓库；计划改插件前，必须核对对应源码、版本和授权。现有配置中的 Relay 也不自动赋予小红书发布或私信权限。

### 2.1 本地浏览器插件核查与补全路线

当前仓库包含 `aitoearn-web`、`aitoearn-backend`、`aitoearn-electron`。检索未发现扩展的 `manifest.json`、`content_script`/`background` 文件或 `.crx/.zip` 安装包；`W/store/plugin/` 是网页接入层，Electron 是另一种客户端，均不能据此认定浏览器扩展源码已交付。该结论仅针对本仓库，不代表用户浏览器未安装扩展或其他目录没有源码。

可复核证据：

- [constants.ts](../../project/aitoearn-web/src/store/plugin/constants.ts) 配置 Chrome 商店、OSS 和 GitHub Release 的外部下载地址。
- [store.ts](../../project/aitoearn-web/src/store/plugin/store.ts) 检测 `window.AIToEarnPlugin`，调用 `checkPermission/login/publish`；小红书发布结果中的 `shareLink` 被用于登记发布记录。
- [baseTypes.ts](../../project/aitoearn-web/src/store/plugin/types/baseTypes.ts) 定义 `AIToEarnPluginAPI`，是兼容现有网页的契约入口。
- [rednote-publish.provider.ts](../../project/aitoearn-backend/apps/aitoearn-server/src/core/channels/platforms/rednote/rednote-publish.provider.ts) 处理 `workLink` 并返回作品信息，没有完成笔记媒体上传及浏览器发布动作。
- [原插件商店页面](https://chromewebstore.google.com/detail/aitoearn-extension/hnmocdhmnfgcjnedmdgfefcobideaeja) 可访问，页面描述包含小红书发布和浏览器执行；这不是私有域名兼容性或真实发布成功的证明。

**先验证复用。** 使用企业授权账号，在本地站点及最终企业域名上检查 API 注入、站点权限、账号识别、图文发布、回传链接和错误状态；同时观察是否必须连接原站账号、云服务或限定域名。固定 Web/插件版本和分发渠道，记录已验证的部署组合。仅有安装包时不能承诺插件源码可修改、可随项目再分发或可长期自行维护；应取得对应授权及维护安排。现有下载入口是否为同一版本也需核验。

**复用受阻时，优先取得对应源码。** 向维护者确认扩展源码仓库、分支、构建方式、许可证、私有域名支持及服务依赖。源码和权限齐备后，改造域名授权、任务验证和结果回传；网页仓库 MIT 不能代替独立扩展的授权确认。

**无法获得可维护实现时，自建小红书扩展。** 建议新增独立 `project/aitoearn-extension` 工作区，采用 Manifest V3；使用页面桥接暴露兼容 API、content script 操作授权页面、service worker 协调任务，首期只实现实际需要的小红书能力。Chrome 的 content script 默认处于隔离环境，网页全局 API 需要显式桥接；后台入口通过 manifest 注册。[content script 官方说明](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[service worker 官方说明](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)。

自建任务分为以下可验收步骤：

1. 连接与诊断：版本、权限、部署域名白名单、账号身份及能力声明；未实现的方法明确返回“不支持”，不能伪造成功。
2. 审核任务领取：后端验证权限与审核版本，任务绑定企业、账号、内容版本和有效期；网页桥接限制来源及动作，不向任意网页开放请求代理或暴露登录凭据。
3. 图文发布：素材下载、上传、标题正文与话题填写、预览和确认、进度事件、作品链接及结果核验。遇登录校验或验证码转人工处理。
4. 执行保障：服务端保留持久任务，客户端保存执行检查点；断连后先查询原任务结果，结果未知时等待核验；账号串行执行，避免重复提交和账号误发。
5. 企业交付：安装包、源码和可复现构建材料（自建时）、安装升级说明、兼容版本、脱敏诊断及回退方案；在客户实际设备完成验收。

排期由服务端管理，但浏览器执行仍依赖在线设备与登录会话。插件本身不等于全天候无人值守服务；首期需将客户端在线条件显示在排期入口。私信另外按路线 B/C 验证，不能用补完发布插件代替普通私信渠道接入。

## 3. 十个需求维度，每项两种可执行方案

以下 A/B 可按模块组合；建议从各项 A 开始，消息渠道按第 1 节路线选择。验收数字为建议工程目标，尚非客户合同指标。

### R01 企业知识与品牌资料

- **方案 A｜结构化资料库。** 新增企业档案与知识条目，字段包含价格、服务区域、案例、FAQ、禁用语、证据附件、审核人、版本和有效期；按行业与问题标签检索后注入创作及接待。先录入 30 条已审核 FAQ 和真实产品资料；价格和服务承诺从审核字段/答案模板输出，模型新增的数字与承诺校验不通过则退回。无需新增向量数据库，适合首期少量资料。
- **方案 B｜文档检索增强。** 上传有权使用的企业文档 → 分段 → embedding → Qdrant；每段保存 `tenantId/documentId/version/source`。查询由服务端强制加企业过滤并返回来源；失效资料删除向量。适合大量手册，增加解析、向量服务与维护成本。[Qdrant 多租户说明](https://qdrant.tech/documentation/manage-data/multitenancy/)
- **共用验收：** 50 个已标注问题中，事实回答能追溯资料；缺失价格、案例、承诺时转人工；两企业交叉读取用例全部拒绝。

### R02 地域与行业热点选题

- **方案 A｜人工选源、系统匹配。** 运营每天两次录入当地官方公告、行业资讯及企业活动的链接和摘要，附发生时间、地区、行业、使用范围；系统去重并筛选后生成每日 5 个候选。不是“小红书实时热榜”，但可以立即启动，不依赖爬虫权限。
- **方案 B｜许可数据源自动接入。** 通过 `rss-parser` 接入经确认可商用的 RSS，或对接取得合同、文档和样本的资讯 API；BullMQ 定时拉取，保留来源、采集时间、过期时间与故障状态。小红书行业热度若采购，先验证城市粒度、更新频率和商业使用权；不能把通用新闻热度命名为小红书热度。
- **共用实现与验收：** 地域采用行政区代码及别名，行业采用受控标签；先过滤过期和业务不相关项，再按 `35%行业相关＋25%地域相关＋20%时效＋20%产品适配` 初排，均归一化为 0～1，权重可调。无锡只是地域匹配，不代表掌握平台本地流量。抽查 30 条，记录相关性和采纳率；停源时明确提示并切换常青选题库。

可验证的数据接口候选：聚合数据地区新闻 `GET https://apis.juhe.cn/fapigx/areanews/query`，参数 `key/areaname/word/page`，可用 `areaname=无锡` 与行业词试查；同厂全网热搜为 `https://apis.juhe.cn/fapigx/networkhot/query`。先拿 30 条样本核查无锡覆盖和行业相关性，并确认商用摘要处理许可及费用，再接入；它们不是小红书官方热榜，也不证明能获得小红书本地曝光。[地区新闻文档](https://www.juhe.cn/docs/api/id/731)、[全网热搜文档](https://www.juhe.cn/docs/api/id/739)

### R03 企业图文生成与平台排版

- **方案 A｜真实素材＋固定品牌模板。** 复用生成 planner、素材库和草稿箱；上传企业授权照片，设置封面、案例、FAQ 三类模板，用选题和知识条目生成文案。增加证据 ID、企业事实校验和逐平台预览，中文排版由模板完成。成本及文字准确性较容易控制。
- **方案 B｜生成配图＋模板合成。** 复用现有图片模型链路生成场景图，再用确定性模板叠加标题、品牌和说明；保存模型、提示词、参考素材授权与生成成本。实景案例仍用真实照片，不生成虚构客户案例；平台要求的标识由发布前检查处理。比 A 增加图片调用与质量审核成本。
- **共用验收：** `草稿→待审→通过/退回` 独立于素材处理状态；审核绑定内容版本及哈希，修改后失效。10 篇样稿逐项核对价格、案例、区域和平台长度限制，未审核内容无法创建正式发布任务。

### R04 发布与任务追踪

- **方案 A｜复用插件发布链路。** 在现有插件调用前检查审核版本；后端保存任务与幂等键，前端领取任务执行，回传作品链接和操作证据。设置客户端心跳、超时与人工处理队列；断线后不直接重复点击发布。适合有电脑在线的运营场景，不能承诺关机后仍执行。
- **方案 B｜发布素材包＋人工回填。** 系统导出图片、标题、正文、话题及审核单，生成待办；运营在官方客户端或创作平台完成发布，再回填作品链接。系统校验链接并关联任务，保留人工确认标记。无需插件维护，牺牲自动执行，适合权限不足时长期保底。
- **共用验收：** 区分“已提交、审核中、已核验发布、失败、结果未知”；插件成功回调或可解析 URL 不直接等于平台发布成功。相同任务重复请求 10 次只执行一次；结果未知先查证/人工确认，再决定重试。官方分享 SDK 仅在已有有效接入资质时作为补充，不能当作无交互服务器发布 API。

### R05 企业知识问答与咨询承接

- **方案 A｜FAQ 和确定性流程。** 在获授权渠道接入消息后，按产品、服务区域、咨询目的匹配已审核答案；只收集必要需求，未知问题生成客服待办。无消息 API 时在原生工作台人工接待，AI 仅给建议；自有网站可先验证自动接待流程。成本低，但复杂问法覆盖有限。
- **方案 B｜有证据的多轮问答。** 新增客服专用服务，用 R01 检索资料、最近对话及结构化需求槽位生成答案；无依据、要求人工或涉及承诺时移交。采用第 1 节 B/C 的真实渠道，或先接自有网站。客服不复用可执行创作工具的 Agent 权限，外部消息不能触发发布、改价或跨企业检索。
- **共用验收：** 评论、普通私信、小程序客服分别列能力开关；只对已接入渠道统计首响。模拟 100 条消息，包含重复、图片和超窗消息；消息入库后快速回执、异步处理。建议自动渠道首响 P95≤30 秒；不通过反复追问拖满 3～5 分钟。

### R06 意向识别与销售提醒

- **方案 A｜规则触发。** 对主动询价、预约、购买、主动留资及人工请求建立可配置规则，命中即创建线索；非工作时间分配备用负责人。新增站内待办及企业选定的飞书/企业微信通知适配器，通知带登录后查看的摘要入口，避免在群消息公开完整联系方式。
- **方案 B｜规则＋模型辅助。** 保留明确规则，模型只补充意向类别、需求摘要、证据消息 ID 和待确认字段；低置信度进人工队列，不自动丢弃咨询。以人工标注会话调整分类和阈值，适合复杂行业。
- **共用验收：** 用 `tenantId＋channel＋externalMessageId＋ruleVersion` 去重；通知任务有成功/失败/重试记录，“通知发出”与“销售已确认”分开。50 条标注样本中主动要人工的消息全部触发，重复回调不重复建单。

最小提醒实现可选飞书群机器人：后端 `POST https://open.feishu.cn/open-apis/bot/v2/hook/{企业配置的机器人ID}`，发送 `msg_type=text` 及 `content.text`，按企业配置签名；销售点击摘要内的系统链接确认接管。群机器人只负责单向通知，不能作为接管回调或已读回执。[官方自定义机器人文档](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)

### R07 人工接管与跟进记录

- **方案 A｜项目内轻量工作台。** 新建会话、分配、接管和跟进页面，状态采用 `BOT→WAITING_HUMAN→HUMAN→CLOSED`。接管与消息派发按会话串行执行，销售确认接管时原子更新状态和 `version`；发送端在同一串行边界内校验版本、状态及渠道时间窗，取消未发送任务，不能只在模型生成前检查一次。按配置在 60 秒、180 秒未确认时升级提醒，阈值可调整。
- **方案 B｜接入 Chatwoot 社区功能。** 独立部署 Chatwoot，创建 API Channel；适配器把平台消息映射为联系人与会话，通过 API 写入消息，将人工回复事件转回原渠道。项目保存平台会话和 Chatwoot 会话映射；消息过滤发送方、消息类型及原始事件 ID，防止回声循环。增加 Rails/PostgreSQL 等运维成本，但可复用客服工作台。[API Channel 文档](https://www.chatwoot.com/hc/user-guide/articles/1677839703-how-to-create-an-api-channel-inbox)
- **共用验收：** 20 次机器人生成与人工抢接并发测试，接管后不得新发自动回复；已提交平台的在途消息标明时间。无人值守生成回访任务，人工可查历史。Chatwoot 不自带本项目的小红书授权，也不能控制销售在平台原生界面的回复；原生接待需显式切换接管状态。

### R08 内容与线索效果复盘

- **方案 A｜人工导入报表与结果。** 通过表单/CSV 录入创作平台允许导出的自有账号数据，用作品 ID 关联内容；销售回填有效咨询、预约和成交。保存数据来源、统计区间及导入人，未知字段使用空值。先实现基础周报，最少依赖外部权限。
- **方案 B｜授权 API＋CRM 回传。** 只接取得权限的数据接口，保存原始数据与标准化快照；CRM 以稳定线索 ID 回传状态。回调或定时同步按平台限频执行，采集失败保留旧值并标记更新时间。广告、合作订单和自然笔记数据使用不同口径。
- **共用验收：** 10 篇内容与平台/人工报表核对；缺失曝光不显示 0。仅有咨询来源关联时称“关联”，只有可靠来源参数或客户确认才记为归因；不可把蒲公英订单查询当作自然曝光查询。

### R09 关键词及曝光持续优化

- **方案 A｜关键词词库＋配对试验。** 为地域、行业、需求阶段建词组；按账号和发布时间配对常青/热点选题，四周各至少 10 篇，比较每篇有效咨询、审核通过率和成本。每轮只调整一个主要因素，样本少时记录方向，不下排名因果结论。
- **方案 B｜标准化可见度观察。** 人工按固定地区、账号状态、时间和关键词记录搜索样本；或购买明确允许此用途的数据服务，将观察结果和采样条件入库。只观察约定样本，不做模拟点击、刷互动或固定排名承诺；购买前要求真实样本及报价。
- **共用验收：** 每个优化建议可关联词组、内容和观察记录，保留常青组作参考；未取得搜索数据时显示“未观测”。付费推广单独开户、预算和验收。

### R10 企业隔离、订阅与用量

- **方案 A｜每企业独立部署。** 每企业独立应用配置、数据库、存储凭据与账号会话，使用现有用户认证；新增本企业销售/审核角色、月度额度、用量台账，人工开通和续费。首期最快形成隔离边界，但多企业时运维成本增加。
- **方案 B｜共享服务多租户。** 新增 `Tenant/Membership/Role/Subscription/UsageLedger`；企业身份由认证上下文及成员关系确定，不能信任请求体的 `tenantId`。查询、对象存储、缓存、队列、向量过滤和 WebSocket 均绑定企业；套餐扣额需并发原子性，预占后结算，失败按规则释放。
- **共用验收：** 企业间越权读写、附件下载、导出、消息订阅全部拒绝；100 次并发用量请求不超卖。停订阅保留按约定导出与删除入口。R10 的付费自动化可后置，但数据隔离、角色和成本计量须在接入第二家企业前完成。

## 4. 小红书真实接口与能力边界

“官方文档可确认”“仓库已有调用”和“持凭据实测可用”是不同证据等级。以下均未使用真实账号发消息或发笔记；接口存在不等于客户账号有权限。

### 4.1 官方小程序客服：路线 B 的明确接口

**发送消息：`POST https://miniapp.xiaohongshu.com/api/rmp/message/custom`。** 公共参数为 `app_id`、`access_token`；文本业务字段为 `openid`、`msg_type: "text"`、`content`。返回需同时校验 `success` 和业务 `code`，不只看 HTTP 200；公共参数承载方式按对应 API 通用规范实现。[官方发送客服消息](https://miniapp.xiaohongshu.com/doc/DC234367)

**接收消息：平台向开发者配置的 URL 发起回调，接收地址由我们实现。** 文本事件包含 `MsgId/FromOpenId/ToAppId/MsgType/CreateTime/Content`；官方说明接收后 48 小时内可回复，不能用于任意账号的主动私信。[官方接收与发送说明](https://miniapp.xiaohongshu.com/doc/DC897608)

接入任务：配置公网 HTTPS 回调 → 按文档做 URL 验证、消息验签及解密 → 按 `tenantId＋ToAppId＋MsgId` 去重入库 → 快速回执 → 异步回答或转人工。官方消息推送要求五秒内响应，重试去重必须在模型调用前完成。[官方服务端消息推送](https://miniapp.xiaohongshu.com/doc/DC469488)

服务商代开发另有 `POST https://miniapp.xiaohongshu.com/api/rmp/tp/auth/token` 及 `/api/rmp/tp/auth/token/refresh`，涉及授权码和授权刷新凭证；不是普通登录 Token 的替代品。[获取授权凭证](https://miniapp.xiaohongshu.com/doc/DC075294)、[刷新授权凭证](https://miniapp.xiaohongshu.com/doc/DC059296)

### 4.2 官方分享 SDK：真实存在，但不能作为首期发布前提

网页方法为 `xhs.share({ shareInfo, verifyConfig, fail })`；媒体使用服务器 URL，签名在服务端生成。它唤起客户端分享流程，不提供这里所需的通用服务器定时发布。[官方 JS SDK](https://agora.xiaohongshu.com/doc/js)

本次可检索的官方页面显示“暂停接入”，JS 文档还提示不再支持自动填充标题、文案、话题；旧示例仍含这些字段，不能据此承诺它们有效。已有资质也需重新联调。[官方分享平台入口](https://agora.xiaohongshu.com/doc)

### 4.3 普通私信与客资：有产品，不臆造收发接口

[官方 Marketing 开放平台](https://ad-market.xiaohongshu.com/app-center) 明确列有“私信 API／提供会话服务能力”。但本次没有取得适用于本客户的收发文档、权限、回复时间窗或费用，不能写一个猜测的 `/message/send` 充数；客资推送也不等于双向客服收发。

路线 C 的执行门槛：客户/服务商申请权限 → 取得官方应用类目与授权 scope、收发/回调完整契约、配额及价格 → 用真实测试会话完成“收到、回复、撤权、过期、重复投递”五项联调 → 才启用普通私信适配器。任一项不通过则保留 A；若客户接受小程序客服，另走 B。

### 4.4 仓库中真实使用的网页内部接口：仅能认定有调用代码

以下路径由 `window.AIToEarnPlugin.xhsRequest` 访问，不是官方开放平台授权 API；依赖浏览器登录、插件及平台校验，当前可用性未实测：

- `GET /api/sns/web/v2/comment/page`：评论列表，使用 `note_id`、`cursor`，可能需要 `xsec_token`。
- `GET /api/sns/web/v2/comment/sub/page`：子评论，增加 `root_comment_id` 等字段。
- `POST /api/sns/web/v1/comment/post`：评论/回复，使用 `note_id/content/at_users`，回复增加 `target_comment_id`；一级评论当前优先走 `unifiedInteraction` 自动化。

证据：[comment.ts](../../project/aitoearn-web/src/store/plugin/plats/xhs/comment.ts)、[index.ts](../../project/aitoearn-web/src/store/plugin/plats/xhs/index.ts)。可用于受控验证已有链路，不能包装成官方长期稳定 API；不新增签名破解、验证码绕过、账号池或批量主动私信。验证失败转人工。

### 4.5 容易误用的官方接口

- **蒲公英合作订单：** `GET https://adapi.xiaohongshu.com/api/open/pgy/order/list`，使用 `Access-Token` 和 `user_id` 等参数；查询授权范围内的合作订单，不能负责发普通笔记或读取所有自然曝光。[官方接口说明](https://ad-market.xiaohongshu.com/docs-center?articleId=4105&bizType=944)
- **ARK 电商接口：** 官方说明面向商品、库存、价格和包裹等商家业务，不能因为有开放平台就推定存在通用笔记发布和私信权限。[官方 ARK 范围说明](https://school.xiaohongshu.com/en/open/quick-start/introduction.html)
- **地域/行业热榜与搜索排名：** 本次未确认可直接满足要求的通用官方 API；使用 R02、R09 的人工来源或有许可供应商方案。微博首期采用人工发布/数据回填；若列为必须自动化平台，单独核实资质、发布和消息权限后新增 provider，不沿用小红书结论。

## 5. 二次开发改动清单

路径缩写：`S = project/aitoearn-backend/apps/aitoearn-server/src`；`A = project/aitoearn-backend/apps/aitoearn-ai/src`；`W = project/aitoearn-web/src`。下列标为“新增”的目录及接口是实施设计，尚不存在。

### 5.1 后端与 AI

1. **新增 `S/core/enterprise/` 与 `knowledge/`：** 企业资料、成员权限、审核知识版本；R01/R10。复用认证守卫，新增成员鉴权，不能仅按前端选择企业过滤。
2. **新增 `S/core/topics/`：** 来源录入、RSS/API 适配、去重、评分、过期和采纳反馈；R02/R09。采集内容作为不可信数据，不允许其中的文本改变模型权限或企业范围。
3. **改造 `A/core/draft-generation/` 与 `S/core/content/`：** 增加企业上下文、选题 ID、事实证据、模板和审核修订；R01/R03。知识版本是事实边界，不能被现有“用户提示词优先于记忆”规则覆盖。
4. **改造 `S/core/channels/publish/` 与 `platforms/rednote/`：** 服务端审核门禁、内容哈希、幂等记录、未知结果与人工确认；修正图文类型和记录状态；R04。插件的最终执行也需使用后端签发的有效审核任务，不能只隐藏按钮。
5. **新增 `S/core/conversations/`、`leads/`、`notifications/`：** 消息接入、FAQ/检索问答、线索分配、通知重试、接管、跟进及审计；R05～R07。渠道分为 `rednote_comment/rednote_miniapp_service/rednote_dm/website`，权限分别配置。
6. **扩展 `libs/mongodb`、`libs/channel-db`、`libs/aitoearn-queue`：** 业务实体分别落在企业/内容库与渠道会话库；沿用现有队列与 Repository 分层。消息入库同时写 outbox，由队列派发；任务重试仍以数据库唯一键兜底，不能只依赖队列去重。[BullMQ 去重说明](https://docs.bullmq.io/guide/jobs/deduplication)
7. **扩展 `S/core/channels/analytics/`；新增 `S/core/operations-report/` 与 `subscriptions/`：** 导入、来源口径、内容与线索关联、用量限额及账单；R08～R10。支付网关在规模化时再接。

最小数据集合：`Enterprise/KnowledgeVersion/TopicCandidate/ContentRevision/Conversation/Message/Lead/FollowUp/NotificationOutbox/UsageLedger`；共享服务时再加 `Membership/Subscription`。通用字段含企业 ID、创建人、时间、版本及来源。

关键唯一约束：消息 `(tenantId, channel, externalMessageId)`；发布 `(tenantId, accountId, contentRevisionId, scheduledAt)`；通知 `(tenantId, leadId, escalationLevel, notificationRound)`。主动重新发布需显式创建新任务；重复投递复用原键。

### 5.2 前端

- 新页面放在 `W/app/[lng]/` 下的 `enterprise/`、`topics/`、`service-desk/`、`leads/`、`operations-report/`，各页面先用局部 `components/hooks/store`。新增请求放 `W/api/`，更新对应 README；品牌遵循现有 `DESIGN.md`。
- 扩展 `W/components/draft-box/`、`PublishDialog/` 与 `W/store/plugin/`：显示知识证据、审核历史、排期依赖、客户端在线和发布核验状态。人工接管后禁用自动回复，并由后端最终裁决。
- `W/components/Chat` 是现有创作 Agent 交互组件；客服工作台只复用适用的展示组件，另建客服数据协议和权限，不能直接把它视为已接通平台私信。

企业 UI 改版作为 R11 独立实施：先确定企业品牌、导航和角色流程，再完成“选题→创作→审核→发布”及“咨询→线索→接管→跟进”两条关键流程的高保真页面。首期导航聚焦小红书，其他平台从主要入口收起，保留底层适配能力。继续复用已有组件和语义 token，避免每页重新定义样式；若调整品牌，统一更新 DESIGN.md 及主题实现。

工作台展示可操作的待审核、待发布、失败待处理和待跟进任务；创作页呈现选题依据、企业事实来源与笔记预览；发布页显示账号、执行设备、排期依赖及核验状态；咨询页显示渠道能力、负责人和接管状态。视觉检查覆盖真实长标题、多图、空数据、加载、错误、无权限及插件离线；数据缺失不得用虚构数字或零填补。交付前在客户目标分辨率检查可读性、键盘操作和主要角色的完整流程。

### 5.3 拟新增接口契约

统一以部署 API 前缀下的 `/enterprise-ops` 为新命名空间，避免覆盖现有路由；以下均为**我们要开发的接口，不是小红书接口**：

- `POST /enterprise-ops/knowledge/versions`、`POST /enterprise-ops/topics/candidates`：审核知识和候选选题入库。
- `POST /enterprise-ops/content-revisions/:id/approve`：校验审核人并锁定版本；发布入口重新校验。
- `POST /enterprise-ops/webhooks/rednote-miniapp/:bindingId`：验签解密后按应用绑定解析企业；不信任 body 自报企业。
- `POST /enterprise-ops/conversations/:id/claim`：用 `expectedVersion` 原子接管；冲突返回 409。
- `POST /enterprise-ops/conversations/:id/messages`、`POST /enterprise-ops/leads/:id/follow-ups`：鉴权、去重、时间窗校验和审计。

## 6. 借用开源项目与授权处理

**路线 A 的默认组合为 AiToEarn＋现有 BullMQ＋可选 rss-parser；路线 B/C 按实际需求增加 Chatwoot 或 Qdrant。每个选型先锁版本与提交，再审该版本许可证，不能仅看仓库首页标签。**

- **AiToEarn｜MIT。** 本地 [LICENSE](../../LICENSE) 允许修改、商用和分发；MIT 本身不强制公开二开代码。向客户交付源码、镜像或前端构建产物时保留原版权及许可，新增自己的修改说明和第三方声明。商标、图片、插件、模型和外部服务授权另查。[MIT 原文](https://opensource.org/license/mit)
- **Chatwoot｜社区部分 MIT，企业目录例外。** 复用社区客服会话和 API Channel，独立服务集成，不复制或启用未授权的 `enterprise/` 功能；其 LICENSE 明确把企业目录及第三方组件另列。部署前验证所需分配/接管能力确在所选社区版本中。[项目 LICENSE](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE)
- **Qdrant｜Apache-2.0。** 可选的文档向量检索服务；保留许可证、适用的 NOTICE，修改文件按许可证要求标注；按企业过滤权限仍由我们实现。[项目 LICENSE](https://github.com/qdrant/qdrant/blob/master/LICENSE)
- **BullMQ｜MIT。** 当前项目已经依赖，直接扩展已有任务、重试和延时机制；不把 BullMQ Pro 视为 MIT 范围。[官方仓库](https://github.com/taskforcesh/bullmq)
- **rss-parser｜MIT。** 只负责解析许可 RSS，不赋予新闻内容的转载、训练或商业再分发权。[项目授权声明](https://github.com/rbren/rss-parser/blob/master/package.json)
- **RSSHub｜当前主分支 AGPL-3.0，非默认依赖。** 若采用并修改为网络服务，应按许可证提供相应源码及许可；不能按旧印象当作 MIT，也不能认为换成独立容器就自动豁免义务。需要闭源时优先使用许可 RSS/API，不复制其路由代码。[当前 LICENSE](https://github.com/DIYgod/RSSHub/blob/master/LICENSE)

交付动作二选一：**A，保留二开业务代码闭源，使用许可兼容的社区组件并附授权清单；B，按所选许可证公开相应二开部分及构建材料。** 无论选哪条，新增 `THIRD_PARTY_NOTICES.md`，记录组件、锁定版本、来源、许可证及修改情况；同时盘点依赖和镜像。Redis/MongoDB 等基础镜像也按锁定版本分别核查，不能由 AiToEarn 的 MIT 一并覆盖。

内容与咨询数据同样单独授权：企业照片/案例留存授权记录，联系人按角色可见，约定保存期与删除导出；不默认把小红书内的用户信息导向站外，也不默认取得第三方文章全文或图片的商用权。

## 7. 开发顺序与交付门槛

以下人日为基于定点源码核查的工程估算，包含相关实现与验证，不是已确认排期；外部申请、采购、客户审核等待另计。

1. **G0 能力验证｜3～5 人日。** 固定行业、地区、账号及咨询路线；核对插件版本、资质和协议。用授权账号验证 3 篇发布及 20 条消息/人工接待记录，保留脱敏请求、结果、费用与失败样本。B/C 权限不通过则采用 A；输出逐渠道能力开关和已选方案。
2. **G1 企业基础｜6～9 人日。** 选 R10-A/B、实现资料版本、角色和用量台账。录入 30 条 FAQ、完成两企业隔离测试；先把权限边界做对，再接真实咨询。
3. **G2 创作与发布｜8～12 人日。** 完成 R02/R03/R04，先采用人工热点及模板，跑通 10 篇“有来源选题→生成→退回/通过→发布→核验”。无插件时素材包发布必须仍可完成。
4. **G3 接待与销售｜10～15 人日。** 按选定路线实现 R05～R07，跑通询价、转人工、无人响应、重复消息和原生工作台接待；没有真实消息权限时只验收网站机器人及小红书人工辅助，明确自动化缺口。
5. **G4 复盘与试运营｜6～9 人日。** 交付基础导入报表、关键词试验、告警与成本限制；再安排四周运营观察。内容数量和咨询转化分开评价，销售按约定回填结果。

基础合计 **33～50 人日**；加约 20% 联调缓冲约 **40～60 人日**。两名熟悉 NestJS/Next.js 的工程师并行、配合兼职产品/QA，日历暂按 5～7 周预留，再加四周效果观察；这是资源假设，不是客户交付承诺。首次上线不同时堆叠 Qdrant、Chatwoot、自动数据采购和多平台。

所有阶段都可关闭新增能力并回到人工操作；数据库升级采用可回填字段和显式迁移，避免为回退删除咨询或审核记录。生产前在 `docker-compose.yml` 检查服务端口、默认凭据、备份与恢复，并同步两份 Docker 部署文档。中国版 Relay Key 仅搭配 `https://aitoearn.cn/api`，国际版仅搭配 `https://aitoearn.ai/api`；按 Key 来源选择 `RELAY_SERVER_URL`，不能交叉使用。

## 8. 预算与运营可行性

**月度 1,000～2,000 元可以作为有限额度服务的验证起点，不能同时包含无限生图、全网热点采购、全天人工客服及整套定制开发。**

- **方案 A｜固定额度订阅。** 试算每月 20 篇图文、每篇最多 4 张图（其中最多 2 张 AI 图，其余授权素材）、150 次咨询、每次最多 8 次机器人回复；按额度先预占、后结算。超额暂停新增任务并提示人工处理，不停掉既有线索查看和回访。
- **方案 B｜基础订阅＋企业自带服务。** 企业直接购买模型、数据及消息渠道凭据，平台只收软件及维护费；仍计量消耗并告警。适合已有账号和服务商的企业，费用透明，但接入管理更多。

测算示例：20 篇×2 张＝40 次图片生成；150 次×8＝1,200 次回答，按每次输入 2,000/output 300 token，约输入 240 万、输出 36 万 token，另加创作、检索和失败重试。模型价格与实际上下文长度需用账单验证。

如果目标是 1,000 元收费、直接服务成本最多 500 元，可以先设**内部预算上限**：文本 40、图片 100、基础设施分摊 80、热点来源 80、通知存储 20、人工维护 180 元，共 500 元。这是待验证的成本约束，不是供应商报价；需包含失败重试、图片生成总次数及真实人工时。任何一项无法做到就缩减额度、换方案或提高收费，不能隐藏成本。单企业独立部署不可机械套用“基础设施分摊”数字。

上述 180 元只预留软件维护，热点录入、内容审核及销售接待暂由企业承担。若由服务方代运营，仅按每月 22 天、每天两次各 5 分钟录入及 20 篇每篇 15 分钟审核，已需约 8.7 小时；还没计算接待和修改。须按真实人工单价另计，不能把路线 A 的人工成本当作零。

贡献额按 `订阅收入－模型－数据/渠道－基础设施－人工维护` 核算；开发投入、获客、税费及广告另列。正式定价前至少用四周真实账单和人工工时复核，不能用理论 token 成本推算全部利润。

## 9. 验收清单与本次交付边界

上线前至少验证：跨企业资料及附件越权；虚构价格和案例；审核后修改；重复发布与未知结果；消息重放；模型超时；接管与自动回复并发；通知失败升级；数据缺失；额度并发；备份恢复。发布和消息样本必须用授权账号留存证据，模拟通过不能替代平台联调。

未来代码验证入口：后端在 `project/aitoearn-backend` 执行 `pnpm nx build aitoearn-server`、`pnpm nx build aitoearn-ai`，按实际配置的 Nx 测试 target 运行受影响用例；前端在 `project/aitoearn-web` 执行 `pnpm run type-check`、`pnpm build` 和新增流程对应的 Playwright 用例。不在根目录运行 install/build。

本次完成：需求拆分、每维度两种方案、源码改动定位、开源许可核查、真实小红书接口与限制、阶段任务和预算约束。尚未执行：客户账号授权、第三方服务采购、平台接口真实收发、业务代码实现及线上部署。部分官方页面正文直连超时，相关限制依据可检索的官方页面内容，接入时须重开文档复核；未确认的收发接口未编造。
