# 企业工作台实施验证记录

本记录区分本地实现证据和客户真实验收。OpenSpec 变更为 `build-xiaohongshu-enterprise-workspace`，schema 为 `spec-driven`，当前完成 64/96 项。未完成项包含已选定但未实现的自建扩展，以及尚无外部条件的真实验收，不应直接归档。

## 已通过的检查

- Web：在 `project/aitoearn-web` 执行 `pnpm run type-check`、受影响 ESLint、`NEXT_PUBLIC_ENTERPRISE_OPS_ENABLED=true pnpm build`，均成功。构建包含完整 lint/type 检查，未使用跳过检查参数。
- Backend：在 `project/aitoearn-backend` 使用 Nx 对 `aitoearn-server`、`aitoearn-ai` 构建及依赖构建，均成功。受影响 ESLint 无错误；直接运行 ESLint 时 Nx 报未找到缓存图谱并跳过模块边界规则，此项不算图谱规则已验证。
- 后端企业单元测试：22/22 通过，覆盖权限、知识有效性、审核与发布边界等。
- AI 规划桥接测试：1/1 通过，确认复用配置中的默认规划模型、返回供应商请求 ID 和 tokens、禁止隐藏重试、不传个人记忆或工具。供应商返回为测试桩。
- MongoDB/Nest 集成：独立临时数据库验证四角色、两企业隔离、资源授权、不可变修订、图片替换、幂等发布、租约、未知结果、重复消息、持久通知和接管竞争；新增生成幂等、无来源事实拒绝、显式重试、已知/未知费用及重复对账拒绝。完整模块使用 Nest HTTP 验证 DTO/权限和业务冲突。
- 十份明确标注的合成样稿完成知识、选题、生成、退回/批准、素材导出、人工链接回填与人工核验。生成供应商使用测试桩，链接为合成值，未向平台发布。
- Playwright：14/14 通过，覆盖企业流程、图片上传 ID、FAQ/案例模板、AI 编排及来源保存、人工 ZIP、日历、移动端接管、原多平台导航/发布入口、共享引导 Token 隔离、扩展冲突和主题文字对比度。
- OpenSpec strict validate、`node --check scripts/init.mjs` 和 `git diff --check` 通过。

## 可复现命令

后端在工作区执行 `pnpm nx run-many -t build -p aitoearn-server aitoearn-ai`。受限环境已使用工作区安装的 Nx 二进制和独立临时 Nx 缓存执行同一目标，未关闭包管理器签名检查。

企业单元检查：`pnpm exec vitest run --config apps/aitoearn-server/vitest.config.mts apps/aitoearn-server/src/core/enterprise-ops`。

规划桥接检查：`pnpm exec vitest run --config apps/aitoearn-ai/vitest.enterprise.config.mts`。独立配置避免依赖原配置指向但仓库内缺失的 `test/setup.ts`，不改变原有测试目标。

集成 runner 为 `apps/aitoearn-server/tests/enterprise/mongodb.integration.cjs`，依赖先完成构建及本机专用 Mongo `127.0.0.1:27028`；只创建和清理自身随机命名的测试数据库。鉴权 actor、素材、账号与模型调用使用明确的测试替身。它不等于客户 JWT、对象存储、模型或平台真实联调。

浏览器测试配置为 `project/aitoearn-web/tests/enterprise/playwright.config.ts`。预览使用企业开关、`NEXT_PUBLIC_API_URL=/api` 和本机 6061 端口；API 通过 fixtures 拦截，并屏蔽外部站点请求。执行 `pnpm exec playwright test --config tests/enterprise/playwright.config.ts`。该配置已忽略 `personal-regression.spec.ts`。原先在企业构建内点击原导航，不能代替关闭企业模式的 13.8。

