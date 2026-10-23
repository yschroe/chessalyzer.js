# Release process

Releases are driven by a version tag (`v*`). Pushing the tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml): validate `package.json` vs the tag, dry-run the npm pack, build notes from `CHANGELOG.md`, publish to npm, and create the GitHub release.

Local version bumps use [bumpp](https://github.com/antfu-collective/bumpp) via `bun run bump` ([`bump.config.ts`](bump.config.ts)). Config highlights:

- `push: false` — commit and tag locally; you push when ready
- `all: true` — the release commit includes **all** pending changes (e.g. changelog), not only `package.json`

## Happy path

Pre: Make sure you are on the main branch before running the steps. If you accidentally performed the steps on a different (fresh) branch, see the [section below](#moving-a-release-from-a-fresh-branch-to-main).

1. **Update `CHANGELOG.md`**
    - Move items from `[Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` section (Keep a Changelog style).
    - The heading version **must** match the version you are about to bump. CI fails with `No changelog section found for [version]` otherwise.
    - Leave the file uncommitted (or staged). Do not create a separate “update changelog” commit first.

2. **Bump, commit, and tag**

    ```sh
    bun run bump
    ```

    Confirm the version prompt. bumpp updates `package.json`, commits everything pending (changelog + version) as `chore: release {version}`, and creates tag `v{version}` locally.

3. **Optional: preview release notes** before publishing

    ```sh
    bun run release:notes -- <version>
    # or workflow_dispatch on the Release workflow with that version
    ```

4. **Push the commit and the tag**

    ```sh
    git push origin main
    git push origin v<version>
    ```

    Tag push triggers CI. Prereleases (version contains `-`) publish under the matching npm dist-tag (e.g. `alpha`) and are marked prerelease on GitHub.

5. **Confirm** the Actions run, npm package, and GitHub release look right.

## Checklist before bumping

- [ ] `CHANGELOG.md` has `## [<version>]` for the version you will select
- [ ] Working tree only has release-related pending changes (changelog, maybe docs) — `all: true` will commit **everything** dirty
- [ ] You are on the branch you intend to release from (usually `main`)

## Moving a tag (recovery)

Use this when the tag already points at the wrong commit — typically after bumping/tagging **before** the changelog was updated, so CI failed on release notes while npm/GitHub never published.

**Safe only if** the failed run never published to npm and never created a GitHub release for that tag. If either already exists, fix notes/package carefully instead of casually retargeting the tag.

Given: tag `vX.Y.Z` is on an older commit; HEAD (or another commit) has the missing changelog (and matches `package.json` version).

```sh
# Recreate the tag on the correct commit (usually HEAD)
git tag -f vX.Y.Z

# Overwrite the remote tag (required — a normal push will refuse)
git push origin vX.Y.Z --force
```

That re-runs the release workflow on the new tip.

If a GitHub release object already exists for the old tag target, delete or update it so it does not disagree with the moved tag (`gh release delete vX.Y.Z` and let CI recreate, or edit the release).

Avoid moving tags that consumers may already have pulled; for a botched **published** release, prefer a new patch/prerelease over rewriting history.

## Moving a release from a fresh branch to main

If the above steps were accidentally performed on a fresh branch, the release commit can simply be fast-forwarded onto the main branch by running `git push origin <the-release-commit>:main`.

## Related commands

| Command                              | Purpose                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| `bun run bump`                       | Interactive version bump, commit (`all: true`), local tag           |
| `bun run release:notes -- <version>` | Write `RELEASE_BODY.md` from changelog + commits since previous tag |
| `bun run release:pack`               | `npm publish --dry-run` with the correct dist-tag                   |
