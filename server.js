const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = __dirname;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const datasets = {};
function getDataset(kind) {
  if (!datasets[kind]) {
    const filenames = { sales: "sales-history.json", purchases: "purchase-history.json", shipments: "shipment-history.json", inventory: "inventory-history.json" };
    const filename = filenames[kind];
    if (!filename) throw new Error(`Unknown dataset: ${kind}`);
    const filePath = path.join(root, "public", "data", filename);
    const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath) : zlib.gunzipSync(fs.readFileSync(filePath + ".gz"));
    datasets[kind] = JSON.parse(raw.toString("utf8"));
  }
  return datasets[kind];
}
const server = http.createServer((req, res) => {
  if (["/api/sales", "/api/purchases", "/api/shipments", "/api/inventory"].some((route) => req.url.startsWith(route))) {
    const requestUrl = new URL(req.url, "http://localhost");
    const kinds = { "/api/sales": "sales", "/api/purchases": "purchases", "/api/shipments": "shipments", "/api/inventory": "inventory" };
    const kind = kinds[requestUrl.pathname];
    const source = getDataset(kind);
    const offset = Math.max(0, Number(requestUrl.searchParams.get("offset")) || 0);
    const limit = Math.min(200, Math.max(1, Number(requestUrl.searchParams.get("limit")) || 100));
    const query = (requestUrl.searchParams.get("q") || "").trim().toLowerCase();
    const filtered = query ? source.records.filter((record) => Object.values(record).some((value) => String(value).toLowerCase().includes(query))) : source.records;
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ fields: source.fields, total: filtered.length, offset, limit, records: filtered.slice(offset, offset + limit) }));
  }
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const target = path.join(root, pathname === "/" ? "index.html" : pathname);
  if (!target.startsWith(root)) return res.writeHead(403).end("Forbidden");
  fs.stat(target, (err, stat) => {
    const file = !err && stat.isFile() ? target : path.join(root, "index.html");
    fs.readFile(file, (readErr, data) => {
      if (readErr) return res.writeHead(404).end("Not found");
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache", "Expires": "0" });
      res.end(data);
    });
  });
});
server.listen(process.env.PORT || 3000, () => console.log("TrueERP: http://localhost:" + (process.env.PORT || 3000)));
