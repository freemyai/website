# Freemy Source & Learning Implementation Plan

> For agentic workers: 可用 superpowers:executing-plans 按任务执行；有独立执行/复核能力时也可使用 subagent-driven-development。任务完成前运行相应验证，不以“代码看起来正确”替代证据。

**Goal:** 在不破坏真实作品展示、双语与直接体验的前提下，加入可核验源码入口、条件显示的学习资料与少量有依据的学习笔记。

**Architecture:** 保留现有 Node 静态构建。新增按 work_id 关联的学习资源数据，由纯函数统一判定展示；构建时生成卡片、弹窗数据与详情，浏览器不访问第三方仓库 API。候选文件不参与生产构建。

**Tech Stack:** 现有 JavaScript ES modules、Node test、JSON、静态 HTML/CSS、当前浏览器回归与 SEO 审计工具。不换框架、不加运行他人代码的服务。

**Spec:** `01-产品与核验规则.md`；字段契约 `05-资源数据契约.schema.json`。

## Global Constraints

- 不联系作者、不发送外部消息、不请求回链、不修改第三方仓库。
- 维持当前 work_id、slug、中文/英文路径、canonical/hreflang、真实预览和原站直接跳转。
- 公开可读不等于开源；只有对应项目和许可都核验通过才能出现开源入口。
- 没有源码和学习内容时不显示占位图标、不生成空文章、不降权或删除作品。
- 数据构建离线进行；未经复核的外部检索结果不自动发布。
- 不执行不可信仓库代码；任何必要的执行验收另行在无秘密的隔离环境中进行。
- 多个作品可指向同一个大仓库的不同文件；demo_url 去重逻辑不能错用于 repository_url。
- source_open/learning_open 不得计为 experience_open 或完成学习。
- 保留统计开启/关闭与 QA 控制；新事件不擅自启用付费套餐或曝光功能。

## Review Focus

1. 误配同名仓库、作者主页、上游依赖或 HF 模型为作品源码：任务 1/2 的负例和任务 8 数据复核覆盖。
2. 公开但无许可、许可范围不覆盖目标文件、许可冲突仍显示开源：任务 1/2 测试覆盖。
3. 弹窗切换残留旧作品源码，点击源码同时打开预览/重复计数：任务 3/7/9 覆盖。
4. 中文有学习资料而英文没有，或“实现思路”标签在一种语言丢失：任务 4/9 覆盖。
5. 把草稿、原始审核笔记、凭据或第三方异常响应送到前端：任务 2/3/8/9 覆盖。

## 文件职责

新增：
- `data/learning-resources.json`：仅存经过编辑接受的资源记录；初始可为空，候选另存。
- `data/candidates/source-discovery/*.json`：Grok/研究候选，生产构建不读取。
- `data/open-source-license-policy.json`：本轮已人工核验的 SPDX 许可集合及版本说明；不是把任何 SPDX 标识视为开源。
- `src/learning-resources.mjs`：无 Node 依赖的 URL/记录/展示资格纯函数，可安全用于前端。
- `src/learning-content.mjs`：构建期加载本地学习正文、输出经过转义的结构化段落；不得被浏览器 import。
- `content/learning/zh/{work_id}.json`、`content/learning/en/{work_id}.json`：人工核验的学习正文；字段为 title、summary、kind、sections、references。
- `assets/icons/`：本地小型平台/通用图标，带来源许可说明；或者复用已有合规本地图标机制。
- `scripts/check-learning-resources.mjs`：离线结构与关联检查；可另带显式 --network 模式做限速在线检查。
- `tests/learning-resources.test.mjs`、`tests/learning-render.test.mjs`：新功能自动化测试。

