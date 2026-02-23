import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return {
      service: "table",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
