'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),ejs=require('ejs'),fs=require('fs');
test('staff page renders orphaned and linked staff without broken account actions',()=>{
 const source=fs.readFileSync('views/portal/all-staff.ejs','utf8').replace(/<%- include\([^\n]+?%>/g,'');
 const html=ejs.render(source,{staffs:[{user:null,user_id:'orphan',phonenumber:'123'}, {user_id:'valid',phonenumber:'456',user:{_id:'valid',name:'Receptionist',email:'staff@example.com',roleName:'hotel receptionist',status:true,createdAt:new Date()}}]});
 assert.match(html,/Missing linked user account/);assert.match(html,/Receptionist/);
 assert.ok(!html.includes('profile?id=orphan'));assert.ok(html.includes('profile?id=valid'));
});
let writes=[],fail=false,rolledBack=false;
const tx={};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../config/connectDB',{transaction:async fn=>{try{return await fn(tx);}catch(error){writes=[];rolledBack=true;throw error;}}});
stub('../models/User',{create:async(data,options)=>{assert.equal(options.transaction,tx);writes.push('user');return {_id:'user-uuid',...data};}});
stub('../models/Staff',{create:async(data,options)=>{assert.equal(options.transaction,tx);assert.equal(data.user_id,'user-uuid');if(fail)throw Error('Staff validation failed');writes.push('staff');return data;}});
const create=require('../services/createStaff');
test('staff creation links the new user and rolls back on a staff save failure',async()=>{
 const input={first:'Ada',last:'Staff',email:'staff@example.com',role:'7',phonenumber:'123',address:'Lagos'};
 const result=await create(input,'password');assert.equal(result.staff.user_id,result.user._id);assert.deepEqual(writes,['user','staff']);
 fail=true;await assert.rejects(create(input,'password'),/validation/);assert.equal(rolledBack,true);assert.deepEqual(writes,[]);
});
