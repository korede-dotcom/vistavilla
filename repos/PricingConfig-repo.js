const PricingConfig = require('../models/PricingConfig');
const Room = require('../models/Room');
const { Op } = require('sequelize');

class PricingConfigRepository {
  async create(data) {
    const pricingConfig = await PricingConfig.create(data);
    return pricingConfig;
  }

  async findAll() {
    const pricingConfigs = await PricingConfig.findAll({
      order: [['created_at', 'DESC']]
    });
    return pricingConfigs;
  }

  async findActive() {
    const now = new Date();
    const activePricing = await PricingConfig.findAll({
      where: {
        is_active: true,
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now }
      },
      order: [['created_at', 'DESC']]
    });
    return activePricing;
  }

  async findById(id) {
    const pricingConfig = await PricingConfig.findOne({
      where: { _id: id }
    });
    return pricingConfig;
  }

  async findByCategoryId(categoryId) {
    const now = new Date();
    const pricingConfig = await PricingConfig.findOne({
      where: {
        category_id: categoryId,
        is_active: true,
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now }
      },
      order: [['created_at', 'DESC']]
    });
    return pricingConfig;
  }

  async getPriceForCategory(categoryId, bookingDate = new Date()) {
    // Check if there's a special pricing for this category
    const specialPricing = await PricingConfig.findOne({
      where: {
        category_id: categoryId,
        is_active: true,
        start_date: { [Op.lte]: bookingDate },
        end_date: { [Op.gte]: bookingDate }
      }
    });

    if (specialPricing) {
      return {
        price: parseFloat(specialPricing.special_price),
        isSpecialPrice: true,
        pricingConfig: specialPricing
      };
    }

    // Get default price from room category
    const category = await Room.findOne({
      where: { _id: categoryId }
    });

    return {
      price: category ? parseFloat(category.price) : 0,
      isSpecialPrice: false,
      pricingConfig: null
    };
  }

  async update(id, data) {
    const pricingConfig = await this.findById(id);
    if (!pricingConfig) {
      throw new Error('Pricing configuration not found');
    }
    const updated = await pricingConfig.update(data);
    return updated;
  }

  async delete(id) {
    const pricingConfig = await this.findById(id);
    if (!pricingConfig) {
      throw new Error('Pricing configuration not found');
    }
    await pricingConfig.destroy();
  }

  async deactivate(id) {
    const pricingConfig = await this.findById(id);
    if (!pricingConfig) {
      throw new Error('Pricing configuration not found');
    }
    await pricingConfig.update({ is_active: false });
    return pricingConfig;
  }
}

module.exports = new PricingConfigRepository();

