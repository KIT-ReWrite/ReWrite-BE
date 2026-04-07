import { IsArray, IsObject, IsString } from 'class-validator';

export class CreateAIFeedbackDto {
  @IsString() summary!: string;
  @IsObject() detail_analysis!: Record<string, any>;
  @IsArray() improvement_suggestions!: string[];
}