修改：
- `src/validate.mjs`：将已发布资源与合并后的 works 按 ID 关联，校验孤立记录。
- `src/components.mjs`：卡片、弹窗的源码/学习入口。
- `src/pages.mjs`：详情页 #source/#learning、学习资料与筛选。
- `src/catalog.mjs`：增加学习筛选条件，保持模块浏览器可加载。
- `src/i18n.mjs`：中文/英文按钮、状态和辅助文本。
- `assets/app.mjs`：弹窗数据同步、筛选、事件绑定。
- `assets/style.css`：紧凑辅助操作行与无障碍焦点。
- `assets/analytics.mjs`：扩展事件白名单，复用现有安全字段。
- `src/build.mjs`：复制新增客户端模块/图标并生成学习正文，保留原媒体规则。
- `src/structured-data.mjs`：可选的真实源码节点；不制造错误 license/author。
- `package.json`：添加 `learning:audit`，扩展现有 lint 范围。

## 接口约定

`validateLearningRecord(record, {workIds, allowedLicenses}) -> string[]`
返回校验错误；空数组为通过。不得在验证过程中联网。

`eligibleSourceLink(resource, {allowedLicenses}) -> boolean`
严格符合产品规范的源码主入口规则。

`getLearningActions(record, locale, options) -> Action[]`
Action = `{kind, resourceId, provider, href, label, ariaLabel, external}`。
kind = source | author_guide | learning_note。最多两个卡片级 action；详情可以展示更多已发布资料。

`publicLearningPayload(record, locale, options) -> {actions, hasOpenSource, hasLearningNote}`
只输出可公开展示字段，不含完整证据、审核人员和采集日志。

`renderLearningResources(work, locale) -> string`
基于 work.learning 的已发布字段生成详情内容；所有文本转义。

`loadPublishedLearningNote(record, locale) -> Note | null`
只从限定目录加载安全相对路径。Note.sections = `{heading, paragraphs[], bullets[]}`；references = `{id,label,url}`。不接受任意 HTML；本轮不引入不受控 Markdown/脚本渲染。

`filterWorks(works, filters)` 增加 `filters.open_source` 与 `filters.learning_note`，与上面两个布尔值保持一致。

## Task 1：锁定基线与展示资格

**Files:** 新增 src/learning-resources.mjs、data/open-source-license-policy.json、tests/learning-resources.test.mjs。

- [ ] 读取最新分支、当前提交和未提交修改；运行现有测试并保存基线，不能沿用历史“127项通过”的数字。
- [ ] 写失败测试：verified exact-project Apache-2.0 code + published + available 返回 true；public-only、license unknown、model、upstream、candidate、restricted 都返回 false；partial frontend 合格时必须得出专用标签。
- [ ] 用 `node --test tests/learning-resources.test.mjs` 验证失败来自未实现的接口，而非环境错误。
- [ ] 实现 eligibleSourceLink 和 URL 检查：拒绝 javascript/data 协议、userinfo、异常端口、伪装域名，平台 icon 与精确 hostname/path 结构对应。其他自托管站只在显式审核后使用通用代码图标。
- [ ] 维护本轮实际用到的许可名单；不要只看 JSON 中自报 status，不识别的许可进入复核。
- [ ] 重跑测试并提交 `feat: define verified learning resource policy`。

## Task 2：数据合并、候选隔离和验证

**Files:** data/learning-resources.json、src/validate.mjs、src/learning-resources.mjs、tests/learning-resources.test.mjs。

- [ ] 写失败测试：未知 work_id、重复 resource.id、缺 checked_at/evidence、发布的开源资源无许可原文、源资源协议危险、笔记路径越界被拒；同仓库多个作品允许；candidate 文件不出现在加载结果。
- [ ] 实现 validateLearningRecord；发布数据经离线验证后与所有 works 合并，不只是 gallery，从而兼容“灵感参考”中的公开源码。
- [ ] 用 publication、match_status、license/status、availability 独立字段，不把“来源匹配”自动当“许可通过”。
- [ ] 缺少学习记录的旧作品向后兼容。不要改变 eligibleForGallery 原有 AI 来源判断。
- [ ] 运行新增单测、现有 `npm run typecheck`、`npm test` 并提交。

