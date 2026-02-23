import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];

  // Staff restaurant assignment is included in the JWT payload for role-scoped access.
  restaurantId?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET") ?? "dev_secret",
    });
  }

  async validate(payload: JwtPayload) {
    // The returned object is attached to req.user for use in controllers.
    return {
      userId: payload.sub,
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      restaurantId: payload.restaurantId ?? null,
    };
  }
}
