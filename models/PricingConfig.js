const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const PricingConfig = sequelize.define('pricingconfig', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  category_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    foreignKey: true,
  },
  category_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  special_price: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
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

PricingConfig.sync({ alter: true });

module.exports = PricingConfig;

