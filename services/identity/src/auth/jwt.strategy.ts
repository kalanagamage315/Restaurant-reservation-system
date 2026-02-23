import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "dev_secret",
    });
  }

  validate(payload: any) {
    const rolesRaw = payload?.roles ?? payload?.role ?? [];
    const roles =
      Array.isArray(rolesRaw)
        ? rolesRaw.map((r: any) => (typeof r === "string" ? r : r?.role)).filter(Boolean)
        : [rolesRaw].map((r: any) => (typeof r === "string" ? r : r?.role)).filter(Boolean);

    return {
      ...payload,
      id: payload.sub,      // alias for convenience
      userId: payload.sub,  // standardized – matches req.user.userId across all services
      roles,                // always a string[]
    };
  }
}
