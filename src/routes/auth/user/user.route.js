const express = require("express");
const { registerUser, loginUser, fetchAllUser, forgetPassword, verifyOTP, resetPassword, userProfile, changePassword, toggleUserStatus } = require("../../../controllers/auth/user/user.controller");
const { adminAuthMiddleware} = require("../../../middlewares/auth.middleware");
const { userAuthMiddleware } = require("../../../middlewares/auth.middleware");

const userRoute = express.Router();

userRoute.post("/register", registerUser);
userRoute.post("/login", loginUser);
userRoute.post("/forget-password", forgetPassword);
userRoute.post("/verify-otp", verifyOTP);
userRoute.post("/reset-password", resetPassword);
userRoute.get('/fetchAllUser', adminAuthMiddleware, fetchAllUser);
userRoute.get('/profile', userAuthMiddleware, userProfile);
userRoute.put('/change-password', userAuthMiddleware, changePassword);
userRoute.put('/toggle-status', adminAuthMiddleware, toggleUserStatus);

module.exports = userRoute;
