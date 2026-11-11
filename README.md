# Freemy 好奇心探索站

一个中文互动作品发现站。网站生成静态首页、分类页和作品详情，引导读者前往第三方原站体验，不托管第三方作品。

## 本地运行

需要 Node.js 20 或更新版本，无需安装第三方运行依赖。

```sh
npm run build
npm test
python -m http.server 4177 --directory dist
```

浏览 `http://localhost:4177`。`vercel.json` 将 `dist` 配置为 Vercel 的构建输出。

## 内容更新与审核

- `data/taxonomy.json` 是 12 类、72 个方向的分类词表。没有已发布作品的分类不会出现在网站上。
- `data/works.json` 是经过编辑处理的内容数据。构建时只读取其中 `editorial.status` 为 `published` 的作品。
- `data/candidates/` 和外部采集结果不会进入网站构建。Grok 的候选结果必须经过人工试玩、核对来源和编辑后，才可以由编辑加入已发布数据；不要批量把候选状态改为已发布。
- 首批作品由 Codex 根据用户给出的示例及公开资料选取。液压与电机作品经过浏览器操作，其余作品主要进行了页面或资料检查；这不代表完成人工试玩。详情页保留检查日期和检查级别。后续请在人工试玩后补充实际操作、结果、环境及时间。
- 登录、价格、语言和设备支持必须各自有依据；没有确认时使用 `unknown` 或空数组。检查日期应是实际检查的日期，不能用重新生成数据的日期替代。
- `demo_url` 是作品直接入口；`sources` 和 `creator` 保存可核对的来源。默认链接到原站，不嵌入第三方作品。

每次内容修改后运行 `npm run typecheck`、`npm test` 和 `npm run build`，检查作品详情、链接和筛选，再提交。仓库生产分支更新后由现有 Vercel Git 集成部署。
