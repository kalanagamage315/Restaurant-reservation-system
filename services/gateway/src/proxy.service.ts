import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { AxiosRequestConfig } from "axios";

@Injectable()
export class ProxyService {
  constructor(private readonly http: HttpService) { }

  async forward(opts: {
    baseUrl: string;
    method: string;
    path: string;
    params?: any;
    body?: any;
    headers?: any;
  }) {
    const url = `${opts.baseUrl}${opts.path}`;

    const config: AxiosRequestConfig = {
      url,
      method: opts.method as any,
      params: opts.params,
      data: opts.body,
      headers: opts.headers,
      timeout: 15000, // 15 second timeout to prevent hanging requests
      validateStatus: () => true,
    };

    const resp = await firstValueFrom(this.http.request(config));

    return {
      status: resp.status,
      data: resp.data,
    };
  }
}
