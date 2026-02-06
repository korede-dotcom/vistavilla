const hotelConfigRepository = require("../repos/Room-repo")
const asynchandler = require("express-async-handler")
const cloudinaryRepo = require("../repos/cloudinary");
const cloudinary = require('cloudinary').v2;
const RoomNumber = require("../models/RoomNumbers");
const Room = require("../models/Room");
const HotelBooking = require("../models/HotelBooking");
const { Op,Sequelize } = require("sequelize");
const moment = require("moment");
const sequelize = require("sequelize");
const Marque = require("../models/Marque");
const axios = require("axios");
const connectDB = require("../config/connectDB");

const getPkgs = asynchandler( async (req,res) => {
    
    const pkgs = await hotelConfigRepository.findAll()
    return res.status(200).json({
        message:"hotel pkgs fetched",
        data:{
            pkgs
        }
    })
});

const getActivePkgs = asynchandler( async (req,res) => {
    if(req.user.role_id !== 1){
        const pkgs = await hotelConfigRepository.findAllApproveByBranch(parseInt(req.user.branch))
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
        
    }else{
        const pkgs = await hotelConfigRepository.findAllApprove()
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
    }
});

const getAavailableRoom = asynchandler( async (req,res) => {
    if(req.user.role_id !== 1){
        const pkgs = await hotelConfigRepository.findAvailableRooms(parseInt(req.user.branch))
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
        
    }else{
        const pkgs = await hotelConfigRepository.findAvailableRoomsGeneral()
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
    }
});

const getBookings = asynchandler( async (req,res) => {
    if(req.user.role_id !== 1){
        const pkgs = await hotelConfigRepository.BranchBookings(parseInt(req.user.branch))
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
        
    }else{
        const pkgs = await hotelConfigRepository.Bookings()
        console.log("🚀 ~ file: Hotelmanager.js:70 ~ getBookings ~ pkgs:", pkgs)
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
    }
});



const showRoom = asynchandler(async (req,res) => {

    cloudinary.config({
        cloud_name: process.env.cloud_name,
        api_key: process.env.api_key,
        api_secret: process.env.api_secret,
      });
    
        try {
          const result = await cloudinary.search
            .expression(`folder:${process.env.folder_name}`) // Specify the folder
            .sort_by('created_at', 'desc') // Optional: sort by creation date
            .max_results(100) // Adjust the limit as needed
            .execute();
      
          const images = result.resources.map((img) => img.secure_url); // Get image URLs
          console.log("🚀 ~ showRoom ~ images:", images.length)
          res.render('show', { images });
        } catch (error) {
          console.error('Error fetching images from Cloudinary:', error);
          res.status(500).send('Error fetching images');
        }
    

})
const clientHotelRoom = asynchandler(async (req,res) => {
    const pkgs = await hotelConfigRepository.roomCategorys()
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss'); // Ensure correct format

    const activeMarquees = await Marque.findOne({
      where: {
        startTime: {
          [Op.lte]: currentTime // current time <= startTime
        },
        endTime: {
          [Op.gte]: currentTime // current time >= endTime
        }
      }
    });

    console.log("🚀 ~ clientHotelRoom ~ activeMarquees:", activeMarquees);

    // Get active pricing configurations
    const PricingConfig = require('../models/PricingConfig');
    const activePricingConfigs = await PricingConfig.findAll({
      where: {
        is_active: true,
        start_date: {
          [Op.lte]: new Date()
        },
        end_date: {
          [Op.gte]: new Date()
        }
      }
    });

    // Apply special pricing to packages if available
    const pkgsWithPricing = pkgs.map(pkg => {
      // Skip if pkg is null or undefined
      if (!pkg) return null;

      // Get the base data (handle both Sequelize instances and plain objects)
      const baseData = pkg.dataValues || pkg;

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

      // Return consistent plain object structure
      return {
        ...baseData,
        hasSpecialPrice: false
      };
    }).filter(pkg => pkg !== null); // Remove any null entries


// console.log("🚀 ~ clientHotelRoom ~ activeMarquees:", activeMarquees);


   return res.render('index', {
        pkgs: pkgsWithPricing,
        activeMarquees:activeMarquees
      });
})

