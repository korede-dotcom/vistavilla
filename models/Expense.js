const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const Expense = sequelize.define('expense', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  expense_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Amount in kobo'
  },
  expense_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM("utilities", "maintenance", "supplies", "salaries", "marketing", "other"),
    defaultValue: "other",
  },
  recorded_by: {
    type: DataTypes.STRING,
    allowNull: true,
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

Expense.sync({ alter: true });

module.exports = Expense;

