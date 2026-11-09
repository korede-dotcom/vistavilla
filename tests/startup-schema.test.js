'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ensureSchema = require('../config/ensureStartupSchema');
function fixture() {
  const tables = {
    partpayments: { id:{}, existing_guest_data:{} },
    roomtransfers: { id:{}, old_total:{} }
  };
  const calls=[];
  const transaction={};
  function model(table,fields) {
    return {
      rawAttributes:Object.fromEntries(fields.map(name=>[name,{type:'test',defaultValue:name==='is_room_transfer'?false:undefined}])),
      getTableName:()=>table,
      sync:async options=>{assert.equal(options.transaction,transaction);assert.equal(options.alter,undefined);calls.push('sync:'+table);}
    };
  }
  const models={
    PartPayment:model('partpayments',['is_room_transfer','previous_room_number']),
    RoomTransfer:model('roomtransfers',['old_total','new_total','price_adjustment','amount_paid_now','balance_after'])
  };
  const query={
    describeTable:async table=>({...tables[table]}),
    addColumn:async(table,name,attribute,options)=>{assert.equal(options.transaction,transaction);tables[table][name]=attribute;calls.push('add:'+name);}
  };
  const db={
    transaction:async fn=>fn(transaction),getDialect:()=> 'postgres',
    query:async(sql,options)=>{assert.equal(options.transaction,transaction);calls.push('lock');},
    getQueryInterface:()=>query
  };
  return {db,models,tables,calls,query};
}
test('startup adds missing fields without replacing existing columns, repeated startup is a no-op',async()=>{
 const f=fixture();const existing=f.tables.partpayments.existing_guest_data;
 await ensureSchema(f.db,f.models);
 assert.equal(f.calls[0],'lock');
 assert.equal(f.calls.filter(c=>c.startsWith('add:')).length,6);
 assert.equal(f.tables.partpayments.existing_guest_data,existing);
 assert.equal(f.tables.partpayments.is_room_transfer.defaultValue,false);
 f.calls.length=0;
 await ensureSchema(f.db,f.models);
 assert.equal(f.calls.filter(c=>c.startsWith('add:')).length,0);
});
test('schema failure propagates so startup cannot continue with missing fields',async()=>{
 const f=fixture();f.query.addColumn=async()=>{throw Error('ALTER denied');};
 await assert.rejects(ensureSchema(f.db,f.models),/ALTER denied/);
});
test('non-Postgres setup does not issue a PostgreSQL advisory lock',async()=>{
 const f=fixture();f.db.getDialect=()=> 'mysql';
 await ensureSchema(f.db,f.models);
 assert.ok(!f.calls.includes('lock'));
});

test('startup adds caution-fee columns to existing booking tables',async()=>{
 const f=fixture();const fields=['caution_fee_amount','caution_fee_status','caution_fee_collected_at','caution_fee_collected_by','caution_fee_refunded_at','caution_fee_refunded_by','caution_fee_held_at','caution_fee_held_by'];
 f.tables.hotelbookings={id:{},amount:{}};
 f.models.Booking={getTableName:()=> 'hotelbookings',rawAttributes:Object.fromEntries(fields.map(name=>[name,{type:'test',defaultValue:name==='caution_fee_amount'?0:undefined}])),sync:async()=>{}};
 await ensureSchema(f.db,f.models);
 for(const name of fields)assert.ok(f.tables.hotelbookings[name]);
 assert.equal(f.tables.hotelbookings.caution_fee_amount.defaultValue,0);
 assert.ok(f.tables.hotelbookings.amount);
});
