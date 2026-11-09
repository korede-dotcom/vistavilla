'use strict';

// Add only the fields introduced by room-transfer payments. Existing columns
// and records are left intact; running this on every restart is safe.
async function ensureStartupSchema(db, models) {
  if (!models) models = {
    PartPayment: require('../models/PartPayment'),
    RoomTransfer: require('../models/RoomTransfer'),
    Booking: require('../models/HotelBooking'),
    ActivityLog: require('../models/ActivityLog'),
    HotelSettings: require('../models/HotelSettings'),
    StayExtension: require('../models/StayExtension')
  };
  const additions = [
    [models.PartPayment, ['is_room_transfer', 'previous_room_number']],
    [models.RoomTransfer, ['old_total', 'new_total', 'price_adjustment', 'amount_paid_now', 'balance_after']]
  ];
  if (models.Booking) additions.push([models.Booking, ['discount_scope','discount_type','discount_value','price_subtotal','discount_total','caution_fee_amount','caution_fee_status','caution_fee_collected_at','caution_fee_collected_by','caution_fee_refunded_at','caution_fee_refunded_by','caution_fee_held_at','caution_fee_held_by']]);
  await db.transaction(async transaction => {
    // Serialize this migration when multiple Node processes start together.
    if (db.getDialect() === 'postgres') {
      await db.query('SELECT pg_advisory_xact_lock(791204631)', { transaction });
    }
    if (models.StayExtension) await models.StayExtension.sync({transaction});
    if (models.ActivityLog) await models.ActivityLog.sync({transaction});
    if (models.HotelSettings) await models.HotelSettings.sync({transaction});
    const query = db.getQueryInterface();
    for (const [model, fields] of additions) {
      await model.sync({ transaction });
      const table = model.getTableName();
      const columns = await query.describeTable(table, { transaction });
      for (const name of fields) {
        if (!Object.prototype.hasOwnProperty.call(columns, name)) {
          await query.addColumn(table, name, model.rawAttributes[name], { transaction });
        }
      }
    }
  });
}
module.exports = ensureStartupSchema;
