const routes = require("express").Router()
const expressAsyncHandler = require("express-async-handler");
const Admin = require("../controllers/Admin");
const { createRoomUnderCat } = require("../controllers/Hotelmanager");
const checkAuthCookie = require("../middleware/checkAuthCookie");
const HotelBooking = require("../models/HotelBooking");
const RoomNumber = require("../models/RoomNumbers");
const RoomRepo = require("../repos/Room-repo");
const { QueryTypes, Sequelize, where } = require('sequelize');
const Room = require("../models/Room");
const PaymentMode = require("../models/PaymentMode");
const Staff = require("../models/Staff");
const User = require("../models/User");
const connectDB = require("../config/connectDB");
const bcrypt = require("bcryptjs");
const Drink = require("../models/Drinks");
const DrinkLog = require("../models/DrinksLog");
const {Op} = require("sequelize");
const sequelize = require("sequelize");
const SendEmail = require("../utils/sendEmail");
const ResetPassword = require("../models/ResetPassword");
const Marque = require("../models/Marque");
const { Parser } = require('json2csv');
const PartPaymentController = require("../controllers/PartPayment");
const PricingConfigController = require("../controllers/PricingConfig");
const ExpenseController = require("../controllers/Expense");
const DamageController = require("../controllers/Damage");
const PartPayment = require("../models/PartPayment");
const PricingConfig = require("../models/PricingConfig");
const RoomTransfer = require("../models/RoomTransfer");
const Expense = require("../models/Expense");
const Damage = require("../models/Damage");
const pricingConfigRepo = require("../repos/PricingConfig-repo");

const fs = require('fs');

routes.get("/",async (req,res) => {
            res.render('login', {
              pkgs: "jhgfhghh",
            });
          
      })
routes.get("/dashboard/monthly-bookings",checkAuthCookie,async (req,res) => {
      const monthlyData = await HotelBooking.findAll({
            attributes: [
              [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'month'],
              [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],  // Sum the amounts
              [sequelize.fn('COUNT', sequelize.col('id')), 'count']            // Count of bookings
            ],
            where: {
              status: 'success'  // Filter by status = "success"
            },
            group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']]
          });

          const weeklyData = await HotelBooking.findAll({
            attributes: [
              [sequelize.fn('DATE_TRUNC', 'week', sequelize.col('createdAt')), 'week'],  // Group by week
              [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],  // Sum the amounts
              [sequelize.fn('COUNT', sequelize.col('id')), 'count']           // Count of bookings
            ],
            where: {
              status: 'success'  // Filter by status = "success"
            },
            group: [sequelize.fn('DATE_TRUNC', 'week', sequelize.col('createdAt'))],
            order: [[sequelize.fn('DATE_TRUNC', 'week', sequelize.col('createdAt')), 'ASC']]
          });
          console.log("🚀 ~ routes.get ~ weeklyData:", weeklyData)
          
      
          
          return res.json({
            monthlyData:monthlyData,
            weeklyData:weeklyData
      });
})
routes.get("/dashboard",checkAuthCookie,async (req,res) => {
      // Get today's date range
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Get current month date range
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

// Get the current date in 'YYYY-MM-DD' format
const currentDate = new Date().toISOString().slice(0, 10); 
const totalAmountForWebOnline = await HotelBooking.findAll({
      where: {
        status: 'success',
        booked_from: 'web-online',
        [Op.or]: [
          sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), currentDate),
          sequelize.where(sequelize.fn('DATE', sequelize.col('updatedAt')), currentDate)
        ]
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'bookingCount'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ]
    });
    console.log("🚀 ~ routes.get ~ totalAmountForWebOnline:", totalAmountForWebOnline[0].dataValues)
    
    const totalAmountForReception = await HotelBooking.findAll({
      where: {
        status: 'success',
        booked_from: 'reception',
        [Op.or]: [
          sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), currentDate),
          sequelize.where(sequelize.fn('DATE', sequelize.col('updatedAt')), currentDate)
        ]
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'bookingCount'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ]
    });
    console.log("🚀 ~ routes.get ~ totalAmountForReception:", totalAmountForReception)
const totalAmount = await HotelBooking.findAll({
  where: {
    status: 'success',
    [Op.or]: [
      sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), currentDate),
      sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), currentDate)
    ]
  },
  attributes: [
    [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
  ]
});


// Get the result as a number
const total = totalAmount[0].get('totalAmount') || 0;
const availableroomCount = await RoomNumber.count({where:{status:false}})
const roomCount = await RoomNumber.count({where:{}})


