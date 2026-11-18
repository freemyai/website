# Freemy 专属分享链接与联系入口 Implementation Plan

> **For agentic workers:** 使用 superpowers:executing-plans 或 superpowers:subagent-driven-development 按任务实施；每项先测试，再实现，再验证。

**Goal:** 增加稳定的双语作品短链、作品分享能力和 `ai@freemy.ai` 联系入口，同时保护现有 SEO 与展示体验。  
**Architecture:** 保留 Node 静态生成；短链注册表生成精确 Vercel 重定向；页面静态输出规范内容，前端渐进增强分享。联系页为双语静态内容，邮件通过固定 mailto 地址打开，不自建邮件后端。  
**Tech Stack:** 现有 Node ESM、HTML/CSS/浏览器 JS、node:test、Playwright、parse5、Vercel。  
**Spec:** 同目录 `01-产品与技术设计.md`。

## Global Constraints

- 不修改既有作品 canonical 与语言地址规则。
- 标准分享 URL 带尾斜杠；英文 `/{share_slug}/`，中文 `/zh/{share_slug}/`。
- 目标始终为本站对应详情页，不能由用户参数控制。
- `ai@freemy.ai` 是唯一对外联系邮箱。
- UI、反馈、元数据和联系页中英文同步。
- 不伪造复制、发布、访问、收信或测试完成结果。
- 不执行生产发布、DNS、外部消息等超出本次授权范围的动作。
- 现有 QA/关闭统计、源码权限判断、SEO 测试和 API 访问保护都必须保留。

## Review Focus

1. 分享别名误覆盖真实路径/API，或模板重定向吞掉未知页面（Tasks 2–3）。
2. 参数与语言切换导致分享错误作品/首页，或 A→B 弹窗保留旧状态（Tasks 4–5）。
3. 复制/系统分享被拒绝、被取消、缺少用户激活，仍提示成功（Task 4）。
4. 新联系方式扩大 safeExternalUrl 权限或把私人文字送入统计（Tasks 6、8）。
5. 本地构建正常，Vercel 实际路由、OG 或客户端模块缺失（Tasks 3、7、10）。

---

## Task 1：建立当前基线，避免重复修改

**Files:** 检查 `src/components.mjs`, `src/pages.mjs`, `src/catalog.mjs`, `src/i18n.mjs`,
`src/page-manifest.mjs`, `src/seo.mjs`, `src/structured-data.mjs`, `src/build.mjs`,
`assets/app.mjs`, `assets/analytics.mjs`, `vercel.json`, `package.json`；新增 `docs/share/baseline.md`。

**Interfaces:** 输入最新仓库与现有部署；输出可复现的基线和待改动点，不改变运行行为。

- [ ] 记录当前 commit、git status 和已有用户改动；不得 reset 或覆盖未提交内容。
- [ ] 执行现有 lint/typecheck/test/build/learning:audit/seo:audit，保存实际结果。
- [ ] 检查首页、对应中英文详情、合集、about、submit、已存在的 `/en/` 跳转。
- [ ] 记录不能访问/不能验证的项目；不把浏览器或网络工具失败说成站点故障。
- [ ] 提交仅基线文档，避免与后续功能混合。

## Task 2：稳定注册表与分享 URL 合同

**Files:** 新增 `data/share-aliases.json`, `src/share-links.mjs`, `src/share-manifest.mjs`,
`tests/share-links.test.mjs`；修改 `src/validate.mjs`。

**Interfaces:**
- `buildShareManifest(catalog, registry, pageManifest) -> {workId, locale, shareSlug, sharePath, canonicalPath}[]`
- `shareUrlFor(entry) -> absoluteHttpsUrl`，origin 固定为 site-config 中的正式域。
- `validateShareRegistry(catalog, registry, pageManifest) -> void`，不合格时抛明确错误。

- [ ] 写失败测试：hydraulics 双语路径准确；不改变 existing canonical；注册表顺序不影响输出。
- [ ] 写失败测试：重复别名、保留名、静态/API 冲突、跨域 target、候选作品、未知 work_id 被拒绝；retired 别名不能复用。
- [ ] 实现纯 URL/清单函数，注册表读取留在构建侧；不得让浏览器代码依赖 node:fs。
- [ ] 运行 `node --test tests/share-links.test.mjs`；预期全部通过。
- [ ] 初次为已发布作品生成并审核注册表，提交代码、数据和测试。

## Task 3：精确重定向与构建前检查

**Files:** 新增 `scripts/sync-share-routes.mjs`, `config/share-redirects.json`,
`tests/share-routes.test.mjs`；修改 `vercel.json`, `package.json`, `src/build.mjs`。

**Interfaces:**
- `buildShareRedirects(shareManifest) -> {source,destination,permanent:true}[]`
- `npm run share:sync`：本地编辑流程同步已审核注册表及受管理的精确路由。
- `npm run share:check`：只读核对，不修改配置，不访问网络。

