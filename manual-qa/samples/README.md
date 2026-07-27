# Synthetic Manual QA Samples

All files in this directory are original synthetic data created for Daily Canvas manual QA. They contain no real user data, credentials, local paths, private databases, or third-party copyrighted content.

这些文件均为 Daily Canvas 人工验收专用的原创合成数据，不包含真实用户数据、凭据、本地路径、私人数据库内容或第三方版权材料。

## Files

### `daily-canvas-v6-normal.json`

- Format: current Daily Canvas backup format v6.
- Expected result: import preview succeeds; restoring replaces the disposable test origin after a safety backup is downloaded.
- Coverage: Areas, fixed positive and avoidance habits, Floating Task, Quota Goal, completed/skipped/lapse records, archived history, planned pause, lifecycle events, Experience Logs, Reflection, Meditations, rewards, and English settings.
- Key dates: June and July 2026. Navigate Calendar and Review to those months/ranges.
- Important: the sample intentionally contains an archived task with June CheckIn and Experience evidence. It must remain inspectable in Calendar even though it is absent from ordinary active selectors.

### `daily-canvas-v5-migration.json`

- Format: supported legacy backup format v5.
- Expected result: preview succeeds and clearly says the backup will be migrated; restore creates a v6 database with an empty Meditations collection while preserving the synthetic task, check-in, lifecycle, and reflection.
- Coverage: additive v5-to-v6 restore migration.

### `invalid-v6-duplicate-meditation-order.json`

- Format: structurally recognizable v6 backup containing duplicate `MeditationEntry.sortOrder` values.
- Expected result: rejected during file validation before any restore confirmation or database replacement.
- Coverage: Milestone 7.1 backup ordering contract.

### `invalid-future-version.json`

- Format: recognizable Daily Canvas backup identity with unsupported version `99`.
- Expected result: rejected explicitly as unsupported before any restore confirmation or database replacement.
- Coverage: future-version and incompatible-schema protection.

## Use order and safety

1. Export any data you care about before using a restore sample.
2. Prefer a disposable browser profile or origin.
3. Use the current v6 sample for most dense-state checks.
4. Use the v5 sample for migration only.
5. Use invalid samples last and verify that the data already in the app remains unchanged.

The files use fixed historical dates so their expected Calendar and Review evidence stays deterministic. They do not include a background image. For the local-background check, use a small nonprivate JPEG, PNG, or WebP that you created or are authorized to use; do not use a personal photograph.

已使用固定历史日期，便于稳定核对 Calendar 和 Review。样本没有附带背景图片。测试本地背景时，请使用自己创建或确认有权使用的小型非私人 JPEG、PNG 或 WebP，不要使用个人照片。

## Known limitations

- The samples do not replace clean-database creation checks.
- Restore is intentionally destructive to the current browser origin after the safety-backup step.
- OS print dialogs, downloaded file locations, and final PDF/Word rendering vary by browser and operating system and require human observation.
