// server/test/unit/scopeGuard.util.test.ts
import { isUnassignedSubordinate, SUBORDINATE_ROLES } from '../../src/common/utils/scopeGuard.util';

describe('isUnassignedSubordinate', () => {
  it('treats a KAM with no Line Manager as unassigned, so nobody is left unable to act', () => {
    expect(isUnassignedSubordinate(null, 'KAM')).toBe(true);
    expect(isUnassignedSubordinate(undefined, 'SALES_COORDINATOR')).toBe(true);
  });

  it('does NOT treat a manager as unassigned just because they have no Line Manager', () => {
    // This was the bug: every Line Manager has lineManagerId = null, so the
    // old check handed each of them access to all the others' own accounts.
    expect(isUnassignedSubordinate(null, 'LINE_MANAGER')).toBe(false);
    expect(isUnassignedSubordinate(null, 'HEAD_OF_DEPARTMENT')).toBe(false);
    expect(isUnassignedSubordinate(null, 'SUPER_ADMIN')).toBe(false);
  });

  it('is not unassigned once a Line Manager has been set', () => {
    expect(isUnassignedSubordinate('lm-1', 'KAM')).toBe(false);
  });

  it('only ever applies to the two subordinate roles', () => {
    expect(SUBORDINATE_ROLES).toEqual(['KAM', 'SALES_COORDINATOR']);
  });
});