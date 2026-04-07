import { IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsString() text_content!: string;
}
