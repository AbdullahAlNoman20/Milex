// server/src/jobs/notification.job.ts
import pino from 'pino';
import { env } from '../config/env';

// Deliberately its own logger instance rather than importing the one from
// app.ts: users.service imports this file, and app.ts imports users.service,
// so pulling the logger from app.ts would create an import cycle in which
// `logger` can be undefined at module-load time.
const logger = pino({ level: env.IS_PRODUCTION ? 'info' : 'debug' });

// No queue backend without Redis — runs in-process instead. Every caller
// invokes this fire-and-forget, so nothing waits on it.
//
// IMPORTANT: nothing sensitive is ever logged here. An earlier version
// printed the recipient's email address and the raw password-reset token to
// the server log, which meant anyone with log access effectively had
// account takeover. Only non-identifying metadata is recorded now.
export const sendNotification = async (data: Record<string, unknown>): Promise<void> => {
  const kind = typeof data.kind === 'string' ? data.kind : 'GENERIC';
  logger.info({ kind }, 'Outbound notification queued (no delivery provider configured)');
};

export const sendCustomerAccountEmail = async (customer: {
  accountName: string;
  barcode: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  status: string;
}): Promise<void> => {
  // Plug a real provider (Resend / SendGrid / SES) in here. Only the
  // non-personal account reference is logged, never the customer's contact
  // details or address.
  logger.info(
    { kind: 'CUSTOMER_ACCOUNT_CREATED', barcode: customer.barcode },
    'Customer account email queued (no delivery provider configured)'
  );
};