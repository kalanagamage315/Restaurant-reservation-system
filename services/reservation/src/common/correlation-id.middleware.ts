import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Attaches a unique X-Correlation-ID header to every request/response.
 * Downstream services should forward this header when making inter-service calls.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const id = (req.headers["x-correlation-id"] as string) ?? randomUUID();
        req.headers["x-correlation-id"] = id;
        res.setHeader("X-Correlation-ID", id);
        next();
    }
}