console.log(`Total amount for bookings with status 'success' on ${currentDate}: ${total}`);
const totalStaff = await Staff.count({where:{status:true}})
const distinctCustomer = await HotelBooking.findAll({
      attributes: [
        'guest_email',
        [Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'success' THEN 1 ELSE 0 END`)), 'success_count'],
        [Sequelize.fn('MIN', Sequelize.col('guest_name')), 'guest_name'], // Choose the first occurrence of guest_name
        [Sequelize.fn('MIN', Sequelize.col('guest_phone')), 'guest_phone'], // Choose the first occurrence of guest_phone
        [Sequelize.fn('MIN', Sequelize.col('guest_address')), 'guest_address'] // Choose the first occurrence of guest_address
      ],
      group: ['guest_email'],
      raw: true
    });
const barSummary = await DrinkLog.findAll({
      where: {
      
        [Op.or]: [
          sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), currentDate),
          sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), currentDate)
        ]
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ]
    });
   let barTotal = barSummary[0].get('totalAmount') || 0;


   const totalDrink = await Drink.count({where:{}})

      // Get expenses data
      const expenseRepo = require('../repos/Expense-repo');
      const damageRepo = require('../repos/Damage-repo');

      const todayExpenses = await expenseRepo.getTotalByDateRange(startOfToday, endOfToday);
      const monthExpenses = await expenseRepo.getTotalByDateRange(startOfMonth, endOfMonth);

      const todayDamages = await damageRepo.getTotalByDateRange(startOfToday, endOfToday);
      const monthDamages = await damageRepo.getTotalByDateRange(startOfMonth, endOfMonth);

      const pendingDamages = await Damage.count({ where: { status: 'pending' } });

           return res.render('index', {
              name: req.user.name ,
              email: req.user.email ,
              roleName:req.user.roleName,
              data:{
                  todayBooking:total,
                  availableroomCount:availableroomCount,
                  totalStaff:totalStaff,
                  customerCount:distinctCustomer.length,
                  todayBarSummary:barTotal,
                  totalDrink:totalDrink,
                  totalAmountForWebOnline:totalAmountForWebOnline[0].dataValues,
                  totalAmountForReception:totalAmountForReception[0].dataValues,
                  roomCount:roomCount,
                  todayExpenses: todayExpenses || 0,
                  monthExpenses: monthExpenses || 0,
                  todayDamages: todayDamages || 0,
                  monthDamages: monthDamages || 0,
                  pendingDamages: pendingDamages || 0
                  // totalAmountByBookedFrom:totalAmountByBookedFrom

              }
            });
      })
routes.post("/add-room-category",checkAuthCookie,async (req,res) => {
            res.render('index', {
              name: req.user.name ,
              email: req.user.email ,
              roleName:req.user.roleName
            });
      })
routes.get("/add-room-category",checkAuthCookie,async (req,res) => {
        res.render('addroomcategory', {
              name: req.user.name ,
              email: req.user.email ,
              roleName:req.user.roleName
            });
      });
routes.get("/room-category",checkAuthCookie,async (req,res) => {
      if(req.query.type === "delete" && req.query.id) {
            const catego = await RoomRepo.deletecategory(req.query.id)
            console.log("🚀 ~ routes.get ~ catego:", catego)
            const categories = await RoomRepo.roomCategorys()
                return  res.render('roomcategory', {
                    name: req.user.name ,
                    email: req.user.email ,
                    roleName:req.user.roleName,
                    categories:categories
                  });
      
      }
      if(req.query.id) {
           
            const categories = await RoomRepo.categoryById(req.query.id)
                return  res.render('edit-room-category', {
                    name: req.user.name ,
                    email: req.user.email ,
                    roleName:req.user.roleName,
                    categories:categories
                  });
      
      }
      const categories = await RoomRepo.roomCategorys()
            res.render('roomcategory', {
              name: req.user.name ,
              email: req.user.email ,
              roleName:req.user.roleName,
              categories:categories
            });
      })
routes.post("/edit-room-category",checkAuthCookie,async (req,res) => {
      try {
        const categoryId = req.query.id;
        const updateData = { ...req.body };

        console.log("🔄 Updating category:", categoryId);
        console.log("📦 Update data received:", {
          hasNewImages: !!updateData.newImages,
          newImagesCount: updateData.newImages?.length || 0,
          hasDeletedImages: !!updateData.deletedImages,
          deletedImagesCount: updateData.deletedImages?.length || 0
        });

        // Get current category to access existing pictures
        const currentCategory = await RoomRepo.categoryById(categoryId);
        let currentPictures = currentCategory.dataValues.picture || [];

        console.log("📸 Current pictures count:", currentPictures.length);

        // Handle deleted images
        if (updateData.deletedImages && Array.isArray(updateData.deletedImages)) {
          console.log("🗑️ Deleting images:", updateData.deletedImages);
          currentPictures = currentPictures.filter(img => !updateData.deletedImages.includes(img));
          delete updateData.deletedImages;
        }

        // Handle new images
        if (updateData.newImages && Array.isArray(updateData.newImages)) {
          console.log("➕ Adding new images:", updateData.newImages);
          currentPictures = [...currentPictures, ...updateData.newImages];
          delete updateData.newImages;
        }

        // Update pictures array
        updateData.picture = currentPictures;

        console.log("📸 Final pictures count:", currentPictures.length);
        console.log("💾 Saving to database...");

        // Update category
        const categories = await RoomRepo.editcategory(categoryId, updateData);

        console.log("✅ Update result:", categories);

        if (categories && categories.length > 0) {
          // Verify the update by fetching the category again
          const updatedCategory = await RoomRepo.categoryById(categoryId);
          console.log("✅ Verified pictures count:", updatedCategory.dataValues.picture?.length || 0);

          return res.json({
            status: true,
            message: "Category updated successfully",
            pictureCount: updatedCategory.dataValues.picture?.length || 0
          });
        }
        return res.json({status: false, message: "Error while editing category"});
      } catch (error) {
        console.error("❌ Error updating category:", error);
        return res.status(500).json({status: false, message: error.message});
      }
      })
routes.get("/edit-room-category",checkAuthCookie,async (req,res) => {
      // if(req.query.type === "delete" && req.query.id) {
      //       const catego = await RoomRepo.deletecategory(req.query.id)
      //       console.log("🚀 ~ routes.get ~ catego:", catego)
      //       const categories = await RoomRepo.roomCategorys()
      //           return  res.render('roomcategory', {
      //               name: req.user.name ,
      //               email: req.user.email ,
      //               roleName:req.user.roleName,
      //               categories:categories
      //             });
      
      // }
      const categories = await RoomRepo.roomCategorys()
            res.render('edit-room-category', {
              name: req.user.name ,
              email: req.user.email ,
              roleName:req.user.roleName,
              categories:categories
            });
      })
routes.get("/add-room",checkAuthCookie,async (req,res) => {
      const categories = await RoomRepo.roomCategorys()
            res.render('add-room', {
              name: req.user.name ,
              email: req.user.email ,
              roleName:req.user.roleName,
              categories:categories
            });
      })
.post("/add-room",checkAuthCookie,createRoomUnderCat)

routes.get("/all-rooms",checkAuthCookie,async (req,res) => {
      const page = parseInt(req.query.page) || 1; // Current page number, default is 1
      const limit = parseInt(req.query.limit) || 10; // Number of items per page, default is 10
      const offset = (page - 1) * limit; // Calculate the offset
      
      const query = `
        SELECT 
    roomnumbers._id AS id, 
    roomnumbers.*, 
    roomcategories._id AS category_id,
    roomcategories.*
FROM 
    roomnumbers
INNER JOIN 
    roomcategories ON roomnumbers.category_id = roomcategories._id
LIMIT 
    :limit 
OFFSET 
    :offset;
`;
        
        
      
      const results = await RoomNumber.sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: { limit, offset }
      });
      console.log("🚀 ~ routes.get ~ results:", results)
      
      // Count total items for pagination
      const countQuery = `
        SELECT COUNT(*) as totalItems
        FROM roomnumbers
        INNER JOIN roomcategories ON roomnumbers.category_id = roomcategories._id`;
      
      const totalItems = await RoomNumber.sequelize.query(countQuery, { type: QueryTypes.SELECT });
      const totalPages = Math.ceil(totalItems[0].totalItems / limit);
      
      res.render('all-rooms', {
            name: req.user.name ,
            email: req.user.email ,
            roleName:req.user.roleName,
            success: true,
            data: results,
            pagination: {
                  totalItems: totalItems[0].totalItems,
                  totalPages,
                  currentPage: page,
                  pageSize: limit
            }
      
      });
 
      })

routes.get("/all-booking",checkAuthCookie,async (req, res) => {
      const hasQueryParams = Object.keys(req.query).length > 0;
      const startDate = new Date(); // Get the current date
      startDate.setHours(0, 0, 0, 0); // Set start time to 00:00:00
      
      const endDate = new Date(); // Get the current date
      endDate.setHours(23, 59, 59, 999);
      const bookings = await HotelBooking.findAll({order: [['createdAt', 'DESC']]})
      console.log("🚀 ~ routes.get ~ bookings:", bookings)
      
      const totalAmount = await HotelBooking.sum('amount', {
            where: {
                status:"success",
                'createdAt': {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate,
                },

            },
        });
        console.log("🚀 ~ routes.get ~ totalAmount:", totalAmount)
    

      if (req.query.start && req.query.end) { 
            const startDate = new Date(req.query.start);
            const endDate = new Date(req.query.end);

            endDate.setHours(23, 59, 59, 999);

            const totalAmounts = await HotelBooking.sum('amount', {
                  where: {
                      status:"success",
                      'createdAt': {
                          [Op.gte]: startDate,
                          [Op.lte]: endDate,
                      },
      
                  },
              });
              console.log("🚀 ~ routes.get ~ totalAmount:", totalAmount)
            console.log("🚀 ~ routes.get ~ totalAmount:", totalAmount)
            const bookings = await HotelBooking.findAll({
                  where: {
                        createdAt: {
                              [Op.gte]: startDate,
                              [Op.lte]: endDate,
                          }
                  },
                  // order: [
                  //   ['createdAt', 'DESC']
                  // ]
            });
           
            
           
            res.render("all-booking", {
                  name: req.user.name ,
                  email: req.user.email ,
                  roleName:req.user.roleName,
                  bookings:bookings,
                  hasQueryParams:hasQueryParams,
                  totalAmount: totalAmounts,
                  start: req.query.start,
                  end: req.query.end,
            })
            return
      }



      if (req.query.room_number) {
            const bookings = await HotelBooking.findAll({
                  where: {
                    room_number: req.query.room_number,
                    status:"success"
                  },
                  order: [
                    ['createdAt', 'DESC']
                  ]
                });

                const totalAmounts = await HotelBooking.sum('amount', {
                  where: {
                        room_number: req.query.room_number,
                      status:"success",
                    
      
                  },
              });
                
      
            return res.render('all-booking', {
                  name: req.user.name ,
                  email: req.user.email ,
                  roleName:req.user.roleName,
                  bookings:bookings,
                  hasQueryParams:hasQueryParams,
                  start: startDate,
                  end: endDate,
                  totalAmount:totalAmounts
                }) 
      }

      if (req.query.type) {
            let bookings;
            switch (req.query.type) {
                  case "web-online":
                        bookings = await HotelBooking.findAll({
                              where: {
                                booked_from:"web-online"
                              },
                              order: [
                                ['createdAt', 'DESC']
                              ]
                            });
                        
                            const totalAmounts = await HotelBooking.sum('amount', {
                              where: {
                                   booked_from:"web-online",
                                  status:"success",
                                
                  
                              },
                          });
                  
                        return res.render('all-booking', {
                              name: req.user.name ,
                              email: req.user.email ,
                              roleName:req.user.roleName,
                              bookings:bookings,
                              hasQueryParams:hasQueryParams,
                              start: startDate,
                              end: endDate,
                              totalAmount:totalAmounts
                            }) 
                        break;
            
                  default:
                        bookings = await HotelBooking.findAll({
                              where: {
                                booked_from:"reception"
                              },
                              order: [
                                ['createdAt', 'DESC']
                              ]
                            });

                            const totalAmoun = await HotelBooking.sum('amount', {
                              where: {
                                   booked_from:"reception",
                                  status:"success",
                                
                  
                              },
                          });
                            
                            
                  
                        return res.render('all-booking', {
                              name: req.user.name ,
                              email: req.user.email ,
                              roleName:req.user.roleName,
                              bookings:bookings,
                              hasQueryParams:hasQueryParams,
                              start: startDate,
                              end: endDate,
                              totalAmount:totalAmoun
                            }) 

                        break;
            }
          
      }
    

        
        
      
      res.render('all-booking', {
            name: req.user.name ,
            email: req.user.email ,
            roleName:req.user.roleName,
            bookings:bookings,
            hasQueryParams:false,
            start: startDate,
            end: endDate,
            totalAmount:totalAmount
          })
})

routes.get("/all-bookings-calendar",checkAuthCookie,async (req, res, next) => {
      const hotelbookings = await HotelBooking.findAll({order: [['createdAt', 'DESC']]})

      // Fetch retained rooms
      const retainedRooms = await RoomNumber.findAll({
        where: {
          is_retained: true
        }
      });

      // const sanitizedBookings = hotelbookings.map(booking => ({
      //       id: booking.id,
      //       start: booking.start,
      //       end: booking.end,
      //       guest_name: booking.guest_name,
      // }));
      // console.log("🚀 ~ sanitizedBookings ~ sanitizedBookings:", sanitizedBookings)

      // const categories = await RoomRepo.roomCategorys()
      res.render('calendar', {
            name: req.user.name ,
            email: req.user.email ,
            roleName:req.user.roleName,
            bookings : JSON.stringify(hotelbookings).replace(/'/g, "\\'"),
            retainedRooms : JSON.stringify(retainedRooms).replace(/'/g, "\\'")
          })
})

routes.get('/bookings-csv', async (req, res) => {
      try {
          const { start, end } = req.query;
  
  
          const startDate = new Date(req.query.start);
          const endDate = new Date(req.query.end);
  
          endDate.setHours(23, 59, 59, 999);
          // Build query conditions
        //   const whereClause = {};
        //   if (start && end) {
        //       whereClause.start = { [Op.gte]: start }; // Start date filter
        //       whereClause.end = { [Op.lte]: end };   // End date filter
        //   }
  
         const bookings = await HotelBooking.findAll({
                    where: {
                          createdAt: {
                                [Op.gte]: startDate,
                                [Op.lte]: endDate,
                            }
                    },
                    // order: [
                    //   ['createdAt', 'DESC']
                    // ]
              });
          console.log("🚀 ~ routes.get ~ bookings:", bookings)
  
  
          // Format data
          const formattedData = bookings.map((booking, index) => ({
              "S/N": index + 1,
              "Booking ID": booking.reference_id || '',
              "Name": booking.guest_name || '',
              "Amount": booking.amount ? (booking.amount / 100).toFixed(2) : '0.00',
              "Room Type": booking.room_name || '',
              "Room Number": booking.room_number || '',
              "Booked From": booking.booked_from || '',
              "Arrival Date": booking.start ? new Date(booking.start).toLocaleDateString('en-GB') : 'N/A',
              "Departure Date": booking.end ? new Date(booking.end).toLocaleDateString('en-GB') : 'N/A',
              "Email": booking.guest_email || '',
              "Phone Number": booking.guest_phone || '',
              "Status": booking.status || '',
              "Booking Time": booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-GB') : 'N/A',
              "Checked": booking.checked_in || '',
              "Checked By": booking.checked_in_by || '',
          }));
  
          // Convert to CSV
          const json2csvParser = new Parser();
          const csv = json2csvParser.parse(formattedData);
  
          const fileName = `bookings_${start || 'all'}_${end || 'all'}.csv`;
  
          // Set headers and send response
          res.header('Content-Type', 'text/csv');
          res.attachment(fileName);
          res.send(csv);
      } catch (error) {
          console.error('Error generating CSV:', error);
          res.status(500).send('Error generating CSV');
      }
  });
routes.get("/add-booking",checkAuthCookie,async (req, res) => {

      // Get active pricing configurations
      const activePricingConfigs = await PricingConfig.findAll({
        where: {
          is_active: true,
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() }
        }
      });

      if(req.query.id && req.query.cat_id){
            const bookings = await HotelBooking.findAll({order: [['id', 'DESC']]})
            const categories = await RoomRepo.roomNumber(req.query.id)
            const getModes = await PaymentMode.findAll({where:{status:true}})

            // Check if this category has special pricing
            const specialPricing = activePricingConfigs.find(config => {
              const configCategoryId = config.dataValues ? config.dataValues.category_id : config.category_id;
              return configCategoryId === parseInt(req.query.id);
            });

            let amount = req.query.price;
            if (specialPricing) {
              const pricingData = specialPricing.dataValues || specialPricing;
              amount = parseFloat(pricingData.special_price);
            }

            return res.render('add-booking-category', {
                  name: req.user.name ,
                  email: req.user.email ,
                  roleName:req.user.roleName,
                  categories:categories,
                  category_name:req.query.cat_id,
                  amount:amount,
                  modes:getModes

            })
      }

      const bookings = await HotelBooking.findAll({order: [['id', 'DESC']]})
      const categories = await RoomRepo.roomCategorys()

      // Apply special pricing to categories
      const categoriesWithPricing = categories.map(cat => {
        if (!cat) return null;

        const baseData = cat.dataValues || cat;
        const specialPricing = activePricingConfigs.find(config => {
          const configCategoryId = config.dataValues ? config.dataValues.category_id : config.category_id;
          return configCategoryId === baseData._id;
        });

        if (specialPricing) {
          const pricingData = specialPricing.dataValues || specialPricing;
          return {
            ...baseData,
            originalPrice: baseData.price,
            price: parseFloat(pricingData.special_price),
            hasSpecialPrice: true,
            pricingEndDate: pricingData.end_date
          };
        }

        return {
          ...baseData,
          hasSpecialPrice: false
        };
      }).filter(cat => cat !== null);

      res.render('add-booking', {
            name: req.user.name ,
            email: req.user.email ,
            roleName:req.user.roleName,
            categories:categoriesWithPricing
          })
})
routes.post("/check-booking",checkAuthCookie,async (req, res) => {
      const bookingkey = await HotelBooking.findOne({where: {reference_id:req.query.key}})
      if (!bookingkey) return res.status(404).json({status: false, message:'key not found or check properly'})
      return res.status(200).json({status: true, message:'key not found or check properly',data:bookingkey})  
})


routes.get("/check-booking",checkAuthCookie,async (req, res) => {
      res.render('check-booking', {
            name: req.user.name ,
            email: req.user.email ,
            roleName:req.user.roleName,
            // bookings:bookings,
          })
})
 

routes.get("/check-in",checkAuthCookie, async (req, res) => {
    const bookings = await HotelBooking.findOne({ where: { reference_id: req.query.key } });
    res.render('check-in', {
      name: req.user.name,
      email: req.user.email,
      roleName: req.user.roleName,
      bookings: bookings,
    });
  })

routes.post("/check-in", checkAuthCookie, expressAsyncHandler( async (req, res) => {
    const  key  = req.query.key;
    const booking = await HotelBooking.update(
      { checked_in: true,checked_in_by:req.user.name },
      { where: { reference_id:key } }
    );
    return res.status(200).json({status: true, message:'Customer as been checked in',bookings:booking}) 
//     if (booking[0] > 0) { // Sequelize update method returns an array, the first element is the number of affected rows
//       return res.status(200).json({status: true, message:'Customer as been checked in',bookings:booking})  
//     } else {
//       return res.status(200).json({status: false, message:'Error while Customer as been checked in',bookings:booking})  
//     }
  }));

  routes.get("/all-customer",checkAuthCookie, async (req, res) => {
      if (req.query.phonenumber) {
            const bookings = await HotelBooking.findAll({
                  where: {
                        guest_phone: req.query.phonenumber
                  },
                  order: [['id', 'DESC']]
                });
                
          return  res.render('one-customer', {
                  name: req.user.name,
                  email: req.user.email,
                  roleName: req.user.roleName,
                  bookings: bookings,
                  customer_email: req.query.email,
                  customer_name: req.query.name,


                });
      }
      const distinctCustomer = await HotelBooking.findAll({
            attributes: [
              'guest_email',
              [Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN status = 'success' THEN 1 ELSE 0 END`)), 'success_count'],
              [Sequelize.fn('MIN', Sequelize.col('guest_name')), 'guest_name'], // Choose the first occurrence of guest_name
              [Sequelize.fn('MIN', Sequelize.col('guest_phone')), 'guest_phone'], // Choose the first occurrence of guest_phone
              [Sequelize.fn('MIN', Sequelize.col('guest_address')), 'guest_address'] // Choose the first occurrence of guest_address
              // Or concatenate them if needed
              // [Sequelize.fn('GROUP_CONCAT', Sequelize.col('guest_name')), 'guest_name'],
              // [Sequelize.fn('GROUP_CONCAT', Sequelize.col('guest_phone')), 'guest_phone'],
              // [Sequelize.fn('GROUP_CONCAT', Sequelize.col('guest_address')), 'guest_address'],
            ],
            group: ['guest_email'],
            raw: true
          });
          console.log("🚀 ~ routes.get ~ distinctCustomer:", distinctCustomer)
          
     return res.render('all-customer', {
        name: req.user.name,
        email: req.user.email,
        roleName: req.user.roleName,
        customers: distinctCustomer,
      });
    })

  routes.get("/payment-mode",checkAuthCookie,expressAsyncHandler(async (req,res) => {
      if (req.query.id && req.query.status) {
        const updatePaymentMode = await PaymentMode.update({status:req.query.status},{where: {_id: req.query.id}})
        if (updatePaymentMode) {
            const findPaymentMode = await PaymentMode.findAll()
            console.log("🚀 ~ routes.get ~ findPaymentMode:", findPaymentMode)
            return res.render('payment-mode', {
                  name: req.user.name,
                  email: req.user.email,
                  roleName: req.user.roleName,
                  paymentmode:findPaymentMode
            })
        }
      }
      const findPaymentMode = await PaymentMode.findAll()
      return res.render('payment-mode', {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            paymentmode:findPaymentMode
      })
  }))

  routes.get("/all-staff",checkAuthCookie,expressAsyncHandler(async (req, res) => {
      Staff.belongsTo(User,{foreignKey:"user_id"})
      const staffs = await Staff.findAll({
            include: { model: User },
            order: [
                ['createdAt', 'ASC'], // Primary sort column
                ['user', 'name', 'ASC'] // Secondary sort column
            ]
        });
      if (req.query.id && req.query.type) {
            let update;
            switch (req.query.type) {
                  case "activate":
                         update = await User.update({status:true},{where: {_id: req.query.id}})
                        if (update) {
                              return res.render('all-staff', {
                                    name: req.user.name,
                                    email: req.user.email,
                                    roleName: req.user.roleName,
                                    staffs:staffs
                                 
                              })
                        } else {
                              return res.render('all-staff', {
                                    name: req.user.name,
                                    email: req.user.email,
                                    roleName: req.user.roleName,
                                    staffs:staffs
                                 
                              })
                        }
                        break;
                  case "suspend":
                         update = await User.update({status:false},{where: {_id: req.query.id}})
                        if (update) {
                              return res.render('all-staff', {
                                    name: req.user.name,
                                    email: req.user.email,
                                    roleName: req.user.roleName,
                                    staffs:staffs
                                 
                              })
                        } else {
                              return res.render('all-staff', {
                                    name: req.user.name,
                                    email: req.user.email,
                                    roleName: req.user.roleName,
                                    staffs:staffs
                                 
                              })
                        }
                        break;
            
                  default:
                         update = await User.update({status:false},{where: {_id: req.query.id}})
                        if (update) {
                              return res.render('all-staff', {
                                    name: req.user.name,
                                    email: req.user.email,
                                    roleName: req.user.roleName,
                                    staffs:staffs
                                 
                              }) 
                        } else {
                              return res.render('all-staff', {
                                    name: req.user.name,
                                    email: req.user.email,
                                    roleName: req.user.roleName,
                                    staffs:staffs
                                 
                              })
                        }
                      
                        break;
            }
            

      }
      
        
      // staffs.forEach(user => console.log(user.user.name))
      // console.log("🚀 ~ routes.get ~ staffs:", staffs)
      return res.render('all-staff', {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            staffs:staffs
         
      })
}))
  routes.get("/edit-staff",checkAuthCookie,expressAsyncHandler(async (req, res) => {
     
      return res.render('edit-staff', {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
         
      })
}))
routes.get("/add-staff",checkAuthCookie,expressAsyncHandler(async (req, res) => {
 
      return res.render('add-staff', {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
       
      })
}))

