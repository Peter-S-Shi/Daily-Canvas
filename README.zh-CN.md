# 每日画布（Daily Canvas）

Daily Canvas 是一款**免费、无需账号、本地优先**的个人规划、习惯管理、反思、回顾与长期个人记录工具。

当前代码版本为 **v0.7.0**，基于 React/Vite、Dexie/IndexedDB 构建。Milestone 1–13 均已完成，包括 Tauri 2 Windows 桌面基础、冻结的桌面 UI 蓝图、桌面 UI 迁移、首批 v1.0 捕获与任务增强能力、Day/Week Timeline、Time Block 与本地提醒，以及 Reflection Templates、On This Day、本地导出、自动备份与 GitHub Release 更新提示。应用既能以浏览器方式运行，也已打包为 Windows 桌面应用。下一步为 Milestone 14（产品加固）。

## 当前开发状态

此前等待执行的 v0.7 Feature Complete Gate 从未被正式接受。项目在 Feature Freeze 之前主动重新打开范围，重新规划了更完整的 v1.0 桌面版，并已完成 Milestone 8 桌面基础：选定 Tauri 2 作为桌面壳、冻结桌面标识符与来源、保留 Dexie/IndexedDB 不变、为原生能力建立窄接口的桌面适配层、以 Windows/MSVC 作为权威构建环境、并建立按风险分层的 GitHub Actions CI。验证证据见 `desktop-spike/M8A-EVIDENCE.md` 与 `desktop-verify/M8B-EVIDENCE.md`。

已经完成的工作不会作废。Milestone 9 冻结了桌面信息架构与 UI 蓝图（`docs/m9-desktop-ui-blueprint/`），Milestone 10 完成桌面 UI 迁移。**Milestone 11：捕获与任务增强**已加入 Inbox / Quick Capture、本地 Global Search、Task Notes、单层 Checklist、预计时长、更丰富的习惯循环，以及只面向未来的 Replan。**Milestone 12：Timeline 与桌面执行**已加入 Day/Week Timeline、Available Work、带强制键盘可达编辑器的 Time Block、Replan 驱动的 `needsReview` 标记、本地提醒，以及冻结的桌面快捷键集合。**Milestone 13：反思、长期保存与桌面配套能力**已加入轻量 Reflection Templates、On This Day、本地 Reflection / Review Markdown 导出、自动轮换本地备份，以及 GitHub Release 更新提示。已批准的 v1.0 功能范围（Milestone 8–13）现已全部完成；下一个工程目标为 Milestone 14（产品加固与全量回归）。

新的里程碑顺序见 [ROADMAP.md](ROADMAP.md)，当前权威状态见 [PROJECT_STATUS.md](PROJECT_STATUS.md)，架构边界见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## Daily Canvas 当前已有能力

### 规划与任务语义

- 新建、编辑、归档、恢复、星标、组织和删除任务。
- 区分普通任务、积极习惯和戒除习惯，并使用不同的完成语义。
- 支持固定计划、Floating Task 和每周/每月 Quota Goal。
- 每个任务可属于一个可选 Area / 主线领域。
- Today 支持手动排序，但排序不会改变计划本身。
- 区分完成、安全日、失守、跳过和未记录。
- 始终保留“缺失记录不等于成功”的原则。
- 将未分类想法保存到独立 Inbox，再明确整理为真实任务语义。
- 在本地搜索任务标题/笔记、每日回顾、感悟与领域。
- 为任务添加笔记、单层清单和预计时长，不引入递归子任务或时间追踪。
- 使用更丰富的习惯循环与只面向未来的 Replan，不重写历史。

### Timeline 与执行

