import fs from "node:fs/promises";

const [, , purchasePath, inventoryPath] = process.argv;
const purchases = JSON.parse(await fs.readFile(purchasePath, "utf8"));
const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const latestBySku = new Map();

for (const row of purchases.records) {
  const sku = String(row.货品编号 || "").trim();
  const expiry = String(row.保质期 || "").trim();
  const orderTime = String(row.订单时间 || "");
  if (!sku || !expiry) continue;
  const current = latestBySku.get(sku);
  if (!current || orderTime > current.orderTime) latestBySku.set(sku, { orderTime, expiry });
}

let matched = 0;
let unmatched = 0;
for (const row of inventory.records) {
  const purchase = latestBySku.get(String(row.货品编号 || "").trim());
  if (purchase) {
    row.货品保质期 = purchase.expiry;
    matched += 1;
  } else {
    row.货品保质期 = "";
    unmatched += 1;
  }
}

await fs.writeFile(inventoryPath, JSON.stringify(inventory));
console.log(JSON.stringify({ inventoryRows: inventory.records.length, purchaseProducts: latestBySku.size, matched, unmatched }));
