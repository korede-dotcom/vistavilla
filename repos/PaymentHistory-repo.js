const PaymentHistory = require('../models/PaymentHistory');
const { Op } = require('sequelize');

class PaymentHistoryRepository {
  async create(data) {
    const paymentHistory = await PaymentHistory.create(data);
    return paymentHistory;
  }

  async findAll() {
    const paymentHistories = await PaymentHistory.findAll({
      order: [['payment_date', 'DESC']]
    });
    return paymentHistories;
  }

  async findById(id) {
    const paymentHistory = await PaymentHistory.findOne({
      where: { _id: id }
    });
    return paymentHistory;
  }

  async findByBookingId(bookingId) {
    const paymentHistories = await PaymentHistory.findAll({
      where: { booking_id: bookingId },
      order: [['payment_date', 'ASC']]
    });
    return paymentHistories;
  }

  async findByReferenceId(referenceId) {
    const paymentHistories = await PaymentHistory.findAll({
      where: { reference_id: referenceId },
      order: [['payment_date', 'ASC']]
    });
    return paymentHistories;
  }

  async findByPartPaymentId(partPaymentId) {
    const paymentHistories = await PaymentHistory.findAll({
      where: { part_payment_id: partPaymentId },
      order: [['payment_date', 'ASC']]
    });
    return paymentHistories;
  }

  async findByDateRange(startDate, endDate) {
    const paymentHistories = await PaymentHistory.findAll({
      where: {
        payment_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['payment_date', 'DESC']]
    });
    return paymentHistories;
  }

  async getTotalPaymentsByDateRange(startDate, endDate) {
    const result = await PaymentHistory.sum('payment_amount', {
      where: {
        payment_date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    return result || 0;
  }
}

module.exports = new PaymentHistoryRepository();

