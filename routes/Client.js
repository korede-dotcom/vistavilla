const routes = require("express").Router()
const managerControl = require("../controllers/Eventmanager")
const Gym = require("../controllers/Gymmanager")
const client = require("../controllers/Client")
const Hotel = require("../controllers/Hotelmanager")
const {bookEvent} = require("../middleware/validator")
const roomRepo = require("../repos/Room-repo")
const SendEmail = require("../utils/sendEmail")

routes.get("/event/pkg",managerControl.active)
        .get("/gym/pkg",Gym.getactivePkgs)
        .get("/",Hotel.clientHotelRoom)
        .get("/show-room",Hotel.showRoom)
        .get("/hotel/pkg",Hotel.clientHotelRoom)
        .get("/validate/date",client.validatedate)
        .post("/book/event",managerControl.bookForClient)
        .post("/check-availability",Hotel.GetAvailability)
        .get("/available-rooms",Hotel.clientRoomAvailable)
        .get("/rooms",Hotel.clientRoom)
        .get("/terms-and-conditions",Hotel.clientTerms)
        .get("/room-report",Hotel.roomReport)
        .get("/result",Hotel.paymentResult)
        .get("/page-contact",Hotel.contact)
        .get("/gallery",Hotel.gallery)
        .post("/send-email",async(req,res) => {
                const {subject,email:to,message} = req.body;
                
                await SendEmail(subject,message,message,require('../config/mail')().inbox,{ replyTo: to })
                await SendEmail(subject,"Your email has been received. We will reach out to you shortly.","Your email has been received. We will reach out to you shortly.",to)
                return res.json({message: "Email sent successfully",status:true,})
        })
        // .post("/bookroom",protect ,checkHotelStatus,hotemanagerControl.bookRoom)


module.exports = routes