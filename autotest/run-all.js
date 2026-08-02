// Runs every test file under each usecase folder as its own `node` process
// (keeps each file fully standalone/runnable on its own) and prints a
// pass/fail summary.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const usecaseDirs = fs
  .readdirSync(__dirname, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "node_modules")
  .map((d) => d.name)
  .sort();

const results = [];

for (const dir of usecaseDirs) {
  const dirPath = path.join(__dirname, dir);
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".js"))
    .sort();

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const id = file.replace(/\.js$/, "");
    process.stdout.write(`Running ${dir}/${id}... `);
    const r = spawnSync("node", [filePath], { encoding: "utf-8" });
    const pass = r.status === 0;
    const output = `${r.stdout || ""}${r.stderr || ""}`.trim();
    console.log(pass ? "PASS" : "FAIL");
    results.push({ id: `${dir}/${id}`, pass, output });
  }
}

console.log("\n=== Summary ===");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id}${r.pass ? "" : "  — " + r.output.split("\n").pop()}`);
}

const failCount = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failCount}/${results.length} passed`);
process.exit(failCount > 0 ? 1 : 0);
