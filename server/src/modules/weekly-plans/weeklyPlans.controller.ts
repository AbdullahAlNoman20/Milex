// src/modules/weekly-plans/weeklyPlans.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as weeklyPlansService from './weeklyPlans.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const listMinePlansHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await weeklyPlansService.listPlansForKam(req.user!.id);
    return sendSuccess(res, { plans });
  } catch (err) {
    next(err);
  }
};

export const listForReviewHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await weeklyPlansService.listPlansForReview();
    return sendSuccess(res, { plans });
  } catch (err) {
    next(err);
  }
};

export const listForKamHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await weeklyPlansService.listPlansForKam(req.params.kamId);
    return sendSuccess(res, { plans });
  } catch (err) {
    next(err);
  }
};

export const saveDraftHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await weeklyPlansService.upsertDraft(req.user!.id, req.body);
    return sendSuccess(res, { plan });
  } catch (err) {
    next(err);
  }
};

export const submitPlanHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await weeklyPlansService.submitPlan(req.user!.id, req.body.weekStartDate);
    return sendSuccess(res, { plan });
  } catch (err) {
    next(err);
  }
};

export const reviewPlanHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await weeklyPlansService.reviewPlan(req.params.id, req.body.approved, req.body.comments, req.user!.id);
    return sendSuccess(res, { plan });
  } catch (err) {
    next(err);
  }
};