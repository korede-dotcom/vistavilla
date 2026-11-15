'use strict';
module.exports=async booking=>{
 const plain=booking.get?booking.get({plain:true}):booking.dataValues||booking;
 const ledger=await require('../models/PartPayment').findOne({where:{reference_id:plain.reference_id}});
 return ledger?{...plain,amount_paid:Number(ledger.amount_paid||0),balance:Math.max(0,Number(plain.amount)-Number(ledger.amount_paid||0)),receipt_has_ledger:true}:plain;
};
