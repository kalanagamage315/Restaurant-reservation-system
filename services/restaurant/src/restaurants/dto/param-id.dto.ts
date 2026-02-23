import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ParamIdDto {
  @ApiProperty({ example: "cuid_here" })
  @IsString()
  @MinLength(5)
  id: string;
}
