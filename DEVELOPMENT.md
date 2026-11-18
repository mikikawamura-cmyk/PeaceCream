# PeaceCream redesign workspace

Start: production commit `d6a05e7851cd2a0182ef508185fa315edf7d18af`.
Branch: `peacecream-redesign` in the existing PeaceCream repository.

## Edit here

Make future edits in this checkout only. The research/backup checkout is separate.
No website content, design, photography or activity behavior changed during setup.

- `app.js`: homepage, Create activity and activity-only privacy notice.
- `style.css`, `quiz.css`: visual styles.
- `quiz-ui.js`, `quiz-engine.js`, `quiz-en.js`: Discover interface, scoring and content.
- `gelato-renderer.js`, `assets/`: existing preview renderer and photography.
- `index.html`: page shell and script/style references.

## Preview

Run `npm run preview` and open http://127.0.0.1:4185. Refresh after edits.
This command uses Node.js built-ins; no package installation, API keys or database
connection is needed. It serves only web assets on this Mac's loopback address.
It does not serve environment files or accept submissions.

Run `npm test` and `npm run build` before pushing. `dist/` is generated output;
edit the original files, not `dist/`.

Push only `peacecream-redesign`. Vercel's existing Git integration creates a
Preview deployment for this branch. The exact verified preview link and setup
evidence are recorded separately in the parent workspace's redesign setup note.
Preview protection may require your existing Vercel sign-in; do not disable it.

## Isolation

Vercel production tracks `main` and serves https://peacecream.vercel.app/.
Preview tracks other branches. No production settings were changed for setup.
This branch starts from the activity-only live site: no research API routes,
Supabase migrations, collection client, database credentials or backup code.
Existing research service variables are restricted to `feature/anonymous-responses`.
No `.env`, `.vercel` project link or credentials were copied into this checkout.

A local pre-push guard rejects branch updates other than `peacecream-redesign`;
the default push refspec also targets only that branch. Hooks are an additional
local safeguard, not GitHub branch protection. Never use `--no-verify`, force
push, `vercel --prod`, promote a preview, or merge to `main` without explicit
owner approval. Do not import production data or add live service connections.

## Eventually publish

Review the redesign preview and its diff, run activity/privacy/mobile/download
checks, then ask the owner to explicitly approve publication. Only afterward
open/review a pull request into `main` and merge the approved change; the existing
Vercel integration then deploys production. Recheck the live result and retain
the previous production commit as a rollback point. Creating or pushing this
development branch does not merge it or publish it to the production domain.