const contact = asynchandler(async (req,res) => {

    const currentTime = new Date();

    // Fetch marquees where the current time is between start and end times

    const activeMarquees = await Marque.findOne({
      where: {
        startTime: {
          [Op.lte]: currentTime  // Less than or equal to current time
        },
        endTime: {
          [Op.gte]: currentTime   // Greater than or equal to current time
        }
      }
    });
    return res.render('page-contact',{activeMarquees:activeMarquees});
})

const gallery = asynchandler(async (req,res) => {
    const currentTime = new Date();

    // Fetch marquees where the current time is between start and end times
    const activeMarquees = await Marque.findOne({
      where: {
        startTime: {
          [Op.lte]: currentTime
        },
        endTime: {
          [Op.gte]: currentTime
        }
      }
    });

    // Configure Cloudinary
    cloudinary.config({
        cloud_name: process.env.cloud_name,
        api_key: process.env.api_key,
        api_secret: process.env.api_secret,
    });

    try {
        // Fetch all images from Cloudinary folder
        const result = await cloudinary.search
            .expression(`folder:${process.env.folder_name}`)
            .sort_by('created_at', 'desc')
            .max_results(500) // Get up to 500 images
            .execute();

        const images = result.resources.map((img) => ({
            url: img.secure_url,
            public_id: img.public_id,
            width: img.width,
            height: img.height,
            created_at: img.created_at
        }));

        console.log("🚀 ~ gallery ~ Total images fetched:", images.length);

        return res.render('page-gallery', {
            images: images,
            activeMarquees: activeMarquees
        });
    } catch (error) {
        console.error('Error fetching images from Cloudinary:', error);
        return res.render('page-gallery', {
            images: [],
            activeMarquees: activeMarquees
        });
    }
})

