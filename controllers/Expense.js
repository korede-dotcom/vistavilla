const asynchandler = require("express-async-handler");
const expenseRepo = require("../repos/Expense-repo");

const renderExpensesPage = asynchandler(async (req, res) => {
  let expenses;
  
  // Check if date filters are provided
  if (req.query.start && req.query.end) {
    const startDate = new Date(req.query.start);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(req.query.end);
    endDate.setHours(23, 59, 59, 999);
    
    expenses = await expenseRepo.findByDateRange(startDate, endDate);
  } else {
    expenses = await expenseRepo.findAll();
  }
  
  res.render('expenses', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    expenses: expenses
  });
});

const createExpense = asynchandler(async (req, res) => {
  const { expense_name, amount, expense_date, description, category } = req.body;
  
  // Convert amount to kobo
  const amountInKobo = parseFloat(amount) * 100;
  
  const expense = await expenseRepo.create({
    expense_name,
    amount: amountInKobo,
    expense_date: expense_date || new Date(),
    description,
    category: category || 'other',
    recorded_by: req.user ? req.user.name : null
  });
  
  return res.status(201).json({
    status: true,
    message: "Expense created successfully",
    data: expense
  });
});

const updateExpense = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { expense_name, amount, expense_date, description, category } = req.body;
  
  const updateData = {};
  if (expense_name) updateData.expense_name = expense_name;
  if (amount) updateData.amount = parseFloat(amount) * 100;
  if (expense_date) updateData.expense_date = expense_date;
  if (description) updateData.description = description;
  if (category) updateData.category = category;
  updateData.updated_at = new Date();
  
  const expense = await expenseRepo.update(id, updateData);
  
  return res.status(200).json({
    status: true,
    message: "Expense updated successfully",
    data: expense
  });
});

const deleteExpense = asynchandler(async (req, res) => {
  const { id } = req.params;
  
  await expenseRepo.delete(id);
  
  return res.status(200).json({
    status: true,
    message: "Expense deleted successfully"
  });
});

const getExpenseById = asynchandler(async (req, res) => {
  const { id } = req.params;
  
  const expense = await expenseRepo.findById(id);
  
  if (!expense) {
    return res.status(404).json({
      status: false,
      message: "Expense not found"
    });
  }
  
  return res.status(200).json({
    status: true,
    data: expense
  });
});

module.exports = {
  renderExpensesPage,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseById
};

