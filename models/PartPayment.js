const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const PartPayment = sequelize.define('partpayment', {
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
  reference_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  amount_paid: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  balance: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  guest_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  guest_email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  guest_phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  room_name: {
    type: DataTypes.STRING,
  },
  room_number: {
    type: DataTypes.STRING,
  },
  category_name: {
    type: DataTypes.STRING,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  payment_status: {
    type: DataTypes.ENUM("partial", "completed"),
    defaultValue: "partial",
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

PartPayment.sync({ alter: true });

module.exports = PartPayment;

