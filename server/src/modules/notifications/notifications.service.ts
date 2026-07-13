// src/modules/notifications/notifications.service.ts
import { prisma } from '../../config/db';
import { CUSTOMER_STATUS } from '../../common/constants/status.constant';
import { humanizeStatus } from '../../common/utils/humanize.util';

// Reusable notification source-of-truth — every module that needs to notify a
// user plugs into this instead of writing its own alert logic.
export const getNotificationsForUser = async (userId: string, role: string) => {
  const items: { id: string; label: string; link: string }[] = [];

  if (role === 'LINE_MANAGER') {
    const pending = await prisma.customer.findMany({
      where: {
        status: {
          in: [
            CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
            CUSTOMER_STATUS.INFO_UPDATE_PENDING_LM_APPROVAL,
            CUSTOMER_STATUS.PROVISIONAL_EXTENSION_REQUESTED,
            CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
          ],
        },
      },
      take: 20,
    });
    pending.forEach((c) =>
      items.push({ id: `cust-${c.id}`, label: `${c.accountName} — ${humanizeStatus(c.status)}`, link: `/app/customers/${c.barcode}` })
    );
  }

  if (role === 'KAM') {
    const mine = await prisma.customer.findMany({
      where: {
        handledById: userId,
        status: {
          in: [
            CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK,
            CUSTOMER_STATUS.AGREEMENT_SENT_AWAITING_SIGNATURE,
            CUSTOMER_STATUS.PROVISIONAL_DOCS_PENDING,
          ],
        },
      },
      take: 20,
    });
    mine.forEach((c) =>
      items.push({ id: `cust-${c.id}`, label: `${c.accountName} — ${humanizeStatus(c.status)}`, link: `/app/customers/${c.barcode}` })
    );
  }

  return items.slice(0, 20);
};