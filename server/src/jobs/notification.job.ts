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

export const sendCustomerAccountEmail = async (customer: {
  accountName: string;
  barcode: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  status: string;
}) => {
  // TODO: wire a real email provider (e.g. Resend, SendGrid, SES) here.
  // Kept as a structured log for now so the trigger point and payload are
  // correct and ready to swap in a real send call without touching callers.
  // eslint-disable-next-line no-console
  console.log('Sending account-created email to customer', {
    to: customer.email,
    subject: `Your Milex Account (${customer.barcode}) Has Been Created`,
    body: {
      customerName: customer.accountName,
      accountId: customer.barcode,
      companyInfo: { businessType: customer.businessType, address: customer.address },
      contactDetails: { phone: customer.phone, email: customer.email },
      accountStatus: customer.status,
    },
  });
};