const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const RoomNumber = sequelize.define('roomnumber', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    foreignKey: true,
    autoIncrement: true,
  },
  category_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  room_name:{
    type: Sequelize.STRING,
    allowNull: false,
    unique:true,
  },
  room_number: {
    type: Sequelize.STRING,
    allowNull: false,
    unique:true,
  },
  status:{
    type:DataTypes.BOOLEAN,
    defaultValue:false
  },
  is_retained: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  retained_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  retained_from: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  retained_to: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  retention_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  }



});



RoomNumber.sync({alter:true});

module.exports = RoomNumber;
