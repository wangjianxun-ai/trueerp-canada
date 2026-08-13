import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(process.argv[2]));
const sheets = [];
for (let index = 0; index < workbook.worksheets.items.length; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange();
  const values = used?.values ?? [];
  sheets.push({
    name: sheet.name,
    rows: values.length,
    columns: Math.max(0, ...values.map((row) => row.length)),
    sample: values.slice(0, 8),
  });
}
console.log(JSON.stringify(sheets, null, 2));
