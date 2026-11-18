# 作品可用性与异常记录

`data/availability-exceptions.json` 是作品可用性异常记录库。作品的原始资料仍保存在 `data/gallery.json`、`data/references.json` 或 `data/works.json`，不要删除，以便核对和恢复。

只在多次核查且有充分证据确认体验已经不可用时，将作品的 `verification.availability` 设为 `unavailable`，保留原有 `editorial.status: published`。这样作品会退出首页、发现列表、合集和相关推荐；已有详情页和分享短链仍可打开，并说明原站暂时不可用、提供纠错入口。一次超时、地区限制、验证码、设备不支持或其他无法区分于检查环境的问题，应记为待核验，不能直接当成原站失效。

暂时失效时不得删除或重分配 `data/share-aliases.json` 中的短链，详情页的现有索引和站点地图规则保持不变。如果另有明确决定要彻底移除作品，才将编辑状态改为非发布状态、把对应分享登记标为 `retired` 并运行 `npm run share:sync`；保留历史归属，确保旧地址返回 404，而不是跳到首页或其他作品。

异常记录库的每个条目保存 `work_id`、`original_url`、`previous_editorial_status`、`status`、`first_detected_at`、`last_checked_at`、`reason` 和 `evidence`。`evidence` 是检查记录数组，每条包含 `checked_at`、`method` 和可重复核实的 `observation`；时间使用带时区的 ISO 8601 格式。`status` 使用 `pending_verification`、`unavailable` 或 `recovered_pending_review`。待核验不自动改变作品的上架状态。同一作品保留一个条目，新增检查追加证据，保留历史。

恢复后记录 `recovered_pending_review`，保留异常历史，先复核实际体验及其他上架条件。不要把访问状态恢复误当作自动重新上架的依据。提交前运行项目检查，确认异常作品已从推荐和列表退出，而原有双语详情与短链保留且显示不可用提示；再核对远端并正常推送，上线后检查正式站。
