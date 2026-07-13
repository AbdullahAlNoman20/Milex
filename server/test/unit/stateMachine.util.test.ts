// test/unit/stateMachine.util.test.ts
import { CUSTOMER_STATUS_TRANSITIONS, CUSTOMER_STATUS } from '../../src/common/constants/status.constant';

describe('CUSTOMER_STATUS_TRANSITIONS', () => {
  it('does not allow skipping straight from pending rate prep to active', () => {
    const allowed = CUSTOMER_STATUS_TRANSITIONS[CUSTOMER_STATUS.PENDING_RATE_PREPARATION];
    expect(allowed).not.toContain(CUSTOMER_STATUS.ACTIVE_ACCOUNT);
  });

  it('allows provisional active to go to expired', () => {
    const allowed = CUSTOMER_STATUS_TRANSITIONS[CUSTOMER_STATUS.PROVISIONAL_ACTIVE];
    expect(allowed).toContain(CUSTOMER_STATUS.PROVISIONAL_EXPIRED);
  });

  it('has no outgoing transitions from a terminal expired state', () => {
    expect(CUSTOMER_STATUS_TRANSITIONS[CUSTOMER_STATUS.PROVISIONAL_EXPIRED]).toEqual([]);
  });
});