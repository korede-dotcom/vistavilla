'use strict';
const db = require('../config/connectDB');
const Booking = require('../models/HotelBooking');
const RoomNumber = require('../models/RoomNumbers');
const Room = require('../models/Room');
const Pricing = require('../models/PricingConfig');
const PartPayment = require('../models/PartPayment');
const History = require('../models/PaymentHistory');
const Transfer = require('../models/RoomTransfer');
const { Op } = require('sequelize');
const calculate = require('../utils/transferPricing');
module.exports = async function transferRoom(input, staff, quoteOnly = false) {
  if (input.payment_method && !['cash','transfer','card'].includes(input.payment_method)) throw new Error('Invalid payment method.');
  return db.transaction(async transaction => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const booking = await Booking.findOne({ where: { reference_id: input.reference_id }, ...options });
    if (!booking) throw new Error('Booking not found.');
    if (['cancelled','initiated','pending'].includes(booking.status) || booking.checked_out) throw new Error('Only active bookings can be transferred.');
    if (String(booking.room_id) !== String(input.old_room_id)) throw new Error('This booking has already moved. Refresh before trying again.');
    if (String(input.new_room_id) === String(booking.room_id)) throw new Error('Choose a different room.');
    const newRoom = await RoomNumber.findOne({ where: { _id: input.new_room_id }, ...options });
    if (!newRoom || newRoom.status || newRoom.is_retained) throw new Error('The selected room is unavailable.');
    const conflict = await Booking.findOne({ where: {
      room_id: newRoom._id, status: { [Op.in]: ['success','confirmed','part-payment','completed'] },
      checked_out: false, start: { [Op.lt]: booking.end }, end: { [Op.gt]: booking.start }
    }, transaction });
    if (conflict) throw new Error('The selected room has an overlapping booking.');
    const category = await Room.findOne({ where: { _id: newRoom.category_id }, ...options });
    if (!category) throw new Error('Destination category not found.');
    const date = new Date();
    const special = await Pricing.findOne({ where: { category_id: newRoom.category_id, is_active: true,
      start_date: { [Op.lte]: date }, end_date: { [Op.gte]: date } }, order: [['created_at','DESC']], transaction });
    const part = await PartPayment.findOne({ where: { reference_id: booking.reference_id }, ...options });
    const money = calculate({ rate: special ? special.special_price : category.price, nights: booking.night,
      oldTotal: booking.amount, amountPaid: booking.amount_paid, existingPartPayment: part,
      bookingStatus: booking.status, bookingBalance: booking.balance, paidNow: input.amount_paid_now === undefined ? 0 : input.amount_paid_now });
    if (quoteOnly) return { ...money, nights: booking.night, rate: special ? Number(special.special_price) : Number(category.price) };
    const fromRoom = booking.room_number;
    const roomData = { room_id: newRoom._id, room_number: newRoom.room_number, room_name: newRoom.room_name,
      category_id: newRoom.category_id, category_name: category.category_name };
    const ledgerData = {
      booking_id: booking.id, reference_id: booking.reference_id,
      total_amount: money.total, amount_paid: money.amountPaid, balance: money.balance,
      guest_name: booking.guest_name, guest_email: booking.guest_email, guest_phone: booking.guest_phone,
      room_name: newRoom.room_name, room_number: newRoom.room_number, category_name: category.category_name,
      start_date: booking.start, end_date: booking.end, payment_status: money.balance ? 'partial' : 'completed',
      is_room_transfer: true, previous_room_number: fromRoom, updated_at: new Date()
    };
    const ledger = part ? await part.update(ledgerData, { transaction }) : await PartPayment.create(ledgerData, { transaction });
    await Transfer.create({ booking_reference: booking.reference_id, guest_name: booking.guest_name,
      old_room_id: booking.room_id, old_room_number: fromRoom, old_room_name: booking.room_name,
      old_category_id: booking.category_id, old_category_name: booking.category_name,
      new_room_id: newRoom._id, new_room_number: newRoom.room_number, new_room_name: newRoom.room_name,
      new_category_id: newRoom.category_id, new_category_name: category.category_name,
      transferred_by: staff.name, transfer_reason: input.transfer_reason || null,
      booking_start: booking.start, booking_end: booking.end,
      old_total: booking.amount, new_total: money.total, price_adjustment: money.adjustment,
      amount_paid_now: money.paidNow, balance_after: money.balance
    }, { transaction });
    if (money.paidNow > 0) await History.create({ booking_id: booking.id, part_payment_id: ledger._id,
      reference_id: booking.reference_id, payment_amount: money.paidNow, payment_type: money.balance ? 'partial' : 'final',
      payment_method: input.payment_method || 'cash', balance_before: money.total - money.previousPaid,
      balance_after: money.balance, total_amount: money.total, guest_name: booking.guest_name,
      room_number: newRoom.room_number, recorded_by: staff.name, payment_date: new Date(),
      notes: `Room changed: ${fromRoom} → ${newRoom.room_number}`
    }, { transaction });
    await Booking.update({ ...roomData, amount: money.total, amount_paid: money.amountPaid, balance: money.balance,
      is_part_payment: money.balance > 0, status: money.balance ? 'part-payment' : 'success', discount_per_night: 0
    }, { where: { id: booking.id }, transaction });
    if (booking.checked_in) {
      await RoomNumber.update({ status: false }, { where: { _id: booking.room_id }, transaction });
      await newRoom.update({ status: true }, { transaction });
    }
    return { old_room: fromRoom, new_room: newRoom.room_number, ...money };
  });
};
