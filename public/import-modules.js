const moduleConfig={
  orders:{kind:'sales',title:'销售管理',subtitle:'销售单历史明细与天猫直购订单',endpoint:'/api/sales'},
  purchase:{kind:'purchases',title:'采购管理',subtitle:'采购、到货、入库和结算状态查询',endpoint:'/api/purchases'},
  stock:{kind:'inventory',title:'库存管理',subtitle:'总仓规格库存、可用库存与在途数量查询',endpoint:'/api/inventory'},
  shipping:{kind:'shipments',title:'发货',subtitle:'发货单、物流、打印及出库状态查询',endpoint:'/api/shipments'}
};
const moduleState={sales:{page:0,query:''},purchases:{page:0,query:''},inventory:{page:0,query:''},shipments:{page:0,query:'',status:'全部'}};
const pageSize=100;

function valueText(value){return value===null||value===undefined||value===''?'-':String(value)}
function statusClass(value){const text=String(value);if(text.includes('完成')||text.includes('已发'))return'green';if(text.includes('等待')||text.includes('待'))return'orange';if(text.includes('关闭')||text.includes('取消'))return'red';return'blue'}
async function fetchCompressedJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`数据载入失败：${response.status}`);const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return new Response(stream).json()}
function orderOverrides(){try{return JSON.parse(localStorage.getItem('trueerp_order_status_overrides'))||{}}catch{return{}}}
function saveOrderOverrides(value){localStorage.setItem('trueerp_order_status_overrides',JSON.stringify(value))}

function createCell(tag,value,field){
  const cell=document.createElement(tag);const text=valueText(value);
  if(field.includes('状态')){const badge=document.createElement('span');badge.className=`tag ${statusClass(text)}`;badge.textContent=text;cell.appendChild(badge)}else{cell.textContent=text}
  if(field.includes('单号')||field.includes('编号')||field==='条码')cell.classList.add('mono');
  if(field.includes('名称')||field==='货品摘要')cell.title=text;
  return cell;
}

async function renderImportedModule(config){
  const results=document.querySelector('.jike-results');
  if(!results||results.dataset.importKind===config.kind)return;
  results.dataset.importKind=config.kind;results.innerHTML='<div class="module-loading">正在载入历史数据…</div>';
  const current=moduleState[config.kind];
  if(config.kind==='shipments'){await renderPendingShipments(results,current,config);return}
  let data;
  const response=await fetch(`${config.endpoint}?offset=${current.page*pageSize}&limit=${pageSize}&q=${encodeURIComponent(current.query)}`);
  if(response.ok&&response.headers.get('content-type')?.includes('application/json'))data=await response.json();
  else{
    const files={sales:'data/sales-history.json.gz',purchases:'data/purchase-history.json.gz',inventory:'data/inventory-history.json.gz',shipments:'data/shipment-history.json.gz'};
    const source=await fetchCompressedJson(files[config.kind]);
    const query=current.query.toLowerCase();const filtered=query?source.records.filter(record=>Object.values(record).some(value=>String(value).toLowerCase().includes(query))):source.records;
    const offset=current.page*pageSize;data={fields:source.fields,total:filtered.length,offset,limit:pageSize,records:filtered.slice(offset,offset+pageSize)};
  }
  results.innerHTML='';
  if(config.kind==='purchases'&&!data.fields.includes('保质期')){
    const insertAt=Math.max(0,data.fields.indexOf('预计到货日期')+1);data.fields.splice(insertAt,0,'保质期');
  }
  if(config.kind==='sales'){
    const overrides=orderOverrides();
    data.records=data.records.map(record=>{const update=overrides[record.订单编号];return update?{...record,订单状态:update.status,物流公司:update.carrier||record.物流公司,物流单号:update.tracking||record.物流单号,发货时间:update.shippedAt||record.发货时间}:record});
    if(!data.fields.includes('操作'))data.fields.push('操作');
  }

  const toolbar=document.createElement('div');toolbar.className='toolbar imported-toolbar';
  toolbar.innerHTML=`<div class="search"><input placeholder="搜索全部字段" value="${current.query.replaceAll('"','&quot;')}"></div><button class="btn primary" data-history-search>查询</button><button class="btn" data-history-reset>重置</button><span class="muted">原始字段 ${data.fields.length} 个</span>`;
  results.appendChild(toolbar);
  const card=document.createElement('div');card.className='card imported-card';
  const wrap=document.createElement('div');wrap.className='table-wrap imported-table';
  const table=document.createElement('table');const head=document.createElement('thead');const headRow=document.createElement('tr');
  data.fields.forEach(field=>headRow.appendChild(createCell('th',field,field)));head.appendChild(headRow);table.appendChild(head);
  const body=document.createElement('tbody');data.records.forEach(record=>{const row=document.createElement('tr');data.fields.forEach(field=>{if(field==='操作'){const cell=document.createElement('td');if(String(record.订单状态).includes('待审核'))cell.innerHTML=`<button class="btn primary" data-audit-order="${record.订单编号}">审核</button>`;else cell.textContent='-';row.appendChild(cell)}else row.appendChild(createCell('td',record[field],field))});body.appendChild(row)});table.appendChild(body);wrap.appendChild(table);card.appendChild(wrap);
  const footer=document.createElement('div');footer.className='footer-row imported-pagination';const from=data.total?data.offset+1:0;const to=Math.min(data.offset+data.records.length,data.total);
  footer.innerHTML=`<span>显示 ${from}-${to} 条，共 ${data.total.toLocaleString('zh-CN')} 条</span><span class="page-actions"><button class="btn" data-history-prev ${current.page===0?'disabled':''}>上一页</button><b>第 ${current.page+1} 页</b><button class="btn" data-history-next ${to>=data.total?'disabled':''}>下一页</button></span>`;card.appendChild(footer);results.appendChild(card);

  const input=toolbar.querySelector('input');
  const reload=(page,query)=>{moduleState[config.kind]={page,query};results.dataset.importKind='';renderImportedModule(config).catch(showModuleError)};
  toolbar.querySelector('[data-history-search]').onclick=()=>reload(0,input.value.trim());
  input.onkeydown=event=>{if(event.key==='Enter')reload(0,input.value.trim())};
  toolbar.querySelector('[data-history-reset]').onclick=()=>reload(0,'');
  footer.querySelector('[data-history-prev]').onclick=()=>reload(Math.max(0,current.page-1),current.query);
  footer.querySelector('[data-history-next]').onclick=()=>reload(current.page+1,current.query);
  results.querySelectorAll('[data-audit-order]').forEach(button=>button.onclick=()=>{const overrides=orderOverrides();overrides[button.dataset.auditOrder]={...(overrides[button.dataset.auditOrder]||{}),status:'待发货',auditedAt:new Date().toISOString()};saveOrderOverrides(overrides);reload(current.page,current.query)});
}

