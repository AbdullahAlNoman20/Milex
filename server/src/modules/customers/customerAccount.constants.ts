// server/src/modules/customers/customerAccount.constants.ts
// Kept apart from the service so the auth layer can read it without pulling
// in the customer module's whole dependency graph.
export const CUSTOMER_LOGIN_DOMAIN = 'customer.milex';

export const buildCustomerLogin = (barcode: string) =>
  `${barcode.toLowerCase()}@${CUSTOMER_LOGIN_DOMAIN}`;