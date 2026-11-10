'use strict';
const fs=require('fs');
const path=require('path');
const {randomUUID}=require('crypto');
const {spawnSync}=require('child_process');
const db=require('../config/connectDB');
const {QueryTypes}=require('sequelize');
const preserve=new Set(['users','staffs','staff']);
const identifier=value=>'"'+String(value).replace(/"/g,'""')+'"';
const schema=db.options.schema||'public';
const table=name=>identifier(schema)+'.'+identifier(name);
const select=(sql,options={})=>db.query(sql,{...options,type:QueryTypes.SELECT,logging:false});
async function inventory(transaction){
 const rows=await select("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = :schema AND table_type = 'BASE TABLE' ORDER BY table_name",{replacements:{schema},transaction});
 return Promise.all(rows.map(async row=>({name:row.name,count:Number((await select('SELECT COUNT(*) AS count FROM '+table(row.name),{transaction}))[0].count)})));
}
async function fingerprint(name,transaction){
 return (await select("SELECT md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text), '')) AS fingerprint FROM "+table(name)+' t',{transaction}))[0].fingerprint;
}
function backup(){
 const directory=path.join(__dirname,'../.backups');fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const filename=path.join(directory,'before-record-reset-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.dump');
 fs.closeSync(fs.openSync(filename,'wx',0o600));
 const config=db.config;
 const env={...process.env,PGHOST:String(config.host),PGPORT:String(config.port||5432),PGDATABASE:config.database,PGUSER:config.username,PGPASSWORD:config.password||'',PGCONNECT_TIMEOUT:'10'};
 if(db.options.dialectOptions&&db.options.dialectOptions.ssl)env.PGSSLMODE='require';
 const result=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl','--file',filename],{env,encoding:'utf8',timeout:180000});
 if(result.error||result.status!==0){
  let message=(result.stderr||(result.error&&result.error.message)||'pg_dump failed').slice(0,1000);
  if(config.password)message=message.split(config.password).join('[redacted]');
  throw Error('Backup failed; nothing was cleared. '+message);
 }
 if(fs.statSync(filename).size<100)throw Error('Backup is empty; nothing was cleared.');
 console.log('Backup saved:',filename);return filename;
}
(async()=>{
 try{
  db.options.logging=false;
  if(db.getDialect()!=='postgres')throw Error('This reset supports PostgreSQL only.');
  await db.authenticate();
  const rows=await inventory();
  if(!rows.some(row=>row.name==='users')||!rows.some(row=>row.name==='staffs'||row.name==='staff'))throw Error('Users/staff tables were not found. Refusing reset.');
  console.log('Application schema:',schema);
  console.table(rows.map(row=>({...row,action:preserve.has(row.name)?'KEEP':'CLEAR'})));
  if(!process.argv.includes('--execute')){console.log('Preview only. No records changed. Use --execute to back up and clear the listed tables.');return;}
  const filename=backup();
  const result=await db.transaction(async transaction=>{
   await db.query("SET LOCAL lock_timeout = '10s'",{transaction,logging:false});
   await db.query('LOCK TABLE '+rows.map(row=>table(row.name)).join(', ')+' IN ACCESS EXCLUSIVE MODE',{transaction,logging:false});
   const current=await inventory(transaction);
   if(JSON.stringify(current.map(row=>row.name))!==JSON.stringify(rows.map(row=>row.name)))throw Error('The table list changed during reset. Nothing was cleared.');
   const kept=current.filter(row=>preserve.has(row.name));
   const hashes=new Map();for(const row of kept)hashes.set(row.name,await fingerprint(row.name,transaction));
   const cleared=current.filter(row=>!preserve.has(row.name));
   if(cleared.length)await db.query('TRUNCATE TABLE '+cleared.map(row=>table(row.name)).join(', ')+' RESTART IDENTITY RESTRICT',{transaction,logging:false});
   for(const row of kept)if(await fingerprint(row.name,transaction)!==hashes.get(row.name))throw Error('Protected user/staff records changed; reset rolled back.');
   const final=await inventory(transaction);
   if(final.some(row=>!preserve.has(row.name)&&row.count!==0))throw Error('Some target records remain; reset rolled back.');
   return {kept:final.filter(row=>preserve.has(row.name)),tablesCleared:cleared.length,recordsCleared:cleared.reduce((sum,row)=>sum+row.count,0),backup:filename};
  });
  console.log('Reset committed:',JSON.stringify(result));
 }catch(error){console.error('Reset stopped:',error.message);process.exitCode=1;}finally{await db.close();}
})();
