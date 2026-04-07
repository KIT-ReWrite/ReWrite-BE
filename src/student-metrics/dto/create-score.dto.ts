import { IsInt, Min } from 'class-validator';

export class CreateScoreDto {
  @IsInt() assignment_id!: number;
  @IsInt() @Min(0) score!: number;
}
