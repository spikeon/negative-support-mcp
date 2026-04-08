# @spikeonstudio/negative-support-mcp

[MCP](https://modelcontextprotocol.io/) server for [negative.support](https://negative.support/) — generate negative-space print supports (STL/OBJ/STEP) via the official [`negative-support`](https://www.npmjs.com/package/negative-support) package. Full API details: [negative.support/docs](https://negative.support/docs).

| | |
|--|--|
| **npm** | [`@spikeonstudio/negative-support-mcp`](https://www.npmjs.com/package/@spikeonstudio/negative-support-mcp) |
| **Source** | [github.com/spikeon/negative-support-mcp](https://github.com/spikeon/negative-support-mcp) |

## Requirements

- Node.js **18+**
- A negative.support token (`ns_live_…`) from [negative.support](https://negative.support/) after sign-in

## MCP configuration

Use **`npx`** — no clone or local `npm install` required. Set `NEGATIVE_SUPPORT_TOKEN`, or omit it and call `negative_support_activate` once per session.

**npm (default)**

```json
{
  "mcpServers": {
    "negative-support": {
      "command": "npx",
      "args": ["-y", "@spikeonstudio/negative-support-mcp"],
      "env": {
        "NEGATIVE_SUPPORT_TOKEN": "ns_live_..."
      }
    }
  }
}
```

**From GitHub** (same binary name as in [`package.json` `bin`](./package.json)):

```json
{
  "mcpServers": {
    "negative-support": {
      "command": "npx",
      "args": ["-y", "--package=github:spikeon/negative-support-mcp", "negative-support-mcp"],
      "env": {
        "NEGATIVE_SUPPORT_TOKEN": "ns_live_..."
      }
    }
  }
}
```

On Windows, if `npx` is missing, use `"command": "npx.cmd"` with the same `args`.

## Tools

| Tool | Description |
|------|-------------|
| `negative_support_activate` | Activate your license for this process. |
| `negative_support_deactivate` | Clear the local session (token not revoked on the server). |
| `negative_support_generate` | Build supports from a **local** STL/OBJ/STEP/STP; writes `*_supports.stl` and optional `.3mf`. |

**`negative_support_generate`:** `input_path` (absolute, on the host running the MCP) is required. Optional: `output_stl_path`, `output_3mf_path`, `format`, `margin`, `angle`, `min_volume`, `skip_merge` — see [negative.support/docs](https://negative.support/docs).

**Resource:** `negative-support://docs` — short in-server summary.

## Timeouts

Generation can take **several minutes** on large meshes. Many MCP clients use a default tool timeout (often around 60s) unless the call stays “active.” This server emits MCP **`notifications/progress`** when the client sends a **`progressToken`** with the tool request (about every 15s plus throttled updates from the library), which usually **refreshes** that timeout.

If a host still cuts you off, use the [`negative-support` CLI](https://negative.support/docs) for huge models, or raise the tool-timeout in your client if it exposes one.

## Development

```bash
git clone https://github.com/spikeon/negative-support-mcp.git
cd negative-support-mcp
npm install
npm run build   # or: npm run dev
```

The server uses stdio; it is started by the MCP host, not run interactively.

## Publishing (maintainers)

Pushing to `main` does not publish. [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml) runs `npm publish --access public` when a **`v*`** tag is pushed.

1. Add repository secret **`NPM_TOKEN`** ([npm access token](https://www.npmjs.com/settings/~/tokens) with publish rights for `@spikeonstudio/*`).
2. Bump `version` in `package.json` (each publish must be a new version).
3. `git tag vX.Y.Z && git push origin vX.Y.Z`

`prepublishOnly` runs `npm run build`. `dist/` is committed so GitHub-based `npx` installs work without a local TypeScript build.

## License

MIT. Not affiliated with negative.support; integrates their published npm package and licensing.
