'use strict';
const db = require('../config/connectDB');
const Booking = require('../models/HotelBooking');
const { Op } = require('sequelize');
const { nextStatus } = require('../utils/cautionFee');
exports.summary = async () => {
  const amount = await Booking.sum('caution_fee_amount', { where: { caution_fee_status: { [Op.in]: ['paid','hold'] } } });
  return Number(amount || 0);
};
exports.changeStatus = async (id, action, staff) => db.transaction(async transaction => {
  const booking = await Booking.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!booking || Number(booking.caution_fee_amount) <= 0) throw new Error('Collected caution fee not found.');
  const status = nextStatus(booking.caution_fee_status, action);
  const data = { caution_fee_status: status };
  if (status === 'refunded') Object.assign(data, { caution_fee_refunded_at: new Date(), caution_fee_refunded_by: staff.name });
  else Object.assign(data, { caution_fee_held_at: new Date(), caution_fee_held_by: staff.name });
  // Static update avoids the booking instance hook that normalizes checkout dates.
  await Booking.update(data, { where: { id: booking.id }, transaction });
  return status;
});

exports.collect = async (reference, value, staff) => {
 const amount = require('../utils/cautionFee').amountInKobo(value);
 if (amount <= 0) throw Error('Enter a caution fee greater than zero.');
 if (typeof reference !== 'string' || !reference.trim() || reference.length > 255) throw Error('Enter the booking reference.');
 return db.transaction(async transaction => {
  const booking = await Booking.findOne({where:{reference_id:reference.trim()},transaction,lock:transaction.LOCK.UPDATE});
  if (!booking) throw Error('Booking not found. Check the booking reference.');
  if (Number(booking.caution_fee_amount) > 0) throw Error('A caution fee already exists for this booking. Use its existing Hold or Refund actions.');
  await Booking.update({caution_fee_amount:amount,caution_fee_status:'paid',caution_fee_collected_at:new Date(),caution_fee_collected_by:staff.name,
    caution_fee_refunded_at:null,caution_fee_refunded_by:null,caution_fee_held_at:null,caution_fee_held_by:null
  },{where:{id:booking.id},transaction});
  return booking.id;
 });
};