## Task 3：卡片、快速预览和详情的源码入口

**Files:** src/components.mjs、src/pages.mjs、src/i18n.mjs、assets/app.mjs、assets/style.css、assets/icons/、src/build.mjs、tests/learning-render.test.mjs。

- [ ] 写失败测试：有合格源码输出真实链接；没有源码不输出占位；公开但未明确许可仅在详情普通文字区域展示；HF 模型不出现“HF源码”；每个入口有可访问名称。
- [ ] 实现 getLearningActions/publicLearningPayload/renderLearningResources，主按钮保持“体验作品”。
- [ ] 开源前端显示“前端源码 / Front-end source”，不是“完整源码”；许可证名称在详情展示。
- [ ] 快速预览每次先清空 actions，再填入当前作品；切换到无资源作品时无残留 href。
- [ ] 防止嵌套 a、源码点击冒泡打开预览、disabled 假按钮和不明确的仅图标操作。
- [ ] 保留无 JS 时详情与原站可访问；卡片文本和来源来自构建数据，不在浏览器调用 GitHub/HF。
- [ ] 复制新增图标/客户端纯函数模块到 dist，检查模块图无 fs/path 等 Node 导入。
- [ ] 运行渲染与构建测试，提交。

## Task 4：学习笔记与原作者说明

**Files:** content/learning/{zh,en}/、src/learning-content.mjs、src/pages.mjs、src/i18n.mjs、tests/learning-render.test.mjs。

- [ ] 写失败测试：draft 不渲染；缺任何一种语言的发布笔记被拒；implementation_idea 在两种语言都有显著限定语；文本中的 HTML 被转义；路径穿越被拒。
- [ ] 使用固定 JSON 段落结构输出，不执行外部脚本、不渲染原始 HTML、不批量导入 README。
- [ ] 只有 source_walkthrough 才允许标题“源码解读”。author_summary 必须链接原作者说明；implementation_idea 标“实现思路”，不是原作揭秘。
- [ ] 第一批只选择材料够用的3–5个以内作品；审查时间/来源/运行情况真实。不足时交付入口功能和空正文目录，不造内容。
- [ ] 正文先并入现有详情 #learning，不新建空路由。笔记已发布后，卡片才能出现学习入口。
- [ ] 运行测试与双语内容检查并提交。

## Task 5：学习筛选与检索

**Files:** src/catalog.mjs、src/components.mjs、assets/app.mjs、src/i18n.mjs、tests/catalog.test.mjs。

- [ ] 写失败测试：open_source 只返回和图标一致的作品；learning_note 只返回已发布双语笔记；切换筛选不改变 work_id；不同作品共仓库不合并。
- [ ] 添加“有开源代码 / Open-source code”与“有学习笔记 / Learning notes”筛选。不让无源码作品在默认全站列表消失。
- [ ] 已确认技术标签才可被检索；标签保存证据引用。开发工具、运行时框架和底层模型分开，不把 AI 工具名当技术栈。
- [ ] 查询参数不进入 sitemap；canonical 沿用干净页面。不要为了两个筛选生成大量索引页。
- [ ] 重跑筛选及 SEO 回归，提交。

## Task 6：可信结构化数据与 SEO

**Files:** src/structured-data.mjs、src/page-manifest.mjs（仅确有必要时）、测试。

- [ ] 写失败测试：没有来源不产生 codeRepository；无许可不填 license；模型/数据集不冒充应用源码；原作者不是 Freemy；原有 hreflang/canonical 不变。
- [ ] 可选给详情的真实源码资源加独立 SoftwareSourceCode 节点，关联正确 codeRepository、license、author，不滥用 sameAs 把不同资源声明为同一实体。
- [ ] 来源核验日期不自动成为整页 lastmod；有真实正文或资源内容变更才更新。
- [ ] `npm run build && npm run seo:audit` 零错误；警告人工说明并修复相关问题，不删检查掩盖错误。
- [ ] 提交。

