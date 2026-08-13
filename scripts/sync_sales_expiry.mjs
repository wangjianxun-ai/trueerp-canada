import fs from "node:fs/promises";
import zlib from "node:zlib";

const [, , purchasePath, salesPath] = process.argv;
const load = async (path) => JSON.parse(zlib.gunzipSync(await fs.readFile(path)).toString("utf8"));
const purchases = await load(purchasePath);
const sales = await load(salesPath);
const purchasesBySku = new Map();

const timestamp = (value) => {
  const parsed = Date.parse(String(value || "").replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : 0;
};

for (const row of purchases.records) {
  const sku = String(row.货品编号 || "").trim();
  if (!sku || !row.保质期) continue;
  if (!purchasesBySku.has(sku)) purchasesBySku.set(sku, []);
  purchasesBySku.get(sku).push({ time: timestamp(row.订单时间), expiry: row.保质期 });
}

for (const entries of purchasesBySku.values()) entries.sort((a, b) => a.time - b.time);
if (!sales.fields.includes("保质期")) {
  const index = sales.fields.indexOf("货品批次");
  sales.fields.splice(index >= 0 ? index + 1 : sales.fields.length, 0, "保质期");
}

let matched = 0;
for (const row of sales.records) {
  const entries = purchasesBySku.get(String(row.货品编号 || "").trim());
  if (!entries?.length) { row.保质期 = ""; continue; }
  const saleTime = timestamp(row.付款时间 || row.发货时间);
  let nearest = entries[0];
  for (const entry of entries) if (Math.abs(entry.time - saleTime) < Math.abs(nearest.time - saleTime)) nearest = entry;
  row.保质期 = nearest.expiry;
  matched += 1;
}

const encoded = Buffer.from(JSON.stringify(sales));
await fs.writeFile(salesPath, zlib.gzipSync(encoded, { level: 9 }));
console.log(JSON.stringify({ rows: sales.records.length, matched, unmatched: sales.records.length - matched, fields: sales.fields.length }));
