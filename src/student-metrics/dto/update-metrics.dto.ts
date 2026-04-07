import { IsInt, Max, Min } from 'class-validator';

export class UpdateMetricsDto {
  @IsInt() @Min(0) @Max(100) logical!: number;
  @IsInt() @Min(0) @Max(100) structure!: number;
  @IsInt() @Min(0) @Max(100) grammar!: number;
  @IsInt() @Min(0) @Max(100) creativity!: number;
  @IsInt() @Min(0) @Max(100) understanding!: number;
}
