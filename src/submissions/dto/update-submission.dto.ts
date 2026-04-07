import { IsOptional, IsString } from 'class-validator';

export class UpdateSubmissionDto {
  @IsOptional() @IsString() text_content?: string;
}