async function renderPendingShipments(results,current,config){
  const [shipments,sales]=await Promise.all([fetchCompressedJson('data/shipment-history.json.gz'),fetchCompressedJson('data/sales-history.json.gz')]);const overrides=orderOverrides(),unique=new Map();
  shipments.records.forEach(record=>{const id=record.关联单号||record.发货单号;if(!id)return;const update=overrides[record.关联单号];const raw=update?.status||record.状态;unique.set(id,{orderId:record.关联单号,shipmentId:record.发货单号,time:record.下单时间,warehouse:record.仓库,carrier:update?.carrier||record.物流公司,tracking:update?.tracking||record.物流单号,sku:record.货品编号,name:record.货品名称,qty:record.数量,status:String(raw).includes('已完成')||String(raw).includes('已发货')?'已发货':'未发货'})});
  sales.records.forEach(record=>{const id=record.订单编号,update=overrides[id];if(!id||unique.has(id)||update?.status!=='待发货')return;unique.set(id,{orderId:id,shipmentId:'-',time:record.付款时间,warehouse:record.发货仓库,carrier:'',tracking:'',sku:record.货品编号,name:record.货品名称,qty:record.数量,status:'未发货'})});
  let rows=[...unique.values()];if(current.status==='未发货')rows=rows.filter(record=>record.status==='未发货');if(current.status==='已发货')rows=rows.filter(record=>record.status==='已发货');const query=current.query.toLowerCase();if(query)rows=rows.filter(record=>Object.values(record).some(value=>String(value).toLowerCase().includes(query)));
  const offset=current.page*pageSize,total=rows.length;rows=rows.slice(offset,offset+pageSize);results.innerHTML='';
  const toolbar=document.createElement('div');toolbar.className='toolbar imported-toolbar';toolbar.innerHTML=`<select data-shipment-status aria-label="发货状态"><option ${current.status==='全部'?'selected':''}>全部</option><option ${current.status==='未发货'?'selected':''}>未发货</option><option ${current.status==='已发货'?'selected':''}>已发货</option></select><div class="search"><input placeholder="搜索发货单、订单或物流单号" value="${current.query.replaceAll('"','&quot;')}"></div><button class="btn primary" data-pending-search>查询</button><button class="btn" data-pending-reset>重置</button>`;results.appendChild(toolbar);
  const card=document.createElement('div');card.className='card imported-card';const wrap=document.createElement('div');wrap.className='table-wrap imported-table';
  wrap.innerHTML=`<table><thead><tr><th>发货单号</th><th>订单编号</th><th>下单时间</th><th>仓库</th><th>物流公司</th><th>物流单号</th><th>货品编号</th><th>货品名称</th><th>数量</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(record=>`<tr><td class="mono">${valueText(record.shipmentId)}</td><td class="mono">${valueText(record.orderId)}</td><td>${valueText(record.time)}</td><td>${valueText(record.warehouse)}</td><td>${valueText(record.carrier)}</td><td class="mono">${valueText(record.tracking)}</td><td class="mono">${valueText(record.sku)}</td><td>${valueText(record.name)}</td><td>${valueText(record.qty)}</td><td><span class="tag ${record.status==='已发货'?'green':'orange'}">${record.status}</span></td><td>${record.status==='未发货'?`<button class="btn primary" data-complete-shipment="${record.orderId}">发货</button>`:'-'}</td></tr>`).join('')||'<tr><td colspan="11"><div class="empty">暂无符合条件的发货单</div></td></tr>'}</tbody></table>`;card.appendChild(wrap);
  const footer=document.createElement('div');footer.className='footer-row imported-pagination';const from=total?offset+1:0,to=Math.min(offset+rows.length,total);footer.innerHTML=`<span>显示 ${from}-${to} 条，共 ${total.toLocaleString('zh-CN')} 条发货单</span><span class="page-actions"><button class="btn" data-pending-prev ${current.page===0?'disabled':''}>上一页</button><b>第 ${current.page+1} 页</b><button class="btn" data-pending-next ${to>=total?'disabled':''}>下一页</button></span>`;card.appendChild(footer);results.appendChild(card);
  const reload=(page,search,status=current.status)=>{moduleState.shipments={page,query:search,status};results.dataset.importKind='';renderImportedModule(config).catch(showModuleError)},input=toolbar.querySelector('input'),statusSelect=toolbar.querySelector('[data-shipment-status]');
  statusSelect.onchange=()=>reload(0,input.value.trim(),statusSelect.value);toolbar.querySelector('[data-pending-search]').onclick=()=>reload(0,input.value.trim(),statusSelect.value);toolbar.querySelector('[data-pending-reset]').onclick=()=>reload(0,'','全部');input.onkeydown=event=>{if(event.key==='Enter')reload(0,input.value.trim(),statusSelect.value)};footer.querySelector('[data-pending-prev]').onclick=()=>reload(Math.max(0,current.page-1),current.query,current.status);footer.querySelector('[data-pending-next]').onclick=()=>reload(current.page+1,current.query,current.status);
  results.querySelectorAll('[data-complete-shipment]').forEach(button=>button.onclick=()=>openShipmentDialog(button.dataset.completeShipment,()=>reload(current.page,current.query)));
}

