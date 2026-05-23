import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodeMailer.js";

import {
  EMAIL_VERIFY_TEMPLATE,
  PASSWORD_RESET_TEMPLATE,
} from "../config/emailTemplates.js";


// ================= REGISTER =================
export const register = async (req, res) => {
  try {

    let { name, email, password } = req.body;

    // CLEAN INPUTS
    name = name?.trim();
    email = email?.trim().toLowerCase();

    // VALIDATION
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing details",
      });
    }

    // CHECK EXISTING USER
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE USER
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    // CREATE JWT TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // SAVE COOKIE
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userData: {
        name: user.name,
        isAccountVerified: user.isAccountVerified,
      },
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= LOGIN =================
export const login = async (req, res) => {
  try {

    let { email, password } = req.body;

    // CLEAN EMAIL
    email = email?.trim().toLowerCase();

    console.log("LOGIN EMAIL:", email);

    // VALIDATION
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    // FIND USER
    const user = await userModel.findOne({ email });

    console.log("FOUND USER:", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email",
      });
    }

    // CHECK PASSWORD
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    // GENERATE TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // SAVE COOKIE
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      userData: {
        name: user.name,
        isAccountVerified: user.isAccountVerified,
      },
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= LOGOUT =================
export const logout = async (req, res) => {
  try {

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= SEND VERIFY OTP =================
export const sendVerifyOtp = async (req, res) => {
  try {

    const userId = req.userId;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isAccountVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified",
      });
    }

    // GENERATE OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // SAVE OTP
    user.verifyOtp = otp;
    user.verifyOtpExpireAt =
      Date.now() + 10 * 60 * 1000;

    await user.save();

    // SEND EMAIL
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verification OTP",

      html: EMAIL_VERIFY_TEMPLATE
        .replace("{{otp}}", otp)
        .replace("{{email}}", user.email),
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= VERIFY EMAIL =================
export const verifyEmail = async (req, res) => {
  try {

    const { otp } = req.body;

    const userId = req.userId;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Missing Details",
      });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // CHECK OTP
    if (
      user.verifyOtp === "" ||
      user.verifyOtp !== otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // CHECK OTP EXPIRY
    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // VERIFY ACCOUNT
    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= CHECK AUTH =================
export const isAuthenticated = async (req, res) => {
  try {

    return res.status(200).json({
      success: true,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= SEND RESET OTP =================
export const sendResetOtp = async (req, res) => {
  try {

    let { email } = req.body;

    email = email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // FIND USER
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // GENERATE OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // SAVE OTP
    user.resetOtp = otp;

    user.resetOtpExpireAt =
      Date.now() + 15 * 60 * 1000;

    await user.save();

    // SEND EMAIL
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",

      html: PASSWORD_RESET_TEMPLATE
        .replace("{{otp}}", otp)
        .replace("{{email}}", user.email),
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  try {

    let { email, otp, newPassword } = req.body;

    console.log("RESET PASSWORD BODY:", req.body);

    email = email?.trim().toLowerCase();

    // VALIDATION
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP, and new password are required",
      });
    }

    // FIND USER
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // CHECK OTP
    if (
      !user.resetOtp ||
      user.resetOtp !== otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // CHECK OTP EXPIRY
    if (user.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // HASH NEW PASSWORD
    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    // UPDATE PASSWORD
    user.password = hashedPassword;

    // CLEAR OTP
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password has been reset successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};