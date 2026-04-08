# negative-support-mcp

[MCP](https://modelcontextprotocol.io/) server that exposes the [negative.support](https://negative.support/) support-generation workflow to compatible clients (for example Cursor). It wraps the official [`negative-support`](https://www.npmjs.com/package/negative-support) npm API described in the [project documentation](https://negative.support/docs).

**Repository:** [github.com/spikeon/negative-support-mcp](https://github.com/spikeon/negative-support-mcp)

## Requirements

- Node.js **18+** (ships with `npx`; no separate install step for the MCP itself)
- A negative.support license token (`ns_live_…`) from [negative.support](https://negative.support/) after sign-in

## Quick start (paste into MCP config)

You do **not** need to clone the repo or run `npm install` in this project. Use **`npx`**: it downloads dependencies into a cache the first time, then reuses them.

Put your real token in `NEGATIVE_SUPPORT_TOKEN` (or drop that block and use the `negative_support_activate` tool instead).

### Install from GitHub (works today)

```json
{
  "mcpServers": {
    "negative-support": {
      "command": "npx",
      "args": [
        "-y",
        "--package=github:spikeon/negative-support-mcp",
        "negative-support-mcp"
      ],
      "env": {
        "NEGATIVE_SUPPORT_TOKEN": "ns_live_..."
      }
    }
  }
}
```

On Windows, if `npx` is not found, try `"command": "npx.cmd"` with the same `args`.

### Install from npm (after you publish this package)

Once this package is published to npm as `negative-support-mcp` (`npm publish` from this repo, with an npm account that owns the name):

```json
{
  "mcpServers": {
    "negative-support": {
      "command": "npx",
      "args": ["-y", "negative-support-mcp"],
      "env": {
        "NEGATIVE_SUPPORT_TOKEN": "ns_live_..."
      }
    }
  }
}
```

Publishing is optional; the GitHub `npx` form above is enough for end users.

### Releasing to npm (maintainers)

Pushes to `main` do **not** publish. A [workflow](.github/workflows/publish-npm.yml) runs **`npm publish`** when you push a **version tag** matching `v*`.

1. In [npm](https://www.npmjs.com/), create an **Automation** access token (or Granular Access Token with publish permission for this package).
2. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret** → name **`NPM_TOKEN`**, value = that token.
3. On `main`, set **`version`** in [`package.json`](./package.json) to the release you want (for example `1.0.1`), commit, and push.
4. Tag and push (the tag must match the version you intend to ship, conventionally `v` + semver):

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

The workflow checks out the tag, runs `npm ci`, then `npm publish` (which runs `prepublishOnly` → `npm run build`). Each new version on npm must be **unique**; bump `package.json` before every release.

## Why this works

- **`dist/` is committed** so GitHub installs do not need TypeScript or a build step.
- **`npx -y`** runs the `negative-support-mcp` binary from [`package.json` `bin`](./package.json); npm installs this package’s **runtime** `dependencies` automatically.
- **`prepublishOnly`** rebuilds `dist/` before `npm publish` so the registry tarball stays in sync with source.

## Development (contributors)

```bash
git clone https://github.com/spikeon/negative-support-mcp.git
cd negative-support-mcp
npm install
npm run build
npm start
```

Or with hot reload during development:

```bash
npm run dev
```

The server uses **stdio** MCP and is meant to be started by an MCP host.

## Tools

| Tool | Description |
|------|-------------|
| `negative_support_activate` | Activate the license for this process using your token. |
| `negative_support_deactivate` | Clear the active license locally (does not revoke the token). |
| `negative_support_generate` | Generate supports from a **local** STL, OBJ, STEP, or STP file; writes `*_supports.stl` and optionally a `.3mf`. |

### `negative_support_generate` parameters

- **`input_path`** (required): Absolute path to the model on the machine running this MCP server.
- **`output_stl_path`**: Optional; default is `<basename>_supports.stl` next to the input.
- **`output_3mf_path`**: Optional; if set, writes a 3MF with model + support objects (similar to the CLI `--3mf` flag).
- **`format`**: Optional `stl` \| `obj` \| `step` \| `stp` if the extension is ambiguous.
- **`margin`**, **`angle`**, **`min_volume`**, **`skip_merge`**: Same meaning as in the [official docs](https://negative.support/docs).

## Resources

- **`negative-support://docs`**: Short in-server summary; full reference remains at [negative.support/docs](https://negative.support/docs).

## License

MIT. This project is not affiliated with negative.support; it only integrates their published npm package and licensing model.
