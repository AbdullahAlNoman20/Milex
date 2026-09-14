// server/src/modules/follow-ups/followUps.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as followUpsService from './followUps.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const listFollowUpsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await followUpsService.listFollowUps({ id: req.user!.id, role: req.user!.role });
    return sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};