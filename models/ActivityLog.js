'use strict';
const {DataTypes}=require('sequelize');
module.exports=require('../config/connectDB').define('activity_log',{
 id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},
 actor_id:DataTypes.STRING,actor_name:DataTypes.STRING,actor_role:DataTypes.STRING,
 description:DataTypes.TEXT,
 request_id:DataTypes.STRING,action:DataTypes.STRING,resource:DataTypes.STRING,
 record_id:DataTypes.STRING,method:DataTypes.STRING,path:DataTypes.STRING,
 outcome:DataTypes.STRING,fields:DataTypes.JSON
},{updatedAt:false});
