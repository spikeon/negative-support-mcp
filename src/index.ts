#!/usr/bin/env node
/**
 * MCP server wrapping the negative-support npm API (https://negative.support/docs).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, basename, extname, join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  activate,
  deactivate,
  generateSupports,
  export3MF,
  parseSTL,
  parseOBJ,
  parseSTEP,
  weldMesh,
} from "negative-support";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return Uint8Array.from(buf).buffer;
}

type ModelFormat = "stl" | "obj" | "step" | "stp";

function formatFromPath(filePath: string): ModelFormat | undefined {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".stl") return "stl";
  if (ext === ".obj") return "obj";
  if (ext === ".step" || ext === ".stp") return "step";
  return undefined;
}

async function modelMeshFor3mf(
  buffer: ArrayBuffer,
  format: ModelFormat
): Promise<ReturnType<typeof parseSTL>> {
  if (format === "stl") return parseSTL(buffer);
  if (format === "obj") return parseOBJ(buffer);
  const step = await parseSTEP(buffer);
  return weldMesh(step.mesh);
}

let licenseActive = false;

async function ensureLicense(): Promise<void> {
  const envToken = process.env.NEGATIVE_SUPPORT_TOKEN;
  if (!licenseActive && envToken) {
    await activate(envToken.trim());
    licenseActive = true;
  }
  if (!licenseActive) {
    throw new Error(
      "No active license. Set NEGATIVE_SUPPORT_TOKEN or call negative_support_activate with your token from https://negative.support/"
    );
  }
}

const DOC_SNIPPET = `negative-support — generate negative-space 3D print supports from STL, OBJ, or STEP.

Official docs: https://negative.support/docs

CLI: npx negative-support model.stl [--3mf] [-m margin] [--min-volume n] [-a angle]

Programmatic API (used by this server): activate(token), then generateSupports(buffer, { format, margin, angle, minVolume, skipMerge }).
`;

const server = new McpServer(
  {
    name: "negative-support-mcp",
    version: "1.0.0",
  },
  {
    instructions:
      "Wrappers for https://negative.support — generate negative-space 3D print supports from STL/OBJ/STEP files on disk. Set NEGATIVE_SUPPORT_TOKEN or call negative_support_activate. Use negative_support_generate with an absolute input_path on the host running the server.",
  }
);

server.registerResource(
  "negative-support-documentation",
  "negative-support://docs",
  {
    description: "Summary of the negative-support API; see https://negative.support/docs for full reference",
    mimeType: "text/markdown",
  },
  async () => ({
    contents: [
      {
        uri: "negative-support://docs",
        mimeType: "text/markdown",
        text: DOC_SNIPPET,
      },
    ],
  })
);

server.registerTool(
  "negative_support_activate",
  {
    description:
      "Activate a negative.support license for this MCP process. Same ns_live_* token as the CLI. Alternatively set env NEGATIVE_SUPPORT_TOKEN.",
    inputSchema: {
      token: z
        .string()
        .min(1)
        .describe("License token from https://negative.support/ (user menu after sign-in)"),
    },
    outputSchema: {
      ok: z.literal(true),
      message: z.string(),
    },
  },
  async ({ token }) => {
    await activate(token.trim());
    licenseActive = true;
    const structuredContent = {
      ok: true as const,
      message: "License activated for this session.",
    };
    return {
      content: [{ type: "text", text: structuredContent.message }],
      structuredContent,
    };
  }
);

server.registerTool(
  "negative_support_deactivate",
  {
    description: "Clear the active license in this process (does not revoke the token on the server).",
    outputSchema: {
      ok: z.literal(true),
      message: z.string(),
    },
  },
  async () => {
    deactivate();
    licenseActive = false;
    const structuredContent = {
      ok: true as const,
      message: "License cleared locally. Set NEGATIVE_SUPPORT_TOKEN or call negative_support_activate to use generation tools again.",
    };
    return {
      content: [{ type: "text", text: structuredContent.message }],
      structuredContent,
    };
  }
);

server.registerTool(
  "negative_support_generate",
  {
    description:
      "Generate support STL (and optionally 3MF with model + support pieces) from a local STL, OBJ, STEP, or STP file. Requires an activated license.",
    inputSchema: {
      input_path: z
        .string()
        .min(1)
        .describe("Absolute path to the model file on the machine running this MCP server"),
      output_stl_path: z
        .string()
        .optional()
        .describe("Where to write the supports STL (default: <basename>_supports.stl next to input)"),
      output_3mf_path: z
        .string()
        .optional()
        .describe("If set, also writes a 3MF containing the model and support objects"),
      format: z
        .enum(["stl", "obj", "step", "stp"])
        .optional()
        .describe("File format; default: inferred from extension"),
      margin: z
        .number()
        .optional()
        .describe("Gap between supports and model in mm (default 0.2)"),
      angle: z
        .number()
        .optional()
        .describe("Overhang angle threshold in degrees (default 45)"),
      min_volume: z
        .number()
        .optional()
        .describe("Minimum support piece volume in mm³ (default 1.0)"),
      skip_merge: z
        .boolean()
        .optional()
        .describe("If true, skip merging pieces (OOM fallback)"),
    },
    outputSchema: {
      output_stl_path: z.string(),
      output_3mf_path: z.string().optional(),
      stats: z.object({
        pieces: z.number(),
        faces: z.number(),
        volume: z.number(),
      }),
      progress: z.array(z.string()).optional(),
    },
  },
  async ({
    input_path,
    output_stl_path,
    output_3mf_path,
    format: formatArg,
    margin,
    angle,
    min_volume,
    skip_merge,
  }) => {
    await ensureLicense();
    const inputPath = resolve(input_path);
    if (!existsSync(inputPath)) {
      return {
        isError: true,
        content: [{ type: "text", text: `Input file not found: ${inputPath}` }],
      };
    }

    const inferred = formatFromPath(inputPath);
    const format = formatArg ?? inferred;
    if (!format) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "Could not infer format from extension; pass format: stl | obj | step | stp",
          },
        ],
      };
    }

    const fileBuf = readFileSync(inputPath);
    const arrayBuffer = toArrayBuffer(fileBuf);
    const progress: string[] = [];
    const result = await generateSupports(arrayBuffer, {
      format,
      margin,
      angle,
      minVolume: min_volume,
      skipMerge: skip_merge,
      onProgress: (step, detail) => {
        progress.push(detail ? `${step}: ${detail}` : step);
      },
    });

    const baseName = basename(inputPath, extname(inputPath));
    const dir = dirname(inputPath);
    const stlOut =
      output_stl_path != null && output_stl_path.length > 0
        ? resolve(output_stl_path)
        : join(dir, `${baseName}_supports.stl`);

    writeFileSync(stlOut, Buffer.from(result.stl));

    let threeMfOut: string | undefined;
    if (output_3mf_path != null && output_3mf_path.length > 0) {
      threeMfOut = resolve(output_3mf_path);
      const modelMesh = await modelMeshFor3mf(arrayBuffer, format);
      const mfBuf = export3MF(modelMesh, result.supportPieces);
      writeFileSync(threeMfOut, Buffer.from(mfBuf));
    }

    const structuredContent = {
      output_stl_path: stlOut,
      ...(threeMfOut != null ? { output_3mf_path: threeMfOut } : {}),
      stats: result.stats,
      ...(progress.length > 0 ? { progress } : {}),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  }
);

async function main(): Promise<void> {
  if (process.env.NEGATIVE_SUPPORT_TOKEN?.trim()) {
    try {
      await activate(process.env.NEGATIVE_SUPPORT_TOKEN.trim());
      licenseActive = true;
    } catch (e) {
      console.error(
        "negative-support-mcp: NEGATIVE_SUPPORT_TOKEN set but activation failed:",
        e
      );
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("negative-support-mcp fatal:", err);
  process.exit(1);
});
