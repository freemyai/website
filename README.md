# Freemy

Freemy 是一个双语 AI 创意作品画廊。访客可以先看真实作品画面，再直接前往创作者的原站体验。根路径显示英文，中文首页为 `/zh/`；英文内容路径仍以 `/en/` 开头，英文首页别名 `/en/` 在部署时重定向至根路径。

## 本地运行与验证

需要 Node.js 20 或更新版本。网站运行时不需要第三方依赖；Playwright Core 用于本地媒体采集和浏览器验收，HTML/XML 解析器用于构建产物审计。

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run seo:audit
python -m http.server 4177 --directory dist
npm run test:browser
```

浏览 `http://localhost:4177`。`typecheck` 为兼容旧命令而保留，实际执行的是内容数据校验，并非 TypeScript 类型检查。浏览器验收使用本机 Edge；可用 `FREEMY_BROWSER_PATH` 指定其他 Chromium 可执行文件。截图默认保存到仓库旁的 `freemy-preview-checks/seo` 目录，可通过 `FREEMY_QA_DIR` 改位置。静态审计报告保存在 `reports/seo/`；部署后可用 `npm run seo:live -- --base https://freemy.ai --limit 20 --concurrency 2` 抽查公开页面。

Windows PowerShell 若通过 `npm.ps1` 丢失传给脚本的选项，请改用 `npm.cmd run seo:live -- --base https://freemy.ai --limit 20 --concurrency 2`，或直接运行 `node scripts/check-seo-live.mjs` 并传入相同选项。

## 内容与媒体

- `data/gallery.json`：首页 AI 作品及双语内容、作者、作品入口、AI 创作来源、真实预览和检查记录。
- `data/works.json`、`data/legacy-locales.json`、`data/references.json`：保留的早期作品、翻译与其他参考。AI 创作方式未确认的作品放在“灵感参考”，不作为 AI 首页精选。
- `data/types.json` 和 `data/taxonomy.json`：前台作品类型和保留的学科主题。`data/collections.json` 定义合集。
- `data/candidates/` 及外部 Grok 结果不会自动进入构建。编辑时核对作品、来源和画面，再将可展示内容加入 `gallery.json`。把 `verification.availability` 设为 `unavailable` 会使作品退出首页画廊。
- `assets/media/` 保存从实际作品界面捕获的预览与一段可按需播放的短片。记录中的 `media.provenance` 保存原站、捕获日期和方式；图片尺寸变体会被明确复制到构建产物。
- 作品的登录、价格、语言、设备兼容性和交互检查分开记录；没有确认时保持未知。AI 工具或创作者信息应有可追溯来源。

截图脚本只处理代码中列出的公开网址，使用独立浏览器上下文，不作为生产环境的任意网址抓取服务。运行 `node scripts/capture-previews.mjs` 后，可用安装了 Pillow 的 Python 运行 `python scripts/prepare-media.py` 生成图片变体；发布前检查画面是否完成加载。

Grok 已核验的截图可从本机 outbox 放到 `assets/media/<slug>.jpg`；使用 `python scripts/prepare-media.py <slug>` 可以只生成该作品的变体，避免重写其他预览。记录捕获方、日期与作品来源，并在发布前检查截图与作品是否一致。

Quantum Eraser、Ocean Currents、SVT 3D、BEE-X9 和 The Last Hexagon 的截图会自动补齐至 16:10，避免展示时裁掉两侧内容；Ocean Currents 的原始截图还会去掉边缘留白。更换截图时，应重新核对画面及记录的尺寸。

投稿入口会打开本仓库的公开 GitHub issue，访客可以填写作品资料；网站本身不保存投稿数据。`vercel.json` 将 `dist` 配置为 Vercel 构建输出。

页面接入 Vercel Web Analytics 与 Speed Insights；访问和性能数据由 Vercel 收集，相关说明见网站隐私页。

分享图从已核验预览离线生成：安装 Python 和 Pillow 后运行 `node scripts/generate-og.mjs`。网站构建使用仓库中已有的图片，不依赖 Pillow；新作品暂时没有专属分享图时，会使用该作品自己的预览。语言路由、统计配置及站长平台交接分别见 `docs/seo/`。
