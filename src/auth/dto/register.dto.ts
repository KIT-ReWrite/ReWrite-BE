import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEnum(['student', 'teacher'])
  role!: 'student' | 'teacher';

  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsString()
  school!: string;

  @IsOptional()
  @IsString()
  student_number?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
