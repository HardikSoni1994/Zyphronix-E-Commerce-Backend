const express = require("express");
const { registerUser, loginUser, fetchAllUser, forgetPassword } = require("../../../controllers/auth/user/user.controller");
const { userAuthMiddleware } = require("../../../middlewares/auth.middleware");

const userRoute = express.Router();

userRoute.post("/register", registerUser);
userRoute.post("/login", loginUser);
userRoute.get("/fetchAllUser", userAuthMiddleware, fetchAllUser);
userRoute.post("/forget-password", forgetPassword);

module.exports = userRoute;
