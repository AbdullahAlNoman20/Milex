// server/src/jobs/document-expiry.job.ts
import { prisma } from '../config/db';
import { createNotificationsForUsers } from '../modules/notifications/notifications.service';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Runs nightly. A trade licence that lapses without anyone noticing stops the
// customer from trading, so the KAM who owns that account is told a month
// ahead — while there is still time to collect a renewed copy.
//
// Each document is reminded about once: expiryReminderSentAt is stamped as
// soon as the notification is written, so a licence sitting in the window for
// thirty nights does not produce thirty identical alerts.
export const runDocumentExpiryReminders = async () => {
  const now = new Date();
  const horizon = new Date(now.getTime() + ONE_MONTH_MS);

  const due = await prisma.onboardingDocument.findMany({
    where: {
      documentType: 'TRADE_LICENSE',
      expiryReminderSentAt: null,
      expiryDate: { not: null, lte: horizon, gt: now },
      customer: { isDeleted: false },
    },
    select: {
      id: true,
      expiryDate: true,
      customer: { select: { accountName: true, barcode: true, handledById: true } },
    },
    take: 500,
  });

  if (due.length === 0) return { reminded: 0 };

  for (const doc of due) {
    const days = Math.max(
      0,
      Math.ceil(((doc.expiryDate as Date).getTime() - now.getTime()) / 86400000)
    );
    // eslint-disable-next-line no-await-in-loop
    await createNotificationsForUsers([doc.customer.handledById], {
      label: `${doc.customer.accountName} — Trade License expires in ${days} day${days === 1 ? '' : 's'} (${(doc.expiryDate as Date).toLocaleDateString()})`,
      link: `/app/customers/${doc.customer.barcode}`,
      isOverdue: true,
    });
  }

  await prisma.onboardingDocument.updateMany({
    where: { id: { in: due.map((d) => d.id) } },
    data: { expiryReminderSentAt: now },
  });

  return { reminded: due.length };
};