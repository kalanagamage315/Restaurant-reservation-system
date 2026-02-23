import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "admin@test.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password@123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: "Sankha" })
  @IsOptional()
  @IsString()
  fullName?: string;


  @ApiProperty({ description: "Customer phone number", example: "+94771234567" })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ enum: Role, example: Role.CUSTOMER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
