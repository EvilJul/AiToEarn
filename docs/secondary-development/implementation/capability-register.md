# 企业模式能力验证登记

## 当前路线

插件路线定为自建扩展 `project/aitoearn-extension/`。人工发布和人工咨询在扩展完成前继续可用。原插件复用和授权改造不进入本次实现。未安装原插件、未取得企业域名和授权账号，不能把原插件写成 unsupported。

## 证据分类

- source：仅代码存在，不代表可执行。
- local-test：本地自动测试或演示样本通过。
- authorized-live：企业授权账号真实操作；必须含脱敏结果和操作者。
- customer-acceptance：在客户目标域名和设备验收。

记录字段：能力、企业/账号类型、部署域名、Web/扩展版本、来源、依赖、操作、证据路径、失败原因、结论、下一步。结论仅使用 verified/unsupported/blocked/not_tested；每项同时保存证据分类。

## 本地复用清单

- 认证：`project/aitoearn-backend/libs/aitoearn-auth/src/aitoearn-auth.guard.ts`，复用 GetToken 用户上下文；新增企业成员权限，不把认证当企业鉴权。
- 数据：`project/aitoearn-backend/libs/mongodb/src/mongodb.module.ts`，业务库默认连接；企业数据使用独立集合与归属索引，不改个人数据。
- 素材：`libs/mongodb/src/repositories/asset.repository.ts`、`material.repository.ts`，提供所有者查询；企业绑定必须显式授权。
- 生成：`apps/aitoearn-ai/src/core/draft-generation/draft-generation-planner.service.ts`；模型凭据与真实调用尚未验证。
- 发布：`apps/aitoearn-server/src/core/channels/publish/tasks/publish-state.service.ts`；小红书 provider 处理作品链接，浏览器发布依赖插件。
- 网页插件：`project/aitoearn-web/src/store/plugin/store.ts`、`types/baseTypes.ts`、`constants.ts`，已有权限/版本/登录/发布调用契约及下载入口。
- UI：`src/components/ui/`、`src/components/common/`、局部 zustand 和 `src/utils/request`；遵循 PRODUCT.md/DESIGN.md，不新建全局工具目录。

图谱 MCP list_projects 当前未包含本仓库，故本次回退文件阅读。

## 环境参数

行业、服务城市、小红书账号类型与数量、企业目标域名、通知渠道、客户插件版本：待客户提供。企业时区默认 Asia/Shanghai，可配置。无锡仅原需求示例，不作为系统默认业务区域。

## 外部能力状态

- 原插件企业域名接入及图文发布：not_tested，缺安装及授权账号。
- 原插件源码、许可证和独立分发维护授权：blocked。只有 CRX 3.3.11 静态清单和包内第三方库许可文本，没有源码、构建方法、修改权、独立分发许可和维护安排。Web MIT 不作为替代。因此选定自建，不把原插件标成 unsupported。
- 小红书评论自动接收/发送：blocked，现有插件调用仅 source，客户授权及真实链路未提供。
- 普通私信接收/发送/自动回复：blocked，未提供客户权限及完整契约。
- 小程序客服接收/发送/自动回复：blocked，未提供客户应用、权限及回调配置。
- 热点自动数据源：not_tested，首期采用人工来源及常青选题。

## 客服渠道 receive/send/autoReply

核对范围只包括评论、普通私信、小程序客服。`conversations.service.ts` 的 `capabilities()` 对 `ServiceChannel` 全部返回 `receive/send/autoReply=false`、`manualEntry=true`、`validation=not_tested`。仓库没有小红书客户收件、发送或自动回复契约，也不猜测平台端点。下表三个渠道均关闭，不表示人工录入已开通为平台自动渠道。

| 渠道 | receive | send | autoReply | 结论 |
| --- | --- | --- | --- | --- |
| 评论 `rednote_comment` | 关闭 | 关闭 | 关闭 | blocked |
| 普通私信 `rednote_dm` | 关闭 | 关闭 | 关闭 | blocked |
| 小程序客服 `rednote_miniapp_service` | 关闭 | 关闭 | 关闭 | blocked |

- 模型调用：not_tested，本地开发不调用外部模型。

## 交付分支

适用分支：第 10 节自建扩展是本次插件实现；第 9 节原插件复用和授权改造未选；第 12 节自动消息未选，三个客服渠道保持关闭。未选任务保持未勾选。第 10 节在扩展按规格实现前也保持未勾选。人工发布继续可用。

## 原插件安装包清单核查

仓库配置的 OSS 入口返回 Manifest V3、版本 3.3.11 的 CRX。SHA-256 与清单保存在 plugin-package-manifest.json。未安装或运行扩展；Chrome 标准配置目录中未发现商店 ID 对应安装记录，不代表所有浏览器均未安装。

host_permissions 为 all_urls，但网页桥接 content_script_home 的静态 matches 仅列原站及若干 localhost 地址，未列企业自定义域名；localhost:6061 在名单中，127.0.0.1:6061 不在该静态名单中。通用 agent 脚本匹配全部站点，不等于企业 Web API 已注入。仍需确认动态注册或站点授权机制，不能仅凭 manifest 认定私有域名可用或绝对不可用。

包内找到第三方库 LICENSE 文本，未据此取得扩展自身源码、修改及独立分发授权。现阶段不复制安装包代码或自动安装扩展。原包可作为复用验证候选；客户域名、登录账号及维护/授权条件仍是 G0 未完成项。
