// @ts-check
// Minimal static file server for local development and e2e tests.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

const [root = "web", port = "8080"] = process.argv.slice(2);
const base = resolve(root);
/** @type {Record<string, string>} */
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/** @param {string} file */
const insideRoot = (file) => {
  const rel = relative(base, file);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

createServer(async (req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  let file = resolve(join(base, path));
  if (!insideRoot(file)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": types[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}).listen(Number(port), () => console.log(`http://localhost:${port}/`));
