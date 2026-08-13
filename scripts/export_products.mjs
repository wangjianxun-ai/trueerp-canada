import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const [, , inputPath, outputPath] = process.argv;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheet = workbook.worksheets.getItemAt(0);
const rows = sheet.getRange("A1:O491").values;
const headers = rows[0];
const products = rows.slice(1).filter((row) => row[0]).map((row, index) =>
  Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""]).concat([["id", `P${String(index + 1).padStart(4, "0")}`]]))
);
await fs.writeFile(outputPath, JSON.stringify(products, null, 2));
console.log(`exported ${products.length} products`);
