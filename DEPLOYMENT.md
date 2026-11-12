# PeaceCream publication preparation

Status: tested and built locally; local Git history is being prepared. GitHub creation, push and public deployment require account authorization.

## Inspection

The current project is a static HTML/CSS/JavaScript application with both Create and Discover routes in one homepage/navigation system. The user confirmed that no remote repository exists and authorized creating `PeaceCream` on GitHub and publishing through Vercel. The local branch is `main`. The connected GitHub account is `mikikawamura-cmyk`. GitHub's website requires sign-in to create the repository; Vercel also requires account authorization. No remote URL or public deployment URL has been established.

## Prepared release

Use Node 22 or newer. No third-party npm packages are required.

```
npm test
npm run build
```

The build produces `dist/` with the homepage, Create, Discover, all runtime scripts, styling and PNG assets. Test pages and internal guides are excluded. It adds a content-derived version to script and stylesheet URLs to prevent stale browser code after a release. No login or server-side credentials are required by the application itself; hosting access restrictions still need live verification.

Checks passed: 66,154 quiz assertions across 64 flavor patterns and 16,384 lens patterns; existing 560 placement configurations; 1,200 three-topping plans; JavaScript syntax and referenced asset checks. The build completed successfully. These are local checks, not proof of public deployment.

## Required before GitHub integration

After GitHub sign-in, create a new repository named `PeaceCream`, private by default, without an initial README or .gitignore. Push the complete local `main` history, including all existing source, images, tests and guides. Generated `dist/` files are excluded from Git because the production build recreates them. No force push is needed.

## Hosting decision and authorization

Connect Vercel to Codex or sign in to Vercel to authorize deployment. Import the new GitHub repository, using its root as the project root. The committed `vercel.json` selects a static build with command `npm test && npm run build` and output directory `dist`. No environment variables or paid AI services are required. Configuration follows https://vercel.com/docs/project-configuration/vercel-json. Local configuration does not mean a deployment has occurred.

Once authorized and connected, configure Git-driven deployments on the intended branch. Verify public visitor access in the project settings rather than assuming a generated URL is anonymous.

## Public verification still required

After deployment succeeds, test the actual public origin: homepage and both journeys, all 12 quiz questions, grounded results, selection/removal and customization, photo loading, responsive image/caption spacing, PNG export and anonymous visitor access. Record the exact production URL, repository URL, branch and deployed commit. Current localhost links are development previews and are not shareable public websites.
