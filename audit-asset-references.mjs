import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const report = JSON.parse(await readFile(".tmp/database-audit/audit.json", "utf8"));
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", windowsHide: true })
  .split("\0")
  .filter(Boolean);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".sql",
  ".html",
  ".css",
  ".md",
]);
const files = [];
for (const path of tracked) {
  if (!textExtensions.has(extname(path)) || path.endsWith("package-lock.json")) continue;
  files.push({ path, text: await readFile(path, "utf8") });
}
const candidates = report.storage.flatMap((bucket) =>
  bucket.unreferencedCandidates.map((file) => {
    const path = `${bucket.bucket}/${file.path}`;
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return {
      bucket: bucket.bucket,
      path: file.path,
      bytes: file.bytes,
      exactCodeReferences: files
        .filter((file) => file.text.includes(path) || file.text.includes(encoded))
        .map((file) => file.path),
      possibleFilenameReferences: files
        .filter((file) => file.text.includes(basename(path)))
        .map((file) => file.path),
      deletionProvenSafe: false,
    };
  }),
);
const result = {
  checkedAt: new Date().toISOString(),
  currentDatabaseScanAt: report.at,
  trackedTextFilesChecked: files.length,
  candidateCount: candidates.length,
  exactCodeReferenceCount: candidates.filter((file) => file.exactCodeReferences.length).length,
  possibleFilenameReferenceCount: candidates.filter(
    (file) => file.possibleFilenameReferences.length,
  ).length,
  filesDeleted: 0,
  externalAndHistoricalDeploymentUsageVerified: false,
  candidates,
};
await writeFile(".tmp/database-audit/asset-reference-review.json", JSON.stringify(result, null, 2));
const { candidates: _candidates, ...summary } = result;
console.log(JSON.stringify(summary));