function openShipmentDialog(orderId,onComplete){
  const backdrop=document.createElement('div');backdrop.className='modal-backdrop';backdrop.innerHTML=`<form class="modal" id="onlineShipmentForm"><div class="modal-head"><h2>订单发货</h2><button type="button" class="close" data-cancel-shipment>×</button></div><div class="form-grid"><div class="field full"><label>订单编号</label><input value="${orderId}" disabled></div><div class="field"><label>物流公司</label><select name="carrier"><option>Canada Post</option><option>UPS</option><option>FedEx</option><option>天猫国际海外仓物流</option></select></div><div class="field"><label>物流单号</label><input name="tracking" placeholder="扫描或输入物流单号" required></div></div><div class="modal-foot"><button type="button" class="btn" data-cancel-shipment>取消</button><button class="btn success">发货完成</button></div></form>`;document.body.appendChild(backdrop);
  backdrop.querySelectorAll('[data-cancel-shipment]').forEach(button=>button.onclick=()=>backdrop.remove());backdrop.querySelector('form').onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget),overrides=orderOverrides();overrides[orderId]={...(overrides[orderId]||{}),status:'已发货',carrier:form.get('carrier'),tracking:form.get('tracking'),shippedAt:new Date().toLocaleString('zh-CN',{hour12:false})};saveOrderOverrides(overrides);backdrop.remove();onComplete()};
}

function showModuleError(error){const results=document.querySelector('.jike-results');if(results)results.innerHTML=`<div class="empty">${error.message}</div>`;console.error(error)}

function enhanceImportedModules(){
  const active=document.querySelector('.nav-item.active')?.dataset.page;const config=moduleConfig[active];if(!config)return;
  const heading=document.querySelector('.page-head h1');const subtitle=document.querySelector('.page-head p');if(heading&&heading.textContent!==config.title)heading.textContent=config.title;if(subtitle&&subtitle.textContent!==config.subtitle)subtitle.textContent=config.subtitle;
  if(active==='purchase'&&!document.querySelector('.jike-results')){
    const nativeLayout=document.querySelector('.content>.filter-layout');const nativeResults=nativeLayout?.children[1];
    if(nativeLayout)nativeLayout.classList.add('jike-business');if(nativeResults)nativeResults.classList.add('jike-results');
    const action=document.querySelector('.page-head [data-action="newReceipt"]');if(action)action.textContent='＋ 新建采购单';
  }
  if((active==='stock'||active==='shipping')&&!document.querySelector('.jike-results')){
    const nativeLayout=document.querySelector('.content>.filter-layout');
    const nativeResults=nativeLayout?.querySelector('.jike-results')||nativeLayout?.children[1];
    if(nativeResults)nativeResults.classList.add('jike-results');
    if(!nativeResults){
      const content=document.querySelector('.content');[...content.children].filter(child=>!child.classList.contains('page-head')).forEach(child=>child.remove());
      const fallback=document.createElement('div');fallback.className='jike-results';content?.appendChild(fallback);
    }
  }
  renderImportedModule(config).catch(showModuleError);
}

let importScheduled=false;
new MutationObserver(()=>{if(importScheduled)return;importScheduled=true;queueMicrotask(()=>{importScheduled=false;enhanceImportedModules()})}).observe(document.querySelector('#app'),{childList:true,subtree:true});