- 把真实任务放进可选的 Day 或 Week Timeline，粒度为 15 分钟，并配有强制的键盘可达 日期/开始时间/时长/提醒 编辑入口（拖放只是可选的高效方式，不是唯一入口）。
- 查看某一天的 Available Work，全部来自现有的固定、浮动与配额任务，不会建立第二份任务数据库。
- Time Block 与计划/循环/配额语义保持分离：删除 Time Block 不会删除任务，Time Block 结束也不会自动完成任务。
- 当某一天存在 Time Block 时，Today 会出现轻量、可选的“今日计划”摘要。
- 获得本地、应用内的提醒（关闭、开始时、提前 5/10/15/30/60 分钟），并在应用关闭期间错过提醒时，重新打开后做克制的补充提示。
- 使用固定的桌面快捷键集合（搜索、快速记录、今天、关闭）以及设置中只读的快捷键说明。

### 习惯生命周期

- 支持 starting、building、milestone reached、maintenance、paused、completed、archived 等生命周期状态。
- 达成里程碑后可以继续、延长、转为维持、完成或归档。
- 支持计划休息、假期、事后补填暂停和手动恢复，并保留历史证据。
- 累计完成、历史最佳、暂停记录与里程碑事件不会因为中断而被抹去。

### 反思与回顾

- 每日可保存一份可编辑的 Daily Reflection，并可选情绪、强度、提示词和自由文本。
- 打卡后可选记录 Experience Log，主观体验与完成事实保持分离。
- 支持本周、上周、本月、上月和自定义区间的本地确定性统计与中英双语自然语言回顾。
- Review 中的陈述可以回到 Calendar 检查对应证据。
- 不进行诊断、因果推断或预测性判断。

### 长期个人保存

- 独立保存并手动排序 Meditations / 感悟。
- 可选择部分或全部感悟导出，并保持全局人工排序。
- 可在本地打印 / 保存 PDF，并生成可编辑的 `.docx`。
- 私人文字不依赖远程服务。

### Reflection 模板、历史回顾与导出

- 撰写 Daily Reflection 时可选择 Free Write（默认）、Daily Check-in 或 Gratitude & Perspective；所有提示词都可跳过，提示文字不会被写入保存的内容。
- 在 Reflect 中浏览 On This Day：往年同月同日的 Daily Reflection 与感悟，按年份分组，一键跳转回原始记录。
- 将当前 Daily Reflection 或当前 Review 筛选结果导出为本地 Markdown（`.md`）文件。

### 桌面可靠性与更新提示

- 自动轮换本地备份，默认开启：每个自然日最多一次，保留最近 7 份，在设置中显示位置与历史，可通过与手动导入相同的流程恢复。
- 在设置 → 关于与更新中按需检查已安装版本与最新 GitHub Release 的对比状态，并提供手动“查看发布页面”跳转——绝不静默下载或自动安装。

### 数据所有权与个性化

- 数据默认保存在本地 Dexie/IndexedDB。
- JSON 备份具有版本、迁移、验证、预览与安全恢复流程。
- 当前备份格式为 v9，并继续迁移支持的 v1–v8 备份。
- 背景图片等外观资源保存在本地。
- 支持中英文、浅色/深色/系统主题、每周起始日以及减少动态效果。

## 已批准的 v1.0 方向

v1.0 不会推翻现有产品哲学，而是重点补齐“规划 → 执行”之间的桥梁。已批准的 v1.0 能力（Milestone 8–13）现已全部交付：

- Quick Capture / Inbox、Global Search、Task Notes、单层 Checklist、更丰富的循环规则、Task Duration Estimate、对未完成工作的显式 Replan（Milestone 11）。
- 可选 Day / Week Timeline 与 Time Blocking、基础本地提醒，以及桌面快捷键集合（Milestone 12）。
- 轻量 Reflection Templates、On This Day、Reflection / Review 本地导出、自动轮换本地备份，以及基于 GitHub Release 的版本更新识别（Milestone 13）。

Timeline 与 Time Blocking 永远是可选层。偏好弹性时间管理的用户可以继续只使用 Today、Floating、Quota 和 Calendar，而不必把每个任务都安排到具体时刻。

## v1.0 产品边界

Daily Canvas 不打算变成：

- 账号驱动的 SaaS；
- 团队协作或共享任务平台；
- 无限层级项目管理工具；
- 社交网络或竞争型习惯排行榜；
- 临床心理工具或 AI therapist；
- 强制云同步产品；
- 以 PWA 为正式发布路线的产品；
- 依赖远程 AI 才能工作的应用。

