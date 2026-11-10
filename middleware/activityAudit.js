'use strict';
const {AsyncLocalStorage}=require('async_hooks');
const {randomUUID}=require('crypto');
const context=new AsyncLocalStorage();
const Log=require('../models/ActivityLog');
const words=require('../utils/activityDescription');
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
  Log.create({...actor,description:words.requestDescription(req.method,req.auditPath,rejected||res.statusCode>=400),action:req.method==='GET'?'view':'request',resource:'HTTP',outcome:rejected||res.statusCode>=400?'failed':String(res.statusCode),fields:[]})
   .catch(error=>console.error('Activity request log failed:',error.message));
 });
 next();
});
exports.install=db=>{
 if(db.vistavillaAuditInstalled)return;
 db.vistavillaAuditInstalled=true;
 async function record(action,model,id,fields,options,data={}){
  if(model==='activity_log')return;
  const bookingModel=db.models&&db.models.hotelbooking;
  if(['booking_revision','stay_extension'].includes(model)&&data.booking_id&&!data.guest_name&&bookingModel&&typeof bookingModel.findByPk==='function'){
   const booking=await bookingModel.findByPk(data.booking_id,{attributes:['guest_name','room_number','reference_id'],transaction:options.transaction,raw:true});
   if(booking)data={...data,...words.safeRecord(booking)};
  }
  await Log.create({...metadata(),action,description:words.description(action,model,data,fields,id),resource:model,record_id:id==null?null:String(id),outcome:'success',fields:cleanFields(fields)},options.transaction?{transaction:options.transaction}:{});
 }
 for(const [hook,action] of [['afterCreate','create'],['afterUpdate','update'],['afterDestroy','delete']]) {
  db.addHook(hook,async(instance,options)=>record(action,instance.constructor.name,instance.get(instance.constructor.primaryKeyAttribute),instance.changed()||[],options,words.safeRecord(instance.get({plain:true}))));
 }
 for(const hook of ['beforeBulkUpdate','beforeBulkDestroy']){
  db.addHook(hook,async options=>{
   const model=options.model;
   if(!model||model.name==='activity_log'||!model.rawAttributes||typeof model.findAll!=='function')return;
   const attributes=words.allowed.filter(key=>model.rawAttributes[key]);
   if(!attributes.length)return;
   const rows=await model.findAll({where:options.where,attributes,transaction:options.transaction,limit:100,raw:true});
   options.vistavillaAuditRecords=rows.map(words.safeRecord);
  });
 }
 for(const [hook,action] of [['afterBulkCreate','create_many'],['afterBulkUpdate','update_many'],['afterBulkDestroy','delete_many']]){
  db.addHook(hook,async(first,second)=>{
   const options=second||first;const model=options.model||(Array.isArray(first)&&first[0]&&first[0].constructor);
   if(model) {
    const where=options.where||{};
    const id=where.id||where._id||where.reference_id||where.booking_id;
    const records=Array.isArray(first)?first.map(instance=>words.safeRecord(instance.get?instance.get({plain:true}):instance)):options.vistavillaAuditRecords;
    if(records&&records.length){
     for(const row of records)await record(action,model.name,row.id||row._id||id,Object.keys(options.attributes||{}),options,{...row,...words.safeRecord(options.attributes||{})});
    }else if(!records)await record(action,model.name,['string','number'].includes(typeof id)?id:null,Object.keys(options.attributes||{}),options,words.safeRecord(options.attributes||{}));
   }
  });
 }
};
exports.cleanFields=cleanFields;
