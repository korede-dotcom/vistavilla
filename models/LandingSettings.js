'use strict';
const { DataTypes } = require('sequelize');
const db = require('../config/connectDB');
const { defaults } = require('../utils/landingContent');
const Settings = db.define('landing_setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  content: { type: DataTypes.JSON, allowNull: false }
});
let ready;
async function initialize() {
  if (!ready) ready = Settings.sync().catch(error => { ready = undefined; throw error; });
  await ready;
}
exports.get = async () => {
  await initialize();
  const row = await Settings.findByPk(1);
  return { ...defaults, ...(row ? row.content : {}) };
};
exports.save = async content => {
  await initialize();
  await Settings.upsert({ id: 1, content });
};
