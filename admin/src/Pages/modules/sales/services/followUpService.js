// src/Pages/modules/sales/services/followUpService.js
// Derives follow-up reminders directly from customer records — no separate
// storage needed unless a dedicated reminder collection is added later.
export const deriveFollowUps = (customers = []) => {
  const now = Date.now();
  return customers
    .filter((c) => c.status !== 'ACTIVE ACCOUNT')
    .map((c) => {
      const followUpDate = c.followUpDate ? new Date(c.followUpDate).getTime() : null;
      const isOverdue = followUpDate ? followUpDate < now : false;
      return {
        customerId: c.id,
        barcode: c.barcode,
        accountName: c.accountName,
        status: c.status,
        commitment: c.recNote || c.lmNote || '',
        proposedRate: c.proposedRate || '',
        approvedRate: c.approvedRate || '',
        clientFeedback: c.rejectReason || '',
        followUpDate: c.followUpDate || null,
        followUpNote: c.followUpNote || '',
        isOverdue,
      };
    })
    .sort((a, b) => (b.isOverdue === a.isOverdue ? 0 : b.isOverdue ? 1 : -1));
};