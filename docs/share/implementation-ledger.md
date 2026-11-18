# Implementation notes

- Baseline is the exact previously published main commit `70b4cd9`; the existing
  linked worktree was clean. Its dependency directory is a shared junction, so
  clean installation was run in a separate tracked-source snapshot instead of
  removing or replacing the user's shared dependencies.
- The supplied design and implementation plan are retained in this directory.
  Short-link aliases use exact Vercel redirects, and the local ownership history
  prevents accidental removal or reassignment of previously registered names.
- The share panel stays in document flow rather than overlaying other cards.
  The existing preview dialog continues to suspend card impression timers.
- List scroll restoration uses each browser history entry's state with a
  30-minute expiry, preserving unrelated plain-object state. Non-object or
  unusual state is left untouched and falls back to browser behavior. This
  avoids two visits to the same URL overwriting one another without creating a
  persistent identifier.
- Independent review identified three important issues: a delayed clipboard
  or native-share result could affect the next preview; separate visits to the
  same list could overwrite scroll position; and the live audit omitted some
  redirect and final-page checks. Browser or unit tests reproduced each issue,
  and the fixes and reruns are included in this branch.
- The QR dependency is the fixed local MIT-licensed version documented in
  `assets/vendor/README.md`; its output was programmatically decoded for two
  works and both languages. A physical-phone scan remains unverified.
- Mail links do not send messages. Mailbox delivery/replies and third-party
  social-card rendering remain separate, unverified checks.
