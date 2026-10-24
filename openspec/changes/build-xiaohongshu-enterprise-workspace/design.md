## Context

本设计落实 [proposal.md](proposal.md) 的 7 项能力与需求 R01–R07、R10 基础、R11、R12。R08/R09 完整分析和优化、R10 自动订阅后置。当前为实施设计，所有拟新增目录、实体和端点均不表示代码已经存在。

已知代码基础：图文生成位于 `apps/aitoearn-ai/src/core/draft-generation/`；素材、认证、队列和渠道发布状态机可复用。Web 的 `src/store/plugin/store.ts` 调用 `window.AIToEarnPlugin.publish`，小红书发布 provider 处理返回作品链接。本仓库未发现完整扩展源码，因此不能将现有后台部署等同于拥有小红书浏览器执行能力。

代码发现优先图谱；已有查询表明本项目尚未索引，实施前重新检查可用性。Web 和后端分别遵守子目录工程规则。UI 以现有 PRODUCT.md、DESIGN.md 为约束，本 change 不重新定义品牌设计系统。

主要使用者：企业管理员管理资料、成员和账号；运营维护选题与内容；审核员批准内容版本；销售处理咨询与跟进。首期按一家企业试点、图文优先设计，数据模型和权限从开始支持明确企业归属。

## Goals / Non-Goals

**Goals:**

- 提供企业知识约束的选题、图文、审核、发布和记录闭环，插件不可用时仍可人工完成业务。
- 明确原插件复用、源码改造与自建扩展的决策条件；形成可维护、可验收的执行方案。
- 企业工作台具备完整岗位流程、统一视觉和异常恢复，真实数据状态与功能可用性可辨。
- 提供咨询、线索、提醒、接管和跟进基础；自动化按渠道真实权限启用。
- 企业隔离、版本审计和费用记录能够支撑后续增加企业，首期不过度搭建 SaaS 计费。

**Non-Goals:**

- 不默认接入微博等其他平台，不承诺自然排名、固定流量或成交。
- 不在没有授权接口时宣称普通私信自动化，不用网站聊天或小程序客服冒充普通私信。
- 不交付验证码绕过、登录凭据采集、账号池、批量主动私信及无权限数据采集。
- 不默认采购资讯、模型、服务商，不先引入向量数据库、独立客服平台或支付网关。
- 本次产出 OpenSpec 规划，不将规格完整误认为业务实现或客户验收完成。

## Decisions

### D1 分阶段门槛与选定路线

实施顺序为 G0 能力验证 → G1 企业基础与 UI 原型 → G2 创作审核及人工发布闭环 → G3 浏览器执行 → G4 咨询销售 → G5 企业交付。UI 原型可与 G0 并行，真实发布自动化不得先于审核门禁。

G0 输出脱敏能力记录：部署域名、Web/插件版本、账号类型、平台、能力项、外部依赖、操作样本、证据、失败原因、结论及下一步。结论为 `verified/unsupported/blocked/not_tested`，模拟结果另设证据类型，不写成真实验证通过。账号及企业行业尚缺时使用明确标注的演示样本推进原型和本地逻辑，真实账号验收保持未完成。

插件路线：原插件在企业域名上通过所需验证且授权/维护安排满足交付时复用；否则检查是否能取得对应源码与构建授权；两者均不可用时执行自建分支。没有插件时先启用人工发布，不等待不确定外部权限阻塞全部业务。

考虑过一开始完整重写多平台插件，但首期成本及维护范围过大。也不接受仅安装未知版本 CRX 就认定可长期企业交付。

### D2 企业模式和服务边界

沿用现有认证，新增 `enterprise-ops` 业务命名空间和企业成员上下文；首期部署可仅开通一个企业。成员关系及角色由服务端解析，拒绝请求自报企业而无成员资格。每条新增记录及素材引用均绑定 `enterpriseId`；渠道任务、缓存键、消息订阅、对象下载和队列携带相同归属。

角色采用管理员、运营、审核员、销售。管理员维护成员和渠道配置；运营编辑选题和内容、提交审核及已审任务；审核员通过/退回内容；销售处理已授权咨询与线索。权限检查不仅隐藏 UI，也约束 API、任务执行及附件下载。自审是否允许使用企业配置，默认禁止作者批准自己的内容，管理员经审计可配置例外。