const paymentResult = asynchandler(async (req, res) => {
    console.log("===========", req.query);

        const findBookings = await HotelBooking.findOne({
            where: { reference_id: req.query.reference.toString().trim() }
        });
        if (!findBookings) {
            return res.redirect('/');  
        }

        const { reference } = req.query;
  
        try {
          const response = await axios.get(
            `${process.env.paystackUrl}/transaction/verify/${reference}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.paystackSecretKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          console.log("🚀 ~ res.status ~ response.data.data:", response.data.data.status,response.data.data.data)
          if (response.data.data.status !== "success") {
            return res.render("failed", { booking:findBookings });  
          }
          
          return res.render("success", { booking:findBookings });  
        }catch(error){
            console.log("🚀 ~ paymentResult ~ error:", error)
            return res.render("failed", { booking:findBookings });  
        }
       
    //     const booking = findBookings;
    //       console.log("🚀 ~ paymentResult ~ booking:", booking.status)
    //       if (booking.status === "success") {
    //         return res.render("failed", { booking:booking });  
    //       }
          
    //     console.log("Booking object:", booking); // Log the booking object to verify its structure
        
    //    return res.render("success", { booking:booking });  

  })

const clientRoomAvailable = asynchandler(async (req, res) => {
    const { id, data,start,end } = req.query;

    // Split the data string into an array of room numbers
    const roomNumbers = data?.split(',');

    // Ensure RoomNumber knows about its relationship to Room
    RoomNumber.belongsTo(Room, { foreignKey: 'category_id',targetKey:"_id" });

    // Query all RoomNumbers that match any of the room numbers in the array
    const totalRooms = await RoomNumber.findAll({
        where: {
            room_number: {
                [Sequelize.Op.in]: roomNumbers // Use Sequelize's $in operator
            },
            category_id:id
        },
        include: [{
            model: Room
        }]
    });

    const selectedRoomNumber = totalRooms[0];
    const dates = {
        start,
        end
    }

    const currentTime = new Date();

    // Fetch marquees where the current time is between start and end times

    const activeMarquees = await Marque.findOne({
      where: {
        startTime: {
          [Op.lte]: currentTime  // Less than or equal to current time
        },
        endTime: {
          [Op.gte]: currentTime   // Greater than or equal to current time
        }
      }
    });

    // Get active pricing configurations
    const PricingConfig = require('../models/PricingConfig');
    const activePricingConfigs = await PricingConfig.findAll({
      where: {
        is_active: true,
        start_date: {
          [Op.lte]: new Date()
        },
        end_date: {
          [Op.gte]: new Date()
        }
      }
    });

    // Fetch room-specific images (if room_id column exists)
    const Images = require('../models/Images');
    let roomImages = [];
    if (selectedRoomNumber && selectedRoomNumber._id) {
      try {
        roomImages = await Images.findAll({
          where: {
            for: 'hotelroom',
            room_id: selectedRoomNumber._id,
            status: true
          },
          order: [['_id', 'DESC']]
        });
      } catch (error) {
        // If room_id column doesn't exist, just use empty array
        console.log('Room-specific images not available:', error.message);
        roomImages = [];
      }
    }

    // Apply special pricing to the room if available
    let roomWithPricing = selectedRoomNumber;
    if (selectedRoomNumber && selectedRoomNumber.Room) {
      const specialPricing = activePricingConfigs.find(config => {
        const configCategoryId = config.dataValues ? config.dataValues.category_id : config.category_id;
        return configCategoryId === parseInt(id);
      });

      const roomData = selectedRoomNumber.Room.dataValues || selectedRoomNumber.Room;

      if (specialPricing) {
        const pricingData = specialPricing.dataValues || specialPricing;
        roomWithPricing = {
          ...selectedRoomNumber.dataValues,
          roomcategory: {
            ...roomData,
            originalPrice: roomData.price,
            price: parseFloat(pricingData.special_price),
            hasSpecialPrice: true,
            pricingEndDate: pricingData.end_date
          },
          roomImages: roomImages.map(img => img.url) // Add room-specific images
        };
      } else {
        roomWithPricing = {
          ...selectedRoomNumber.dataValues,
          roomcategory: {
            ...roomData,
            hasSpecialPrice: false
          },
          roomImages: roomImages.map(img => img.url) // Add room-specific images
        };
      }
    }

    return res.render('room-details', {
      totalRooms: totalRooms,
      name:"ddd",
      selectedRoomNumber:roomWithPricing,
      start:start,
      end:end,
      activeMarquees:activeMarquees
    });
});

const clientRoom = asynchandler(async (req, res) => {
    const currentTime = new Date();

    // Fetch marquees where the current time is between start and end times

    const activeMarquees = await Marque.findOne({
      where: {
        startTime: {
          [Op.lte]: currentTime  // Less than or equal to current time
        },
        endTime: {
          [Op.gte]: currentTime   // Greater than or equal to current time
        }
      }
    });

    // Get active pricing configurations
    const PricingConfig = require('../models/PricingConfig');
    const activePricingConfigs = await PricingConfig.findAll({
      where: {
        is_active: true,
        start_date: {
          [Op.lte]: new Date()
        },
        end_date: {
          [Op.gte]: new Date()
        }
      }
    });

    console.log("🚀 ~ clientRoom ~ activePricingConfigs:", activePricingConfigs.length);

    if (req.query.id) {
        const { id } = req.query;
        const category = await Room.findOne({where:{_id:id}});
        const count = await RoomNumber.count({where:{category_id:id}});

        // Check if this category has special pricing
        const specialPricing = activePricingConfigs.find(config => {
          const configCategoryId = config.dataValues ? config.dataValues.category_id : config.category_id;
          return configCategoryId === parseInt(id);
        });

        console.log("🚀 ~ clientRoom ~ category_id:", id);
        console.log("🚀 ~ clientRoom ~ specialPricing:", specialPricing ? (specialPricing.dataValues || specialPricing) : null);

        let categoryData = category.dataValues || category;

        if (specialPricing) {
          const pricingData = specialPricing.dataValues || specialPricing;
          categoryData = {
            ...categoryData,
            originalPrice: categoryData.price,
            price: parseFloat(pricingData.special_price),
            hasSpecialPrice: true,
            pricingEndDate: pricingData.end_date
          };
        } else {
          categoryData = {
            ...categoryData,
            hasSpecialPrice: false
          };
        }

        console.log("🚀 ~ clientRoom ~ categoryData:", categoryData);

        return res.render('room-details-one', {
          category: categoryData,
          count,
          activeMarquees:activeMarquees
        });
    }

    const categories = await Room.findAll({});

    // Apply special pricing to all categories
    const categoriesWithPricing = categories.map(cat => {
      if (!cat) return null;

      const baseData = cat.dataValues || cat;
      const specialPricing = activePricingConfigs.find(config => {
        const configCategoryId = config.dataValues ? config.dataValues.category_id : config.category_id;
        return configCategoryId === baseData._id;
      });

      if (specialPricing) {
        const pricingData = specialPricing.dataValues || specialPricing;
        console.log("🚀 ~ Found special pricing for category:", baseData._id, "Price:", pricingData.special_price);
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

    console.log("🚀 ~ clientRoom ~ categoriesWithPricing:", categoriesWithPricing.map(c => ({id: c._id, hasSpecial: c.hasSpecialPrice, price: c.price})));

    return res.render('rooms', {
      categories: categoriesWithPricing,
      activeMarquees:activeMarquees
    });

    // Room.belongsTo(RoomNumber,{foreignKey:'_id',targetKey:"category_id" });


});
const clientTerms = asynchandler(async (req, res) => {
    

    return res.render('terms');

    // Room.belongsTo(RoomNumber,{foreignKey:'_id',targetKey:"category_id" });

   
});
const roomReport = asynchandler(async (req, res) => {
    

    return res.render('items');

    // Room.belongsTo(RoomNumber,{foreignKey:'_id',targetKey:"category_id" });

   
});





const GetAvailability = asynchandler(async (req, res) => {
    let { category_id, start, end } = req.query;
    console.log("🚀 ~ GetAvailability ~ end:", end)
    console.log("🚀 ~ GetAvailability ~ start:", start)

    // Get the current date in the format 'YYYY-MM-DD'
    const currentDate = moment().format("YYYY-MM-DD");

    // Parse the start date
    let startDate = moment(start, "DD-MM-YYYY").format("YYYY-MM-DD");

    // Check if the start date is in the past
    if (moment(startDate).isBefore(currentDate)) {
        return res.json({
            message: "Start date cannot be in the past. Please select a valid date.",
            status: false
        });
    }

    // Parse the end date
    const endDate = moment(end, "DD-MM-YYYY").format("YYYY-MM-DD");

    // Find the total number of rooms in the category
    const totalRooms = await RoomNumber.count({
        where: { category_id }
    });

    // Find the number of rooms already booked that overlap with the given date range
    const bookedRooms = await HotelBooking.count({
        where: {
            category_id,
            status: {
                [Op.in]: ["success", "part-payment"]
            },
            [Op.or]: [
                {
                    start: {
                        [Op.between]: [
                            Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`),
                            Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                        ]
                    }
                },
                {
                    end: {
                        [Op.between]: [
                            Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`),
                            Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                        ]
                    }
                },
                {
                    [Op.and]: [
                        {
                            start: {
                                [Op.lte]: Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                            }
                        },
                        {
                            end: {
                                [Op.gte]: Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                            }
                        }
                    ]
                }
            ]
        }
    });

    const availableRooms = totalRooms - bookedRooms;

    // First, get all booked room IDs for the date range
    const bookedRoomIds = await HotelBooking.findAll({
        where: {
            category_id,
            status: {
                [Op.in]: ["success", "part-payment"]
            },
            [Op.or]: [
                {
                    start: {
                        [Op.between]: [
                            Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`),
                            Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                        ]
                    }
                },
                {
                    end: {
                        [Op.between]: [
                            Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`),
                            Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                        ]
                    }
                },
                {
                    [Op.and]: [
                        {
                            start: {
                                [Op.lte]: Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                            }
                        },
                        {
                            end: {
                                [Op.gte]: Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`)
                            }
                        }
                    ]
                }
            ]
        },
        attributes: ['room_id']
    });

    const bookedIds = bookedRoomIds.map(booking => booking.room_id).filter(id => id != null);

    // Fetch details of available rooms that are not booked in the given date range
    // Also exclude retained rooms for the given date range
    const availableRoomDetails = await RoomNumber.findAll({
        where: {
            category_id,
            _id: {
                [Op.notIn]: bookedIds.length > 0 ? bookedIds : [-1] // Use -1 if no bookings to avoid empty array
            },
            [Op.or]: [
                { is_retained: false },
                { is_retained: null },
                {
                    [Op.and]: [
                        { is_retained: true },
                        {
                            [Op.or]: [
                                { retained_to: { [Op.lt]: Sequelize.literal(`TO_TIMESTAMP('${startDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`) } },
                                { retained_from: { [Op.gt]: Sequelize.literal(`TO_TIMESTAMP('${endDate} 12:00:00+01', 'YYYY-MM-DD HH24:MI:SS')`) } }
                            ]
                        }
                    ]
                }
            ]
        }
    });


    if (availableRoomDetails.length) {
        return res.json({
            message: "Yay! We found you a room",
            status: true,
            data: {
                availableRooms,
                availableRoomDetails,
                totalRooms,
                bookedRooms,
                category_id,
                
            }
        });
    }

    return res.json({
        message: "No room available for this category you might want to check from our other nice category of rooms instead",
        status: false,
        start,
        end,
        data: {
            
            availableRooms,
            availableRoomDetails,
            totalRooms,
            bookedRooms,
            category_id
        }
    });
});

