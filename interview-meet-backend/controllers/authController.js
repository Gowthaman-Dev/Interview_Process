import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import OTPToken from '../models/OTPToken.js';
import AppError from '../utils/errorHandler.js';

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate refresh token and add to user's array (atomic)
const generateRefreshToken = async (userId) => {
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  await User.updateOne(
    { _id: userId },
    { $push: { refreshTokens: refreshToken } }
  );
  return refreshToken;
};

// Register
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return next(new AppError('User already exists', 400));

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Candidate',
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return next(new AppError('Invalid email or password', 401));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new AppError('Invalid email or password', 401));

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// Get me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokens');
    if (!user || user.isDeleted) return next(new AppError('User not found', 404));
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Email required', 400));
    const user = await User.findOne({ email });
    if (!user) return next(new AppError('No user found', 404));

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTPToken.findOneAndDelete({ email });
    await OTPToken.create({ email, otp, expiresAt });
    console.log(`🔐 OTP for ${email}: ${otp}`);
    res.status(200).json({ success: true, message: 'OTP sent (check console)' });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return next(new AppError('Email, OTP and new password required', 400));

    const otpRecord = await OTPToken.findOne({ email, otp });
    if (!otpRecord || otpRecord.expiresAt < new Date())
      return next(new AppError('Invalid or expired OTP', 400));

    const user = await User.findOne({ email });
    if (!user) return next(new AppError('User not found', 404));

    user.password = newPassword;
    await user.save();
    await OTPToken.deleteOne({ _id: otpRecord._id });
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

// ✅ Fixed Refresh Token (no $pull + $push conflict)
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError('Refresh token required', 400));

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    } catch (err) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Remove old token and add new one - using two separate updates to avoid conflict
    await User.updateOne(
      { _id: user._id },
      { $pull: { refreshTokens: refreshToken } }
    );

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await User.updateOne(
      { _id: user._id },
      { $push: { refreshTokens: newRefreshToken } }
    );

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};