后端新增 `core/enterprise-ops/`，按 enterprise、knowledge、topics、content、publishing、executors、conversations、leads、notifications 分模块；遵循 Controller → Service → Repository，不在 controller 直接访问数据库。既有渠道 provider 与发布任务由适配层调用，避免复制状态机或在全局 provider 中改变其他用户行为。

暂不选每家企业维护一套代码。数据库/存储仍可独立部署，但逻辑归属检查保持一致，避免增加第二家企业时重写业务。

### D3 最小数据模型与存储

复用现有 MongoDB Repository、channel-db 及队列分工，具体物理落库按已有库职责核对后确定，不为规划新增数据库服务。

- `Enterprise`：名称、行业、地区代码、时区、品牌设置、功能开关。
- `EnterpriseMembership`：enterpriseId、userId、role、启停状态；企业与用户组合唯一。
- `KnowledgeVersion`：知识条目、证据素材、审核人、版本、有效期、状态；已批准版本不可就地修改。
- `TopicCandidate`：来源 URL/人工来源、来源类型、发生/采集/到期时间、行业/地区、关键词、匹配理由、采纳反馈。
- `ContentRevision`：内容主 ID、版本、标题/正文/图片顺序/话题、知识版本引用、选题、模板、审核状态、内容哈希。
- `ApprovalEvent`：内容版本、操作者、动作、理由、时间；提交、退回、批准与失效均记事件。
- `EnterprisePublishJob`：企业、账号、内容版本/哈希、执行方式、计划 UTC 时间、状态、租约及尝试次数、作品链接、证据和核验级别；关联原渠道 flow/task ID。
- `ExecutorBinding`：设备 ID、所属用户/企业、原插件或自建类型、版本、能力、账号身份、最后心跳及撤销时间。
- `Conversation/Message`：独立渠道标识、外部消息 ID、来源、负责人、接管版本、自动化是否可用及消息状态；人工录入明确来源。
- `Lead/FollowUp/NotificationOutbox`：意向依据消息、负责人、状态、下一次跟进时间；通知事件及尝试结果。
- `UsageLedger/AuditEvent`：企业、业务动作、关联任务、供应商请求标识、预占/结算/释放、计量和成本状态；不记录明文凭据。

唯一约束：消息 `(enterpriseId, channel, externalMessageId)`；首次业务发布 `(enterpriseId, accountId, contentRevisionId, scheduledAt)`；执行回执 `(jobId, attemptId, eventId)`；通知 `(enterpriseId, leadId, ruleVersion, triggeringMessageId, escalationLevel)`。人工录入的消息使用服务端生成 ID，不与平台推送共用未知 ID。数据库约束兜底，不能仅靠前端禁用按钮。

### D4 知识、选题和审核约束

先采用结构化 FAQ、产品、价格、真实案例和品牌规则，不默认向量检索。创作服务接收服务端选定的已审核且有效知识快照，输出同时保存引用；用户提示词和外部资讯均不能更改知识及企业权限。无价格/案例依据时留空并提示人工补充，不能用模型补全。

选题从人工录入与常青库开始，保留来源、地区、行业、采集与有效期。先做业务相关性和过期过滤，再给出有分项依据的排序，权重可配置。未接入小红书热榜时界面使用“选题来源/资讯”，不标“小红书实时热度”。自动源适配为后续分支。

内容审核状态为 `draft → pending_review → approved/rejected`，退回后修改产生新版本并再次提交。批准绑定内容哈希，涵盖标题、正文、媒体内容摘要/顺序、话题与影响发布的配置；素材必须使用不可变对象版本或可靠摘要，不能因同 URL 内容被替换而沿用批准。

创建发布任务、领取任务、最终提交前分别校验权限、账号、批准版本及知识有效性。知识撤回或到期使受影响未执行任务阻断并等待重新确认。UI 草稿、预览和模型处理完成不代表批准。无法验证原插件会执行最终门禁时，仅采用人工确认模式，不宣称强制自动审核链路已达标。此门禁约束本系统发起的任务，无法限制企业在小红书原生端自行发布。

### D5 发布状态与未知结果

