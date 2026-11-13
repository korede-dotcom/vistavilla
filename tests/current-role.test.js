'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const role=require('../utils/userRole');
test('role IDs resolve managers consistently and stale role labels cannot grant CEO access',()=>{
 assert.equal(role({role_id:4,roleName:'staffs'}),'hotelmanager');
 assert.equal(role({role_id:'4',roleName:'hotel manager'}),'hotelmanager');
 assert.equal(role({role_id:7,roleName:'ceo'}),'hotel receptionist');
});
let user={_id:'staff',role_id:4,roleName:'staffs',status:true,name:'Manager',email:'manager@example.com'};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('jsonwebtoken',{verify:()=>({_id:'staff',role_id:7,roleName:'hotel receptionist'})});
stub('../models/User',{findOne:async()=>user});
const auth=require('../middleware/checkAuthCookie');
test('existing sessions use the current database role and inactive users lose access',async()=>{
 const req={cookies:{jwtToken:'session'}};let passed=false,redirect;
 const res={redirect(url){redirect=url;}};
 await auth(req,res,()=>{passed=true;});assert.equal(passed,true);assert.equal(req.user.roleName,'hotelmanager');assert.equal(req.user.role_id,4);
 passed=false;user={...user,status:false};await auth(req,res,()=>{passed=true;});assert.equal(passed,false);assert.equal(redirect,'/portal');
});