const GetAvailabilityToday = asynchandler(async (req, res) => {
    // Get the current date in the format 'YYYY-MM-DD'
        const currentDate = moment().format("YYYY-MM-DD");

        // Find the categories and count of all rooms within each category
        const categories = await Category.findAll({
            include: [{
                model: Room,
                attributes: []
            }],
            attributes: {
                include: [
                    [sequelize.fn('COUNT', sequelize.col('Rooms.id')), 'totalRooms']
                ]
            },
            group: ['Category.id']
        });

        // Find all bookings for today
        const bookings = await Booking.findAll({
            where: {
                [Op.or]: [
                    {
                        start: {
                            [Op.lte]: moment().endOf('day').toDate()
                        }
                    },
                    {
                        end: {
                            [Op.gte]: moment().startOf('day').toDate()
                        }
                    }
                ]
            }
        });

        // Map booked room IDs
        const bookedRoomIds = bookings.map(booking => booking.roomId);

        // Get available rooms that are not booked for today, grouped by category
        const availableRooms = await Room.findAll({
            where: {
                id: {
                    [Op.notIn]: bookedRoomIds
                }
            },
            include: [
                {
                    model: Category,
                    attributes: ['name']
                }
            ]
        });

        // Format the response
        const result = categories.map(category => {
            const roomsInCategory = availableRooms.filter(room => room.categoryId === category.id);
            return {
                category: category.name,
                totalRooms: category.get('totalRooms'),
                availableRooms: roomsInCategory.length
            };
        });

        if (result.length) {
            return res.json({
                message: "Available rooms for today",
                status: true,
                data: result
            });
        }

        return res.json({
            message: "No rooms available today",
            status: false,
            data: result
        });
});





