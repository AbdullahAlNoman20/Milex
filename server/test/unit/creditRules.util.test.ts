// server/test/unit/creditRules.util.test.ts — NEW FILE
import {
  assertValidCreditPeriodValue,
  isCreditPeriodField,
  isUnlimitedCreditLimitField,
  MAX_CREDIT_PERIOD_DAYS,
} from '../../src/common/utils/creditRules.util';

describe('creditRules.util', () => {
  describe('assertValidCreditPeriodValue', () => {
    it('accepts a value within range', () => {
      expect(() => assertValidCreditPeriodValue('30')).not.toThrow();
      expect(() => assertValidCreditPeriodValue(0)).not.toThrow();
      expect(() => assertValidCreditPeriodValue(MAX_CREDIT_PERIOD_DAYS)).not.toThrow();
    });

    it('rejects a value above the max (business-rule bypass attempt)', () => {
      expect(() => assertValidCreditPeriodValue(9999)).toThrow();
      expect(() => assertValidCreditPeriodValue(MAX_CREDIT_PERIOD_DAYS + 1)).toThrow();
    });

    it('rejects negative or non-numeric values', () => {
      expect(() => assertValidCreditPeriodValue(-5)).toThrow();
      expect(() => assertValidCreditPeriodValue('not-a-number')).toThrow();
    });
  });

  describe('isCreditPeriodField', () => {
    it('detects credit period field keys regardless of casing/format', () => {
      expect(isCreditPeriodField('creditPeriodDays')).toBe(true);
      expect(isCreditPeriodField('credit_period')).toBe(true);
      expect(isCreditPeriodField('accountName')).toBe(false);
    });
  });

  describe('isUnlimitedCreditLimitField', () => {
    it('detects the unlimited-credit-limit field to block it from generic edit flows', () => {
      expect(isUnlimitedCreditLimitField('unlimitedCreditLimit')).toBe(true);
      expect(isUnlimitedCreditLimitField('creditLimitTk', 'Unlimited Credit Limit')).toBe(true);
      expect(isUnlimitedCreditLimitField('creditLimitTk', 'Credit Limit (TK)')).toBe(false);
    });
  });
});