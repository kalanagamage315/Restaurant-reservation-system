import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ParamIdDto {
  @ApiProperty({ example: "resv_abc123" })
  @IsString()
  id: string;
}
