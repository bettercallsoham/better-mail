export interface ResponsePayload {
  status?: number;
  message?: string;
  data?: any;
}

export interface ResponseObject {
  status: number;
  message: string;
  data?: any;
}

import { Request, Response, NextFunction } from "express";
import { logger } from "../../shared/utils/logger";

export const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>,
  controllerName: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      logger.error(
        `Got error from controller controllerName ${controllerName}: ` +
          error.message
      );

      (error as any).controller = controllerName;
      next(error);
    }
  };
};

export const httpResponse = ({
  status = 200,
  message = "Success",
  data = null,
}: ResponsePayload): ResponseObject => {
  return { status, message, data };
};
