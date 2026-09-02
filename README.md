# 校招 · 官网投递岗位筛选器（深圳/香港）

只收录**企业官网**投递渠道的校招岗位，可按城市 / 行业 / 岗位类别 / 投递状态筛选。

## 文件说明

- `index.html` — 单文件应用（打开时自动拉取 `data.json`，离线则用内置清单兜底）
- `data.json` — 公司清单（数据源，由每天 9 点的定时任务自动更新）
- `scripts/update.py` — 每日更新脚本（Tavily 搜新闻 → DeepSeek 整理 → 写回 data.json）
- `.github/workflows/daily-update.yml` — 定时任务（UTC 01:00 = 北京时间 09:00）

## 部署步骤

1. 把仓库推送到 GitHub
2. Settings → Secrets and variables → Actions → 添加两个密钥：
   - `DEEPSEEK_API_KEY`
   - `TAVILY_API_KEY`
3. Settings → Pages → Source 选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)` → 保存
4. 等 Pages 发布完成后，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可分享

## 本地预览

直接双击 `index.html` 即可（会回退到内置清单；要看到最新 `data.json`，请用本仓库托管地址或起个本地静态服务）。
