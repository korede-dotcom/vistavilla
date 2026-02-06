const Expense = require('../models/Expense');
const { Op } = require('sequelize');

class ExpenseRepository {
  async create(data) {
    const expense = await Expense.create(data);
    return expense;
  }

  async findAll() {
    const expenses = await Expense.findAll({
      order: [['expense_date', 'DESC']]
    });
    return expenses;
  }

  async findById(id) {
    const expense = await Expense.findOne({
      where: { _id: id }
    });
    return expense;
  }

  async findByDateRange(startDate, endDate) {
    const expenses = await Expense.findAll({
      where: {
        expense_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['expense_date', 'DESC']]
    });
    return expenses;
  }

  async findByCategory(category) {
    const expenses = await Expense.findAll({
      where: { category },
      order: [['expense_date', 'DESC']]
    });
    return expenses;
  }

  async getTotalByDateRange(startDate, endDate) {
    const result = await Expense.sum('amount', {
      where: {
        expense_date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    return result || 0;
  }

  async getTotalByCategory(category, startDate = null, endDate = null) {
    const whereClause = { category };
    
    if (startDate && endDate) {
      whereClause.expense_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const result = await Expense.sum('amount', { where: whereClause });
    return result || 0;
  }

  async update(id, data) {
    const expense = await this.findById(id);
    if (!expense) {
      throw new Error('Expense not found');
    }
    const updated = await expense.update(data);
    return updated;
  }

  async delete(id) {
    const expense = await this.findById(id);
    if (!expense) {
      throw new Error('Expense not found');
    }
    await expense.destroy();
  }
}

module.exports = new ExpenseRepository();

