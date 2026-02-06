const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const PaymentHistory = sequelize.define('paymenthistory', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  booking_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    foreignKey: true,
  },
  part_payment_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    foreignKey: true,
  },
  reference_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  payment_amount: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Amount paid in this transaction (in kobo)'
  },
  payment_type: {
    type: DataTypes.ENUM("initial", "partial", "final", "full"),
    allowNull: false,
    comment: 'initial = first payment, partial = subsequent payment, final = last payment completing balance, full = single full payment'
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'cash, bank transfer, paystack, etc.'
  },
  balance_before: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Balance before this payment (in kobo)'
  },
  balance_after: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Balance after this payment (in kobo)'
  },
  total_amount: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Total booking amount (in kobo)'
  },
  guest_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  room_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  recorded_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Staff member who recorded the payment'
  },
  payment_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

PaymentHistory.sync({  });

module.exports = PaymentHistory;

