const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const Marque = sequelize.define('marque', {
  _id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    foreignKey: true,
    autoIncrement: true,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    get() {
      const value = this.getDataValue('startTime');
      // Format to 'YYYY-MM-DD HH:mm:ss' without timezone
      return value ? value.toISOString().slice(0, 19).replace('T', ' ') : null;
    },
    set(value) {
      // Save the value as a Date object in the database
      this.setDataValue('startTime', new Date(value));
    }
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    get() {
      const value = this.getDataValue('endTime');
      // Format to 'YYYY-MM-DD HH:mm:ss' without timezone
      return value ? value.toISOString().slice(0, 19).replace('T', ' ') : null;
    },
    set(value) {
      // Save the value as a Date object in the database
      this.setDataValue('endTime', new Date(value));
    }
  }
});



Marque.sync({alter:true});

module.exports = Marque;
