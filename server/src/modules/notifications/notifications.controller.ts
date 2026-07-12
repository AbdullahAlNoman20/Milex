// src/modules/notifications/notifications.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const listNotificationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await notificationsService.getNotificationsForUser(req.user!.id, req.user!.role);
    return sendSuccess(res, { items, count: items.length });
  } catch (err) {
    next(err);
  }
};