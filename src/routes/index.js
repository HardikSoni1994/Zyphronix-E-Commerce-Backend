const express = require("express");
const { adminAuthMiddleware, userAuthMiddleware } = require("../middlewares/auth.middleware");

const route = express.Router();

route.use("/auth", require("./auth/auth.route"));

// Auth Middleware
route.use('/admin', adminAuthMiddleware, require('./auth/admin/admin.route'));
route.use('/user', userAuthMiddleware, require('./auth/user/user.route'));

route.use('/admin', require('./auth/admin/admin.route'));
route.use('/user', require('./auth/user/user.route'));
route.use('/category', adminAuthMiddleware, require('./category/category.route'));

module.exports = route;
