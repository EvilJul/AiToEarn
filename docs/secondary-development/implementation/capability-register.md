# 企业模式能力验证登记

## 当前路线

采用“人工发布与人工咨询先行，浏览器协议独立实现”的本地实施路线。原插件复用、授权改造、自建 DOM 执行仍为条件分支；未安装原插件、未取得企业域名和授权账号，不能断言原插件不支持，也不据此立即选择完整重写。

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
- 原插件源码、许可证和独立分发维护授权：not_tested，尚无对应来源材料；Web MIT 不作为替代。
- 小红书评论自动接收/发送：blocked，现有插件调用仅 source，客户授权及真实链路未提供。
- 普通私信接收/发送/自动回复：blocked，未提供客户权限及完整契约。
- 小程序客服接收/发送/自动回复：blocked，未提供客户应用、权限及回调配置。
- 热点自动数据源：not_tested，首期采用人工来源及常青选题。
- 模型调用：not_tested，本地开发不调用外部模型。

## 交付分支

第 9 节仅在原插件复用或授权改造路线确定后执行；第 10 节完整浏览器扩展仅在前两路线不能满足交付时执行；第 12 节仅取得选定渠道权限和文档后执行。其余不依赖外部账号的企业基础、UI、审核和人工业务继续。条件任务保持未勾选，不删除验收要求或伪造成功。

## 原插件安装包清单核查

仓库配置的 OSS 入口返回 Manifest V3、版本 3.3.11 的 CRX。SHA-256 与清单保存在 plugin-package-manifest.json。未安装或运行扩展；Chrome 标准配置目录中未发现商店 ID 对应安装记录，不代表所有浏览器均未安装。

host_permissions 为 all_urls，但网页桥接 content_script_home 的静态 matches 仅列原站及若干 localhost 地址，未列企业自定义域名；localhost:6061 在名单中，127.0.0.1:6061 不在该静态名单中。通用 agent 脚本匹配全部站点，不等于企业 Web API 已注入。仍需确认动态注册或站点授权机制，不能仅凭 manifest 认定私有域名可用或绝对不可用。

包内找到第三方库 LICENSE 文本，未据此取得扩展自身源码、修改及独立分发授权。现阶段不复制安装包代码或自动安装扩展。原包可作为复用验证候选；客户域名、登录账号及维护/授权条件仍是 G0 未完成项。
