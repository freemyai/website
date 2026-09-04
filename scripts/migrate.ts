import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

/**
 * Applies db/migrations/*.sql in filename order.
 * Run manually with `pnpm db:migrate` — never during build, so
 * concurrent preview deployments cannot race on migrations.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is missing. Set it before running migrations.");
    process.exit(1);
  }

  const sql = neon(url);
  const dir = join(process.cwd(), "db", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

  for (const file of files) {
    const statements = (await readFile(join(dir, file), "utf8"))
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Applying ${file} (${statements.length} statements)…`);
    for (const statement of statements) {
      await sql.query(statement);
    }
  }

  console.log("Migrations complete.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
