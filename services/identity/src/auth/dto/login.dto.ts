import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@test.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password@123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