routes.post("/add-staff",checkAuthCookie,expressAsyncHandler(async (req, res) => {
      let transaction
      transaction = await connectDB.transaction()
      console.log("🚀 ~ routes.post ~ req.body:", req.body)
      function generateRandomString(length) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
              result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
          }
      const randPass = generateRandomString(6)
      console.log("🚀 ~ routes.post ~ randPass:", randPass)
      const saveUser = await User.create({
            name: req.body.first + " " + req.body.last,
            email: req.body.email,
            password: randPass,
            role_id: parseInt(req.body.role),
            

      },{transaction})
      console.log("🚀 ~ routes.post ~ saveUser:", saveUser)
      const saveStaff = await Staff.create({
            user_id: saveUser._id,
            phonenumber: req.body.phonenumber,
            address: req.body.address,
            // designation: req.body.designation,
      },{transaction})
      await transaction.commit()
     

          const sendEmail = await SendEmail(
            "Welcome On Board",
            "",
            `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td align="center" style="background-color: #c19b76; padding: 20px;">
                        <h2 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome Aboard!</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px; color: #333;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${saveUser.name},</p>
                        <p style="font-size: 16px; margin-bottom: 20px;">Welcome to Wishmewell Apartment and Suites! We're excited to have you as our new staff member with role ${saveUser.roleName === "hotel receptionist" ? "Receptionist" : saveUser.roleName} . Below are your login credentials:</p>
                        <p style="font-size: 16px; margin-bottom: 20px;">Email: ${saveUser.email}</p>
                        <p style="font-size: 16px; margin-bottom: 20px;">Password: ${randPass}</p>
                        <p style="font-size: 16px; margin-top: 20px;">You can log in to your account here: <a href="https://wishmewellapartment.com/portal" style="color: #c19b76; text-decoration: underline;">Wishmewell Apartment and Suites Portal</a></p>
                        <p style="font-size: 16px; margin-top: 20px;">If you have any questions, feel free to reach out to us.</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="background-color: #f4f4f4; padding: 20px; color: #666; font-size: 14px;">
                        <p style="margin: 0;">Best regards,</p>
                        <p style="margin: 5px 0 0;">Wishmewell Apartment and Suites</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            `,
            saveUser.email,
            "wishmewellapartment@gmail.com"
        );
        
      // sendSMS
      return res.status(201).json({
            status: true,
            message: 'Staff added successfully',
            data: saveStaff,
      })

}))


