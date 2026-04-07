import { IsDateString, IsInt, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsInt() class_id!: number;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsDateString() due_date!: string;
}
