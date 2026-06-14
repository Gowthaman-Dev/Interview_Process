import mongoose from 'mongoose';

const otpTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// Auto-delete expired OTPs
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTPToken = mongoose.model('OTPToken', otpTokenSchema);
export default OTPToken;