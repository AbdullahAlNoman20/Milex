// src/modules/follow-ups/followUps.service.ts
import * as customersService from '../customers/customers.service';

export const listFollowUps = () => customersService.deriveFollowUps();