routes.get("/info-promotion-create",checkAuthCookie,expressAsyncHandler(async  (req, res) => {
      const promotions = await Marque.findAll({
         
      });
      res.render("promotions", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
      })
}))
routes.post("/info-promotion-create",checkAuthCookie,expressAsyncHandler(async  (req, res) => {
      

      const promotions = await Marque.create(req.body);
      return res.status(201).json({
            status: true,
            message: 'Promotion created successfully',
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
          });
}))
routes.get("/info-promotion",checkAuthCookie,expressAsyncHandler(async  (req, res) => {
      const promotions = await Marque.findAll({
         
      });
      res.render("all-promos", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            data:promotions
      })
}))

routes.get("/bar",checkAuthCookie,expressAsyncHandler(async (req,res) => {
      const drinks = await Drink.findAll({
         
      });
      res.render("barRecent", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            drinks:JSON.stringify(drinks)
      })
}))
routes.get("/bar-buy-records",checkAuthCookie,expressAsyncHandler(async (req,res) => {
      if (req.query.start && req.query.end) { 
            const DrinkLogs = await DrinkLog.findAll({
                  where: {createdAt: { [Op.gte]: req.query.start, [Op.lte]: req.query.end }},
                  order: [
                    ['createdAt', 'DESC']
                  ]
            });
            res.render("barOlder", {
                  name: req.user.name,
                  email: req.user.email,
                  roleName: req.user.roleName,
                  logs:DrinkLogs
            })
            return
      }
      const DrinkLogs = await DrinkLog.findAll({
            order: [
              ['id', 'DESC']
            ]
      });
      res.render("barOlder", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            logs:DrinkLogs
      })
      return
}))
routes.get("/bar-records",checkAuthCookie,expressAsyncHandler(async (req,res) => {
      if (req.query.start && req.query.end) { 
            const startDate = new Date(req.query.start);
const endDate = new Date(req.query.end);

// Adjust endDate to include the full day (23:59:59)
endDate.setHours(23, 59, 59, 999);
            const DrinkLogs = await DrinkLog.findAll({
                  where: {
                        createdAt: {
                              [Op.gte]: startDate,
                              [Op.lte]: endDate,
                          }
                  },
                  order: [
                    ['createdAt', 'DESC']
                  ]
            });
            const totalAmount = await DrinkLog.sum('amount', {
                  where: {
                      createdAt: {
                          [Op.gte]: startDate,
                          [Op.lte]: endDate,
                      },
                  },
              });
            console.log("🚀 ~ routes.get ~ totalAmount:", totalAmount)
            
           
            res.render("all-bar-records", {
                  name: req.user.name,
                  email: req.user.email,
                  roleName: req.user.roleName,
                  logs:DrinkLogs,
                  totalAmount: totalAmount,
                  start: req.query.start,
                  end: req.query.end,
                  totalDrinksSold: DrinkLogs.length,
                 

            })
            return
      }
      const startDate = new Date(); // Get the current date
startDate.setHours(0, 0, 0, 0); // Set start time to 00:00:00

const endDate = new Date(); // Get the current date
endDate.setHours(23, 59, 59, 999);

      const totalAmount = await DrinkLog.sum('amount', {
            where: {
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate,
                },
            },
        });
      const DrinkLogs = await DrinkLog.findAll({
            order: [
              ['id', 'DESC']
            ]
      });
      res.render("all-bar-records", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            logs:DrinkLogs,
            totalAmount: totalAmount,
            start: startDate,
            end: endDate,
            totalDrinksSold: DrinkLogs.length,
      })
      return
}))
routes.get("/bar-all-drinks",checkAuthCookie,expressAsyncHandler(async (req,res) => {
      // Drink model
// Drink.hasMany(DrinkLog, { foreignKey: 'drink_name' });


//       const drinks = await Drink.findAll({
//             attributes: [
//               'id',
//               'name',
//               'totalStock',
//               'price',
//               // Calculate leftInStock: totalStock - SUM(quantity)
//               [Sequelize.literal('totalStock - COALESCE(SUM(DrinkLogs.quantity), 0)'), 'leftInStock']
//             ],
//             include: [{
//               model: DrinkLog,
//               attributes: [] // We don't need any attributes from DrinkLog itself
//             }],
//             group: ['Drink.id'], // Group by Drink ID to aggregate correctly
//             order: [['id', 'DESC']]
//           });
//           console.log("🚀 ~ routes.get ~ drinks:", drinks)
          
      
      const drinks = await Drink.findAll({
            order: [
              ['id', 'DESC']
            ]
      });
     return  res.render("all-drinks", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            drinks:JSON.stringify(drinks)
      })
}))