结构保持刻意简单：

```text
Area
  └── Task
       └── 可选的一层 Checklist
```

如果某个 Checklist item 已经需要独立的计划、Area、生命周期、Quota、奖励或历史，它就应该升级成真正的 Task，而不是继续向下生成“子任务的子任务”。

## 桌面迁移原则 —— 已由 Milestone 8 落实

v1.0 桌面化先建立了一个薄的 Desktop Foundation，而不是大规模重写。Milestone 8 已经用证据回答了以下每一个问题：

- React、TypeScript、Vite、现有 service layer 和领域语义保持不变。
- 继续使用 Dexie/IndexedDB；可行性验证没有发现需要改写成 SQLite 的证据。
- **Tauri 2** 经评估后被采纳为桌面壳。桌面标识符 `io.github.peter-s-shi.dailycanvas` 与打包来源 `https://tauri.localhost` 已冻结。
- 在扩展功能之前，已经在 Windows/MSVC 上验证了数据持久化（包括强制杀进程后的持久性）、备份恢复、本地文档输出与安装包升级安全。
- 本地文件、打印、本地通知、自动备份文件操作、GitHub Release 元数据与打开发布页面等桌面能力，均已通过 `src/desktop/desktopAdapter.ts` 与领域服务分离；网页层仅被授予最小化的 `notification:default`、`opener:default` 以及限定单一端点的 `http:default` 权限，不授予任何文件系统或通用 Shell/网络能力。

## UI 迁移原则 —— 已由 Milestone 9 落实

广泛实施桌面 UI 之前，先建立了明确的设计蓝本；冻结结果位于 `docs/m9-desktop-ui-blueprint/`，已由 Milestone 10 实现：

```text
产品语义
   ↓
信息架构
   ↓
线框图
   ↓
Markdown 行为说明
   ↓
HTML 视觉/交互蓝本
   ↓
冻结的 PDF 设计快照
   ↓
工程实现
```

可视化设计工具可以用于探索候选方案，但不能替代已经批准的信息架构和产品语义。

## 当前开发命令

当前 v0.7 需要 Node.js 20.19 或更高版本，以及 pnpm。

```bash
pnpm install
pnpm dev
```

当前验证命令：

```bash
pnpm typecheck
pnpm test
pnpm build
```

桌面壳（Tauri 2，Windows；权威构建环境是 CI 中的 MSVC）：

```bash
pnpm desktop:dev       # 开发窗口（Vite + Tauri）
pnpm desktop:build     # 不带安装包的 release 构建
pnpm desktop:bundle    # 按用户安装的 NSIS 安装包（测试版本号由 CI 提供）
```

在 Windows 上，双击 `OPEN_DAILY_CANVAS_DEV.cmd` 即可启动开发窗口：它会加载 Visual Studio Build Tools 的 x64 环境，使用 `stable-x86_64-pc-windows-msvc` Rust 工具链；本机工具链不完整时，会说明缺少什么。

打包后的应用验证位于 `desktop-verify/`（见 `desktop-verify/M8B-EVIDENCE.md`），只使用合成数据，并且不会清除它没有创建过的现有用户数据目录。

持续集成按风险分层（`.github/workflows/ci.yml`）：纯文档修改不安装任何工具链；应用代码修改运行类型检查、测试与构建；数据与备份修改额外运行定向回归；桌面壳或 CI 修改额外运行 Windows/MSVC 的桌面构建与冒烟检查。稳定的 `PR Gate` 任务汇总结果。详见 [ROADMAP.md](ROADMAP.md)。

## 隐私模式

核心个人数据必须继续保存在本地，并且产品在没有账号、没有云服务时仍可完整使用。

计划中的版本更新识别可以向 GitHub Releases 发起非常窄的非个人数据请求，仅用于比较版本号。它不得上传任务、习惯、反思、感悟、使用行为统计或其它私人内容。

未来任何远程、同步或 AI 能力都必须单独立项，并且不能悄悄取消 local-only 使用方式。
