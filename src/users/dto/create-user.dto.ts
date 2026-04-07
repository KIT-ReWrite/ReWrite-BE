export class CreateUserDto {
  username!: string;
  password!: string;
  role!: 'teacher' | 'student';
  name!: string;
  school!: string;
  student_number?: string | null;
  subject?: string | null;
}
