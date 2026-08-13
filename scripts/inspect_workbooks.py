import json
import sys
import pandas as pd

for path in sys.argv[1:]:
    book = pd.ExcelFile(path)
    result = {"path": path, "sheets": []}
    for name in book.sheet_names:
        frame = pd.read_excel(path, sheet_name=name, header=None, nrows=10)
        full = pd.read_excel(path, sheet_name=name, header=None, usecols=None)
        result["sheets"].append({
            "name": name,
            "rows": len(full),
            "columns": len(full.columns),
            "sample": frame.fillna("").astype(str).values.tolist(),
        })
    print(json.dumps(result, ensure_ascii=False, indent=2))
