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
    const user = await UserAuthService.singleUser({email: req.body.email, isDelete: false, isActive: true});
    
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

// FORGET PASSWORD & OTP LOGIC
module.exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await UserAuthService.singleUser({ email: email, isDelete: false, isActive: true });
    if (!user) {
      return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, "User not found with this email"));
    }

    let currentAttempt = user.attempt || 0; 
    let currentExpire = user.attempt_Expire || null;

    if (currentAttempt >= 3) {
        if (currentExpire && new Date(currentExpire) > new Date()) {
            return res.status(statusCode.TOO_MANY_REQUESTS).json(
                errorResponse(statusCode.TOO_MANY_REQUESTS, true, "Aapne 3 baar try kar liya hai. Kripya 60 minute baad try karein.")
            );
        } else {
            currentAttempt = 0;
            currentExpire = null;
        }
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expireOTPTime = new Date(Date.now() + 1000 * 60 * 2);

    currentAttempt++; 
    if (currentAttempt >= 3) {
        currentExpire = new Date(Date.now() + 1000 * 60 * 60); 
    }

    await UserAuthService.updateUser(user._id, { 
        OTP: otp, 
        OTPExpire: expireOTPTime, 
        attempt: currentAttempt, 
        attempt_Expire: currentExpire 
    });

    console.log("Generated User OTP:", otp);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Zyphronix E-Commerce - User Password Reset OTP",
        html: `
            <h3>Hello ${user.first_name},</h3>
            <p>Your User OTP for password reset is: <b style="font-size: 20px; color: blue;">${otp}</b></p>
            <p>This OTP is valid for exactly <b>2 minutes</b>.</p>
        `
    };

    sendotpmailer.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Email Bhejne Mein Error:", error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Failed to send OTP email"));
        }
        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, "OTP sent successfully", { email, otp }));
    });

  } catch (error) {
    console.log("User Forget Password Error:", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Internal Server Error"));
  }
};

// 🛡️ USER VERIFY OTP
module.exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await UserAuthService.singleUser({ email: email, isDelete: false, isActive: true });
    if (!user) return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, "User not found"));

    let currentVerifyAttempt = user.verify_attempt || 0;
    let currentVerifyExpire = user.verify_attempt_expire || null;

    if (currentVerifyAttempt >= 3) {
        if (currentVerifyExpire && new Date(currentVerifyExpire) > new Date()) {
            return res.status(statusCode.TOO_MANY_REQUESTS).json(errorResponse(statusCode.TOO_MANY_REQUESTS, true, "3 baar galat OTP daala hai. Kripya thodi der baad try karein."));
        } else {
            currentVerifyAttempt = 0;
            currentVerifyExpire = null;
        }
    }

    if (user.OTPExpire && new Date(user.OTPExpire) < new Date()) {
        return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "OTP expire ho chuka hai. Naya OTP mangwayein."));
    }

    if (user.OTP !== Number(otp)) {
        currentVerifyAttempt++; 
        if (currentVerifyAttempt >= 3) currentVerifyExpire = new Date(Date.now() + 1000 * 60 * 60); 

        await UserAuthService.updateUser(user._id, { verify_attempt: currentVerifyAttempt, verify_attempt_expire: currentVerifyExpire });
        return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, `Galat OTP! Remaining attempts: ${3 - currentVerifyAttempt}`));
    }

    await UserAuthService.updateUser(user._id, { OTP: 0, OTPExpire: null, attempt: 0, attempt_Expire: null, verify_attempt: 0, verify_attempt_expire: null });

    return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, "OTP Verified Successfully!", { email }));

  } catch (error) {
    console.log("User Verify OTP Error:", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Internal Server Error"));
  }
};

