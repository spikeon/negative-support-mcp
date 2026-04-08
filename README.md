# negative-support-mcp

[MCP](https://modelcontextprotocol.io/) server that exposes the [negative.support](https://negative.support/) support-generation workflow to compatible clients (for example Cursor). It wraps the official [`negative-support`](https://www.npmjs.com/package/negative-support) npm API described in the [project documentation](https://negative.support/docs).

**Repository:** [github.com/spikeon/negative-support-mcp](https://github.com/spikeon/negative-support-mcp)

## Requirements

- Node.js **18+**
- A negative.support license token (`ns_live_…`) from [negative.support](https://negative.support/) after sign-in

## Install and build

```bash
git clone https://github.com/spikeon/negative-support-mcp.git
cd negative-support-mcp
npm install
npm run build
```

The compiled entry point is `dist/index.js`.

## Run

```bash
npm start
```

Or during development (no separate build step):

```bash
npm run dev
```

The server speaks **stdio** MCP; it is meant to be launched by an MCP host, not used interactively in a terminal.

## Cursor (and similar) configuration

Add a server entry that runs Node against the built file and passes your token via environment (recommended):

```json
{
  "mcpServers": {
    "negative-support": {
      "command": "node",
      "args": ["/absolute/path/to/negative-support-mcp/dist/index.js"],
      "env": {
        "NEGATIVE_SUPPORT_TOKEN": "ns_live_..."
      }
    }
  }
}
```

Alternatively, omit `NEGATIVE_SUPPORT_TOKEN` and call the `negative_support_activate` tool once per session with your token.

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
