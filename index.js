'use strict';

const express = require('express');
const app = express();
const routes = require('./routes/Index');
const connectDB = require('./config/connectDB');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/Error');
const cookieParser = require('cookie-parser');
const PaymentMode = require('./models/PaymentMode');
const RoomNumber = require('./models/RoomNumbers');
const HotelBooking = require('./models/HotelBooking');
const cron = require('node-cron');
const { Sequelize,Op } = require('sequelize');
const nodemailer = require('nodemailer');
const SendEmail = require('./utils/sendEmail');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const axios = require('axios');
require('dotenv').config();

app.use(cors());

const databaseReady = (async () => {
  await connectDB.authenticate().then(async () => {
    await require('./config/ensureStartupSchema')(connectDB);
    require('./middleware/activityAudit').install(connectDB);
    console.log('DB connected; application schema ready.');

    // Seed payment modes if necessary
    const paymentModes = [
      { mode: 'customer-self-payment', status: true },
      { mode: 'Generate-Bank-Transfer', status: true },
      { mode: 'Cash', status: true }
    ];
    // 0 12 * * *

    async function seed () {
        
      const seedAdmin = await User.findOne({where:{role_id:1}})
      // const hashed = await bcrypt.hash(process.env.adminPassword,10)
      if (!seedAdmin) {
          const createAdmin = await User.create({role_id:1,email:process.env.adminEmail,password:process.env.adminPassword,name:process.env.adminName})
          console.log("🚀 ~ seed ~ createAdmin:", createAdmin)
      }
  }
      await seed()

    // cron.schedule("0 12 * * *" async () => {
    //   try {
    //     const now = new Date();        
    //     const { Op } = require('sequelize');
    //     const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
        
    //     const bookings = await HotelBooking.findAll({
    //       where: {
    //         // checked_out: false,
    //         status: 'success',
    //         end: {
    //           [Op.gte]: today + 'T00:00:00.000Z',
    //           [Op.lt]: today + 'T23:59:59.999Z'
    //         }
    //       }
    //     });
    //     // console.log("🚀 ~ cron.schedule ~ bookings:", bookings)
        
        
        
    //     // Filter out bookings where end time is today but not yet expired
    //     const expiredBookings = bookings.filter(booking => {
    //       const endTime = new Date(booking.end);
    //       return endTime < now; // Ensure end time is strictly less than current time
    //     });
        
    //     console.log("Expired bookings found:", expiredBookings);
        
    //     if (expiredBookings.length > 0) {
    //       const roomNumbers = expiredBookings.map(booking => booking.room_number);
    //       console.log("🚀 ~ cron.schedule ~ roomNumbers:", roomNumbers)

    //       if (roomNumbers.length > 0) {
    //           // Update the status of all rooms in the RoomNumber table to false
    //          const updateRoom = await RoomNumber.update({ status: false }, {
    //               where: {
    //                   room_number: {
    //                       [Sequelize.Op.in]: roomNumbers,
    //                   },
    //               },
    //           });
    //          console.log("🚀 ~ cron.schedule ~ updateRoom:", updateRoom)
    //     } else {
    //       console.log("No rooms to update.");
    //     }
    //   }
        
    //   } catch (error) {
    //     console.error('Error updating room status:', error);
    //   }
    // });

    cron.schedule("0 11 * * *", async () => {
      try {
        const now = new Date();        
        const { Op } = require('sequelize');
        const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
    
        const bookings = await HotelBooking.findAll({
          where: {
            status: 'success',
            end: {
              [Op.gte]: today + 'T00:00:00.000Z',
              [Op.lt]: today + 'T23:59:59.999Z'
            }
          }
        });
    
        // Filter out bookings where end time is today but not yet expired
        const expiredBookings = bookings.filter(booking => {
          const endTime = new Date(booking.end);
          return endTime < now; // Ensure end time is strictly less than current time
        });
    
        console.log("Expired bookings found:", expiredBookings);
    
        if (expiredBookings.length > 0) {
          const roomNumbers = expiredBookings.map(booking => booking.room_number);
          console.log("Room numbers to update:", roomNumbers);
    
          if (roomNumbers.length > 0) {
            // Update the status of all rooms in the RoomNumber table to false
            const updateRoom = await RoomNumber.update({ status: false }, {
              where: {
                room_number: {
                  [Op.in]: roomNumbers,
                },
              },
            });
            console.log("Rooms updated:", updateRoom);
          } else {
            console.log("No rooms to update.");
          }
        }
      } catch (error) {
        console.error('Error updating room status:', error.stack);
      }
    });
    // djdjd


    const findAllPaymentModes = await PaymentMode.findAll();
    if (findAllPaymentModes.length === paymentModes.length) {
      console.log('Payment modes already seeded.');
    } else {
      const seedPaymentMode = await PaymentMode.bulkCreate(paymentModes);
      console.log('Payment modes seeded successfully:', seedPaymentMode);
    }

  }).catch(err => {
    throw err;
  });
})();

app.set('view engine', 'ejs');

// Override browsers requesting the old root favicon automatically.
app.get('/favicon.ico', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.redirect(302, '/images/vistavilla-app-192.png?v=3');
});

// Middleware to serve static files (like CSS, JS, images)
const staticOptions = {
  // Cache assets while keeping templates and other responses revalidated.
  setHeaders(res, filePath) {
    if (path.basename(filePath) === 'sw.js' || path.extname(filePath) === '.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(?:css|js|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
};
app.use(express.static(path.join(__dirname, 'views'), staticOptions));
// Register portal assets once, rather than adding middleware on every request.
app.use(express.static(path.join(__dirname, 'views/portal'), staticOptions));
app.use((req, res, next) => {
  if (req.path.startsWith('/portal')) {
    res.setHeader('Cache-Control', 'no-store');
    app.set('views', path.join(__dirname, 'views', 'portal'));
  } else {
    app.set('views', path.join(__dirname, 'views'));
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());







// Create a transporter object using the default SMTP transport


// Your routes here
app.use(require('./middleware/activityAudit').middleware);
app.use(routes);

// Error handling middleware
app.use(errorHandler);


// Cron job for checking and updating room status


const port = process.env.Port || 9800;

databaseReady.then(() => {
  const server = app.listen(port, () => console.log(`Server running on ${port}`));
  // Allow up to five minutes for image uploads.
  server.timeout = 300000;
  server.keepAliveTimeout = 300000;
  server.headersTimeout = 310000;
}).catch(error => {
  console.error('Startup failed; server was not started:', error.message);
  process.exit(1);
});
