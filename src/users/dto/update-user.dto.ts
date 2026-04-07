import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() student_number?: string;
}
