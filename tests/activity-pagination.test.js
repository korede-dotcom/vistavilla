'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
let count=257,calls=[];
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user={_id:'staff',roleName:'ceo'};next();});
stub('../models/User',{findByPk:async()=>({roleName:'ceo'})});
stub('../models/ActivityLog',{findAndCountAll:async options=>{calls.push(options);return {count,rows:[]};}});
const router=require('../routes/ActivityLogs');
function request(query){return new Promise((resolve,reject)=>{
 const req={method:'GET',url:'/',query,headers:{}};
 const res={set(){},render(file,data){resolve(data);}};
 router.handle(req,res,error=>reject(error||Error('No response')));
});}
const template=fs.readFileSync('views/portal/activity-logs.ejs','utf8').replace(/<%- include\([^\n]+?%>/g,'');
test('activity pages query only the requested rows and preserve filters in numbered links',async()=>{
 const data=await request({page:'3',size:'10',q:'Room 1'});
 assert.equal(calls.at(-1).limit,10);assert.equal(calls.at(-1).offset,20);
 assert.equal(data.pages,26);
 const html=ejs.render(template,data);
 assert.match(html,/Showing <strong>21–30<\/strong> of <strong>257/);
 assert.match(html,/aria-current="page">3/);
 assert.match(html,/aria-label="Page 4" href="\?q=Room\+1[^\"]*page=4/);
 assert.match(html,/rel="prev"/);assert.match(html,/rel="next"/);
});
test('out-of-range pages clamp to the last page and an empty table has no active navigation links',async()=>{
 let data=await request({page:'999',size:'100'});
 assert.equal(data.page,3);assert.equal(calls.at(-1).offset,200);
 let html=ejs.render(template,data);assert.doesNotMatch(html,/rel="next"/);
 count=0;data=await request({page:'2'});html=ejs.render(template,data);
 assert.equal(data.page,1);assert.equal(data.pages,1);
 assert.match(html,/Showing <strong>0–0/);assert.doesNotMatch(html,/rel="(?:prev|next)"/);
});
