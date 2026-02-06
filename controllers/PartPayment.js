const asynchandler = require("express-async-handler");
const partPaymentRepo = require("../repos/PartPayment-repo");
const paymentHistoryRepo = require("../repos/PaymentHistory-repo");
const HotelBooking = require("../models/HotelBooking");
const RoomNumber = require("../models/RoomNumbers");

const getAllPartPayments = asynchandler(async (req, res) => {
  const partPayments = await partPaymentRepo.findAll();
  return res.status(200).json({
    message: "Part payments fetched successfully",
    data: {
      partPayments
    }
  });
});

const getPartPaymentById = asynchandler(async (req, res) => {
  const partPayment = await partPaymentRepo.findById(req.params.id);
  if (!partPayment) {
    return res.status(404).json({
      message: "Part payment not found"
    });
  }
  return res.status(200).json({
    message: "Part payment fetched successfully",
    data: {
      partPayment
    }
  });
});

const completePartPayment = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { remaining_amount } = req.body;

  if (!remaining_amount || remaining_amount <= 0) {
    return res.status(400).json({
      message: "Invalid payment amount"
    });
  }

  const recordedBy = req.user ? req.user.name : null;
  const result = await partPaymentRepo.completePayment(id, remaining_amount, recordedBy);

  return res.status(200).json({
    message: result.paymentCompleted ? "Payment completed successfully" : "Payment recorded successfully",
    data: result
  });
});

const getPaymentHistory = asynchandler(async (req, res) => {
  const { id } = req.params;
  const paymentHistory = await paymentHistoryRepo.findByPartPaymentId(id);

  return res.status(200).json({
    status: true,
    message: "Payment history fetched successfully",
    data: {
      paymentHistory
    }
  });
});

const renderPartPaymentsPage = asynchandler(async (req, res) => {
  let partPayments;

  // Check if date filters are provided
  if (req.query.start && req.query.end) {
    const startDate = new Date(req.query.start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(req.query.end);
    endDate.setHours(23, 59, 59, 999);

    const PartPayment = require('../models/PartPayment');
    const { Op } = require('sequelize');

    partPayments = await PartPayment.findAll({
      where: {
        payment_status: 'partial',
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['created_at', 'DESC']]
    });
  } else {
    partPayments = await partPaymentRepo.findAll();
  }

  res.render('part-payments', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    partPayments: partPayments
  });
});

const renderCompletePaymentPage = asynchandler(async (req, res) => {
  const partPayment = await partPaymentRepo.findById(req.query.id);
  if (!partPayment) {
    return res.redirect('/portal/part-payments');
  }
  res.render('complete-payment', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    partPayment: partPayment
  });
});

module.exports = {
  getAllPartPayments,
  getPartPaymentById,
  completePartPayment,
  getPaymentHistory,
  renderPartPaymentsPage,
  renderCompletePaymentPage
};

