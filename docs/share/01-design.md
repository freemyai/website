# Freemy 分享与联系：设计与范围

## 1. 目标及当前事实

Freemy 目前已有每件作品的域内详情页。源码中的作品 slug、卡片详情链接、
SEO canonical 与分享图片可直接复用。本轮不是重新建作品页，而是将分享作为明确的产品能力。

截至基线提交，已读到：
- `src/components.mjs`：卡片、预览弹窗、源码学习入口、页头页脚；未见作品分享与联系邮箱入口。
- `src/pages.mjs`：首页输出整个画廊；首页合集仍使用 `slice(0,2)`；详情已有相关推荐、来源和学习说明。
- `src/seo.mjs`：已有每件作品 OG/Twitter 元数据与作品预览回退。
- `assets/app.mjs`：搜索和源码/学习筛选写入 URL；当前排序没有同样写入 URL；已有曝光统计。
- `vercel.json`：`trailingSlash:true`、`cleanUrls:true`，`/en` 与 `/en/` 跳转到根首页，另有私有统计 API 配置。
- `src/build.mjs`：显式复制前端模块、媒体、图标；新增模块必须纳入输出。

网站公开抓取存在缓存。本轮未进行真人浏览器视觉验收，未验证新的短链、联系页或邮箱收发。

## 2. 选择方案

比较三个方案：
1. 只增加复制现有详情页 URL：改动最少，但不满足短地址的品牌表达。
2. 新增短地址别名，永久跳转到现有详情页：推荐。保留现有 SEO 与历史链接。
3. 将根路径短地址改成全部作品的 canonical：需要全站迁移，不纳入本轮。

根路径短地址先承担“易记、易分享”的作用。打开后浏览器可能显示更长的既有详情地址，
但仍在 freemy.ai 域下。不要同时承诺“308 跳转”与“地址栏始终不变”。
若将来明确要求地址栏保留短路径，应另行设计重写或 URL 迁移，不临时叠加两套规范地址。

## 3. URL 合同

| 用途 | 英文 | 中文 |
|---|---|---|
| 既有首页 | `/` | `/zh/` |
| 既有详情 canonical | `/en/works/{slug}/` | `/works/{slug}/` |
| 新增作品分享别名 | `/{share_slug}/` | `/zh/{share_slug}/` |
| 新增联系页 canonical | `/en/contact/` | `/contact/` |

- 示例：`/hydraulics/` → 308 → `/en/works/hydraulics/`。
- 示例：`/zh/hydraulics/` → 308 → `/works/hydraulics/`。
- `#learning` 由浏览器处理，不能期望服务端收到 fragment；需实际测试跳转后的锚点定位。
- 英文根短链不依 IP、浏览器语言或 localStorage 改目标。中文链接显式带 `/zh/`。
- 复制“当前语言链接”时，选择对应分享别名，不复制当前首页 URL、筛选参数或个人追踪标识。
- 默认不给普通用户分享 URL 加 UTM/cid。可在以后受控运营流程里另行加 campaign ID。
- 任意 `?url=`、`?target=`、`?next=` 都不得影响目的地址；它不是通用短网址服务。

### 3.1 稳定性

新增 `data/share-aliases.json`，用稳定 `work_id` 关联 `share_slug`，不要每次从中文标题重新生成。
初始优先复用现有 slug；名称翻译、展示标题变化不改变分享别名。

注册表条目：`work_id`, `share_slug`, `previous_slugs`, `state`。
`state` 为 `active` 或 `retired`。已退役条目的名字仍被保留，不能分配给另一件作品。

冲突策略：
- 首段保留名至少包括：`en`, `zh`, `works`, `explore`, `collections`, `types`, `categories`,
  `about`, `contact`, `privacy`, `submit`, `api`, `admin`, `insights`, `assets`, `media`, `og`,
  `_vercel`, `.well-known`, `404`, `robots.txt`, `sitemap.xml`, `feed`, `rss`, `search`, `w`, `s`。
- 同时与页面清单、静态资源与当前路由核对。名单不是替代实际冲突检测。
- slug 仅使用小写字母、数字和中划线，长度 1–80；连续和首尾中划线不允许。
- 冲突时验证失败，编辑明确指定替代值（例如 `hydraulics-lab`），不静默覆盖。
- 只有已发布作品可获得 active 分享别名；草稿、候选不可暴露。
- 原站暂时失效不删除 Freemy 详情或分享链接；显示不可用状态与相关作品。
- 内容被正式删除时，不把旧链接送往不相干首页；返回真实 404，或经明确规划的 410。

### 3.2 重定向实现

