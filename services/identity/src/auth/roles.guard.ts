import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<any[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    // Normalize each required role to a plain string for comparison.
    const required = requiredRoles.map((r) => String(r));

    // Normalize user roles, supporting various shapes: string[], [{role: string}], etc.
    const rolesRaw = user.roles ?? user.role ?? [];
    const userRoles = (Array.isArray(rolesRaw) ? rolesRaw : [rolesRaw])
      .map((r: any) => (typeof r === "string" ? r : r?.role))
      .filter(Boolean)
      .map(String);

    return required.some((role) => userRoles.includes(role));
  }
}
