const PartPayment = require('../models/PartPayment');
const HotelBooking = require('../models/HotelBooking');
const PaymentHistory = require('../models/PaymentHistory');
const { Op } = require('sequelize');

class PartPaymentRepository {
  async create(data) {
    const partPayment = await PartPayment.create(data);
    return partPayment;
  }

  async findAll() {
    const partPayments = await PartPayment.findAll({
      where: { payment_status: 'partial' },
      order: [['created_at', 'DESC']]
    });
    return partPayments;
  }

  async findById(id) {
    const partPayment = await PartPayment.findOne({
      where: { _id: id }
    });
    return partPayment;
  }

  async findByReferenceId(referenceId) {
    const partPayment = await PartPayment.findOne({
      where: { reference_id: referenceId }
    });
    return partPayment;
  }

  async findByBookingId(bookingId) {
    const partPayment = await PartPayment.findOne({
      where: { booking_id: bookingId }
    });
    return partPayment;
  }

  async update(id, data) {
    const partPayment = await this.findById(id);
    if (!partPayment) {
      throw new Error('Part payment not found');
    }
    const updated = await partPayment.update(data);
    return updated;
  }

  async completePayment(id, remainingAmount, recordedBy = null) {
    const db = require('../config/connectDB');
    return db.transaction(async transaction => {
    const initial = await this.findById(id);
    if (!initial) throw new Error('Part payment not found');
    // Same lock order as transfers: booking, then its payment ledger.
    await HotelBooking.findOne({ where: { reference_id: initial.reference_id }, transaction, lock: transaction.LOCK.UPDATE });
    const partPayment = await PartPayment.findOne({ where: { _id: id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!partPayment) {
      throw new Error('Part payment not found');
    }

    const value = Number(remainingAmount);
    if (!Number.isFinite(value) || value <= 0 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) throw new Error('Invalid payment amount');
    const paymentAmountInKobo = Math.round(value * 100);
    if (partPayment.payment_status === 'completed' || paymentAmountInKobo > Number(partPayment.balance)) throw new Error('Payment exceeds the remaining balance');
    const balanceBefore = parseFloat(partPayment.balance);
    const newAmountPaid = parseFloat(partPayment.amount_paid) + paymentAmountInKobo;
    const newBalance = parseFloat(partPayment.total_amount) - newAmountPaid;
    const isCompleted = newBalance <= 0;

    // Determine payment type
    let paymentType = 'partial';
    if (isCompleted) {
      paymentType = 'final';
    }

    // Record payment in history
    await PaymentHistory.create({
      booking_id: partPayment.booking_id,
      part_payment_id: partPayment._id,
      reference_id: partPayment.reference_id,
      payment_amount: paymentAmountInKobo,
      payment_type: paymentType,
      payment_method: 'cash',
      balance_before: balanceBefore,
      balance_after: newBalance > 0 ? newBalance : 0,
      total_amount: partPayment.total_amount,
      guest_name: partPayment.guest_name,
      room_number: partPayment.room_number,
      recorded_by: recordedBy,
      payment_date: new Date()
    }, { transaction });

    await partPayment.update({
      amount_paid: newAmountPaid,
      balance: newBalance > 0 ? newBalance : 0,
      payment_status: isCompleted ? 'completed' : 'partial',
      updated_at: new Date()
    }, { transaction });

    // Update the booking status if payment is completed
    if (isCompleted) {
      await HotelBooking.update(
        {
          status: 'success',
          is_part_payment: false,
          amount_paid: newAmountPaid,
          balance: 0
        },
        { where: { reference_id: partPayment.reference_id }, transaction }
      );
    } else {
      await HotelBooking.update(
        {
          amount_paid: newAmountPaid,
          balance: newBalance
        },
        { where: { reference_id: partPayment.reference_id }, transaction }
      );
    }

    return { partPayment, paymentCompleted: isCompleted };
    });
  }

  async delete(id) {
    const partPayment = await this.findById(id);
    if (!partPayment) {
      throw new Error('Part payment not found');
    }
    await partPayment.destroy();
  }
}

module.exports = new PartPaymentRepository();

