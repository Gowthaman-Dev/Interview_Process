import Interview from '../models/Interview.js';
import Notification from '../models/Notification.js';

export default (io, socket) => {
  // ========== WAITING ROOM EVENTS ==========

  // Candidate joins waiting room
  socket.on('join-waiting-room', async (interviewId) => {
    try {
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        socket.emit('error', 'Interview not found');
        return;
      }

      if (socket.user.role !== 'Candidate' || interview.candidateId.toString() !== socket.user._id.toString()) {
        socket.emit('error', 'Not authorized');
        return;
      }

      interview.waitingRoomStatus = 'Waiting';
      await interview.save();

      // Emit to HR immediately
      io.to(interview.hrId.toString()).emit('candidate-waiting', {
        interviewId: interview._id,
        candidateName: socket.user.name,
        position: interview.position,
      });

      socket.emit('waiting-status', { status: 'Waiting' });
    } catch (err) {
      console.error(err);
      socket.emit('error', 'Server error');
    }
  });

  // HR accepts candidate
  socket.on('accept-candidate', async ({ interviewId }) => {
    try {
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        socket.emit('error', 'Interview not found');
        return;
      }

      if (socket.user.role !== 'HR' || interview.hrId.toString() !== socket.user._id.toString()) {
        socket.emit('error', 'Not authorized');
        return;
      }

      interview.waitingRoomStatus = 'Accepted';
      interview.status = 'InProgress';
      interview.meetingStartedAt = new Date();
      await interview.save();

      io.to(interview.candidateId.toString()).emit('hr-accepted', {
        interviewId: interview._id,
        meetLink: interview.meetLink,
      });

      socket.emit('accepted', { interviewId });
    } catch (err) {
      console.error(err);
      socket.emit('error', 'Server error');
    }
  });

  // HR rejects candidate
  socket.on('reject-candidate', async ({ interviewId }) => {
    try {
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        socket.emit('error', 'Interview not found');
        return;
      }

      if (socket.user.role !== 'HR' || interview.hrId.toString() !== socket.user._id.toString()) {
        socket.emit('error', 'Not authorized');
        return;
      }

      interview.waitingRoomStatus = 'Rejected';
      interview.status = 'Cancelled';
      await interview.save();

      io.to(interview.candidateId.toString()).emit('hr-rejected', {
        interviewId: interview._id,
        message: 'HR has rejected your interview request.',
      });

      socket.emit('rejected', { interviewId });
    } catch (err) {
      console.error(err);
      socket.emit('error', 'Server error');
    }
  });

  // ========== VIDEO CALL SIGNALING ==========

  socket.on('join-video-room', (interviewId) => {
    socket.join(`video_${interviewId}`);
    socket.to(`video_${interviewId}`).emit('user-joined', { userId: socket.user._id });
  });

  socket.on('offer', ({ interviewId, offer }) => {
    socket.to(`video_${interviewId}`).emit('offer', { offer });
  });

  socket.on('answer', ({ interviewId, answer }) => {
    socket.to(`video_${interviewId}`).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ interviewId, candidate }) => {
    socket.to(`video_${interviewId}`).emit('ice-candidate', { candidate });
  });

  // ========== DISCONNECT HANDLING ==========
  socket.on('disconnect', async () => {
    try {
      const activeInterview = await Interview.findOne({
        $or: [{ candidateId: socket.user._id }, { hrId: socket.user._id }],
        status: 'InProgress',
        meetingStartedAt: { $ne: null },
        meetingEndedAt: null,
      });
      if (activeInterview) {
        console.log(`User ${socket.user.email} disconnected from active interview ${activeInterview._id}`);
        // Optionally notify the other party
        io.to(activeInterview.candidateId.toString()).emit('user-disconnected', { userId: socket.user._id });
        io.to(activeInterview.hrId.toString()).emit('user-disconnected', { userId: socket.user._id });
      }
    } catch (err) {
      console.error('Error in disconnect handler:', err);
    }
  });
};