// ==========================================
// 🔐 USER RESET PASSWORD
// ==========================================
module.exports.resetPassword = async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "Passwords match nahi ho rahe!"));

    const user = await UserAuthService.singleUser({ email: email, isDelete: false, isActive: true });
    if (!user) return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, "User not found"));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await UserAuthService.updateUser(user._id, { password: hashedPassword });

    return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, "Password reset successfully! Ab aap login kar sakte hain.", { email }));

  } catch (error) {
    console.log("User Reset Password Error:", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, "Internal Server Error"));
  }
};

// 👥 GET ALL USERS LOGIC (ONLY FOR ADMIN)
module.exports.fetchAllUser = async (req, res) => {
    try {
        // Sirf unhi users ko nikalenge jo delete nahi hue hain
        const users = await UserAuthService.fetchAllUser({ isDelete: false });

        if (!users || users.length === 0) {
            return res.status(statusCode.NOT_FOUND).json(errorResponse(statusCode.NOT_FOUND, true, "No users found"));
        }

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, "All Users Fetched Successfully", users));

    } catch (error) {
        console.log("Fetch All Users Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
    }
};

// 🧑‍💻 GET USER PROFILE LOGIC (ONLY FOR LOGGED-IN USER)
module.exports.userProfile = async (req, res) => {
    try {
        // Middleware ne already req.user mein data daal diya hai
        const user = req.user; 

        return res.status(statusCode.OK).json(
            successResponse(statusCode.OK, false, MSG.USER_PROFILE_SUCCESS, user)
        );
    } catch (error) {
        console.log("User Profile Error : ", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(
            errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR)
        );
    }
};

// 🔐 CHANGE PASSWORD LOGIC (FOR LOGGED-IN USER)
module.exports.changePassword = async (req, res) => {
    try {
        // 1. Database se user nikalo (req.user middleware se aa raha hai)
        const user = await UserAuthService.singleUser({ _id: req.user._id });

        if (!user) {
             return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "User not found"));
        }

        // 2. Current password check karo
        const isPasswordMatch = await bcrypt.compare(req.body.current_password, user.password);

        if (!isPasswordMatch) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.CHANGE_PASSWORD_FAILED));
        }

        // 3. Naya password hash karo
        const hashedNewPassword = await bcrypt.hash(req.body.new_password, 11);

        // 4. Database mein update karo
        await UserAuthService.updateUser(req.user._id, { password: hashedNewPassword });

        // 5. Success response bhejo
        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, MSG.CHANGE_PASSWORD_SUCCESS));

    } catch (err) {
        console.log("User Change Password Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
    }
};

// 🚫 BLOCK / UNBLOCK USER LOGIC (ONLY FOR ADMIN)
module.exports.toggleUserStatus = async (req, res) => {
    try {
        // Guard clause: Agar koi normal user (customer) isko hit kare, toh bhaga do!
        // Sirf Admin allow hona chahiye
        if (req.user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, MSG.UNAUTHORIZED_ACCESS));
        }

        const userId = req.query.id;

        // 1. User ko database se nikaalo
        const user = await UserAuthService.singleUser({ _id: userId, isDelete: false });

        if (!user) {
            return res.status(statusCode.BAD_REQUEST).json(errorResponse(statusCode.BAD_REQUEST, true, "User not found"));
        }

        // 2. Status Toggle karo (Active hai toh Inactive, Inactive hai toh Active)
        const updatedUser = await UserAuthService.updateUser(
            userId,
            { isActive: !user.isActive }
        );

        // 3. Dynamic Message (Blocked ya Unblocked)
        const statusMessage = `${user.first_name} ${user.last_name} is now ${updatedUser.isActive ? 'Active (Unblocked)' : 'Inactive (Blocked)'}`;

        return res.status(statusCode.OK).json(successResponse(statusCode.OK, false, statusMessage, updatedUser));

    } catch (err) {
        console.log("Toggle User Status Error : ", err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json(errorResponse(statusCode.INTERNAL_SERVER_ERROR, true, MSG.INTERNAL_SERVER_ERROR));
    }
};