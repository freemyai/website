# Freemy

Freemy 是一个双语 AI 创意作品画廊。访客可以先看真实作品画面，再直接前往创作者的原站体验。根路径默认显示英文，中文首页为 `/zh/`，旧的作品和主题地址及英文 `/en/` 地址继续保留。

## 本地运行与验证

需要 Node.js 20 或更新版本。网站运行时不需要第三方依赖；Playwright Core 仅用于本地媒体采集和浏览器验收。

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
python -m http.server 4177 --directory dist
npm run test:browser
```

浏览 `http://localhost:4177`。`typecheck` 为兼容旧命令而保留，实际执行的是内容数据校验，并非 TypeScript 类型检查。浏览器验收使用本机 Edge；可用 `FREEMY_BROWSER_PATH` 指定其他 Chromium 可执行文件。截图默认保存到仓库旁的 `freemy-preview-checks` 目录，可通过 `FREEMY_QA_DIR` 改位置。

## 内容与媒体

- `data/gallery.json`：首页 AI 作品及双语内容、作者、作品入口、AI 创作来源、真实预览和检查记录。
- `data/works.json`、`data/legacy-locales.json`、`data/references.json`：保留的早期作品、翻译与其他参考。AI 创作方式未确认的作品放在“灵感参考”，不作为 AI 首页精选。
- `data/types.json` 和 `data/taxonomy.json`：前台作品类型和保留的学科主题。`data/collections.json` 定义合集。
- `data/candidates/` 及外部 Grok 结果不会自动进入构建。编辑时核对作品、来源和画面，再将可展示内容加入 `gallery.json`。把 `verification.availability` 设为 `unavailable` 会使作品退出首页画廊。
- `assets/media/` 保存从实际作品界面捕获的预览与一段可按需播放的短片。记录中的 `media.provenance` 保存原站、捕获日期和方式；图片尺寸变体会被明确复制到构建产物。
- 作品的登录、价格、语言、设备兼容性和交互检查分开记录；没有确认时保持未知。AI 工具或创作者信息应有可追溯来源。

截图脚本只处理代码中列出的公开网址，使用独立浏览器上下文，不作为生产环境的任意网址抓取服务。运行 `node scripts/capture-previews.mjs` 后，可用安装了 Pillow 的 Python 运行 `python scripts/prepare-media.py` 生成图片变体；发布前检查画面是否完成加载。

投稿入口会打开本仓库的公开 GitHub issue，访客可以填写作品资料；网站本身不保存投稿数据。`vercel.json` 将 `dist` 配置为 Vercel 构建输出。

页面接入 Vercel Web Analytics 与 Speed Insights；访问和性能数据由 Vercel 收集，相关说明见网站隐私页。
