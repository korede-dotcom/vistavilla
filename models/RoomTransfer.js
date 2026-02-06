const { Sequelize, DataTypes } = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

const RoomTransfer = sequelize.define('roomtransfer', {
    booking_reference: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Reference ID of the booking'
    },
    guest_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    old_room_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    old_room_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    old_room_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    old_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    old_category_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    new_room_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    new_room_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    new_room_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    new_category_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    new_category_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transferred_by: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the staff who performed the transfer'
    },
    transfer_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional reason for the transfer'
    },
    booking_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    booking_end: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'roomtransfers'
});

RoomTransfer.sync({alter:true});
module.exports = RoomTransfer;

