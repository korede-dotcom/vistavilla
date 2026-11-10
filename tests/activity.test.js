'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('events');
let entries=[];
const filename=require.resolve('../models/ActivityLog');
require.cache[filename]={id:filename,filename,loaded:true,exports:{create:async(data,options)=>{entries.push({data,options});}}};
const audit=require('../middleware/activityAudit');
test('audit stores actor, outcome and route without query secrets or form contents',async()=>{
 entries=[];
 const req={method:'POST',originalUrl:'/portal/caution-fees/7/status?token=secret',body:{password:'secret'}};
 const res=new EventEmitter();res.statusCode=200;res.json=function(){};
 audit.middleware(req,res,()=>{req.user={_id:'staff-1',name:'Reception',roleName:'hotel receptionist'};res.json({status:false,password:'secret'});res.emit('finish');});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(entries.length,1);assert.equal(entries[0].data.actor_id,'staff-1');assert.equal(entries[0].data.outcome,'failed');
 assert.equal(entries[0].data.path,'/portal/caution-fees/7/status');assert.ok(!JSON.stringify(entries).includes('secret'));
});
test('model changes use the original transaction, omit secrets and never log logs recursively',async()=>{
 entries=[];const hooks={};const db={addHook:(name,fn)=>{hooks[name]=fn;}};audit.install(db);audit.install(db);
 const tx={};const model={name:'hotelbooking',primaryKeyAttribute:'id'};
 await hooks.afterUpdate({constructor:model,get:()=>7,changed:()=>['amount','password','token']},{transaction:tx});
 assert.equal(entries[0].data.resource,'hotelbooking');assert.equal(entries[0].data.record_id,'7');assert.equal(entries[0].options.transaction,tx);assert.deepEqual(entries[0].data.fields,['amount']);
 await hooks.afterCreate({constructor:{name:'activity_log'},get:()=>99,changed:()=>[]},{});
 assert.equal(entries.length,1);
 await hooks.afterBulkUpdate({model,attributes:{balance:20,password:'hidden'},where:{id:7},transaction:tx});
 assert.equal(entries[1].data.record_id,'7');assert.deepEqual(entries[1].data.fields,['balance']);
});

test('meaningful booking and expense descriptions use verified record details, not raw form data',()=>{
 const words=require('../utils/activityDescription');
 const record={guest_name:'Jane',room_number:'1',reference_id:'VV123',amount:15000000,balance:5000000,password:'secret',guest_email:'private@example.com'};
 assert.match(words.description('create','hotelbooking',record),/Created booking for Jane in Room 1/);
 assert.match(words.description('update','hotelbooking',record,['amount']),/Edited booking for Jane in Room 1/);
 assert.match(words.description('update','hotelbooking',{...record,status:'success'},['status']),/Validated booking for Jane/);
 assert.match(words.description('update','hotelbooking',{...record,checked_in:true},['checked_in']),/Checked in Jane/);
 const expense=words.description('create','expense',{expense_name:'Generator fuel',amount:2500000});assert.ok(expense.includes('Added expense “Generator fuel”'));assert.ok(expense.includes('25,000'));
 assert.deepEqual(words.safeRecord(record),{guest_name:'Jane',room_number:'1',reference_id:'VV123',amount:15000000,balance:5000000});
});
test('bulk booking updates retain customer and room context for readable logs',async()=>{
 entries=[];const hooks={};audit.install({addHook:(name,fn)=>{hooks[name]=fn;}});
 const model={name:'hotelbooking',rawAttributes:{id:{},guest_name:{},room_number:{},reference_id:{},amount:{}},findAll:async()=>[{id:7,guest_name:'Jane',room_number:'1',reference_id:'VV123',amount:10000000}]};
 const options={model,where:{id:7},attributes:{amount:15000000,balance:5000000},transaction:{}};
 await hooks.beforeBulkUpdate(options);await hooks.afterBulkUpdate(options);
 assert.equal(entries.length,1);assert.ok(entries[0].data.description.includes('Edited booking for Jane in Room 1'));assert.ok(entries[0].data.description.includes('150,000'));assert.equal(entries[0].options.transaction,options.transaction);
});

test('booking edit and extension events resolve customer identity from the linked booking',async()=>{
 entries=[];const hooks={};audit.install({models:{hotelbooking:{findByPk:async()=>({guest_name:'Jane',room_number:'1',reference_id:'VV123'})}},addHook:(name,fn)=>{hooks[name]=fn;}});
 const data={id:9,booking_id:7,reference_id:'VV123'};
 await hooks.afterCreate({constructor:{name:'booking_revision',primaryKeyAttribute:'id'},get:key=>typeof key==='object'?data:9,changed:()=>['reason']},{});
 assert.ok(entries[0].data.description.includes('Saved booking edit for Jane'));assert.ok(entries[0].data.description.includes('VV123'));
});
