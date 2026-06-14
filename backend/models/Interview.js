import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hrId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ['Scheduled', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    meetLink: { type: String, required: true, unique: true },
    meetingStartedAt: { type: Date },
    meetingEndedAt: { type: Date },
    waitingRoomStatus: { type: String, enum: ['Waiting', 'Accepted', 'Rejected'] },
  },
  { timestamps: true }
);

// Indexes for performance
interviewSchema.index({ candidateId: 1, date: 1, time: 1 });
interviewSchema.index({ hrId: 1, date: 1, time: 1 });

const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;