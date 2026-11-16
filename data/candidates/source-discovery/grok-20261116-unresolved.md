# Unresolved — Freemy source discovery 2026-11-16

对照提交 `81c20095eee287a39b2cbe1cc1ec61f1847367ef`。全部记录的 publication 均为 candidate。未找到源码或许可未清的项目如下。没有把未找到写成闭源。

## 未找到公开源码

### hydraulics（How Hydraulics Work）
- 原站 https://hydraulics.wasmer.app/ 可访问，标题正确，页面只有 Google Fonts，没有 GitHub 或其他源码链接。
- 作者推文 https://x.com/thebuggeddev/status/2119075448449581197 只给出演示地址。
- 作者 GitHub 用户 thebuggeddev 下按 hydraulics 检索仓库为 0 条；直接打开 github.com/thebuggeddev/hydraulics 为 404。
- gallery.json 与 works.json 共用 work_id `hydraulics`；works.json 中 creator 为空，gallery.json 中为 The Bugged Dev。
- 状态：searched，sources=[]。不是闭源结论。

### learn-arduino（Learn Arduino）
- 原站与中文路径可访问，只链到多语言页面和 https://x.com/DilumSanjaya。
- 作者站点 dilum.dev / primers 只链到演示和 GitHub 用户主页 github.com/dilums，没有点名本作品仓库。
- 作者推文 https://x.com/DilumSanjaya/status/2112587730542854263 只给出演示。
- GitHub 检索 `arduino user:dilums` 为 0 个仓库。
- 状态：searched，sources=[]。不是闭源结论。

### null-range（Null Range）
- 原站只链到作者 X 账号，没有源码入口。
- 作者站点 taylorallen.co、sntx.co、labs.sntx.co 未见该游戏的仓库链接；labs 上的实验项目不包含 Null Range。
- 作者推文检索未找到 github/source 披露。
- GitHub 上名称相近的仓库属于无关的 scientific null-range / 数据包项目，不能当作本作品。
- 状态：searched，sources=[]。不是闭源结论。

## 源码可见但许可未明确

- **web-bayan**：对应目录已找到，根目录与 bayan 目录均无 LICENSE。
- **harmonograph** / **rosette**：各自 HTML 已找到，仓库无许可文件。必须按文件分别链接。
- **wawa-school-of-magic**：完整 TypeScript 源码可见，但无许可文件。
- **fall-line**：公开的是 fall-line/index.html 内联构建产物，不是预打包源码树；仓库与子目录均无 LICENSE。

## 有明确限制性许可

- **haldane-4**：仓库 LICENSE 为 CC BY-NC 4.0。源码公开，但不能当作已核验 OSI 开源。本轮阅读了仓库 LICENSE 文本，未再抓取 Creative Commons 官方 legalcode 全文。

## 已读许可但仍需范围复核

- **tree-appreciator**：根目录 Apache-2.0 已读；未穷尽字体与内嵌库例外。
- **battle-drones**：根目录 Apache-2.0 已读；未穷尽生成美术与依赖许可。
- **regolith**：根目录 MIT 已读；未单独打开 vendored three.js 许可文件。

## 其他边界

- 未观看 Wawa 作者视频「The Algorithm That Generates Infinite Worlds」，只记录推文中的链接与标题。
- 本轮 GitHub API 在中途触发未认证速率限制，后续改用 raw/HTML/atom，可能漏掉仅出现在 API 元数据中的字段；许可结论以实际读到的文件为准。
- 未修改 Freemy 仓库，未执行第三方项目代码，未联系作者。
