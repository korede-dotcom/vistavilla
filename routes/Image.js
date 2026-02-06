const routes = require("express").Router()
const ImagesHandler = require("../controllers/Images")
const {createHotelConfigValidator} = require("../middleware/validator")
const {protect} = require("../repos/token-repo")
const checkAuthCookie = require("../middleware/checkAuthCookie")
const allowedUser = require("../middleware/Authorization")
const cloudinaryRepo = require("../repos/cloudinary")

// Middleware to extend timeout for image uploads
const extendTimeout = (req, res, next) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    next();
};

routes.post("/upload",extendTimeout,checkAuthCookie,allowedUser([1,2,3,4,5]),cloudinaryRepo._parser,ImagesHandler.uploadBy)
routes.get("/",checkAuthCookie,allowedUser([1,2,3,4,5]),ImagesHandler.getBy)
routes.delete("/delete",checkAuthCookie,allowedUser([1,2,3,4,5]),ImagesHandler.deleteImage)

        // .put("/update",createHotelConfigValidator,hotemanagerControl.updatehotelmpkg)
        // .get("/pkg",hotemanagerControl.getPkgs)


module.exports = routes;