import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered" })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Login with email + password" })
  @ApiResponse({ status: 200, description: "Logged in" })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Get a new access token using refresh token" })
  @ApiResponse({ status: 200, description: "New access token returned" })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @ApiOperation({ summary: "Logout (revoke refresh token)" })
  @ApiResponse({ status: 200, description: "Refresh token revoked" })
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }
}
