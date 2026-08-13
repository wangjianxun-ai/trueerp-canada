const moduleConfig={
  orders:{kind:'sales',title:'销售管理',subtitle:'销售单历史明细与天猫直购订单',endpoint:'/api/sales'},
  purchase:{kind:'purchases',title:'采购管理',subtitle:'采购、到货、入库和结算状态查询',endpoint:'/api/purchases'},
  stock:{kind:'inventory',title:'库存管理',subtitle:'总仓规格库存、可用库存与在途数量查询',endpoint:'/api/inventory'},
  shipping:{kind:'shipments',title:'发货',subtitle:'发货单、物流、打印及出库状态查询',endpoint:'/api/shipments'}
};
const moduleState={sales:{page:0,query:''},purchases:{page:0,query:''},inventory:{page:0,query:''},shipments:{page:0,query:''}};
const pageSize=100;

function valueText(value){return value===null||value===undefined||value===''?'-':String(value)}
function statusClass(value){const text=String(value);if(text.includes('完成')||text.includes('已发'))return'green';if(text.includes('等待')||text.includes('待'))return'orange';if(text.includes('关闭')||text.includes('取消'))return'red';return'blue'}
async function fetchCompressedJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`数据载入失败：${response.status}`);const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return new Response(stream).json()}

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
  let data;
  const response=await fetch(`${config.endpoint}?offset=${current.page*pageSize}&limit=${pageSize}&q=${encodeURIComponent(current.query)}`);
  if(response.ok&&response.headers.get('content-type')?.includes('application/json'))data=await response.json();
  else{
    const files={sales:'/data/sales-history.json.gz',purchases:'/data/purchase-history.json.gz',inventory:'/data/inventory-history.json.gz',shipments:'/data/shipment-history.json.gz'};
    const source=await fetchCompressedJson(files[config.kind]);
    const query=current.query.toLowerCase();const filtered=query?source.records.filter(record=>Object.values(record).some(value=>String(value).toLowerCase().includes(query))):source.records;
    const offset=current.page*pageSize;data={fields:source.fields,total:filtered.length,offset,limit:pageSize,records:filtered.slice(offset,offset+pageSize)};
  }
  results.innerHTML='';
  if(config.kind==='purchases'&&!data.fields.includes('保质期')){
    const insertAt=Math.max(0,data.fields.indexOf('预计到货日期')+1);data.fields.splice(insertAt,0,'保质期');
  }

  const toolbar=document.createElement('div');toolbar.className='toolbar imported-toolbar';
  toolbar.innerHTML=`<div class="search"><input placeholder="搜索全部字段" value="${current.query.replaceAll('"','&quot;')}"></div><button class="btn primary" data-history-search>查询</button><button class="btn" data-history-reset>重置</button><span class="muted">原始字段 ${data.fields.length} 个</span>`;
  results.appendChild(toolbar);
  const card=document.createElement('div');card.className='card imported-card';
  const wrap=document.createElement('div');wrap.className='table-wrap imported-table';
  const table=document.createElement('table');const head=document.createElement('thead');const headRow=document.createElement('tr');
  data.fields.forEach(field=>headRow.appendChild(createCell('th',field,field)));head.appendChild(headRow);table.appendChild(head);
  const body=document.createElement('tbody');data.records.forEach(record=>{const row=document.createElement('tr');data.fields.forEach(field=>row.appendChild(createCell('td',record[field],field)));body.appendChild(row)});table.appendChild(body);wrap.appendChild(table);card.appendChild(wrap);
  const footer=document.createElement('div');footer.className='footer-row imported-pagination';const from=data.total?data.offset+1:0;const to=Math.min(data.offset+data.records.length,data.total);
  footer.innerHTML=`<span>显示 ${from}-${to} 条，共 ${data.total.toLocaleString('zh-CN')} 条</span><span class="page-actions"><button class="btn" data-history-prev ${current.page===0?'disabled':''}>上一页</button><b>第 ${current.page+1} 页</b><button class="btn" data-history-next ${to>=data.total?'disabled':''}>下一页</button></span>`;card.appendChild(footer);results.appendChild(card);

  const input=toolbar.querySelector('input');
  const reload=(page,query)=>{moduleState[config.kind]={page,query};results.dataset.importKind='';renderImportedModule(config).catch(showModuleError)};
  toolbar.querySelector('[data-history-search]').onclick=()=>reload(0,input.value.trim());
  input.onkeydown=event=>{if(event.key==='Enter')reload(0,input.value.trim())};
  toolbar.querySelector('[data-history-reset]').onclick=()=>reload(0,'');
  footer.querySelector('[data-history-prev]').onclick=()=>reload(Math.max(0,current.page-1),current.query);
  footer.querySelector('[data-history-next]').onclick=()=>reload(current.page+1,current.query);
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
