import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateTeacherFeedbackDto {
  @IsInt() @Min(0) @Max(100) score!: number;
  @IsString() feedback!: string;
}
