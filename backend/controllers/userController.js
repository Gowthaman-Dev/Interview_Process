import User from '../models/User.js';
import AppError from '../utils/errorHandler.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinaryHelper.js';

// @desc    Update user profile (name, skills, etc.)
// @route   PUT /api/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, skills } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || user.isDeleted) {
      return next(new AppError('User not found', 404));
    }

    if (name) user.name = name;
    if (skills) {
      // skills can be comma-separated string or array
      user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    }

    await user.save();
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        resumeUrl: user.resumeUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload resume (PDF, max 2MB)
// @route   POST /api/users/resume
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a PDF file', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user || user.isDeleted) {
      return next(new AppError('User not found', 404));
    }

    // Delete old resume if exists
    if (user.resumeUrl) {
      await deleteFromCloudinary(user.resumeUrl);
    }

    // Upload new resume to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, `resumes/${user._id}`);

    // ✅ Atomic update to avoid version conflict with refreshTokens
    await User.updateOne(
      { _id: user._id },
      { $set: { resumeUrl: result.secure_url } }
    );

    // Fetch updated user to return the new resumeUrl
    const updatedUser = await User.findById(user._id).select('resumeUrl');

    res.status(200).json({
      success: true,
      resumeUrl: updatedUser.resumeUrl,
      message: 'Resume uploaded successfully',
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    next(new AppError(error.message || 'Upload failed', 500));
  }
};

// @desc    Search users by name or skill
// @route   GET /api/users/search?name=...&skill=...
export const searchUsers = async (req, res, next) => {
  try {
    const { name, skill } = req.query;
    const query = { isDeleted: false };

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (skill) {
      query.skills = { $in: [new RegExp(skill, 'i')] };
    }

    const users = await User.find(query).select('name email role skills');
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account (soft delete) - atomic update
// @route   DELETE /api/users/account
export const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    // ✅ Atomic update (no need to load full document and save)
    await User.updateOne(
      { _id: req.user.id },
      { $set: { isDeleted: true } }
    );

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile (own)
// @route   GET /api/users/profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokens');
    if (!user || user.isDeleted) {
      return next(new AppError('User not found', 404));
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete resume (remove from Cloudinary and user)
// @route   DELETE /api/users/resume
export const deleteResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.isDeleted) {
      return next(new AppError('User not found', 404));
    }

    if (!user.resumeUrl) {
      return next(new AppError('No resume to delete', 400));
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(user.resumeUrl);

    // Remove resumeUrl from user
    user.resumeUrl = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    next(new AppError(error.message || 'Delete failed', 500));
  }
};