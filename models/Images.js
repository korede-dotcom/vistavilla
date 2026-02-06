const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const Images = sequelize.define('images', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    foreignKey: true,
    autoIncrement: true,
  },
 branch_id:{
    type: Sequelize.INTEGER,
    foreignKey: true,
 },
 public_id:{
    type: DataTypes.STRING,
    foreignKey: true,
    allowNull:false,
 },
 for:{
  type: DataTypes.ENUM("branch","gym","gymclass","eventhall","events","hotel","hotelroom"),
 },
 niceshot:{
  type: DataTypes.BOOLEAN,
  defaultValue:false
 },
 user_id:{
  type: Sequelize.UUID,
  foreignKey: true,
 },
 room_id:{
  type: Sequelize.INTEGER,
  foreignKey: true,
  allowNull: true,
  comment: 'Links image to specific room number (for hotelroom type)'
 },
  url: {
    type: DataTypes.TEXT,
    allowNull:true,
  },
  status:{
    type: DataTypes.BOOLEAN,
    defaultValue:false
  }
});



Images.sync({alter: true});

module.exports = Images;