默认使用现有 `vercel.json.redirects` 的精确映射，复用部署架构。

- 同时处理有/无尾斜杠；标准分享 URL 固定带尾斜杠。优先保证标准 URL 一跳到规范详情。
- 不生成 `/:slug` 全域兜底，不抢占 `/contact/`、静态资源、私有 API 或未来页面。
- 统一从注册表生成精确规则；保留原有 `/en/`、headers、functions、cleanUrls、trailingSlash。
- 同步脚本在提交/部署输入前运行。`npm run build` 不得悄悄重写已经被部署平台读取的 vercel.json。
- 生成规则文件随提交保存；检查模式验证文件与数据一致，发现遗漏或漂移即失败。
- 统计总路由数，按部署时官方限制检查；不要采用旧教程中固定的限额作为永久事实。
- 普通配置方式与 Bulk Redirects 的字段不能混用。尤其 `preserveQueryParams` 是 Bulk 规则字段。
- 若将来接近上限，再评估 Bulk Redirects 或映射路由；确认套餐后单独实施，不擅自升级。
- 查询参数是否在普通配置下保留以部署实测为准。需要保留的 campaign 参数必须列入验收。
- 未知别名仍 404，不改变现有安全边界。

## 4. SEO 与社交预览

- 原 canonical、hreflang 与 sitemap 的作品地址不变。
- 分享别名不加入 sitemap、不生成第二份可索引 HTML、不设为站内主要导航地址。
- 作品卡片标题链接、面包屑、相关作品继续使用 canonical；分享按钮输出短别名。
- 308 响应跳转到有 SSR/静态 head 的详情页，不用客户端 location 跳转代替 HTTP 重定向。
- canonical 与 og:url 保持最终规范地址；OG 标题、摘要、图片应对应这一件作品。
- 现有 1200×630 分享图可复用；有文字叠加且需要翻译时再生成 zh/en 版本。
- 不能用别的作品截图作为缺图回退；优先该作品预览，再使用明确的品牌占位图。
- 微信等平台的标题/缩略图行为需单独验收，不承诺加了 OG 就在所有客户端一致。
- `/contact/` 与 `/en/contact/` 是真实内容页，建立各自 metadata、语言对应、面包屑和正常 sitemap 条目。

## 5. 分享交互

### 5.1 入口

首页/列表卡片增加一个轻量“分享”按钮；不得覆盖画面、挤压“体验作品”或移除源码学习入口。
快速预览和详情页也提供分享。文案不要只依赖鼠标悬停。

分享选项：
1. 复制当前语言链接。
2. 复制另一语言链接（明确标明中文/English）。
3. 系统分享（检测可用时展示）。
4. 分享到 X（经当前官方入口/真实浏览器验证后启用，只打开可编辑草稿）。
5. 显示二维码（第二批可交付，不阻塞复制短链）。

不在所有卡片旁并排摆放多枚社交平台图标。

### 5.2 浏览器行为

- 首次用户动作只展开菜单；系统分享/复制动作来自对应按钮的直接点击，不等待网络再调用。
- `navigator.clipboard.writeText()` resolve 后才提示“已复制”，并记录复制事件。
- 不支持或被拒绝时展示只读文本输入框与“手动复制”说明；不假装复制成功。
- 不读取用户剪贴板。无 JS 时仍能到作品详情，详情有普通文本分享地址。
- `navigator.share` 不可用时保留复制；用户取消 `AbortError` 不弹错误、不再次自动触发。
- 原生分享 Promise 返回不证明已发布或已被接收；统计事件按实际观测命名。
- X 文案使用当前语言的准确标题、简短介绍与分享地址；不自动提交、不要求 OAuth。
- 图片/文件分享仅在后续 `canShare` 能力与素材使用依据确认后开启，本轮 URL 分享即可。
- 二维码使用本地打包的固定版本依赖，在打开菜单时按需生成；不调用外部二维码服务。
- 二维码含公开短链，不含用户 ID、会话 token 或后台地址。
- 预览 A→关闭→预览 B 后，全部分享内容必须变为 B；不残留 A 的文案、二维码或链接。
- 分享控件不嵌套在 preview `<a>` 中，点击不能同时打开预览/原站；避免两个模态窗口互相困住焦点。
- 预览内以同一弹窗的内嵌分享区实现；列表/详情可用非嵌套的 accessible popover 或菜单。
- 开启覆盖层时暂停被遮挡卡片的曝光计时，沿用现有监控约束。
- Esc 关闭、焦点归还、aria-label、aria-live 反馈、触屏足够大点击区域都需测试。

## 6. 联系信息