企业任务状态独立表示业务审核及人工处理，适配现有渠道状态：`scheduled → waiting_executor → preparing → awaiting_confirmation → submitting → submitted → verifying → published`；分支含 `blocked/failed/unknown/cancelled`。明确区分系统任务状态与平台作品状态，平台审核中属于 submitted/verifying，无法确认时不标 published。

服务端到期调度。设备领取使用有过期时间的租约及 fencing token，按账号串行执行；租约失效后拒绝旧执行者回执和最终提交授权。发布前取得短期提交许可，绑定任务、账号和内容哈希；执行者在实际点击前重新确认租约与许可有效。浏览器操作无法实现跨平台事务：一旦进入 submitting 后断线，禁止因为租约过期就自动重新发布，进入 unknown 并核验原结果。

published 要求核验账号、内容对应关系与作品 ID，并记录证据及核验方式。只能解析链接时保持 submitted/verifying；无法自动验证时，由有权限人员人工确认并标 `verificationMethod=manual`，不冒充自动平台确认。用户主动再次发布必须显式建立新的业务任务，而非绕开原任务去重。

无插件时生成 ZIP：按顺序命名图片、UTF-8 标题/正文/话题文件、内容版本及审核摘要、操作说明。下载短期鉴权、不含登录 Token 或其他企业材料。操作员在官方后台发布后回填链接；系统先做域名/格式校验，不对任意 URL 发起服务器抓取，必要核验只访问允许的平台域名。回填链接不直接标成功，进入核验。

人工发布仍无法保证外部操作者没有改稿，应由操作员核对版本并确认；证据记录这一限制。排期为 UTC 存储、企业时区展示，离线/休眠不默认为完成，逾期显示待处理及提醒。

### D6 插件适配与自建范围

Web 在现有插件 store 上增加适配层，保留已使用的 `checkPermission/getVersion/login/publish` 契约。新增能力协商（名称待与现有 API 冲突检查）返回协议版本、扩展版本、平台、动作、人工确认支持及审核任务支持；原插件无该 API 时按 G0 验证档案映射最小能力，不以版本号猜测具备私信或审核保障。

只要原扩展存在，避免覆盖 `window.AIToEarnPlugin` 导致双执行；多个扩展时展示来源并只选择一个执行适配器。未实现的 `xhsRequest`、交互或其他平台方法返回明确 unsupported，不能提供可被任意网页调用的通用代理。

自建时使用独立 `project/aitoearn-extension/` pnpm + TypeScript + Manifest V3 工程，设置独立构建、类型检查和测试入口，不修改根目录为统一 package。结构为 manifest、受信业务网页 bridge、content scripts、小红书 DOM 适配器、service worker、任务检查点、权限/状态 popup。扩展独立封装协议类型，通过契约样本检测与 Web 兼容，不在浏览器工程依赖 NestJS。

消息桥仅接受已授权企业部署来源，校验 source/origin、requestId、动作和负载结构；后台重新校验 sender URL、tab、企业绑定、任务和账号。host permissions 使用最小范围；小红书页面的登录会话留在浏览器，不提取到服务端或日志。素材 URL 仅允许已授权存储域名，拒绝任意网络代理请求。凭据由后台受控保存，不注入页面全局对象。

先完成图片上传、标题正文话题填充、预览和人工确认，再在真实验收通过且企业启用后开放自动提交。验证码、登录过期、页面结构变化和账号不符暂停并提示人工。service worker 重启后从持久检查点和服务端状态恢复；submitting 后不盲重试。任何定时执行都依赖在线执行设备，不用后台常驻内存计时器承诺无人值守。

### D7 企业 UI 页面与工程落点

企业模式路由建议为 `src/app/[lng]/enterprise/` 下的 overview、knowledge、topics、content、publishing、service、leads、settings。根 enterprise 页承担企业选择及授权入口；页面复用现有 layout，并以功能开关切换企业导航，不改变默认多平台布局。

- 工作台：待审核、待发布、失败待处理和待跟进，数字链接到相应过滤列表；没有数据时给明确下一步，不填演示指标。
- 企业资料：资料分类、版本、来源附件、批准与到期提示；角色决定可编辑/可审核范围。
- 选题中心：来源和时效清晰的候选列表，展示地域行业匹配理由，采纳后进入创作。
- 内容工作区：编辑区与笔记预览，真实素材/模板、引用依据、修订记录及审核动作；窄屏折叠为顺序流程。
- 发布管理：列表与日历切换，显示账号、审核版本、执行方式、设备在线、计划时间、结果和处理入口。
- 咨询与线索：咨询列表、会话、资料建议和线索信息；未接入渠道显示人工辅助，接管按钮和自动回复状态由后端裁决。
- 设置：成员角色、账号绑定、执行设备、插件安装检测、渠道能力、用量及诊断。

