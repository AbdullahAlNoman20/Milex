// server/src/modules/customers/customerAccount.service.ts
import { prisma } from '../../config/db';
import { hashPassword } from '../../common/utils/hash.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { buildCustomerLogin } from './customerAccount.constants';

// A customer's login name and starting password are both their account id —
// the same code printed on every form they already hold, so nothing new has
// to be communicated to them. The password policy is deliberately not applied
// to this one value; the account is created with mustChangePassword set, so
// it is replaced the first time they actually sign in.
//
// There is no customer dashboard yet. This exists so the identity is already
// in place, correctly linked to the customer record, for the release that
// adds one.
export { CUSTOMER_LOGIN_DOMAIN, buildCustomerLogin } from './customerAccount.constants';

export const ensureCustomerAccount = async (customerId: string): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, barcode: true, accountName: true },
    });
    if (!customer) return;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ customerId: customer.id }, { email: buildCustomerLogin(customer.barcode) }] },
      select: { id: true },
    });
    if (existing) return;

    const role = await prisma.role.findUnique({ where: { name: 'CUSTOMER' as any } });
    if (!role) {
      console.warn('[customer-account] CUSTOMER role is missing — run the seed to create it.');
      return;
    }

    const passwordHash = await hashPassword(customer.barcode);
    const user = await prisma.user.create({
      data: {
        name: customer.accountName,
        email: buildCustomerLogin(customer.barcode),
        customerId: customer.id,
        passwordHash,
        passwordHistory: [passwordHash],
        roleId: role.id,
        mustChangePassword: true,
      },
    });

    await logAudit({
      entity: 'User',
      entityId: user.id,
      action: 'CUSTOMER_ACCOUNT_CREATED',
      actorId: null,
      afterState: { customerId: customer.id, barcode: customer.barcode },
    });
  } catch (err) {
    // A failure here must never stop a customer from going active — the
    // account can be created again on the next activation or by hand.
    console.warn('[customer-account] Could not create the customer login (non-fatal):', (err as Error)?.message);
  }
};