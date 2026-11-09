'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
let role='hotel receptionist',saved;
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user={_id:'staff',name:'Staff',email:'staff@example.com',roleName:role};next();});
stub('../models/User',{findByPk:async()=>({roleName:role})});
stub('../models/ActivityLog',{findAndCountAll:async()=>({rows:[],count:0})});
stub('../models/HotelBooking',{findAll:async()=>[]});
stub('../models/HotelSettings',{findByPk:async()=>({caution_fee_default:1250000,update:async data=>{saved=data;}})});
stub('../services/cautionFees',{summary:async()=>0});
process.env.JWT_SECRET='test-only';
const logs=require('../routes/ActivityLogs'),fees=require('../routes/CautionFees');
function request(router,method='GET',url='/',body={}){return new Promise((resolve,reject)=>{
 const req={method,url,query:{},body,cookies:{jwtToken:'test-session'},headers:{}};
 const res={statusCode:200,set(){},status(code){this.statusCode=code;return this;},send(data){resolve({status:this.statusCode,data});},json(data){resolve({status:this.statusCode,data});},render(file,data){resolve({status:this.statusCode,data});},redirect(url){resolve({status:302,url});}};
 router.handle(req,res,error=>reject(error||Error('No response')));
});}
test('activity log access is restricted to CEO and manager',async()=>{
 for(const allowed of ['ceo','hotelmanager']){role=allowed;assert.equal((await request(logs)).status,200);}
 for(const denied of ['hotel receptionist','bar manager']){role=denied;assert.equal((await request(logs)).status,403);}
});
test('manager and receptionist may set default fee, without changing historical deposits',async()=>{
 for(const allowed of ['hotelmanager','hotel receptionist']){
  role=allowed;const page=await request(fees);assert.equal(page.data.defaultFee,1250000);
  assert.equal((await request(fees,'GET','/default')).data.amount,12500);
  assert.equal((await request(fees,'POST','/default',{csrf:page.data.csrf,amount:'15000.50'})).status,302);
  assert.deepEqual(saved,{caution_fee_default:1500050});
  assert.equal((await request(fees,'POST','/default',{csrf:'forged',amount:'100'})).status,403);
 }
 role='bar manager';assert.equal((await request(fees,'GET','/default')).status,403);
});