routes.get("/bar-create-drinks",checkAuthCookie,expressAsyncHandler(async(req,res) => {
      return  res.render("test", {
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
      })
}))

routes.post("/bar-edit-drinks",checkAuthCookie,expressAsyncHandler(async(req,res) => {
      console.log("��� ~ routes.post ~ req.body:", req.body)
      // const findName = await Drink.findOne({where:{name:req.body.name}})
      // if (findName) {
      //       return res.status(400).json({
      //             status: false,
      //             message: 'Drink already exists',
      //             name: req.user.name,
      //             email: req.user.email,
      //             roleName: req.user.roleName,
      //       }) 
      // }
      const saveBar = await Drink.update({
            name: req.body.name.toLowerCase(),
            totalStock: req.body.totalStock,
            price: req.body.price,
            leftInStock:req.body.totalStock,
            totalSales:0,
       
      },{where:{id:req.body.id}})
      console.log("🚀 ~ routes.post ~ saveBar:", saveBar)
      return res.status(201).json({
            status: true,
            message: 'Drink updated successfully',
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
      })
}))
routes.post("/bar-create-drinks",checkAuthCookie,expressAsyncHandler(async(req,res) => {
      console.log("��� ~ routes.post ~ req.body:", req.body)
      const findName = await Drink.findOne({where:{name:req.body.name}})
      if (findName) {
            return res.status(400).json({
                  status: false,
                  message: 'Drink already exists',
                  name: req.body.name.toLowerCase(),
                  email: req.user.email,
                  roleName: req.user.roleName,
            }) 
      }
      const saveBar = await Drink.create({
            name: req.body.name.toLowerCase(),
            totalStock: req.body.totalStock,
            price: req.body.price,
       
      })
      return res.status(201).json({
            status: true,
            message: 'Drink added successfully',
            data: saveBar,
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
      })
}))
routes.post("/bar-buy", checkAuthCookie, expressAsyncHandler(async (req, res) => {
      const transaction = await connectDB.transaction();
      const { customerName, cart } = req.body;  // Extract the customerName and cart
    
      try {
        // Check if cart is an array and contains items
        if (!Array.isArray(cart) || cart.length === 0) {
          return res.status(400).json({ status: false, message: 'Cart is empty' });
        }
    
        // Process each item in the cart
        for (const item of cart) {
          const { id, name, quantity, total } = item;
    
          // Find the drink by ID
          const drink = await Drink.findOne({ where: { id } }, { transaction });
          if (!drink) {
            throw new Error(`Drink with ID ${id} not found`);
          }
    
          // Calculate the updated stock
          const updatedStock = drink.totalStock - quantity;
          const updateSales = drink.totalSales + quantity;
          if (updatedStock < 0) {
            throw new Error(`Insufficient stock for ${name}`);
          }
    
          // Update the drink's stock
      //     await drink.update({ totalStock: updatedStock }, { transaction });
          await drink.update({ leftInStock: drink.totalStock - quantity,totalSales: updateSales}, { transaction });
    
          // Create a log entry for the transaction
          await DrinkLog.create({
            name: customerName,        // Customer name from request body
            amount: total,             // Total amount for the drink
            drink_name: name,          // Drink name
            quantity: quantity,        // Quantity of drinks purchased
            stockAfterTransaction: drink.totalStock - quantity,
            staff_name: req.user.name, // Staff name from authenticated user
          }, { transaction });
        }
    
        // Commit the transaction after processing all items
        await transaction.commit();
    
        // Respond with success
        return res.status(201).json({
          status: true,
          message: 'Drinks processed successfully',
          name: req.user.name,
          email: req.user.email,
          roleName: req.user.roleName,
        });
    
      } catch (error) {
        // Rollback the transaction if an error occurs
        await transaction.rollback();
    
        // Log the error for debugging purposes
        console.error('Error processing cart:', error);
    
        // Return a 500 status with the error message
        return res.status(500).json({ status: false, message: error.message });
      }
    }));

