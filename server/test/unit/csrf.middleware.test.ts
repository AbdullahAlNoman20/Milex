// server/test/unit/csrf.middleware.test.ts — NEW FILE
import { verifyCsrf } from '../../src/common/middlewares/csrf.middleware';

const buildReq = (method: string, cookieToken?: string, headerToken?: string) => ({
  method,
  cookies: cookieToken !== undefined ? { csrf_token: cookieToken } : {},
  headers: headerToken !== undefined ? { 'x-csrf-token': headerToken } : {},
});

const buildRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('verifyCsrf middleware', () => {
  it('allows GET requests through without a CSRF token', () => {
    const req = buildReq('GET') as any;
    const res = buildRes();
    const next = jest.fn();
    verifyCsrf(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a state-changing request with no CSRF token at all', () => {
    const req = buildReq('POST') as any;
    const res = buildRes();
    const next = jest.fn();
    verifyCsrf(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects a state-changing request where cookie and header tokens do not match', () => {
    const req = buildReq('POST', 'token-a', 'token-b') as any;
    const res = buildRes();
    const next = jest.fn();
    verifyCsrf(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows a state-changing request where cookie and header tokens match', () => {
    const req = buildReq('POST', 'matching-token-1234', 'matching-token-1234') as any;
    const res = buildRes();
    const next = jest.fn();
    verifyCsrf(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});