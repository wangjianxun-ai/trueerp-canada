const workflowSteps=[
  {key:'products',label:'1. 建品',source:'products'},
  {key:'purchase',label:'2. 建采购单',source:'purchase'},
  {key:'receipt',label:'3. 采购入库',source:'inventory'},
  {key:'order-create',label:'4. 订单生成',source:'orders'},
  {key:'order-review',label:'5. 审核订单',source:'orders'},
  {key:'shipping',label:'6. 发货',source:'shipping'}
];
const flowState={active:'dashboard'};

function flowOrders(){try{return JSON.parse(localStorage.getItem('trueerp_orders'))||[]}catch{return[]}}
function saveFlowOrders(rows){localStorage.setItem('trueerp_orders',JSON.stringify(rows))}
function flowPurchases(){try{return JSON.parse(localStorage.getItem('trueerp_purchase_orders'))||[]}catch{return[]}}
function saveFlowPurchases(rows){localStorage.setItem('trueerp_purchase_orders',JSON.stringify(rows))}
function escapeFlow(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}

function installWorkflowNav(){
  const content=document.querySelector('.content');if(!content)return;
  const labels={dashboard:'经营概览',products:'产品管理',purchase:'采购管理',stock:'库存管理',orders:'订单管理',shipping:'发货管理'};
  Object.entries(labels).forEach(([page,label])=>{const item=document.querySelector(`[data-page="${page}"] span:last-child`);if(item&&item.textContent!==label)item.textContent=label});
}

function openFlow(key,source){
  flowState.active=key;
  const nav=document.querySelector(`[data-page="${source}"]`);if(nav)nav.click();
  queueMicrotask(()=>{installWorkflowNav();if(key==='receipt')renderReceiptQueue();if(key==='order-create')renderOrderCreate();if(key==='order-review')renderOrderReview()});
}

function renderReceiptQueue(){
  const content=document.querySelector('.content');if(!content)return;const rows=flowPurchases();
  content.innerHTML=`<div class="page-head"><div><h1>采购入库</h1><p>仅对已建立的采购单执行实际收货入库</p></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>采购单号</th><th>货品编号</th><th>货品名称</th><th>采购数量</th><th>供应商</th><th>保质期</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td class="mono">${row.id}</td><td>${row.sku}</td><td>${escapeFlow(row.name)}</td><td>${row.qty}</td><td>${escapeFlow(row.supplier)}</td><td>${row.expiry}</td><td><span class="tag ${row.status==='已入库'?'green':'orange'}">${row.status}</span></td><td>${row.status==='待入库'?`<button class="btn primary" data-stock-in="${row.id}">采购入库</button>`:'-'}</td></tr>`).join(''):'<tr><td colspan="8"><div class="empty">请先建立采购单</div></td></tr>'}</tbody></table></div></div>`;
  installWorkflowNav();content.querySelectorAll('[data-stock-in]').forEach(button=>button.onclick=()=>stockIn(button.dataset.stockIn));
}

function stockIn(id){const rows=flowPurchases(),row=rows.find(item=>item.id===id);if(!row)return;const actual=prompt('实际入库数量',row.qty);if(actual===null||Number(actual)<=0)return;row.receivedQty=Number(actual);row.status='已入库';saveFlowPurchases(rows);const batches=JSON.parse(localStorage.getItem('trueerp_batches')||'[]');batches.unshift({id:'B'+Date.now().toString().slice(-10),sku:row.sku,name:row.name,warehouse:row.warehouse,qty:row.receivedQty,locked:0,expiry:row.expiry+'-01'});localStorage.setItem('trueerp_batches',JSON.stringify(batches));renderReceiptQueue()}

function renderOrderCreate(){
  const content=document.querySelector('.content');if(!content)return;
  content.innerHTML=`<div class="page-head"><div><h1>订单生成</h1><p>同步平台订单或手工建立订单，生成后进入待审核</p></div><button class="btn primary" data-create-order>＋ 手工生成订单</button></div><div class="card"><div class="empty">天猫订单同步后自动生成；手工订单生成后状态为“待审核”</div></div>`;installWorkflowNav();content.querySelector('[data-create-order]').onclick=createOrder;
}

function createOrder(){const sku=prompt('货品编号');if(!sku)return;const name=prompt('货品名称');if(!name)return;const qty=Number(prompt('数量','1'));if(!qty)return;const rows=flowOrders();rows.unshift({id:'JY'+Date.now().toString().slice(-12),time:new Date().toLocaleString('zh-CN',{hour12:false}),channel:'手工订单',buyer:'手工客户',sku,name,qty,status:'待审核',tracking:''});saveFlowOrders(rows);alert('订单已生成，等待审核');openFlow('order-review','orders')}

function renderOrderReview(){
  const content=document.querySelector('.content');if(!content)return;const rows=flowOrders();
  content.innerHTML=`<div class="page-head"><div><h1>审核订单</h1><p>只有审核通过的订单才可进入发货</p></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>订单号</th><th>下单时间</th><th>渠道</th><th>货品编号</th><th>货品名称</th><th>数量</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="mono">${row.id}</td><td>${row.time}</td><td>${row.channel}</td><td>${row.sku}</td><td>${escapeFlow(row.name)}</td><td>${row.qty}</td><td><span class="tag ${row.status==='待审核'?'orange':'green'}">${row.status}</span></td><td>${row.status==='待审核'?`<button class="btn primary" data-approve="${row.id}">审核通过</button>`:'-'}</td></tr>`).join('')}</tbody></table></div></div>`;installWorkflowNav();content.querySelectorAll('[data-approve]').forEach(button=>button.onclick=()=>approveOrder(button.dataset.approve));
}

function approveOrder(id){const rows=flowOrders(),row=rows.find(item=>item.id===id);if(!row)return;row.status='待发货';row.approvedAt=new Date().toISOString();saveFlowOrders(rows);renderOrderReview()}

document.addEventListener('click',event=>{
  const sidebar=event.target.closest('.nav-item[data-page]');
  if(sidebar&&!event.target.closest('.workflow-step')){
    const defaults={products:'products',purchase:'purchase',inventory:'receipt',stock:'stock',orders:'order-review',shipping:'shipping',dashboard:'dashboard'};
    flowState.active=defaults[sidebar.dataset.page]||'dashboard';
    if(sidebar.dataset.page==='inventory')queueMicrotask(renderReceiptQueue);
  }
  const purchaseButton=event.target.closest('[data-action="newReceipt"]');if(!purchaseButton||flowState.active!=='purchase')return;
  event.preventDefault();event.stopImmediatePropagation();
  const sku=prompt('货品编号');if(!sku)return;const name=prompt('货品名称');if(!name)return;const qty=Number(prompt('采购数量','1'));if(!qty)return;const supplier=prompt('供应商','COSTCO')||'';const expiry=prompt('保质期（YYYY-MM）','2029-09');if(!/^\d{4}-\d{2}$/.test(expiry||''))return alert('保质期格式应为 YYYY-MM');
  const rows=flowPurchases();rows.unshift({id:'CG'+Date.now().toString().slice(-12),sku,name,qty,supplier,expiry,warehouse:'加拿大多伦多1号仓',status:'待入库'});saveFlowPurchases(rows);alert('采购单已建立，下一步请执行采购入库');
},true);

window.erpWorkflowAfterRender=installWorkflowNav;