统一配置 `CONTACT_EMAIL = 'ai@freemy.ai'`，不要散落多个硬编码地址。

### 6.1 放置位置

- 全站页脚：`合作与联系 · ai@freemy.ai` / `Contact & partnerships · ai@freemy.ai`。
- About 页：简短合作/联系区。
- 双语 Contact 页：邮箱、发邮件、复制邮箱、联系事项。
- Submit 页：保留 GitHub 投稿，补一个邮件投稿选择，避免非开发者只能登录 GitHub。
- 作品详情：轻量“报告问题／补充资料”链接；不让每张首页卡片都出现一大段联系信息。

### 6.2 联系页建议文案

中文标题：合作与联系
正文：欢迎就内容合作、产品展示、专题赞助、媒体交流或网站建议联系 Freemy。
作品资料有误、原站打不开，或有需要补充的来源，也可以给我们写信。
按钮：发送邮件 / 复制邮箱
提示：请在邮件中附上相关作品的 Freemy 链接，方便我们定位。

English title: Contact & partnerships
Body: Get in touch about content collaborations, product showcases, sponsorships, media enquiries,
or feedback on Freemy. You can also report a broken experience or suggest a correction or source.
Buttons: Email us / Copy email
Note: Include the relevant Freemy creation link so we can locate it.

- 不承诺未经确认的回复时效、流量、效果或合作关系。
- 明确“联系 Freemy”不等于联系原作作者。
- 不隐藏邮箱成图片，保证可选择、可复制、可被辅助技术读取。
- 公开邮箱可能被收集；通过邮箱规则管理垃圾邮件，不牺牲可用性来假装完全防爬。

### 6.3 邮件行为与安全

- 使用 `mailto:` 打开本地邮件客户端，不在服务器代发；没有客户端时提供复制方式。
- 地址固定；subject/body 用 URL 编码构建，不拼接任意收件人、cc、bcc 或换行头。
- 合作邮件主题建议 `[Freemy] Partnership enquiry` 或 `[Freemy] 合作咨询`。
- 纠错邮件主题包含已知作品 ID，正文预填同语言 canonical、作品标题和留空的问题描述。
- 不自动提交邮件，不读取用户草稿，不记录邮件正文。
- 不为 email 放宽全站 `safeExternalUrl`；邮件链接通过独立的受控构造函数生成。
- 站长验证邮箱存在、能收信和回复后，再将“已验证可联系”列为上线通过项。
- 网站展示邮箱本身不需要改域名 MX/DKIM；未经授权不得编辑 DNS 或邮箱配置。

## 7. 统计

新增事件建议：
- `share_menu_open`：打开分享选项，代表意向。
- `share_copy`：Clipboard 写入成功，不代表转发或被访问。
- `share_native_return`：系统分享调用 resolve，不代表发布成功。
- `share_x_open`：请求打开 X 草稿，不代表发帖。
- `share_qr_open`：显示二维码，不代表扫码。
- `contact_click`：点击邮件入口，不代表邮件已发送。
- `contact_copy`：邮箱复制成功，不代表有人联系。

沿用现有 `work_id + placement` 两属性结构、生产开关、QA 与 off 模式。
站点级 contact 没有 work_id；作品纠错允许带对应 work_id。
placement 用固定白名单区分语言、页面类型和入口；不传任意 URL、邮箱正文、原始搜索词。
不要将 `share_copy` 与 `experience_open` 混合统计。

现有 `freemyRedact` 会清理 URL 查询参数，故仅给短链加 UTM 并不代表精确归因已实现。
本轮默认 clean URL；广告/传播活动归因单列为后续任务，不绕过已有隐私控制。
308 请求还可能来自爬虫、预览器和预取，不能直接当作“人点击”。

## 8. 同批可做的小优化

P1：
- 为 Work/Grok 导出已核验作品的短链/规范页/原站/作者/预览地址索引（保存 `reports/share/`，默认不公开）。
- 搜索与筛选状态已经有 URL 表达，补齐 `sort=recent` 并保留原 history.state；恢复列表滚动位置。
- 首页合集不再永远硬编码前两个；明确编辑精选或最近有实质更新的专题，但不根据虚假热度排序。
- 详情提供失效与纠错入口，维持短链的长期可用性。

P2（另行排期）：本地收藏、合集短链、订阅/RSS、公开热门榜。
这些都不是本轮核心上线条件。

## 9. 非目标

不做通用短网址注册服务、不代理原站、不建设站内邮件系统、
不发推广消息、不新开付费服务、不做全站 URL 迁移、不重建已有学习/分析功能。
