const filterSchemas={
  产品管理:[['货品编号/名称','输入货品编号、名称或条码'],['分类','请选择分类'],['品牌','请选择品牌'],['基础单位','请选择单位']],
  库存管理:[['货品编号/名称','输入货品编号或名称'],['收货仓库','加拿大多伦多1号仓'],['到期状态','全部'],['有效期从','选择日期'],['有效期至','选择日期']],
  订单管理:[['订单编号','输入单号，多个单号以逗号分隔'],['统计时间类型','下单时间'],['统计时间从','2026-05-01'],['统计时间至','2026-08-13'],['客户名称/账号','输入客户名称或账号'],['销售渠道','加拿大天猫直购'],['订单状态','请选择状态']],
  发货管理:[['订单编号/物流号','输入订单号或物流单号'],['发货仓库','加拿大多伦多1号仓'],['物流公司','全部物流公司'],['发货日期从','选择日期'],['发货日期至','选择日期']]
};

function filterPanel(fields){
  return `<aside class="card filter-panel jike-filter"><div class="filter-title">筛选</div>${fields.map(([label,hint])=>`<div class="field"><label>${label}</label><input placeholder="${hint}"></div>`).join('')}<div class="jike-filter-actions"><button class="btn primary">◆ 筛选</button><button class="btn">↻ 重置</button></div></aside>`;
}

function removeInventoryProductionColumn(content,title){
  if(title!=='库存管理'||content.dataset.productionColumnRemoved==='true')return;
  const table=content.querySelector('table');
  if(!table)return;
  const headers=[...table.querySelectorAll('thead th')];
  const columnIndex=headers.findIndex(th=>th.textContent.trim()==='生产日期');
  if(columnIndex<0)return;
  table.querySelectorAll('tr').forEach(row=>row.children[columnIndex]?.remove());
  content.dataset.productionColumnRemoved='true';
}

function adjustPurchaseModal(){
  const form=document.querySelector('#receiptForm');
  if(!form||form.dataset.shelfLifeAdjusted==='true')return;
  const fields=[...form.querySelectorAll('.field')];
  const productionField=fields.find(field=>field.querySelector('label')?.textContent.trim()==='生产日期');
  productionField?.remove();
  const expiryField=fields.find(field=>field.querySelector('label')?.textContent.trim()==='有效期至');
  const expiryLabel=expiryField?.querySelector('label');if(expiryLabel)expiryLabel.textContent='保质期';
  const expiryInput=expiryField?.querySelector('input');if(expiryInput){expiryInput.type='month';expiryInput.setAttribute('aria-label','保质期')}
  form.dataset.shelfLifeAdjusted='true';
}

function applyJikeLayout(){
  adjustPurchaseModal();
  const content=document.querySelector('.content');
  const title=content?.querySelector('h1')?.textContent;
  removeInventoryProductionColumn(content,title);
  if(!content||!filterSchemas[title]||content.querySelector('.jike-business'))return;
  const pieces=[...content.children].filter(el=>!el.classList.contains('page-head'));
  if(!pieces.length)return;
  const layout=document.createElement('div');layout.className='filter-layout jike-business';
  layout.innerHTML=filterPanel(filterSchemas[title]);
  const results=document.createElement('div');results.className='jike-results';
  pieces.forEach(el=>results.appendChild(el));layout.appendChild(results);content.appendChild(layout);
}

let scheduled=false;
new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;applyJikeLayout()})}).observe(document.querySelector('#app'),{childList:true,subtree:true});
