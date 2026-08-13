import json
import sys
from pathlib import Path
import pandas as pd

sales_path, purchase_path, output_dir = sys.argv[1:]
output = Path(output_dir)
output.mkdir(parents=True, exist_ok=True)

sales_fields = [
    "网店订单号", "标记", "货品摘要", "货品数量", "订单编号", "订单状态", "销售渠道",
    "处理时间", "付款时间", "发货仓库", "物流公司", "物流单号", "发货时间", "订单类型",
    "应收合计", "客户账号", "收货人", "手机", "收货地址", "合并备注", "货品编号",
    "货品名称", "规格", "数量", "单价", "优惠", "折扣", "金额", "锁定待发", "备注",
    "达人ID", "达人名称", "生产批号", "货品批次", "赠品",
]
purchase_fields = [
    "采购单号", "外部单号", "采购类型", "订单时间", "供应商", "通知供应商", "采购总额",
    "应付总额", "付款金额（应付）", "订单状态", "付款状态", "结算方式", "采购员", "数量合计",
    "货品种类", "货品摘要", "订单备注", "完成日期", "物流公司", "物流单号", "审核人",
    "货品编号", "货品名称", "规格", "条码", "单位", "数量", "含税单价", "含税金额",
    "要求到货日", "预计到货日期", "到货状态", "入库状态", "结算状态", "到货数量",
    "剩余到货数量", "入库数量", "剩余入库数量", "采购方式", "货品类型", "收货仓库",
    "明细备注", "分类", "品牌", "库存数量", "可用库存", "采购在途", "最近采购时间",
    "最近采购价（货品）", "供应商报价",
]

def export(path, fields, destination):
    frame = pd.read_excel(path, dtype=object)
    available = [field for field in fields if field in frame.columns]
    frame = frame[available].where(pd.notna(frame), "")
    records = frame.to_dict(orient="records")
    destination.write_text(json.dumps({"fields": available, "records": records}, ensure_ascii=False, default=str), encoding="utf-8")
    print(f"{destination.name}: {len(records)} records, {len(available)} fields")

export(sales_path, sales_fields, output / "sales-history.json")
export(purchase_path, purchase_fields, output / "purchase-history.json")
