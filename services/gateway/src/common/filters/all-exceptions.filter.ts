import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default values
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = "Internal server error";

    // If it's a Nest HttpException (like BadRequestException, UnauthorizedException)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as any).message ?? res;
    }

    // If it's an error object
    if (exception instanceof Error && message === "Internal server error") {
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