## Task 7：学习行为统计

**Files:** assets/analytics.mjs、assets/app.mjs、src/components.mjs、src/pages.mjs、对应测试。

- [ ] 写失败测试：source_open/learning_open 可通过白名单；off/非生产域仍禁止；QA 仍带隔离标记；一次点击仅一条对应事件；统计失败不阻止外链。
- [ ] 增加两个事件，不添加第三方统计服务。沿用 work_id + placement 字段预算，不发送原始源码URL、搜索词、邮箱或完整浏览行为。
- [ ] placement 使用有界枚举组合，例如 zh:home:source-github、en:work:learning-note；没有记录 provider 的额外字段也不能挤掉 work_id。
- [ ] source_open 表示点击合格源码；author-guide/学习笔记入口用 learning_open，通过 placement 区分。点击许可原文可不统计。
- [ ] 内部测试模式验证网络发送；后台入库验证只能在有账户权限时做，未完成要写明，不能用 send() 没抛错冒充入库。
- [ ] 保持现有 work_view/work_impression 不变，并提交。

## Task 8：批量来源回填与检查报告

**Files:** data/candidates/source-discovery/、data/learning-resources.json、scripts/check-learning-resources.mjs、docs/learning/verification-report.md。

- [ ] 导出规范 works 输入：work_id、title_original、demo_url、creator、已有来源；按 work_id 排除中英重复记录。
- [ ] 先处理首页精选与明确有仓库线索的作品，再补全其他；每批10–15件作为建议工作规模，不为凑数量降低标准。
- [ ] Grok 返回 candidate；Work 按04指令独立打开源码与许可证核验后再迁移 publication=published。
- [ ] 仅更新新资源字段，不覆盖旧截图、中文英文介绍、AI provenance 和原体验URL。
- [ ] 审计报告分别列已核验开源、公开代码但许可未明确、受限许可、未找到、受阻、待复核；统计是事实，不给主观“置信度95%”。
- [ ] scripts 默认离线。--network 只处理已列出的公开 HTTPS 目标，限制并发、超时和重定向；拒绝回环/私有地址，遵守平台限流。403/429记录为受阻或重试，不等于项目关闭。
- [ ] 运行 `npm run learning:audit`（本轮新增）输出结构、匹配、许可与语言问题。不要把候选全部批量改成 verified。
- [ ] 提交数据与报告。

## Task 9：完整回归与发布交接

**Files:** 现有浏览器测试、README.md、docs/learning/rollout.md、package.json。

- [ ] 自动化覆盖：有源码且有笔记、只有源码、只有笔记、公开无许可、HF权重、来源失效、两者都没有、长英文标签、多来源、无JS、移动端、键盘。
- [ ] 浏览器检查中文/英文首页、合集、详情，1440/768/390宽度；必须看得到真实作品，图标不挤坏文字、无横向溢出。
- [ ] 运行 `npm ci`、`npm run lint`、`npm run typecheck`、`npm test`、`npm run build`、`npm run learning:audit`、`npm run seo:audit`、现有浏览器回归。
- [ ] 提交实际命令结果、测试数量、失败项、覆盖范围与截图。不复用旧的127/230数量宣称新版本通过。
- [ ] 线上发布仅在授权范围内；抽查源码外链、学习锚点、语言切换、站点状态码和构建资源，不擅自改DNS/套餐。
- [ ] 回滚通过撤回功能commit与数据commit；不要删除用户已有作品数据。提供旧卡片兼容模式或空资源文件可继续构建的保证。

## 首批完成定义

不以“每件作品都有图标”为成功；以“每个显示出来的图标都准确、可用、有据可查”为成功。主站仍漂亮、快、免费直接体验；用户能从真实作品走向真实源码与可靠学习资料。
