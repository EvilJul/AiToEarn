# enterprise-ops

企业模式独立业务模块，默认关闭。所有交互 API 在 `/enterprise-ops/enterprises/:enterpriseId/` 下重新验证用户成员关系及角色，Controller/Service/Repository 分层；实体使用当前业务库的独立集合。

- enterprise.*：企业、四角色成员、共享身份拒绝策略、审计与 HTTP 409。
- resources.*：显式授权个人账号/素材、企业内共享及撤回；不迁移原个人资源。
- operations.*、content.service：知识业务版本、选题、图文修订、哈希审核、来源读取。
- publishing.service：人工任务、鉴权素材包、回填/核验、显式再次发布。
- executors.*：独立关闭的浏览器执行协议、账号串行租约、最终提交许可、回执幂等与未知结果保护。
- conversations.service：人工消息、知识原文建议、规则意向线索与原子接管，不调用可执行创作 Agent。
- notifications.service：线索中嵌入持久事件，站内投递幂等/重试、响应和跟进提醒、通知已读。
- maintenance.service：知识到期与未提交任务阻断。

`version` 是状态并发计数；知识 `revision` 和内容 `revisionNumber` 是不可变业务修订序号。批准/执行检查实际图片摘要，素材包上限 50 MiB。原自动发布 flow/task 的映射尚未接入，不能将企业任务等同旧渠道任务。

企业模式要求正常成员登录及非默认的至少 32 字符 JWT 签名材料；保留的共享初始化身份不能访问企业部署。个人模式默认行为保留。实际供应商连通性、完整浏览器驱动及自动平台消息是单独验证门槛，不能由 UI 或能力声明代替。

验证入口：Nx 的 aitoearn-server:test；完成服务构建后运行 `node apps/aitoearn-server/tests/enterprise/mongodb.integration.cjs`，连接独立本机临时 MongoDB 27028。该脚本只创建/删除自身随机命名测试数据库，使用明确的身份和存储夹具，不代表真实平台账号联调。

企业 AI 编排复用现有默认规划模型：选择已批准资料后生成，人工确认文案，再使用授权照片/品牌模板配图并保存审核。完整段落按来源校验，缺少依据不补造事实。生成任务和每次显式重试保存在用量记录，关闭编辑器不取消服务端任务；未确认调用不自动重试。已知 tokens 和供应商请求 ID 按返回记录，费用未知时不记零；管理员可依据供应商凭证调用 `POST /enterprise-ops/enterprises/:enterpriseId/usage/:id/reconcile` 提交 `cost/currency/reference` 对账，相同凭证与金额可幂等重放，冲突被拒绝。
