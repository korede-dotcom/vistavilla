const asynchandler = require("express-async-handler");
const pricingConfigRepo = require("../repos/PricingConfig-repo");
const roomRepo = require("../repos/Room-repo");

const createPricingConfig = asynchandler(async (req, res) => {
  const { category_id, category_name, special_price, start_date, end_date } = req.body;

  if (!category_id || !special_price || !start_date || !end_date) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  const pricingConfig = await pricingConfigRepo.create({
    category_id,
    category_name,
    special_price,
    start_date,
    end_date,
    created_by: req.user.name
  });

  return res.status(201).json({
    message: "Pricing configuration created successfully",
    data: {
      pricingConfig
    }
  });
});

const getAllPricingConfigs = asynchandler(async (req, res) => {
  const pricingConfigs = await pricingConfigRepo.findAll();
  return res.status(200).json({
    message: "Pricing configurations fetched successfully",
    data: {
      pricingConfigs
    }
  });
});

const getActivePricingConfigs = asynchandler(async (req, res) => {
  const activePricing = await pricingConfigRepo.findActive();
  return res.status(200).json({
    message: "Active pricing configurations fetched successfully",
    data: {
      activePricing
    }
  });
});

const updatePricingConfig = asynchandler(async (req, res) => {
  const { id } = req.query;
  const updatedConfig = await pricingConfigRepo.update(id, req.body);
  return res.status(200).json({
    message: "Pricing configuration updated successfully",
    data: {
      updatedConfig
    }
  });
});

const deletePricingConfig = asynchandler(async (req, res) => {
  const { id } = req.query;
  await pricingConfigRepo.delete(id);
  return res.status(200).json({
    message: "Pricing configuration deleted successfully"
  });
});

const deactivatePricingConfig = asynchandler(async (req, res) => {
  const { id } = req.query;
  const deactivated = await pricingConfigRepo.deactivate(id);
  return res.status(200).json({
    message: "Pricing configuration deactivated successfully",
    data: {
      deactivated
    }
  });
});

const renderPricingConfigPage = asynchandler(async (req, res) => {
  const pricingConfigs = await pricingConfigRepo.findAll();
  const categories = await roomRepo.roomCategorys();
  res.render('pricing-config', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    pricingConfigs: pricingConfigs,
    categories: categories
  });
});

const renderCreatePricingPage = asynchandler(async (req, res) => {
  const categories = await roomRepo.roomCategorys();
  res.render('create-pricing', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    categories: categories
  });
});

module.exports = {
  createPricingConfig,
  getAllPricingConfigs,
  getActivePricingConfigs,
  updatePricingConfig,
  deletePricingConfig,
  deactivatePricingConfig,
  renderPricingConfigPage,
  renderCreatePricingPage
};