const getPendingPkgs = asynchandler( async (req,res) => {
    if(req.user){
        const pkgs = await hotelConfigRepository.findAllPendingByBranch(req.user.branch)
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })
    }else{
        const pkgs = await hotelConfigRepository.findAllPending()
        return res.status(200).json({
            message:"hotel pkgs fetched",
            data:{
                pkgs
            }
        })

    }
});

const approve = asynchandler( async (req,res) => {
    if(!req.query.id){
        return res.status(400).json({
            status:false,
            message:"please pass id",
        
        })
    }
    const pkgs = await hotelConfigRepository.approve(req.query.id)
    return res.status(200).json({
        message:"hotel pkgs fetched",
        data:{
            pkgs
        }
    })
});

const createhotelpkg = asynchandler(async (req,res) => {
 
  const upload = await cloudinaryRepo.uploadMany(req.files)
  console.log("🚀 ~ file: Hotelmanager.js:77 ~ createhotelpkg ~ upload:", upload)
   const imageObject = upload.map(url => {
       return {        
           secure_url: url.secure_url,
           url:url.url
           
       }

   });

//    if(req.user.role_id === 1){
//     const createeventpackage = await hotelConfigRepository.create({...req.body,branch_id:req.body.branch,status:true,picture:[...imageObject.map(r => r.secure_url)]})
//     return res.status(200).json({
//         status:true,
//         message:"hotel roomn created ",
//         data:{
//             createeventpackage
//         }
//     })
//    }

    const createeventpackage = await hotelConfigRepository.create({...req.body,status:false,picture:[...imageObject.map(r => r.secure_url)]})
    return res.status(200).json({
        status:true,
        message:"hotel roomn created ",
        data:{
            createeventpackage
        }
    })
});