复用已有全局组件/shadcn、语义 token、字体和主按钮规范；浅深主题均检查。不得局部重定义整套品牌色。页面状态用局部 zustand + combine，多字段选择遵守 useShallow；跨页面复用按真实调用关系提取到中立业务目录。API 方法/类型放同一业务 API 目录，禁止新增全局 `src/api/types`；用户文案国际化，图片使用 OssImage，数字输入使用 NumberInput。

原型验收先覆盖 1440×900 和 1280×720，窄屏检查 390px 的查看及接管流程；不承诺手机作为扩展发布执行端。记录两条完整流程的高保真页面、正常/失败状态截图及可操作预览，之后进入接口联调。组件增补依子目录规则处理，缺少可复用方案时针对具体缺口讨论，不提前阻断已有组件可实现的页面。

### D8 咨询与销售闭环

渠道独立标识为 `rednote_comment/rednote_dm/rednote_miniapp_service/manual`；每个绑定声明 `receive/send/autoReply` 能力和验证状态。默认人工模式：原生工作台处理，企业系统录入咨询及证据、生成基于知识的回复建议、建立线索。默认不增加自有网站聊天产品，避免把另一个渠道当客户核心需求已完成。

消息适配器仅在取得完整文档、客户授权和真实测试结果后启用；具体平台端点在 G0/G4 按文档确定，不在此猜测。回调按绑定确定企业，完成验证/去重后异步处理，不等待模型完成再回执。平台时间窗、配额、撤权和失败映射由各适配器实现。

接待状态 `bot → waiting_human → human → closed`，claim 以 expectedVersion 做比较更新。生成中的自动答复不能直接发送，发送前检查会话版本与状态。外部发送与接管无法跨系统原子事务，使用会话级发送协调：claim 等待已取得发送锁的在途发送结果或明确标记未知，确认成功后拒绝后续自动发送；UI 展示交接中，不能先承诺已停止再补发旧回答。

明确询价、预约、留资、人工请求以规则优先建线索，保存证据消息，模型仅补摘要。首期站内待办必做；企业外部通知渠道配置后才发送。通知使用持久 outbox、重试和升级记录，“通知送达”与“销售确认接管”分开。客服只读批准知识，不拥有创作 Agent 的发布/改价等工具权限。

### D9 API 契约与错误处理

以下为本系统拟新增 API，均在部署 API 前缀下的 `/enterprise-ops`，不是小红书官方 API：

- `GET /enterprises`、`GET /enterprises/:id/capabilities`、`PATCH /enterprises/:id/settings`：授权企业、能力和设置。
- `GET/POST /enterprises/:id/members`、`PATCH /members/:id`：成员及角色，由管理员操作。
- `GET/POST /knowledge/versions`、`POST /knowledge/versions/:id/approve`、`POST /knowledge/versions/:id/withdraw`：版本化资料。
- `GET/POST /topics`、`POST /topics/:id/feedback`：来源、候选及采纳反馈。
- `POST /content/generations`、`GET/POST /content/:id/revisions`、`POST /content/revisions/:id/submit-review`、`POST /content/revisions/:id/review`：异步生成、版本和审核。
- `GET/POST /publish-jobs`、`POST /publish-jobs/:id/cancel`、`POST /publish-jobs/:id/material-package`、`POST /publish-jobs/:id/manual-result`、`POST /publish-jobs/:id/verify`：业务任务及人工核验。
- `POST /executors/register`、`POST /executors/:id/heartbeat`、`POST /executors/:id/revoke`、`POST /publish-jobs/:id/claim`、`POST /publish-jobs/:id/authorize-submit`、`POST /publish-jobs/:id/events`：设备及租约协议。claim 返回 jobId、attemptId、leaseToken、内容哈希和有效期；回执带 eventId 去重。
- `GET/POST /conversations`、`GET/POST /conversations/:id/messages`、`POST /conversations/:id/reply-suggestions`、`POST /conversations/:id/claim`、`POST /conversations/:id/close`、`POST /conversations/:id/resume-bot`：人工记录、建议和已授权发送；resume-bot 需显式权限及渠道能力。
- `GET /leads`、`PATCH /leads/:id`、`POST /leads/:id/follow-ups`、`GET /notifications`、`GET /usage`：线索、跟进、通知和用量。
- `POST /webhooks/:channel/:bindingId`：条件接入，渠道和 binding 白名单，遵从提供商验证及回执协议，不强制使用交互 API 的响应 envelope。

