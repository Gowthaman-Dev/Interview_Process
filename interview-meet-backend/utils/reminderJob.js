import cron from 'node-cron';
import Interview from '../models/Interview.js';
import { createBulkNotifications } from './notificationHelper.js';

// Schedule job to run every 5 minutes
export const startReminderJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🕐 Running reminder job...');
    try {
      const now = new Date();
      const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

      // Find interviews starting in the next 15 minutes (but not already notified? We'll create notification each time; you can add a flag if needed)
      const interviews = await Interview.find({
        status: 'Scheduled',
        date: { $lte: fifteenMinutesLater, $gte: now },
      }).populate('candidateId hrId');

      for (const interview of interviews) {
        const startTime = new Date(interview.date);
        const minutesUntil = Math.round((startTime - now) / (1000 * 60));

        // Only notify for 15 min and 5 min reminders (avoid duplicate at exact same time? We'll allow both)
        if (minutesUntil <= 15 && minutesUntil > 10) {
          // 15-minute reminder
          await createBulkNotifications(
            [interview.candidateId._id, interview.hrId._id],
            'reminder',
            'Interview Reminder',
            `Your interview for "${interview.position}" starts in 15 minutes.`,
            interview._id
          );
        } else if (minutesUntil <= 5 && minutesUntil > 0) {
          // 5-minute reminder
          await createBulkNotifications(
            [interview.candidateId._id, interview.hrId._id],
            'reminder',
            'Interview Starting Soon',
            `Your interview for "${interview.position}" starts in 5 minutes. Please join the waiting room.`,
            interview._id
          );
        }
      }
      console.log(`✅ Reminder job completed. Processed ${interviews.length} interviews.`);
    } catch (error) {
      console.error('❌ Reminder job error:', error);
    }
  });
};