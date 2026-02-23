import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString, Matches, MinLength } from "class-validator";

const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateRestaurantDto {
  @ApiPropertyOptional({ example: "New Restaurant Name" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "Colombo 05" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "0771234567" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "09:00" })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "openTime must be in HH:mm format" })
  openTime?: string;

  @ApiPropertyOptional({ example: "22:00" })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: "closeTime must be in HH:mm format" })
  closeTime?: string;

  @ApiPropertyOptional({ example: ["MONDAY", "FRIDAY"], isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(VALID_DAYS, { each: true })
  openDays?: string[];
}
