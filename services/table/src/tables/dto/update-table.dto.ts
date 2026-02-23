import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateTableDto {
  @ApiPropertyOptional({ example: "T2" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  tableNumber?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
