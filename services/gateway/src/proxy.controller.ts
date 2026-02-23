import { All, Controller, Req, Res } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { Request, Response } from "express";

type RouteInfo = {
  baseUrl: string;
  upstreamPrefix: string;
};

@Controller()
export class ProxyController {
  constructor(private readonly http: HttpService) { }

  private timeoutMs() {
    const ms = Number(process.env.GATEWAY_TIMEOUT_MS ?? "30000");
    return Number.isFinite(ms) ? ms : 30000;
  }

  private resolve(service: string): RouteInfo {
    const IDENTITY = process.env.IDENTITY_URL ?? "http://127.0.0.1:3001";
    const RESERVATION = process.env.RESERVATION_URL ?? "http://127.0.0.1:3002";
    const RESTAURANT = process.env.RESTAURANT_URL ?? "http://127.0.0.1:3003";
    const TABLE = process.env.TABLE_URL ?? "http://127.0.0.1:3004";

    switch (service) {
      case "identity":
        return { baseUrl: IDENTITY, upstreamPrefix: "auth" };

      case "reservation":
        return { baseUrl: RESERVATION, upstreamPrefix: "reservations" };
      case "restaurant":
        return { baseUrl: RESTAURANT, upstreamPrefix: "restaurants" };
      case "table":
        return { baseUrl: TABLE, upstreamPrefix: "tables" };

      case "auth":
      case "users":
        return { baseUrl: IDENTITY, upstreamPrefix: service };

      case "reservations":
        return { baseUrl: RESERVATION, upstreamPrefix: "reservations" };
      case "restaurants":
        return { baseUrl: RESTAURANT, upstreamPrefix: "restaurants" };
      case "tables":
        return { baseUrl: TABLE, upstreamPrefix: "tables" };

      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  private safeHeaders(req: Request) {
    const headers: Record<string, any> = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];
    delete headers["transfer-encoding"];
    return headers;
  }

  private async forward(url: string, req: Request, res: Response) {
    const response = await firstValueFrom(
      this.http.request({
        method: req.method as any,
        url,
        params: req.query,
        data: req.body,
        headers: this.safeHeaders(req),
        timeout: this.timeoutMs(),
        validateStatus: () => true,
      }),
    );

    return res.status(response.status).send(response.data);
  }

  @All("*")
  async proxyAll(@Req() req: Request, @Res() res: Response) {
    try {
      let path = req.path || "/";

      // remove /v1 prefix if you use it
      if (path.startsWith("/v1/")) path = path.slice(3);

      // normalize
      path = path.replace(/^\/+/, "");

      if (!path) return res.status(404).send({ message: "Gateway: missing service segment" });

      // Normalize comma-separated action segments that some older clients may send.
      path = path
        .replace(",confirm", "/confirm")
        .replace(",reject", "/reject")
        .replace(",cancel", "/cancel");

      const [service, ...restParts] = path.split("/");
      const restPath = restParts.join("/");

      if (service === "health") {
        return res.status(404).send({ message: "Use GET /health (gateway local route)" });
      }

      const { baseUrl, upstreamPrefix } = this.resolve(service);

      if (restPath === "health") {
        return await this.forward(`${baseUrl}/health`, req, res);
      }

      const url = restPath
        ? `${baseUrl}/${upstreamPrefix}/${restPath}`
        : `${baseUrl}/${upstreamPrefix}`;

      return await this.forward(url, req, res);
    } catch (err: any) {
      return res.status(502).send({
        message: "Gateway upstream error",
        detail: err?.message ?? "Unknown error",
      });
    }
  }
}
