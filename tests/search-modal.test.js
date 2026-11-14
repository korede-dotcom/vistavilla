'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs');
test('search modal can alternate no-results and successful searches without losing navigation controls',()=>{
 const source=fs.readFileSync('views/index.ejs','utf8');
 const script=source.slice(source.indexOf('// Modal Functions'),source.indexOf('// Form submission handler for main search form'));
 const nodes={};
 function register(node){if(node.id)nodes[node.id]=node;(node.children||[]).forEach(register);}
 function element(id){const node={id,children:[],style:{},classList:{add(){},remove(){}},setAttribute(name,value){this[name]=value;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;items.forEach(register);}};
  Object.defineProperty(node,'innerHTML',{set(value){this.html=value;if(id==='modalFooter')delete nodes.viewRoomsBtn;},get(){return this.html||'';}});return node;}
 ['searchResultsModal','modalIcon','modalTitle','modalSubtitle','modalBody','modalFooter','viewRoomsBtn','searchCancelBtn'].forEach(id=>nodes[id]=element(id));
 const context={URLSearchParams,window:{location:{}},document:{body:{style:{}},getElementById:id=>nodes[id]||null,createElement:()=>element()}};
 vm.createContext(context);vm.runInContext(script,context);
 const result={data:{category_id:1,availableRoomDetails:[{_id:2,room_number:'02'}]}},dates={start:'14-11-2026',end:'16-11-2026'};
 for(let attempt=0;attempt<3;attempt++){
  context.showErrorModal('No rooms available');assert.equal(nodes.viewRoomsBtn.hidden,true);
  context.closeSearchModal();context.showSuccessModal(result,dates);
  assert.equal(nodes.viewRoomsBtn.hidden,false);assert.equal(nodes.searchCancelBtn.textContent,'Cancel');
  nodes.viewRoomsBtn.onclick();assert.equal(new URL(context.window.location.href,'https://example.com').searchParams.get('room_id'),'2');
 }
 delete nodes.viewRoomsBtn;delete nodes.searchCancelBtn;
 context.showSuccessModal(result,dates);assert.equal(nodes.viewRoomsBtn.hidden,false);nodes.viewRoomsBtn.onclick();
 context.showErrorModal('Please retry.',false);assert.equal(nodes.modalTitle.textContent,'Unable to search rooms');
 assert.equal(nodes.searchCancelBtn.textContent,'Try Again');
 context.showSuccessModal(result,dates);assert.equal(nodes.viewRoomsBtn.hidden,false);
});
