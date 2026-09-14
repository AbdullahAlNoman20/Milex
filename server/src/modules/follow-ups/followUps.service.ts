// server/src/modules/follow-ups/followUps.service.ts
import * as customersService from '../customers/customers.service';

export const listFollowUps = (requester: { id: string; role: string }) =>
  customersService.deriveFollowUps(requester);