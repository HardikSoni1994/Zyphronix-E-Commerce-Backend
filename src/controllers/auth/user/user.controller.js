const UserAuthServices = require("../../../services/auth/user/user.service");
const { MSG } = require("../../../utils/msg");
const { errorResponse, successResponse } = require("../../../utils/response");
const statusCode = require('http-status-codes');
const moment = require("moment");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const sendotpmailer = require('../../../utils/mailer');

const UserAuthService = new UserAuthServices();

module.exports.registerUser = async (req, res) => {
  try {
    console.log(req.body);
    console.log("=== Register User successfully ===");

    req.body.password = await bcrypt.hash(String(req.body.password), 10);

    req.body.create_at = moment().format("DD/MM/YYYY, hh:mm:ss a");
    req.body.update_at = moment().format("DD/MM/YYYY, hh:mm:ss a");

    const newUser = await UserAuthService.registerUser(req.body);

    if (!newUser) {
      return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.USER_REGISTRATION_FAILED));
    }
    return res.status(statusCode.CREATED).json(successResponse(statusCode.CREATED, false, MSG.USER_REGISTRATION_SUCCESS, newUser),
      );
  } catch (error) {
    console.log("Error :", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    const user = await UserAuthService.singleUser({email: req.body.email});
    
    if (!user) {
      return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, MSG.USER_NOT_FOUND));
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    
    if (!isPasswordValid) {
      return res.status(statusCode.UNAUTHORIZED).json(errorResponse(statusCode.UNAUTHORIZED, true, MSG.USER_LOGIN_FAILED));
    }

    // JWT Token Generate Logic
    const payload = {
      userId: user._id,
      email: user.email,
      role: "user"
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7D"} );

    return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.USER_LOGIN_SUCCESS, user, {token}));
    
  } catch (error) {
    console.log("Error :", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
  }
};

module.exports.fetchAllUser = async (req, res) => {
  try {
    const users = await UserAuthService.fetchAllUser();
    
    if(!users || users.length === 0){
        return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, "No users found"));
    }

    return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, "All users Fetched Successfully", users));
  } catch (error) {
    console.log("Error :", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
  }
};

// 🔑 FORGOT PASSWORD & OTP LOGIC
module.exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await UserAuthService.singleUser({ email: email });
    
    if (!user) {
      return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, MSG.USER_NOT_FOUND));
    }

    // OTP Math logic
    const otp = Math.floor(1000 + Math.random() * 9999);
    console.log("Generated OTP:", otp);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Zyphronix E-Commerce - Password Reset OTP",
        html: `
            <h3>Hello ${user.first_name},</h3>
            <p>Your OTP for password reset is: <b>${otp}</b></p>
            <p>Please do not share this OTP with anyone.</p>
        `
    };

    sendotpmailer.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Email sending Error:", error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Failed to send OTP email"));
        }
        
        return res.status(statusCode.OK).json(
            successResponse(statusCode.OK, false, "OTP sent successfully to your email", { email, otp }) 
        );
    });

  } catch (error) {
    console.log("Forgot Password Error:", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
  }
};