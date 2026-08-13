import json
import sys
from pathlib import Path
import pandas as pd

source_path, output_path = sys.argv[1:]
frame = pd.read_excel(source_path, dtype=object).where(lambda value: pd.notna(value), "")
payload = {"fields": [str(column) for column in frame.columns], "records": frame.to_dict(orient="records")}
Path(output_path).write_text(json.dumps(payload, ensure_ascii=False, default=str), encoding="utf-8")
print(f"{Path(output_path).name}: {len(payload['records'])} records, {len(payload['fields'])} fields")
