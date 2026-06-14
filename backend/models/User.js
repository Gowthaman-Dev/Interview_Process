import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['Admin', 'HR', 'Candidate'], default: 'Candidate' },
    isDeleted: { type: Boolean, default: false },
    skills: [{ type: String }],
    resumeUrl: { type: String, default: null },
    refreshTokens: [{ type: String }],
  },
  { timestamps: true }
);

// ✅ Correct pre-save – async without next
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;