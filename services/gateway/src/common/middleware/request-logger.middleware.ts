import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on("finish", () => {
      const ms = Date.now() - start;
      console.log(`[GATEWAY] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });

    next();
  }
}
