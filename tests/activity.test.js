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
