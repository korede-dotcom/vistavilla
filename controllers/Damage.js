const asynchandler = require("express-async-handler");
const damageRepo = require("../repos/Damage-repo");
const RoomRepo = require("../repos/Room-repo");
const RoomNumber = require("../models/RoomNumbers");
const Room = require("../models/Room");
const cloudinaryRepo = require("../repos/cloudinary");

const renderDamagesPage = asynchandler(async (req, res) => {
  let damages;

  // Check if date filters are provided
  if (req.query.start && req.query.end) {
    const startDate = new Date(req.query.start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(req.query.end);
    endDate.setHours(23, 59, 59, 999);

    damages = await damageRepo.findByDateRange(startDate, endDate);
  } else {
    damages = await damageRepo.findAll();
  }

  // Get all room categories
  const categories = await RoomRepo.findAll();

  // Get all individual rooms with their category information
  RoomNumber.belongsTo(Room, { foreignKey: 'category_id', targetKey: '_id' });
  const rooms = await RoomNumber.findAll({
    include: [{
      model: Room,
      attributes: ['category_name', '_id']
    }],
    order: [['category_id', 'ASC'], ['room_number', 'ASC']]
  });

  res.render('damages', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    damages: damages,
    rooms: rooms,
    categories: categories
  });
});

const createDamage = asynchandler(async (req, res) => {
  const { room_number, room_name, damage_description, action_type, amount, damage_date, notes } = req.body;

  // Convert amount to kobo
  const amountInKobo = parseFloat(amount) * 100;

  // Handle image uploads if files are present
  let imageUrls = [];
  if (req.files && req.files.length > 0) {
    const uploadedImages = await cloudinaryRepo.uploadMany(req.files);
    imageUrls = uploadedImages.map(img => ({
      url: img.url,
      public_id: img.public_id
    }));
  }

  const damage = await damageRepo.create({
    room_number,
    room_name,
    damage_description,
    action_type,
    amount: amountInKobo,
    damage_date: damage_date || new Date(),
    status: 'pending',
    recorded_by: req.user ? req.user.name : null,
    notes,
    images: imageUrls.length > 0 ? imageUrls : null
  });

  return res.status(201).json({
    status: true,
    message: "Damage report created successfully",
    data: damage
  });
});

const updateDamage = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { room_number, room_name, damage_description, action_type, amount, damage_date, status, notes } = req.body;

  const updateData = {};
  if (room_number) updateData.room_number = room_number;
  if (room_name) updateData.room_name = room_name;
  if (damage_description) updateData.damage_description = damage_description;
  if (action_type) updateData.action_type = action_type;
  if (amount) updateData.amount = parseFloat(amount) * 100;
  if (damage_date) updateData.damage_date = damage_date;
  if (status) updateData.status = status;
  if (notes) updateData.notes = notes;
  updateData.updated_at = new Date();

  // Handle image uploads if files are present
  if (req.files && req.files.length > 0) {
    const uploadedImages = await cloudinaryRepo.uploadMany(req.files);
    const imageUrls = uploadedImages.map(img => ({
      url: img.url,
      public_id: img.public_id
    }));

    // Get existing images and append new ones
    const existingDamage = await damageRepo.findById(id);
    const existingImages = existingDamage.images || [];
    updateData.images = [...existingImages, ...imageUrls];
  }

  if (status === 'completed') {
    updateData.completed_date = new Date();
  }

  const damage = await damageRepo.update(id, updateData);

  return res.status(200).json({
    status: true,
    message: "Damage report updated successfully",
    data: damage
  });
});

const updateDamageStatus = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const damage = await damageRepo.updateStatus(id, status, status === 'completed' ? new Date() : null);
  
  return res.status(200).json({
    status: true,
    message: "Damage status updated successfully",
    data: damage
  });
});

const deleteDamage = asynchandler(async (req, res) => {
  const { id } = req.params;
  
  await damageRepo.delete(id);
  
  return res.status(200).json({
    status: true,
    message: "Damage report deleted successfully"
  });
});

const getDamageById = asynchandler(async (req, res) => {
  const { id } = req.params;
  
  const damage = await damageRepo.findById(id);
  
  if (!damage) {
    return res.status(404).json({
      status: false,
      message: "Damage report not found"
    });
  }
  
  return res.status(200).json({
    status: true,
    data: damage
  });
});

module.exports = {
  renderDamagesPage,
  createDamage,
  updateDamage,
  updateDamageStatus,
  deleteDamage,
  getDamageById
};