交互 API 保持现有 `{code,data,message,timestamp}`，`code===0` 才算成功。ID 先鉴权再访问；版本不匹配、未审核、能力不足、租约失效、结果未知使用明确业务错误码，不靠解析错误文本。冲突按项目异常约定提供 HTTP 409 及业务码。可重试请求使用幂等键；接管、审核与状态变更带 expectedVersion。所有列表限定企业并分页，时间使用 ISO 8601。

### D10 验证与交付证据

在 G0 确认 target 和依赖，再按变更运行后端 `pnpm nx ...`、Web `pnpm run type-check` 与 `pnpm build`。有价值的自动测试覆盖跨企业访问、审核后改稿、重复领取、租约失效、结果未知、消息重放及接管竞争；纯样式不编写镜像实现的单元测试，用视觉和交互验证。

集成测试使用两企业、四角色、授权素材和明确标注的演示消息；真实联调独立记录。创作发布验收至少 10 篇审核样稿，其中授权账号真实发布不少于 3 篇；未取得账号时保持相应任务未完成。自动消息仅对选定渠道测试收发、撤权、过期、重复和接管；人工模式单独列验收范围。UI 留存主题、分辨率、关键状态及流程证据，不能仅交静态截图。

## Risks / Trade-offs

- [原插件域名或服务限制] → G0 提前验证；保留人工闭环；复用失败才进入源码/自建分支，独立估算。
- [页面结构变化导致发布失效] → DOM 适配器独立维护，先人工确认；结构识别失败停止，不盲点按钮。
- [平台提交后客户端掉线] → unknown 状态和人工核验，不承诺跨平台 exactly-once；幂等用于阻止本系统重复发起。
- [原插件不支持服务端审核许可] → 只能作为人工辅助路径，自动发布不得通过强制审核验收。
- [私信或热点数据权限未到位] → 按渠道能力关闭，人工录入和选题来源先运行；不虚构实时性及自动化。
- [企业数据随素材或消息泄漏] → 服务端归属校验、最小化日志和角色过滤，附件/导出同样鉴权。
- [UI 改版影响原多平台业务] → 企业模式开关、公共组件回归检查，不直接全量替换原导航。
- [费用和人工维护超出订阅预算] → 记录实际用量、失败重试及人工时，限制额度，开发费与月费分别核算。

## Migration Plan

1. G0 固定试点部署与能力记录；创建单独验证环境及演示数据，不向客户生产账号自动提交内容。
2. 采用新增集合/字段/索引；先扫描重复再建立唯一索引。旧记录无企业归属时保留原访问路径，禁止默认分配给某企业。
3. 先部署后端企业 API 与关闭的功能开关，再部署 Web；创建企业及显式成员/账号/素材绑定。迁移可重复执行并记录归属依据。
4. 先开放资料、选题、审核和人工发布；验证后逐项启用浏览器执行与消息适配器，不能由一个开关一次启用所有渠道。
5. 生产前验证鉴权、备份恢复、用量与诊断；更新三语 README 和适用 Docker 文档。使用 Relay/MCP 时域名与 Key 所属环境匹配，插件连接企业域名不改变此规则。
6. 回退时停止新任务领取、撤销提交许可与设备绑定、暂停自动回复，保留发布中任务进入核验；关闭企业入口但保留数据和人工导出。已发生的平台发布不由代码回退自动删除。

## Open Questions