- [ ] 写失败测试：标准英文/中文短链都直接映射到规范详情；有/无尾斜杠有明确处理；旧规则保持不变。
- [ ] 写失败测试：保留全部 headers/functions/trailingSlash、未知根路径不产生路由、不会拼接任意外站、不会循环。
- [ ] 同步脚本只管理自身生成的规则集合，使用上一份受管理清单区分现有手工规则，生成稳定排序；不得删除不属于它的配置。
- [ ] 普通 build 调用检查但不重写 vercel.json。统计路由数量并与当前平台限制核对；不要把 Bulk 专用字段写进普通 redirects。
- [ ] 运行 `node --test tests/share-routes.test.mjs` 与 `npm run share:check`；预期全通过且第二次同步没有 diff。
- [ ] 提交配置与生成结果。部署平台输入必须已包含规则，不能假设 build 过程中修改根配置会被重新读取。

## Task 4：分享控制器与失败回退

**Files:** 新增 `assets/share.mjs`, `tests/share-controller.test.mjs`；修改 `src/build.mjs`。

**Interfaces:**
- `createShareController({copyText,nativeShare,notify,track})`
- `.copy(payload, locale) -> Promise<{status:'copied'|'manual',url}>`
- `.native(payload, locale) -> Promise<{status:'returned'|'cancelled'|'unsupported'|'failed'}>`
- payload 使用构建时生成的 `workId,titleZh,titleEn,summaryZh,summaryEn,shareUrlZh,shareUrlEn,canonicalUrlZh,canonicalUrlEn`。

- [ ] 写失败测试：从中文卡片在中文首页分享，URL 必须指向该作品中文短链，不是 location.href；英文同理。
- [ ] 模拟剪贴板成功、拒绝、API 不存在；只有成功才通知已复制；其他情况提供可选中的 URL。
- [ ] 模拟 native share resolve、AbortError、NotAllowedError、不支持；取消静默，失败不自动启动第二次分享。
- [ ] 实现能力检测与显式调用；调用前不等待网络/截图生成，不读取剪贴板。
- [ ] 将新模块纳入 build，运行测试并检查 dist 文件与 import 路径存在；提交。

## Task 5：卡片、预览和详情的一致分享入口

**Files:** 修改 `src/components.mjs`, `src/pages.mjs`, `src/i18n.mjs`, `assets/app.mjs`, `assets/style.css`；
新增 `tests/share-rendering.test.mjs`, `tests/share-browser.mjs`。

**Interfaces:** `renderShareControls(payload, locale, placement)`；统一使用 Task 4 控制器。

- [ ] 写失败渲染测试：卡片有独立 button，不嵌套在 anchor 内；详情有无 JS 可读的分享地址；只输出公开 payload。
- [ ] 在三处放分享入口，保持体验作品为主按钮，源码/学习入口原样保留；手机不堆叠一排社交 Logo。
- [ ] 快速预览内使用内嵌分享区，不再叠加第二个 modal；为列表/详情提供焦点管理和 aria-live 反馈。
- [ ] 浏览器测试 A→B→关闭再开，链接/标题/另一语言/二维码全部同步；点击分享不额外触发体验/预览事件。
- [ ] 对新增覆盖层挂接曝光暂停/恢复逻辑，验证被遮挡卡片不累计曝光。
- [ ] 运行渲染/交互测试及 1440/768/390 宽度检查；保存截图并提交。

## Task 6：双语联系页与邮箱辅助入口

**Files:** 修改 `src/site-config.mjs`, `src/pages.mjs`, `src/components.mjs`, `src/i18n.mjs`,
`src/page-manifest.mjs`, `src/seo.mjs`, `src/structured-data.mjs`, `src/build.mjs`, `assets/share.mjs`；
新增 `src/contact.mjs`, `tests/contact.test.mjs`。

**Interfaces:**
- `CONTACT_EMAIL = 'ai@freemy.ai'`
- `buildMailto({kind,locale,work}) -> string`，kind 为 general/partnership/submission/correction。
- `contact(lang, seo) -> html`；页面 kind=`contact`。

- [ ] 写失败测试：contact 双语路径、自指 canonical、hreflang、sitemap 与 page renderer 均被支持，不退回 404 元数据。
- [ ] 写失败测试：固定收件人；标题含中文、&、引号、问号时编码正确；外部输入不能增加 cc/bcc 或邮件头。
- [ ] 添加页脚邮箱和 Contact 链接、About 合作区、Submit 邮箱备选、详情纠错链接；文案使用设计文件。
- [ ] 邮件用受控 mailto helper，不扩大 safeExternalUrl 协议白名单；复制邮箱复用失败回退。
- [ ] 修订隐私说明，仅描述真正收集的点击，不收邮件内容。无自动发邮件或邮件确认承诺。
- [ ] 执行测试和 SEO audit；收发验证列为站长验收事项，未完成则明确标注；提交。

## Task 7：分享图、二维码与素材清单

