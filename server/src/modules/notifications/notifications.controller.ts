// server/src/modules/notifications/notifications.controller.ts 
import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';
import { asString } from '../../common/utils/requestParams.util';

export const listNotificationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 8));
    const { items, unreadCount } = await notificationsService.getNotificationsForUser(req.user!.id, req.user!.role, limit);
    return sendSuccess(res, { items, count: unreadCount });
  } catch (err) {
    next(err);
  }
};

export const markReadHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markNotificationRead(req.user!.id, asString(req.params.id));
    return sendSuccess(res, { marked: true });
  } catch (err) {
    next(err);
  }
};

export const markAllReadHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markNotificationsRead(req.user!.id, req.body.ids || []);
    return sendSuccess(res, { marked: true });
  } catch (err) {
    next(err);
  }
};