关闭企业模式回归使用 `tests/enterprise/playwright.personal.config.ts`，预览命令为 `NEXT_PUBLIC_ENTERPRISE_OPS_ENABLED=false NEXT_PUBLIC_API_URL=/api pnpm exec next dev -p 6062`。执行 `pnpm exec playwright test --config tests/enterprise/playwright.personal.config.ts tests/enterprise/personal-regression.spec.ts tests/enterprise/execution.spec.ts tests/enterprise/protocol.spec.ts`。2026-10-24 在 `project/aitoearn-web` 先通过 `pnpm run type-check`，随后上述 Playwright 8/8 通过。13.8 覆盖原导航、既有草稿标题、AI 生成素材、发布页“新建作品”和浏览器插件弹窗；直接打开 `/zh-CN/enterprise` 时侧边栏仍保留原导航，不出现“企业工作台”入口。8.3/8.5 使用协议样本和页面内测试扩展：领取与续租发生，媒体 File 与 URL、话题分开传递，自动提交保持关闭；插件回调成功时页面显示“结果未知”，不显示“发布已核验”。未安装真实 CRX，未使用真实小红书账号，未调用 `authorize-submit` 或旧渠道 flow/task。`PublishJobVo` 增加的租约字段用与网页相同的 Zod 3.25 模式核对了缺省、null 和日期，未因此重跑完整 Mongo 集成。

## 界面证据

截图位于根目录 `output/playwright/`，该运行输出目录已忽略：`enterprise-overview-light.png`、`enterprise-mobile-service.png`、`enterprise-topics-dark.png`、`enterprise-template-faq.png`。可重新运行浏览器测试生成。截图内演示企业名称明确标注自动化测试。

对比度检查同时覆盖浅深主题。正文/背景最低约 4.74，动作渐变端点与白字约 5.68–5.81，浅色品牌文字约 5.93，深色品牌文字约 7.27。

## 已实现能力与边界

企业路由提供按角色的资料、选题、内容审核、发布管理、人工咨询/线索及设置；真实后端接口执行归属与权限。图片直传、现有素材、封面/案例/FAQ 模板保留资源 ID 和实际图片摘要。批准绑定不可变修订；素材变化或知识撤回会阻断未执行发布。

按用户选择复用现有配置模型，企业生成复用既有规划器的提供商和默认模型。输出限定为批准资料的完整段落编排，服务端校验来源，返回图片版式建议；未实现任意自由改写或合成客户案例。使用文案后保存 `generationId` 和知识版本引用，仍须人工审核。模型真实可用性与实际费用尚未进行外部验证。

模型任务持久化，每次显式重试独立记录并关联业务任务；未确认调用不会自动重试。当前提供商接口不返回实际账单金额，费用保留 null/unknown。管理员可按供应商请求凭证对账；金额冲突与同一请求重复计费被拒绝。

人工发布使用已审素材包、合法平台链接回填及独立核验。自动执行协议默认关闭；本仓库尚无独立扩展源码。第三方 CRX 只做静态清单审查，没有安装或执行；版本、哈希、权限与站点匹配证据见 `capability-register.md` 和 `plugin-package-manifest.json`。

咨询默认为人工录入及原生工作台处理。回复建议读取批准资料，站内通知、超时提醒、唯一接管与跟进可用；未接入评论/普通私信/小程序客服自动收发，未发送外部通知。

## 仍需完成

- G0：企业行业/地区/时区、正式部署域名、浏览器与设备、授权账号。插件路线已定为自建；原插件安装和账号验证保持 not_tested。第 9、12 节未选。
- 执行联调：任务 6.1 仍不把人工任务映射进旧渠道发布队列。8.3/8.5 已用本地协议样本连接领取、租约、进度、取消和错误映射；真实浏览器驱动、授权账号和选定插件路线仍未执行。自动提交保持关闭。
- 渠道：评论、普通私信、小程序客服的 receive/send/autoReply 均关闭，结论为 blocked。正式接口文档、客户授权、回调/收发限制和真实会话样本仍缺失，第 12 节不实施。
- 验收：实际模型连通、企业授权的十份知识样稿与三篇真实发布、客户设备兼容、真实销售试点、部署回退及备份恢复演练。关闭企业模式后的原导航、素材、发布入口和插件接入已有本地回归，不等于第 14 节客户验收。
- 交付：所选插件版本及许可证/维护安排、完整依赖/字体/镜像许可、供应商真实费用与人工时记录。已有手册和直接复用依赖许可说明不能替代这些记录。

尚未执行部署、真实发布、真实模型调用、客户会话发送或 OpenSpec archive。临时预览和测试 Mongo 容器在检查后停止；测试仅删除自身随机数据库。