**Files:** 复用/修改 `src/seo.mjs`, `scripts/generate-og.mjs`, `src/build.mjs`；
按需新增 `assets/share-qr.mjs`, `scripts/export-share-index.mjs`, `tests/share-assets.test.mjs`。

**Interfaces:**
- `exportShareIndex(catalog,shareManifest) -> {work_id,title,creator,locale,share_url,canonical_url,demo_url,preview_url}[]`
- 输出 `reports/share/share-index.json` 与 `reports/share/share-index.md`；默认不复制到公开 dist。

- [ ] 写失败测试：每件已发布可分享作品双语各有一条记录；任何草稿、私人审核信息或后台路径不能进入导出。
- [ ] 检查现有 OG 生成图是否对应作品；优先复用，不把缺图硬替换为另一件作品图。
- [ ] 若实现二维码，固定版本并核查许可证，按需加载；QR 编码等于所选语言短链，包含正常 quiet zone。
- [ ] 本机程序解码核对 QR 数据，再用真实手机扫码核对最终作品；没有后者不能声称真机验证。
- [ ] 不承诺任何平台一定生成卡片。生产实测与缓存问题记录到报告；必要时可复制规范详情地址作为回退。
- [ ] 运行资产/索引测试并提交；二维码可在第二批独立完成。

## Task 8：统计语义与隐私

**Files:** 修改 `assets/analytics.mjs`, `assets/share.mjs`；检查 `api/insights.mjs` 及相关统计测试/报告映射；
新增 `tests/share-analytics.test.mjs`。

**Interfaces:** 复用 `createTracker`，新增设计中的固定事件与 placement 白名单。

- [ ] 测试 production/qa/off、未知事件、任意 URL/email/body 等输入全部按现有原则限制。
- [ ] `share_copy` 只在写入成功后触发；`contact_click` 只表示打开邮件客户端请求；不能用页面通用点击代理提前发成功事件。
- [ ] 每次行为最多一次；工作 ID 稳定，语言/入口可区分；复制跨语言链接时 placement 同时能解释被复制链接语言。
- [ ] 更新私有后台事件中文名与说明，但不破坏 API 鉴权、不公开原始用户数据。
- [ ] 验证网络发送和后台入库；若无后台权限，记录已完成范围，不能用 `send()` 返回值证明入库成功。
- [ ] 测试统计不可用时功能仍然可用，提交。

## Task 9：浏览状态恢复与首页合集（P1，单独提交）

**Files:** 修改 `assets/app.mjs`, `src/pages.mjs`；按需增加 `data/home-featured-collections.json`；
新增 `tests/navigation-state.test.mjs`。

**Interfaces:** `sort` 仅接受 featured/recent；现有 q/open_source/learning_note 继续支持。

- [ ] 测试返回列表后，搜索、筛选、排序和位置恢复；不恢复到外域、后台或不存在路径。
- [ ] 将 recent 排序写入 URL，默认 featured 不必写；history.replaceState 保留已有 history.state。
- [ ] 用 pagehide/pageshow 与必要的短生命周期 sessionStorage 实现回退，不写永久跟踪标识；处理存储禁用。
- [ ] 首页合集改为显式编辑精选清单，保留原有内容与类别；不要加入虚假热度或日期。
- [ ] 测试不影响 SEO canonical，分享复制仍只输出作品短链，提交。

## Task 10：全量与生产验收

**Files:** 新增 `scripts/check-share-links.mjs`, `tests/share-live-check.mjs` 或扩展现有 live audit；
新增 `docs/share/release.md`, `docs/share/rollback.md`。

**Commands:**
```
npm ci
npm run lint
npm run typecheck
npm test
npm run share:check
npm run build
npm run learning:audit
npm run seo:audit
npm run share:audit
```
`share:check` 与 `share:audit` 是本轮新增命令，不能在未实现时报告它们通过。
现有浏览器测试沿用仓库 README 的启动流程；PowerShell 参数问题按 README 处理。

- [ ] 静态审计所有 published 作品：注册表、短链、canonical、OG、双语、媒体、模块引用完整。
- [ ] 本地浏览器验证三尺寸、键盘、无 JS、Clipboard 拒绝、native 取消、重复弹窗、统计 off/qa。
- [ ] 获得发布授权后，使用实际 Vercel 部署核查 GET/HEAD：短链 308、最终 200、未知路径 404、学习锚点、查询参数和旧地址不受影响。
- [ ] 标准带斜杠分享地址目标一跳；无斜杠因平台规范化最多允许一次额外跳转，不允许循环或跳外站。
- [ ] contact 页正常；未经授权不测试发送。由站长从外部邮箱验证收信/回复，未验证则标记待办。
- [ ] 交付 commit、实际命令输出、截图、链接索引、平台分享/邮件未验事项、回滚操作。
- [ ] 回滚不得重新分配已经传播的别名；优先禁用有问题的 UI，尽量保留已发布短链的可用性。
