import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshDto {
  @ApiProperty({ example: "64_char_refresh_token_here..." })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
