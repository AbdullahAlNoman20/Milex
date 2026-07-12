// src/jobs/notification.job.ts
// No queue backend without Redis — runs synchronously in-process instead.
// Tradeoff: the caller's request waits for this to finish, and there's no
// automatic retry if it fails. Fine at current scale; revisit if notification
// volume grows or a slow provider starts blocking requests noticeably.
export const sendNotification = async (data: Record<string, unknown>) => {
  // Plug in a real email/SMS provider call here.
  // eslint-disable-next-line no-console
  console.log('Sending notification (inline)', data);
};