routes.get("/forgot-password",expressAsyncHandler(async (req,res) => {
      res.render("forgot-password")
}))
routes.get("/first-time",expressAsyncHandler(async (req,res) => {
      res.render("firsttime")
}))

routes.get("/recovery",expressAsyncHandler(async (req,res) => {
       const id = req.query.id;

       if (!id) {
            return  res.redirect('/portal')
        }
       const resetPassword = await ResetPassword.findOne({
            where: {
              token: id,
              expiresAt: { [Op.gt]: new Date() } // Op is Sequelize operator
            }
          });
          
          if (!resetPassword) {
            return res.render("recovery",{status:false})
          }
    
     
      return res.render("recovery",{status:true})
}))

routes.get("/profile",checkAuthCookie,expressAsyncHandler(async (req,res) => {
      res.render("profile",{
            name: req.user.name,
            email: req.user.email,
            roleName: req.user.roleName,
            _id: req.user._id
      })
}))

// Part Payment Routes
routes.get("/part-payments", checkAuthCookie, PartPaymentController.renderPartPaymentsPage);
routes.get("/part-payments/api", checkAuthCookie, PartPaymentController.getAllPartPayments);
routes.get("/complete-payment", checkAuthCookie, PartPaymentController.renderCompletePaymentPage);
routes.post("/complete-payment/:id", checkAuthCookie, PartPaymentController.completePartPayment);
routes.get("/api/payment-history/:id", checkAuthCookie, PartPaymentController.getPaymentHistory);

