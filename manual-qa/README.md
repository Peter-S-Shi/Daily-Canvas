# Daily Canvas Manual QA

This directory contains the living, full-product manual QA baseline for Daily Canvas. It is intended for the Feature Complete Gate, Product Hardening, regression checks, and later release-candidate review. It does not replace automated tests.

中文说明：本目录保存 Daily Canvas 的长期人工验收基线，用于 Feature Complete Gate、Product Hardening、回归检查和后续发布候选验收。它不能替代自动化测试。

## Contents

- `manual_review_questionnaire.html`: bilingual, single-file, offline questionnaire.
- `samples/`: synthetic JSON backups used by selected restore and migration checks.
- `results/`: local-only location for filled JSON, Markdown reports, screenshots, and other private evidence. This directory is excluded through `.git/info/exclude` and is not committed.

## Before you start

1. Make a normal Daily Canvas backup from **Settings → Backup & restore** if the browser already contains data you care about.
2. Use a separate browser profile or a disposable local origin when practical. Restoring a sample replaces the data in the current Daily Canvas origin after first downloading a safety backup.
3. Start Daily Canvas by double-clicking `start-daily-canvas.cmd`, or run `pnpm dev` with Node.js 20.19 or newer.
4. Double-click `manual_review_questionnaire.html`. It does not require a server and does not connect to the network.
5. Enter a tester code such as `QA-01`, not a real name, email address, account identifier, or other personal information.

中文提示：

1. 如果当前浏览器里已有需要保留的数据，请先从 **设置 → 备份与恢复** 导出正常备份。
2. 条件允许时，请使用独立浏览器配置或可丢弃的本地来源。恢复样本会先下载安全备份，再替换当前 Daily Canvas 来源中的数据。
3. 双击 `start-daily-canvas.cmd` 启动产品；也可以在 Node.js 20.19 或更高版本环境运行 `pnpm dev`。
4. 双击 `manual_review_questionnaire.html`。问卷无需服务器，也不会联网。
5. 测试者代号请填写 `QA-01` 之类的代号，不要填写真实姓名、邮箱、账号或其他个人信息。

## Suggested execution order

1. Run startup, onboarding, task creation, Today, Calendar, Reflection, lifecycle, reward, and Meditation checks with a clean or disposable database.
2. Export that database as a normal backup and verify restart persistence.
3. Restore `samples/daily-canvas-v6-normal.json` for dense Calendar, Review, historical-evidence, pause, reward, and Meditation checks.
4. Restore `samples/daily-canvas-v5-migration.json` to verify the supported v5-to-v6 migration preview and result.
5. Attempt to import the two `invalid-*.json` files. They must be rejected before restore.
6. Export the questionnaire JSON frequently. At the end, also export the Markdown report and print or save the questionnaire as PDF if useful.

## Saving and handing back results

The questionnaire autosaves in this browser's `localStorage` under a Daily Canvas-specific key. Browser storage is convenient but is not a backup.

- **Export JSON** creates the resumable, machine-readable QA record.
- **Import JSON** resumes a compatible Daily Canvas questionnaire record.
- **Export Markdown** creates a readable report for review and hardening triage.
- **Print / Save PDF** creates a visual snapshot.

Browsers normally download files to the configured Downloads directory. Move private results into `manual-qa/results/` if you want them beside the project locally. To return a result to an Agent, attach the exported JSON or Markdown file explicitly. Review it first for personal text, local paths, screenshot names, or other identifying details.

问卷会使用本浏览器的 `localStorage` 自动保存，但浏览器存储不等于备份。JSON 用于继续填写和交给 Agent 审阅；Markdown 用于阅读和整理 Hardening 清单。浏览器通常会把文件保存到下载目录，可以手动移动到本地的 `manual-qa/results/`。交回 Agent 前，应先检查是否包含私人文字、本地路径、截图文件名或其他身份信息。

## Git and privacy policy

Safe to consider committing after privacy review:

- the blank questionnaire;
- these instructions;
- synthetic samples in `samples/`.

Keep local by default:

- filled questionnaire JSON and Markdown;
- screenshots and PDF reports;
- real Daily Canvas backups;
- reflections, experience notes, Meditations, personal backgrounds, and any evidence derived from real use.

Never use a real backup as a repository fixture. Do not place secrets, credentials, absolute local paths, real identities, or copyrighted private material in a QA result.

## Maintenance

Treat the questionnaire as a living artifact. When a milestone or behavior correction changes an observable promise:

1. update only the affected modules and regression checks;
2. add samples only when a reproducible state cannot be created economically through the UI;
3. preserve compatible result imports where practical, or increment the schema with migration notes;
4. record the application version or commit being tested in every result;
5. convert confirmed Fail and Blocked findings into the Product Hardening backlog.

Creating this baseline does not itself accept the Feature Complete Gate or activate Feature Freeze.
