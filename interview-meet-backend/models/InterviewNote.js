import mongoose from 'mongoose';

const interviewNoteSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    hrId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Index for faster retrieval
interviewNoteSchema.index({ interviewId: 1, createdAt: -1 });

const InterviewNote = mongoose.model('InterviewNote', interviewNoteSchema);
export default InterviewNote;