// Part Payments CSV Export
routes.get('/part-payments-csv', checkAuthCookie, async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereClause = { payment_status: 'partial' };

    if (start && end) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      whereClause.created_at = {
        [Op.between]: [startDate, endDate]
      };
    }

    const partPayments = await PartPayment.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    // Format data for CSV
    const formattedData = partPayments.map((payment, index) => ({
      "S/N": index + 1,
      "Reference ID": payment.reference_id || '',
      "Guest Name": payment.guest_name || '',
      "Email": payment.guest_email || '',
      "Phone": payment.guest_phone || '',
      "Room Name": payment.room_name || '',
      "Room Number": payment.room_number || '',
      "Category": payment.category_name || '',
      "Total Amount (₦)": payment.total_amount ? (payment.total_amount / 100).toFixed(2) : '0.00',
      "Amount Paid (₦)": payment.amount_paid ? (payment.amount_paid / 100).toFixed(2) : '0.00',
      "Balance (₦)": payment.balance ? (payment.balance / 100).toFixed(2) : '0.00',
      "Payment Percentage": payment.total_amount ? `${Math.round((payment.amount_paid / payment.total_amount) * 100)}%` : '0%',
      "Check In": payment.start_date ? new Date(payment.start_date).toLocaleDateString('en-GB') : 'N/A',
      "Check Out": payment.end_date ? new Date(payment.end_date).toLocaleDateString('en-GB') : 'N/A',
      "Status": payment.payment_status || '',
      "Created At": payment.created_at ? new Date(payment.created_at).toLocaleString('en-GB') : 'N/A',
    }));

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedData);

    const fileName = `part_payments_${start || 'all'}_${end || 'all'}.csv`;

    // Set headers and send response
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);
  } catch (error) {
    console.error('Error generating part payments CSV:', error);
    res.status(500).send('Error generating CSV');
  }
});

// Pricing Configuration Routes
routes.get("/pricing-config", checkAuthCookie, PricingConfigController.renderPricingConfigPage);
routes.get("/pricing-config/create", checkAuthCookie, PricingConfigController.renderCreatePricingPage);
routes.post("/pricing-config/create", checkAuthCookie, PricingConfigController.createPricingConfig);
routes.get("/pricing-config/api", checkAuthCookie, PricingConfigController.getAllPricingConfigs);
routes.get("/pricing-config/active", checkAuthCookie, PricingConfigController.getActivePricingConfigs);
routes.put("/pricing-config/update", checkAuthCookie, PricingConfigController.updatePricingConfig);
routes.delete("/pricing-config/delete", checkAuthCookie, PricingConfigController.deletePricingConfig);
routes.put("/pricing-config/deactivate", checkAuthCookie, PricingConfigController.deactivatePricingConfig);

// Expense Routes
routes.get("/expenses", checkAuthCookie, ExpenseController.renderExpensesPage);
routes.post("/expenses/create", checkAuthCookie, ExpenseController.createExpense);
routes.put("/expenses/update/:id", checkAuthCookie, ExpenseController.updateExpense);
routes.delete("/expenses/delete/:id", checkAuthCookie, ExpenseController.deleteExpense);
routes.get("/expenses/api/:id", checkAuthCookie, ExpenseController.getExpenseById);

// Expenses CSV Export
routes.get('/expenses-csv', checkAuthCookie, async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereClause = {};

    if (start && end) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      whereClause.expense_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const expenses = await Expense.findAll({
      where: whereClause,
      order: [['expense_date', 'DESC']]
    });

    // Format data for CSV
    const formattedData = expenses.map((expense, index) => ({
      "S/N": index + 1,
      "Expense Name": expense.expense_name || '',
      "Category": expense.category || '',
      "Amount (₦)": expense.amount ? (expense.amount / 100).toFixed(2) : '0.00',
      "Date": expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('en-GB') : 'N/A',
      "Description": expense.description || '',
      "Recorded By": expense.recorded_by || '',
      "Created At": expense.created_at ? new Date(expense.created_at).toLocaleString('en-GB') : 'N/A',
    }));

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedData);

    const fileName = `expenses_${start || 'all'}_${end || 'all'}.csv`;

    // Set headers and send response
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);
  } catch (error) {
    console.error('Error generating expenses CSV:', error);
    res.status(500).send('Error generating CSV');
  }
});

// Damage Routes
routes.get("/damages", checkAuthCookie, DamageController.renderDamagesPage);
routes.post("/damages/create", checkAuthCookie, DamageController.createDamage);
routes.put("/damages/update/:id", checkAuthCookie, DamageController.updateDamage);
routes.put("/damages/status/:id", checkAuthCookie, DamageController.updateDamageStatus);
routes.delete("/damages/delete/:id", checkAuthCookie, DamageController.deleteDamage);
routes.get("/damages/api/:id", checkAuthCookie, DamageController.getDamageById);

// Damages CSV Export
routes.get('/damages-csv', checkAuthCookie, async (req, res) => {
  try {
    const { start, end } = req.query;
    let whereClause = {};

    if (start && end) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      whereClause.damage_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const damages = await Damage.findAll({
      where: whereClause,
      order: [['damage_date', 'DESC']]
    });

    // Format data for CSV
    const formattedData = damages.map((damage, index) => ({
      "S/N": index + 1,
      "Room Number": damage.room_number || '',
      "Room Name": damage.room_name || '',
      "Description": damage.damage_description || '',
      "Action Type": damage.action_type || '',
      "Amount (₦)": damage.amount ? (damage.amount / 100).toFixed(2) : '0.00',
      "Date": damage.damage_date ? new Date(damage.damage_date).toLocaleDateString('en-GB') : 'N/A',
      "Status": damage.status || '',
      "Recorded By": damage.recorded_by || '',
      "Completed Date": damage.completed_date ? new Date(damage.completed_date).toLocaleDateString('en-GB') : 'N/A',
      "Notes": damage.notes || '',
      "Created At": damage.created_at ? new Date(damage.created_at).toLocaleString('en-GB') : 'N/A',
    }));

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedData);

    const fileName = `damages_${start || 'all'}_${end || 'all'}.csv`;

    // Set headers and send response
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);
  } catch (error) {
    console.error('Error generating damages CSV:', error);
    res.status(500).send('Error generating CSV');
  }
});

