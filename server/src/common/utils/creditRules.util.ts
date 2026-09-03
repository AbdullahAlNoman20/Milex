// server/src/common/utils/creditRules.util.ts
export const MAX_CREDIT_PERIOD_DAYS = 90;

export const isCreditPeriodField = (fieldKey: string): boolean => {
  const k = (fieldKey || "").toLowerCase();
  return (
    k.includes("creditperiod") ||
    k.includes("credit_period") ||
    (k.includes("credit") && k.includes("period"))
  );
};

export const isUnlimitedCreditLimitField = (
  fieldKey: string,
  label = "",
): boolean => {
  const k = (fieldKey || "").toLowerCase();
  const l = (label || "").toLowerCase();
  return (
    k.includes("unlimited") || (l.includes("unlimited") && l.includes("credit"))
  );
};

// Mirrors the 0–90 day rule already shown in the UI (CustomerEditRequestModal,
// RateApprovalPanel) — enforced here so it can never be bypassed by calling
// the API directly.
export const assertValidCreditPeriodValue = (value: string | number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_CREDIT_PERIOD_DAYS) {
    throw {
      statusCode: 400,
      code: "INVALID_CREDIT_PERIOD",
      message: `Credit period must be between 0 and ${MAX_CREDIT_PERIOD_DAYS} days`,
    };
  }
};
