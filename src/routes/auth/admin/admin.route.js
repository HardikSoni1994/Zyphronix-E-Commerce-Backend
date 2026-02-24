const express = require("express");
const { registerAdmin, loginAdmin, fetchAllAdmin, forgetPassword } = require("../../../controllers/auth/admin/admin.controller");
const { adminAuthMiddleware} = require('../../../middlewares/auth.middleware');

const adminRoute = express.Router();

adminRoute.post("/register", registerAdmin);
adminRoute.post("/login", loginAdmin);
adminRoute.get("/fetchAllAdmin", adminAuthMiddleware, fetchAllAdmin);
adminRoute.post("/forget-password", forgetPassword);

module.exports = adminRoute;