// Room Retention Routes
routes.post("/room/retain", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const { room_id, retained_from, retained_to, retention_reason } = req.body;

  if (!room_id || !retained_from || !retained_to) {
    return res.status(400).json({
      status: false,
      message: "Room ID, start date, and end date are required"
    });
  }

  const room = await RoomNumber.findOne({ where: { _id: room_id } });
  if (!room) {
    return res.status(404).json({
      status: false,
      message: "Room not found"
    });
  }

  await RoomNumber.update(
    {
      is_retained: true,
      retained_by: req.user.name,
      retained_from: retained_from,
      retained_to: retained_to,
      retention_reason: retention_reason || 'Reserved by admin'
    },
    { where: { _id: room_id } }
  );

  return res.status(200).json({
    status: true,
    message: "Room retained successfully"
  });
}));

routes.post("/room/release", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const { room_id } = req.body;

  if (!room_id) {
    return res.status(400).json({
      status: false,
      message: "Room ID is required"
    });
  }

  await RoomNumber.update(
    {
      is_retained: false,
      retained_by: null,
      retained_from: null,
      retained_to: null,
      retention_reason: null
    },
    { where: { _id: room_id } }
  );

  return res.status(200).json({
    status: true,
    message: "Room released successfully"
  });
}));

// API: Get all room categories
routes.get("/api/hotel/categories", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const categories = await Room.findAll({
    order: [['category_name', 'ASC']]
  });

  return res.status(200).json({
    status: true,
    data: {
      categories: categories
    }
  });
}));

// API: Get pricing for a category on a specific date (checks for special pricing)
routes.get("/api/pricing/category/:categoryId", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { date } = req.query; // Expected format: YYYY-MM-DD

  console.log(`🔍 Fetching pricing for category ${categoryId} on date ${date}`);

  const bookingDate = date ? new Date(date) : new Date();
  const pricingInfo = await pricingConfigRepo.getPriceForCategory(categoryId, bookingDate);

  return res.status(200).json({
    status: true,
    data: {
      price: pricingInfo.price,
      hasSpecialPrice: pricingInfo.isSpecialPrice,
      pricingConfig: pricingInfo.pricingConfig
    }
  });
}));

// API: Get rooms by category
routes.get("/api/hotel/rooms/category/:categoryId", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const rooms = await RoomNumber.findAll({
    where: { category_id: categoryId },
    order: [['room_number', 'ASC']]
  });

  return res.status(200).json({
    status: true,
    data: {
      rooms: rooms
    }
  });
}));

// Room Transfer Route
routes.post("/transfer-room", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const {
    reference_id,
    old_room_id,
    old_room_number,
    new_room_id,
    new_room_number,
    new_room_name,
    new_category_id,
    new_category_name
  } = req.body;

  if (!reference_id || !old_room_id || !new_room_id) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields"
    });
  }

  // Check if new room is available
  const newRoom = await RoomNumber.findOne({ where: { _id: new_room_id } });
  if (!newRoom) {
    return res.status(404).json({
      status: false,
      message: "New room not found"
    });
  }

  if (newRoom.status) {
    return res.status(400).json({
      status: false,
      message: "Selected room is already booked"
    });
  }

  // Get the booking
  const booking = await HotelBooking.findOne({ where: { reference_id } });
  if (!booking) {
    return res.status(404).json({
      status: false,
      message: "Booking not found"
    });
  }

  // Start transaction
  const t = await connectDB.transaction();

  try {
    // Save transfer history
    await RoomTransfer.create({
      booking_reference: reference_id,
      guest_name: booking.guest_name,
      old_room_id: old_room_id,
      old_room_number: old_room_number,
      old_room_name: booking.room_name,
      old_category_id: booking.category_id,
      old_category_name: booking.category_name,
      new_room_id: new_room_id,
      new_room_number: new_room_number,
      new_room_name: new_room_name,
      new_category_id: new_category_id,
      new_category_name: new_category_name,
      transferred_by: req.user.name,
      transfer_reason: req.body.transfer_reason || null,
      booking_start: booking.start,
      booking_end: booking.end
    }, { transaction: t });

    // Update the booking with new room details
    await HotelBooking.update(
      {
        room_id: new_room_id,
        room_number: new_room_number,
        room_name: new_room_name,
        category_id: new_category_id,
        category_name: new_category_name
      },
      { where: { reference_id }, transaction: t }
    );

    // Free up the old room (set status to false)
    await RoomNumber.update(
      { status: false },
      { where: { _id: old_room_id }, transaction: t }
    );

    // Mark the new room as booked (set status to true) if booking is active
    const now = new Date();
    const bookingStart = new Date(booking.start);
    const bookingEnd = new Date(booking.end);

    if (now >= bookingStart && now <= bookingEnd && booking.checked_in) {
      await RoomNumber.update(
        { status: true },
        { where: { _id: new_room_id }, transaction: t }
      );
    }

    // Commit transaction
    await t.commit();

    return res.status(200).json({
      status: true,
      message: `Room successfully transferred from ${old_room_number} to ${new_room_number}`,
      data: {
        old_room: old_room_number,
        new_room: new_room_number
      }
    });

  } catch (error) {
    // Rollback transaction on error
    await t.rollback();
    console.error('Error transferring room:', error);
    return res.status(500).json({
      status: false,
      message: "Failed to transfer room: " + error.message
    });
  }
}));

// Get room transfer history
routes.get("/room-transfer-history", checkAuthCookie, expressAsyncHandler(async (req, res) => {
  const { reference_id } = req.query;

  console.log('🔍 Fetching transfer history for reference_id:', reference_id);

  let whereClause = {};
  if (reference_id) {
    whereClause.booking_reference = reference_id;
  }

  const transfers = await RoomTransfer.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']]
  });

  console.log('📊 Found transfers:', transfers.length);

  return res.status(200).json({
    status: true,
    data: {
      transfers: transfers
    }
  });
}));

// Get room transfer history page
routes.get("/room-transfers", checkAuthCookie, async (req, res) => {
  const transfers = await RoomTransfer.findAll({
    order: [['createdAt', 'DESC']],
    limit: 100
  });

  res.render('room-transfers', {
    name: req.user.name,
    email: req.user.email,
    roleName: req.user.roleName,
    transfers: transfers
  });
});



module.exports = routes