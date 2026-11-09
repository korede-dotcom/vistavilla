'use strict';
const {DataTypes}=require('sequelize');
module.exports=require('../config/connectDB').define('hotel_setting',{
 id:{type:DataTypes.INTEGER,primaryKey:true},
 caution_fee_default:{type:DataTypes.DOUBLE,allowNull:false,defaultValue:0}
});
