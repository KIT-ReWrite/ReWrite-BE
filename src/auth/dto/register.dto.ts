import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsEnum(['student', 'teacher'])
  role!: 'student' | 'teacher';

  @IsString()
  username!: string;

  @IsString()
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
