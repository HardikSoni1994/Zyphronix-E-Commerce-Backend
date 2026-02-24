const jwt = require("jsonwebtoken");
const { MSG } = require("../utils/msg");
const { errorResponse } = require("../utils/response");
const statusCode = require("http-status-codes");
const AdminAuthServices = require("../services/auth/admin/admin.service");
const UserAuthServices = require("../services/auth/user/user.service");

const adminAuthService = new AdminAuthServices();
const userAuthService = new UserAuthServices();

// ADMIN AUTH MIDDLEWARE
module.exports.adminAuthMiddleware = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    
    if (!token) {
      return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.TOKEN_MISSING));
    }

    token = token.slice(7, token.length);

    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await adminAuthService.singleAdmin({ _id: decode.adminId });

    if (!admin) {
      return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.UNAUTHORIZED_ACCESS));
    }
    req.admin = admin;
    next();
  } catch (error) {
    console.log("Middleware Error:", error);
    return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.TOKEN_INVALID));
  }
};

// USER AUTH MIDDLEWARE
module.exports.userAuthMiddleware = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    
    if (!token) {
      return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.TOKEN_MISSING));
    }

    token = token.slice(7, token.length);
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    // Dhyan do: Yahan 'adminId' ki jagah 'userId' aayega
    const user = await userAuthService.singleUser({ _id: decode.userId });

    if (!user) {
      return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.UNAUTHORIZED_ACCESS));
    }

    // Yahan req.admin ki jagah req.user save karenge
    req.user = user;
    next();
  } catch (error) {
    console.log("Middleware Error:", error);
    return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.TOKEN_INVALID));
  }
};