const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const Damage = sequelize.define('damage', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  room_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    foreignKey: true,
  },
  room_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  room_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  damage_description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  action_type: {
    type: DataTypes.ENUM("repair", "replace"),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Amount in kobo'
  },
  damage_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
  status: {
    type: DataTypes.ENUM("pending", "in_progress", "completed"),
    defaultValue: "pending",
  },
  recorded_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
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

Damage.sync({ alter: true });

module.exports = Damage;

