'use strict';
const {AsyncLocalStorage}=require('async_hooks');
const {randomUUID}=require('crypto');
const context=new AsyncLocalStorage();
const Log=require('../models/ActivityLog');
function metadata(){
 const req=context.getStore();const user=req&&req.user;
 return {actor_id:user?String(user._id):null,actor_name:user?user.name:'System / anonymous',actor_role:user?user.roleName:null,
 request_id:req?req.auditId:null,method:req?req.method:null,path:req?req.auditPath:null};
}
function cleanFields(fields){return (fields||[]).filter(field=>!['password','token','jwtToken','reset_token'].some(secret=>String(field).toLowerCase().includes(secret.toLowerCase())));}
exports.middleware=(req,res,next)=>context.run(req,()=>{
 req.auditId=randomUUID();req.auditPath=(req.originalUrl||req.path||'').split('?')[0].slice(0,255);let rejected=false;
 const json=res.json;
 res.json=function(body){if(body&&body.status===false)rejected=true;return json.call(this,body);};
 res.once('finish',()=>{
  // Query strings, request bodies, cookies and secrets are intentionally excluded.
  const actor=metadata();
  Log.create({...actor,action:req.method==='GET'?'view':'request',resource:'HTTP',outcome:rejected||res.statusCode>=400?'failed':String(res.statusCode),fields:[]})
   .catch(error=>console.error('Activity request log failed:',error.message));
 });
 next();
});
exports.install=db=>{
 if(db.vistavillaAuditInstalled)return;
 db.vistavillaAuditInstalled=true;
 async function record(action,model,id,fields,options){
  if(model==='activity_log')return;
  await Log.create({...metadata(),action,resource:model,record_id:id==null?null:String(id),outcome:'success',fields:cleanFields(fields)},options.transaction?{transaction:options.transaction}:{});
 }
 for(const [hook,action] of [['afterCreate','create'],['afterUpdate','update'],['afterDestroy','delete']]) {
  db.addHook(hook,async(instance,options)=>record(action,instance.constructor.name,instance.get(instance.constructor.primaryKeyAttribute),instance.changed()||[],options));
 }
 for(const [hook,action] of [['afterBulkCreate','create_many'],['afterBulkUpdate','update_many'],['afterBulkDestroy','delete_many']]){
  db.addHook(hook,async(first,second)=>{
   const options=second||first;const model=options.model||(Array.isArray(first)&&first[0]&&first[0].constructor);
   if(model) {
    const where=options.where||{};
    const id=where.id||where._id||where.reference_id||where.booking_id;
    await record(action,model.name,['string','number'].includes(typeof id)?id:null,Object.keys(options.attributes||{}),options);
   }
  });
 }
};
exports.cleanFields=cleanFields;
