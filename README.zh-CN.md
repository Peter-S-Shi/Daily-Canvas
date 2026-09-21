# 每日画布（Daily Canvas）

Daily Canvas 是一款**免费、无需账号、本地优先**的个人规划、习惯管理、反思、回顾与长期个人记录工具。

当前代码版本为 **v0.7.0**，仍然是基于 React/Vite、Dexie/IndexedDB 的浏览器运行版本。Milestone 1–7 已完成。下一阶段已经正式改为 **Daily Canvas v1.0.0 桌面版计划**：在保留现有数据模型与产品语义的基础上，把产品迁移成真正的桌面应用，并补强“计划 → 执行”之间目前最明显的能力缺口。

## 当前开发状态

此前等待执行的 v0.7 Feature Complete Gate 从未被正式接受。项目在 Feature Freeze 之前主动重新打开范围，并重新规划了更完整的 v1.0 桌面版。

已经完成的 Milestone 1–7 不作废。当前 v0.7 是后续桌面迁移的工程基线。

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

### 数据所有权与个性化

- 数据默认保存在本地 Dexie/IndexedDB。
- JSON 备份具有版本、迁移、验证、预览与安全恢复流程。
- 当前支持到备份格式 v6。
- 背景图片等外观资源保存在本地。
- 支持中英文、浅色/深色/系统主题、每周起始日以及减少动态效果。

## 已批准的 v1.0 方向

v1.0 不会推翻现有产品哲学，而是重点补齐“规划 → 执行”之间的桥梁。

已经批准进入 v1.0 的能力包括：

- Quick Capture / Inbox。
- Global Search。
- Task Notes。
- 仅一层 Checklist，不建立递归任务树。
- 更丰富的循环规则。
- Task Duration Estimate。
- 对未完成工作的显式 Replan。
- 可选 Day / Week Timeline。
- Timeline 上可选的简化 Time Blocking。
- 自动轮换的本地备份。
- 基础本地提醒。
- 轻量 Reflection Templates。
- On This Day / 历史回顾 resurfacing。
- Reflection / Review 本地导出。
- 桌面快捷键。
- 基于 GitHub Release 的版本更新识别；发现新版本后跳转 Release 页面，不做静默自更新。

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

## 桌面迁移原则

v1.0 桌面化先建立一个薄的 Desktop Foundation，而不是大规模重写。

- 保留 React、TypeScript、Vite、现有 service layer 和领域语义。
- 初期继续使用 Dexie/IndexedDB；除非桌面可行性验证证明它成为 blocker，否则不主动改写成 SQLite。
- 先验证轻量桌面壳，同时保留替代方案以应对可行性问题。
- 在功能扩展前先证明数据持久化、备份恢复、本地文档输出和升级安全。
- 文件系统、系统通知、版本检查等桌面能力通过明确的 adapter 与领域服务分离。

## UI 迁移原则

广泛实施桌面 UI 之前，先建立明确的设计蓝本：

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

v1.0 路线会建立按风险分层的 GitHub Actions，而不是让纯文档修改也触发完整依赖安装和全量测试。详见 [ROADMAP.md](ROADMAP.md)。

## 隐私模式

核心个人数据必须继续保存在本地，并且产品在没有账号、没有云服务时仍可完整使用。

计划中的版本更新识别可以向 GitHub Releases 发起非常窄的非个人数据请求，仅用于比较版本号。它不得上传任务、习惯、反思、感悟、使用行为统计或其它私人内容。

未来任何远程、同步或 AI 能力都必须单独立项，并且不能悄悄取消 local-only 使用方式。
