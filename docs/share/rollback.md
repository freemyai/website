# Share rollback without reassigning links

Preserve `data/share-aliases.json`, `config/share-redirects.json`, and the exact
Vercel redirects whenever possible: links already shared should continue to
lead to the same Freemy work. Never assign an old or retired alias to another
work, and never send missing works to the homepage.

If the sharing UI causes a problem, prepare a small reviewed follow-up change
that hides `[data-share-control]` (for example with a temporary CSS rule),
while keeping the alias registry and redirect configuration. Run the normal
build, sharing audit and SEO checks, then deploy that tested follow-up. Contact
and original experience links can remain available.

If a destination is wrong, correct the work's canonical mapping, retain its old
alias in the same registry entry, run `npm run share:sync`, verify its generated
rules and check for unrelated configuration changes before deploying. If a
work is formally removed, retire its aliases and return a real missing page
instead of redirecting to unrelated content.

A complete rollback to the deployment before the sharing feature removes the
new short URLs and should be reserved for an incident where keeping them is
not possible. Check the current remote main and deployment before any revert;
do not force-push or overwrite subsequent content updates.
