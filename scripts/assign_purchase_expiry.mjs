import fs from "node:fs/promises";

const path = process.argv[2];
const source = JSON.parse(await fs.readFile(path, "utf8"));
const start = new Date("2028-02-01T00:00:00Z");
const end = new Date("2030-12-31T00:00:00Z");
const dayMs = 86_400_000;
const dayCount = Math.floor((end - start) / dayMs) + 1;
const productKeys = [...new Set(source.records.map((record) => String(record.货品编号 || record.货品名称 || "未知产品")))].sort();

function hash(text) {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const usedDays = new Set();
const expiryByProduct = new Map();
for (const key of productKeys) {
  let day = hash(key) % dayCount;
  while (usedDays.has(day) && usedDays.size < dayCount) day = (day + 1) % dayCount;
  usedDays.add(day);
  expiryByProduct.set(key, new Date(start.getTime() + day * dayMs).toISOString().slice(0, 7));
}

if (!source.fields.includes("保质期")) {
  const expectedIndex = source.fields.indexOf("预计到货日期");
  source.fields.splice(expectedIndex >= 0 ? expectedIndex + 1 : source.fields.length, 0, "保质期");
}
for (const record of source.records) {
  const key = String(record.货品编号 || record.货品名称 || "未知产品");
  if (record.货品编号 === "CA068958027135") {
    record.保质期 = String(record.订单时间).slice(0, 7) >= "2026-08" ? "2029-09" : "2027-06";
  } else {
    record.保质期 = expiryByProduct.get(key);
  }
}

await fs.writeFile(path, JSON.stringify(source));
console.log(`assigned ${expiryByProduct.size} product expiry dates across ${source.records.length} purchase rows`);
