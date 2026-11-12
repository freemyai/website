# Freemy SEO 上线检查与交接

这份清单用于发布后的抽样核对。运行脚本、提交 sitemap 和请求抓取都不能保证搜索引擎抓取、收录、排名或展示；搜索引擎会自行决定。参见 [Google 抓取与收录常见问题](https://developers.google.com/search/help/crawling-index-faq)及 [Bing 站长支持](https://www.bing.com/webmasters/help/webmaster-support-24ab5ebf)。

## 抽样检查

在仓库根目录安装依赖并完成部署后运行：

```sh
node scripts/check-seo-live.mjs --base https://freemy.ai --limit 20 --concurrency 2
```

也可以在发布前抽查指定的公开 Vercel 预览版本：

```sh
node scripts/check-seo-live.mjs --base https://YOUR-PREVIEW.vercel.app --limit 20 --concurrency 2
```

结果写入 `reports/seo/live-audit.json`。脚本会检查报告目录和文件的真实路径，拒绝写入构建产物目录及通过链接指向其他位置的报告路径。`status` 为 `pass` 表示计划中的抽样项均通过；`fail` 表示发现错误；`blocked` 表示访问保护返回 401 或 403，无法判断受保护资源；`incomplete` 表示请求额度用尽，部分项目被跳过。若多种情况同时出现，整体状态按 `fail`、`blocked`、`incomplete` 的顺序报告，仍可在各检查项中查看细节。只要有失败、受阻或跳过，命令均返回非零退出码。报告中 `checks` 记录状态、重定向、元数据、HTTP 响应头和问题；`requestsMade` 包括重定向及图片请求，`summary` 给出各状态数量。

默认最多 20 次 HTTP 请求、并发 2，每次请求超时 10 秒。`--limit` 可设置为 1–100，`--concurrency` 只能为 1 或 2；可用 `--timeout-ms` 设置 1–30000 毫秒。额度不足时提高上限后重跑。页面、`robots.txt` 和 sitemap 的文本响应各有大小上限；图片通过范围请求检查成功状态、图片类型及非空响应，并不解码整个文件。脚本仅抽查固定代表页面，不是全站爬虫，也不检查搜索引擎的真实索引结果。

生产检查会要求代表性规范页面直接由 `https://freemy.ai` 返回 200，不经重定向；并额外检查 `https://www.freemy.ai/` 通过永久重定向收敛到 `https://freemy.ai/`，且不存在循环。即使 `--base` 填写 `https://www.freemy.ai`，规范页面仍从主域名直接检查，报告中的 `www-normalization` 单独记录 `www` 收敛结果。两种域名及其跳转都计入同一请求上限，额度不足会标记为未完成。

脚本还检查英文首页及中文首页、`/en` 和 `/en/` 别名、英文作品深层地址、结尾斜杠与查询参数、实际不存在的地址的 HTTP 404、robots 和 sitemap、canonical、hreflang、HTML robots、`X-Robots-Tag`、应当 noindex 的隐私页及页面 OG 图片。失败时先查看对应检查项和 `issues`，修复后重跑。

为限定访问范围，只允许 HTTPS 的 `freemy.ai`、`www.freemy.ai` 或单标签 `*.vercel.app` 预览地址，不接受非默认端口、凭据、路径或内网地址作为 `--base`。每次连接前验证 DNS 返回的地址，拒绝本地或非公开地址；手动检查每一次重定向，拒绝跳到其他站点或其他预览项目。只请求这些站点的页面与 OG 图片，不访问页面中作品的外站地址。脚本不使用访问保护绕过凭据。

## 预览与生产的区别

预览检查只证明所指定预览环境的行为，不能代替上线后对 `https://freemy.ai` 的检查。构建中的 canonical、hreflang 和 sitemap 始终使用生产域名，因此检查预览时仍应看到生产地址；OG 图片元数据若指向生产域名，脚本会在预览域名下检查相同图片路径。预览站可能有访问保护或 `noindex`：401/403 或 Vercel 登录跳转会标记为 `blocked`，预览防索引指令也可能让索引检查显示 `fail`。脚本不会跟随登录跳转或保存其查询参数。这两种结果都不能证明生产环境有问题，也不能作为生产已通过的证据；不要为通过预览检查而擅自移除保护。

生产部署生效后，在生产地址重新运行并保存报告；确认 `pass`，或逐项解释并处理 `fail`、`blocked` 与 `incomplete`。其中 `/en` 和 `/en/` 的永久跳转、英文作品保留完整路径、查询参数及真实 404 必须以实际部署的响应为准。

## 回滚准备

这次 SEO 优化合入前，已上线的作品版本是 `9c5db5e00cf90f04fac8d14530cbd5bca882af78`，包含 Huolong、REGOLITH、FALL LINE 和 Glasswood。若上线后需要紧急恢复，可在 Vercel 部署记录中核对该提交对应的成功生产部署，再由有权限的人选择回滚或重新发布；随后检查正式域名、作品和跳转。回滚到旧部署会暂时失去该部署之后新增的内容，因此操作前应核对是否有需要保留的新作品。

Vercel 回滚不会自动撤销 GitHub 中的 SEO 代码，后续 Git 推送仍可能触发新部署。若要持久撤销，应针对实际合入的 SEO 提交创建撤销提交，保留作品提交及其后的有效修改；先审阅差异并重新测试，再以普通方式推送，不使用强推或重置他人的历史。

脚本只请求 HTTPS，不会验证未加密 HTTP 的跳转。上线后还需单独检查 `http://freemy.ai/` 和 `http://www.freemy.ai/` 的实际响应与后续跳转，确认最终通过永久重定向到达 HTTPS 主域名，并且没有循环。例如可分别查看第一跳：

```sh
curl --max-time 10 -sS -o /dev/null -D - http://freemy.ai/
curl --max-time 10 -sS -o /dev/null -D - http://www.freemy.ai/
```

根据返回的 `Location` 继续检查各跳；上述命令不会自动跟随重定向，不能单凭第一跳认定整条链已通过。

## 网站所有者需要完成

以下操作需要网站所有者使用自己的账号和域名管理权限完成；本项目不会自动验证域名或向搜索引擎提交信息。

### Google Search Console

1. 登录 [Google Search Console](https://search.google.com/search-console)，添加域名资源 `freemy.ai`。按页面给出的值在域名 DNS 中添加验证记录并完成验证，保留已有 DNS 记录；域名资源覆盖 `www` 和非 `www`。验证记录及传播说明见 [Google 所有权验证帮助](https://support.google.com/webmasters/answer/9008080?hl=en)。
2. 生产环境公开且 sitemap 可访问后，在“站点地图”中提交 `https://freemy.ai/sitemap.xml`，稍后查看抓取和处理结果。提交 sitemap 只是发现信号；见 [Google sitemap 文档](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。
3. 在“网址检查”中分别检查 `https://freemy.ai/`、`https://freemy.ai/zh/` 和 `https://freemy.ai/en/works/hydraulics/`。查看已索引版本和实时测试、Google 选择的 canonical 及抓取错误；修复后可在有权限时请求编入索引。已索引报告和实时测试含义不同，见 [Google 网址检查工具](https://support.google.com/webmasters/answer/9012289/)。
4. 依次检查 `little-games`、`sound-lab`、`machines-in-motion` 三个合集的中英文版本：中文为 `/collections/{id}/`，英文为 `/en/collections/{id}/`。记录 Google 选择的规范地址和实际索引状态。

### Bing Webmaster Tools

1. 登录 [Bing Webmaster Tools](https://www.bing.com/webmasters/)，导入已验证的 Google Search Console 资源，或手动添加网站并按 Bing 指示完成 DNS、文件或其他可用方式的所有权验证。导入会要求授权 Bing 访问 Google Search Console；具体选项见 [Bing 添加和验证站点](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b)。
2. 在已验证的生产站点中提交 `https://freemy.ai/sitemap.xml`，查看处理状态与发现的 URL 数量。参见 [Bing sitemap 帮助](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)。
3. 用 URL Inspection 检查上述三个生产页面的索引状态和 Live URL，修复报告的问题；如有需要，可在工具允许的额度内请求抓取。参见 [Bing URL Inspection](https://www.bing.com/webmasters/help/url-inspection-55a30305)。
4. 同样检查三个重点合集的中英文 URL，记录 Bing 的抓取与索引结果。

提交后应过一段时间回到两个平台查看实际抓取、索引和错误报告，不要把脚本通过或提交成功当成已经收录。
