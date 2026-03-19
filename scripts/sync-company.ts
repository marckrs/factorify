/**
 * sync-company.ts — Syncs COMPANY.md sections to AttnRes memory via Supabase
 *
 * Usage: pnpm sync:company
 *
 * This script reads COMPANY.md from the project root, parses it into sections,
 * and stores each section as a foundational memory block in AttnRes via Supabase.
 *
 * Environment variables required:
 *   SUPABASE_URL         — Supabase project URL
 *   SUPABASE_SERVICE_KEY  — Supabase service role key (not anon key)
 */

import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanySection {
  readonly title: string;
  readonly level: number;
  readonly content: string;
  readonly path: string;
}

interface AttnResBlock {
  readonly content: string;
  readonly block_type: "foundational";
  readonly importance: number;
  readonly metadata: {
    readonly source: "COMPANY.md";
    readonly section_title: string;
    readonly section_path: string;
    readonly section_level: number;
    readonly synced_at: string;
    readonly version: string;
  };
}

interface SyncResult {
  readonly section: string;
  readonly status: "synced" | "dry-run" | "error";
  readonly error?: string;
}

interface SupabaseInsertResponse {
  readonly error?: { message: string } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");
const COMPANY_MD_PATH = resolve(PROJECT_ROOT, "COMPANY.md");
const ATTNRES_TABLE = "attnres_memories";
const VERSION = "1.0.0";

/** Importance weights by section depth — top-level sections carry more weight */
const IMPORTANCE_BY_LEVEL: Readonly<Record<number, number>> = {
  1: 1.0,
  2: 0.9,
  3: 0.75,
  4: 0.6,
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseMarkdownSections(markdown: string): CompanySection[] {
  const lines = markdown.split("\n");
  const sections: CompanySection[] = [];
  const pathStack: string[] = [];

  let currentTitle = "";
  let currentLevel = 0;
  let currentLines: string[] = [];

  function flushSection(): void {
    if (currentTitle) {
      const content = currentLines.join("\n").trim();
      if (content.length > 0) {
        sections.push({
          title: currentTitle,
          level: currentLevel,
          content,
          path: pathStack.slice(0, currentLevel).join(" > "),
        });
      }
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      flushSection();

      const level = headingMatch[1].length;
      const title = headingMatch[2].replace(/[—\-]\s*/, "").trim();

      // Update path stack for hierarchy tracking
      pathStack[level - 1] = title;
      pathStack.length = level;

      currentTitle = title;
      currentLevel = level;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush the last section
  flushSection();

  return sections;
}

// ---------------------------------------------------------------------------
// AttnRes block creation
// ---------------------------------------------------------------------------

function sectionToAttnResBlock(section: CompanySection): AttnResBlock {
  const importance = IMPORTANCE_BY_LEVEL[section.level] ?? 0.5;

  return {
    content: `[${section.path}]\n\n${section.content}`,
    block_type: "foundational",
    importance,
    metadata: {
      source: "COMPANY.md",
      section_title: section.title,
      section_path: section.path,
      section_level: section.level,
      synced_at: new Date().toISOString(),
      version: VERSION,
    },
  };
}

// ---------------------------------------------------------------------------
// Supabase sync
// ---------------------------------------------------------------------------

async function syncToSupabase(
  blocks: AttnResBlock[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const endpoint = `${supabaseUrl}/rest/v1/${ATTNRES_TABLE}`;

  // First, clear existing foundational blocks from COMPANY.md
  const deleteResponse = await fetch(
    `${endpoint}?metadata->>source=eq.COMPANY.md&block_type=eq.foundational`,
    {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    },
  );

  if (!deleteResponse.ok) {
    console.error(
      `[WARN] Failed to clear old COMPANY.md blocks: ${deleteResponse.statusText}`,
    );
  }

  // Insert new blocks
  for (const block of blocks) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(block),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as SupabaseInsertResponse;
        results.push({
          section: block.metadata.section_title,
          status: "error",
          error: errorBody.error?.message ?? response.statusText,
        });
      } else {
        results.push({
          section: block.metadata.section_title,
          status: "synced",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        section: block.metadata.section_title,
        status: "error",
        error: message,
      });
    }
  }

  return results;
}

function dryRunSync(blocks: AttnResBlock[]): SyncResult[] {
  return blocks.map((block) => ({
    section: block.metadata.section_title,
    status: "dry-run" as const,
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  sync-company.ts — COMPANY.md -> AttnRes Memory");
  console.log("=".repeat(60));
  console.log();

  // 1. Read COMPANY.md
  let markdown: string;
  try {
    markdown = await readFile(COMPANY_MD_PATH, "utf-8");
    console.log(`[OK] Read COMPANY.md (${markdown.length} bytes)`);
  } catch {
    console.error(`[FATAL] Could not read ${COMPANY_MD_PATH}`);
    console.error("        Make sure COMPANY.md exists in the project root.");
    process.exit(1);
  }

  // 2. Parse into sections
  const sections = parseMarkdownSections(markdown);
  console.log(`[OK] Parsed ${sections.length} sections\n`);

  // 3. Convert to AttnRes blocks
  const blocks = sections.map(sectionToAttnResBlock);

  // 4. Display summary
  console.log("Sections to sync:");
  console.log("-".repeat(60));
  for (const block of blocks) {
    const truncated =
      block.content.length > 80
        ? block.content.slice(0, 80).replace(/\n/g, " ") + "..."
        : block.content.replace(/\n/g, " ");
    console.log(
      `  [${block.importance.toFixed(2)}] ${block.metadata.section_path}`,
    );
    console.log(`         ${truncated}`);
  }
  console.log("-".repeat(60));
  console.log();

  // 5. Sync or dry-run
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseKey = process.env["SUPABASE_SERVICE_KEY"];

  let results: SyncResult[];

  if (supabaseUrl && supabaseKey) {
    console.log("[LIVE] Supabase credentials found — syncing to AttnRes...\n");
    results = await syncToSupabase(blocks, supabaseUrl, supabaseKey);
  } else {
    console.log("[DRY-RUN] Supabase not configured — logging what would be synced.");
    console.log("          Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable sync.\n");
    results = dryRunSync(blocks);
  }

  // 6. Report
  console.log("Results:");
  console.log("-".repeat(60));

  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    const icon =
      result.status === "synced"
        ? "[OK]"
        : result.status === "dry-run"
          ? "[--]"
          : "[!!]";

    console.log(`  ${icon} ${result.section} (${result.status})`);
    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }

    if (result.status === "synced" || result.status === "dry-run") {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log("-".repeat(60));
  console.log(
    `\nTotal: ${results.length} sections | ${successCount} ok | ${errorCount} errors`,
  );

  if (errorCount > 0) {
    process.exit(1);
  }

  console.log("\nDone.");
}

main();
