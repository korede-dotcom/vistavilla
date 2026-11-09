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
