import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "myspellinggame.com";
const key = "c8e75d1227e47ac22dd5464a576d8bcf";
const keyFile = `${key}.txt`;
const endpoint = "https://api.indexnow.org/indexnow";
const publicDirs = new Set(["es", "pt-br", "fr", "id", "zh"]);

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function changedFiles(base) {
  if (base) {
    const output = git([
      "diff",
      "--name-only",
      "--diff-filter=ACMRT",
      `${base}..HEAD`,
    ]);
    if (output === null)
      throw new Error(`Cannot compare IndexNow changes from Git ref: ${base}`);
    return output.split(/\r?\n/).filter(Boolean);
  }
  const parent = git(["rev-parse", "HEAD^"]);
  if (parent) return changedFiles(parent);
  const output = git([
    "diff-tree",
    "--root",
    "--no-commit-id",
    "--name-only",
    "-r",
    "--diff-filter=ACMRT",
    "HEAD",
  ]);
  if (output === null)
    throw new Error("Cannot inspect the current Git commit for IndexNow.");
  return output.split(/\r?\n/).filter(Boolean);
}

function isPublicHtml(file) {
  const parts = file.replaceAll("\\", "/").split("/");
  return (
    file.endsWith(".html") &&
    (parts.length === 1 || (parts.length === 2 && publicDirs.has(parts[0])))
  );
}

function canonicalFromFile(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return null;
  const html = fs.readFileSync(absolute, "utf8");
  const tag =
    html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0] || "";
  return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || null;
}

function allowedCanonical(value, sitemapUrls) {
  try {
    const url = new URL(value);
    const blocked = ["/teacher", "/admin", "/api", "/a", "/l"];
    return (
      url.protocol === "https:" &&
      url.hostname === host &&
      !url.search &&
      !url.hash &&
      !url.pathname.endsWith(".html") &&
      !blocked.some(
        (prefix) =>
          url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
      ) &&
      sitemapUrls.has(url.href)
    );
  } catch {
    return false;
  }
}

export function changedPublicUrls(base) {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const sitemapUrls = new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
  );
  return [
    ...new Set(
      changedFiles(base)
        .filter(isPublicHtml)
        .map(canonicalFromFile)
        .filter((url) => allowedCanonical(url, sitemapUrls)),
    ),
  ].sort();
}

async function main() {
  const base = process.argv.find((arg) => arg.startsWith("--base="))?.slice(7);
  const dryRun = process.argv.includes("--dry-run");
  const keyContents = fs.readFileSync(path.join(root, keyFile), "utf8").trim();
  if (keyContents !== key || !/^[a-f0-9]{8,128}$/.test(key))
    throw new Error("IndexNow key file does not match its filename.");

  const urlList = changedPublicUrls(base);
  if (dryRun) {
    console.log(`IndexNow dry run: ${urlList.length} canonical URL(s)`);
    for (const url of urlList) console.log(url);
    return;
  }
  if (!urlList.length) {
    console.log(
      "IndexNow: submitted 0 URLs; no changed canonical public pages found.",
    );
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}/${keyFile}`,
      urlList,
    }),
  });
  const text = (await response.text()).trim();
  console.log(
    `IndexNow: submitted ${urlList.length} URL(s); HTTP ${response.status}.`,
  );
  if (response.status !== 200) {
    const meanings = {
      400: "Malformed request.",
      403: "Key or key-file validation failed.",
      422: "Host, key, or payload mismatch.",
      429: "Rate limited.",
    };
    throw new Error(
      [meanings[response.status] || "IndexNow request failed.", text]
        .filter(Boolean)
        .join(" "),
    );
  }
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`IndexNow: ${error.message}`);
    process.exitCode = 1;
  });
}