const createhotelpkgCat = asynchandler(async (req,res) => {
 
//   const upload = await cloudinaryRepo.uploadMany(req.files)
//   console.log("🚀 ~ file: Hotelmanager.js:77 ~ createhotelpkg ~ upload:", upload)
//    const imageObject = upload.map(url => {
//        return {        
//            secure_url: url.secure_url,
//            url:url.url
           
//        }

//    });

//    if(req.user.role_id === 1){
//     const createeventpackage = await hotelConfigRepository.create({...req.body,branch_id:req.body.branch,status:true,picture:[...imageObject.map(r => r.secure_url)]})
//     return res.status(200).json({
//         status:true,
//         message:"hotel roomn created ",
//         data:{
//             createeventpackage
//         }
//     })
//    }

console.log("🚀 ~ createhotelpkgCat ~ req.body.imageUrls:", req.body.imageUrls)
    const createeventpackage = await hotelConfigRepository.create(req.body)
    return res.status(200).json({
        status:true,
        message:"hotel roomn created ",
        data:{
            createeventpackage
        }
    })
});

const createRoomUnderCat =  asynchandler(async (req,res) => {
    const findCategory = await  hotelConfigRepository.findById(req.body.category_id);
    if (!findCategory) {
       return res.status(400).json({
            status: false,
            message: "Category not found"
        })
    }
    const roomnumber = await hotelConfigRepository.createRoomUnderCat({...req.body})
    return res.status(200).json({
        message:"room created under category ",
        data:{
            roomnumber
        }
    })
})


const getAllcategories = asynchandler(async (req, res) =>{
    const categories = await hotelConfigRepository.roomCategorys()
    return res.status(200).json({
        message:"hotel categories fetched",
        data:{
            categories
        }
    })
})

const updatehotelmpkg = asynchandler( async (req,res) => {
    const createeventpackage = await hotelConfigRepository.update(req.query.id,{...req.body,status:false})
    return res.status(200).json({
        message:"event hotel package updated ",
        data:{
            createeventpackage
        }
    })
});

const bookRoom = asynchandler (async (req,res) => {
    const createeventpackage = await hotelConfigRepository.RoomBook(req.body)
    return res.status(200).json({
        message:"event hotel package updated ",
        data:{
            createeventpackage
        }
    })
})



module.exports = {
    getPkgs,
    createhotelpkg,
    updatehotelmpkg,
    getActivePkgs,
    getPendingPkgs,
    approve,
    clientHotelRoom,
    getAavailableRoom,
    getBookings,
    bookRoom,
    createRoomUnderCat,
    getAllcategories,
    GetAvailability,
    clientRoomAvailable,
    paymentResult,
    GetAvailabilityToday,
    clientRoom,
    contact,
    gallery,
    createhotelpkgCat,
    clientTerms,
    roomReport,
    showRoom
};


