import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
    hrId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Index for faster lookups
feedbackSchema.index({ interviewId: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;