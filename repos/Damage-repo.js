const Damage = require('../models/Damage');
const { Op } = require('sequelize');

class DamageRepository {
  async create(data) {
    const damage = await Damage.create(data);
    return damage;
  }

  async findAll() {
    const damages = await Damage.findAll({
      order: [['damage_date', 'DESC']]
    });
    return damages;
  }

  async findById(id) {
    const damage = await Damage.findOne({
      where: { _id: id }
    });
    return damage;
  }

  async findByRoomNumber(roomNumber) {
    const damages = await Damage.findAll({
      where: { room_number: roomNumber },
      order: [['damage_date', 'DESC']]
    });
    return damages;
  }

  async findByStatus(status) {
    const damages = await Damage.findAll({
      where: { status },
      order: [['damage_date', 'DESC']]
    });
    return damages;
  }

  async findByDateRange(startDate, endDate) {
    const damages = await Damage.findAll({
      where: {
        damage_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['damage_date', 'DESC']]
    });
    return damages;
  }

  async getTotalByDateRange(startDate, endDate) {
    const result = await Damage.sum('amount', {
      where: {
        damage_date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    return result || 0;
  }

  async getTotalByStatus(status, startDate = null, endDate = null) {
    const whereClause = { status };
    
    if (startDate && endDate) {
      whereClause.damage_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const result = await Damage.sum('amount', { where: whereClause });
    return result || 0;
  }

  async update(id, data) {
    const damage = await this.findById(id);
    if (!damage) {
      throw new Error('Damage record not found');
    }
    const updated = await damage.update(data);
    return updated;
  }

  async updateStatus(id, status, completedDate = null) {
    const damage = await this.findById(id);
    if (!damage) {
      throw new Error('Damage record not found');
    }
    
    const updateData = { status, updated_at: new Date() };
    if (status === 'completed' && completedDate) {
      updateData.completed_date = completedDate;
    }
    
    const updated = await damage.update(updateData);
    return updated;
  }

  async delete(id) {
    const damage = await this.findById(id);
    if (!damage) {
      throw new Error('Damage record not found');
    }
    await damage.destroy();
  }
}

module.exports = new DamageRepository();