- 企业行业、城市、品牌资料、素材、审核人、角色人数与小红书账号资质。默认均可配置，演示样本不得冒充客户事实。
- 企业部署域名、目标浏览器、是否可提供在线执行设备。缺失时先完成本地协议及人工模式，设备验收待完成。
- 原插件对私有域名的支持、源码与分发维护条件。由 G0 输出路线结论，不阻塞企业基础和 UI 原型。
- 首期咨询究竟采用人工辅助、评论、普通私信还是小程序客服；相关文档、权限和费用由真实联调确定。
- 通知渠道、销售响应与升级时间、自审例外、知识有效期、数据保存/导出/删除策略。首期站内通知、禁止自审，其他阈值配置化，不默认发送外部消息。
- 自动化、人工辅助两种交付范围如何写入客户验收。只有客户明确选择并完成对应样本，才能关闭真实交付任务；无法取得外部条件时不得勾选为完成。

## Implementation decisions and current boundaries

- API resources are concretely scoped under `/enterprise-ops/enterprises/:enterpriseId/`; the path selects a candidate enterprise, and the server resolves membership and role again. The implementation uses `knowledge`, `topics`, `revisions`, `publish-jobs`, `executors`, `conversations`, `leads`, `notifications` and `resources` below that prefix. Root `/enterprise-ops/enterprises` lists or creates enterprises.
- The initial Web implementation uses `/enterprise` with role-specific in-page navigation. Private hooks, stores and components remain inside that feature. Chinese and English are native resources; other existing interface languages use the declared English fallback. Existing personal workspace routes remain available through an explicit return entry.
- The server rechecks source image bytes and approved versions, returns an authenticated material payload, and the client reuses JSZip to produce the ZIP. Packages are limited to 50 MiB. No extra ZIP dependency is added to the backend.
- Enterprise manual jobs are persisted independently of the original automatic channel flow. Original flow/task correlation remains task 6.1, to be completed with the selected real execution adapter; no legacy publishing queue is invoked merely to register a manual result, avoiding an unintended second execution.
- Deterministic cover/case/FAQ templates reuse approved knowledge and authorized photos. Case mode requires approved case knowledge and a photo. The renderer refuses overflow instead of silently truncating factual conditions. Output is uploaded through the existing asset pipeline and still needs content approval; this is separate from model generation, which now reuses the user-selected existing configured planner.
- Knowledge has a canonical entry ID and immutable revision sequence; content revisions have a canonical content ID, parent revision ID and revision number. `version` remains the separate optimistic state counter. Creation of a content revision accepts `sourceRevisionId`, not an ambiguous content-root input alias.
- Lead notification events are embedded durably in the lead write. In-app delivery is idempotent, retried from persisted pending events, and response/follow-up reminders are configurable. Notification acknowledgement does not claim a conversation. External notification providers are not configured or sent to by default.
- Enterprise builds suppress the shared bootstrap browser token. Server enterprise mode rejects the reserved shared bootstrap identity and marked initialization tokens, including API keys belonging to that reserved account; non-default JWT signing material is validated before enterprise mode starts. Existing single-user mode remains opt-in compatible. Existing shared deployments require explicit credential and ownership migration.
- Identity brand colors are preserved. Action-gradient stops and brand text ink are separated to meet the stated contrast target; the canonical changes are in Web DESIGN.md and globals.css. This is a surface-luminance correction, not a new brand direction.
- Original extension package inspection is evidence only: manifest/version/hash are recorded without installing or executing the extension. Static home-bridge matches do not by themselves prove or disprove dynamic private-domain support. Customer domain/account checks, extension source/redistribution/maintenance conditions, actual platform messages and customer acceptance remain open gates.

### Configured model reuse

The user selected reuse of the existing configured model service. Enterprise generation reuses `DraftGenerationPlannerService` and its configured default model/provider through an authenticated internal endpoint. It arranges complete approved-source paragraphs, title source and cover/case/FAQ layout; the server rejects missing sources, altered paragraphs, unsupported case layouts and excess length. This deliberately constrains free-form factual invention. Brand images remain the existing authorized-photo/Canvas template path; this entry does not create synthetic customer case images.

`enterpriseGenerations` is a durable task/attempt ledger. One request ID creates one attempt, explicit retry retains the business task ID, and interrupted calls become unknown instead of automatic retries. Provider request ID and available tokens are stored; cost stays null/unknown until an administrator reconciles a provider receipt. Reconciliation is immutable and deduplicated by enterprise/provider/request. `generationId` links saved content to its attempt. No live provider invocation is implied by mocked integration tests.
