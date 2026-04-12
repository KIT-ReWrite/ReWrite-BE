import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getTeacherDashboard(user: any) {
    if (user.role !== 'teacher') {
      throw new ForbiddenException('교사만 접근할 수 있습니다.');
    }

    const classes = await this.prisma.class.findMany({
      where: { teacher_id: user.id },
      select: { id: true, name: true },
    });
    const classIds = classes.map((c) => c.id);

    const [student_count, assignments] = await Promise.all([
      // 전체 학생 수 (중복 제거)
      this.prisma.classStudent
        .groupBy({
          by: ['student_id'],
          where: { class_id: { in: classIds } },
        })
        .then((r) => r.length),

      // 전체 과제
      this.prisma.assignment.findMany({
        where: { class_id: { in: classIds } },
        select: { id: true, due_date: true, class_id: true },
      }),
    ]);

    // 오늘 마감 과제 수
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const due_today_count = assignments.filter(
      (a) => a.due_date >= todayStart && a.due_date <= todayEnd,
    ).length;

    // 학급별 제출률
    const submission_rate_by_class = await Promise.all(
      classes.map(async (cls) => {
        const classAssignments = assignments.filter(
          (a) => a.class_id === cls.id,
        );
        const studentCount = await this.prisma.classStudent.count({
          where: { class_id: cls.id },
        });

        const submittedCount = await this.prisma.submission.count({
          where: {
            assignment_id: { in: classAssignments.map((a) => a.id) },
            status: { not: 'not_submitted' },
          },
        });

        const total = studentCount * classAssignments.length;
        const rate =
          total === 0 ? 0 : Math.round((submittedCount / total) * 100);

        return {
          class_id: cls.id,
          class_name: cls.name,
          submission_rate: rate,
        };
      }),
    );

    // AI 주의 학생 (ai_done 상태 - AI 분석 완료됐지만 교사 피드백 없는 제출물 보유 학생)
    const pendingSubmissions = await this.prisma.submission.findMany({
      where: {
        assignment_id: { in: assignments.map((a) => a.id) },
        status: 'ai_done',
      },
      include: {
        student: { select: { id: true, name: true, profile_image: true } },
        assignment: {
          select: { title: true, id: true, class: { select: { name: true } } },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    const studentMap = new Map<string, any>();
    for (const sub of pendingSubmissions) {
      const key = sub.student_id.toString();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          student_id: key,
          name: sub.student.name,
          profile_image: sub.student.profile_image,
          pending_count: 0,
          latest_assignment: sub.assignment.title,
          assignment_id: sub.assignment.id,
          class_name: sub.assignment.class.name,
        });
      }
      studentMap.get(key).pending_count += 1;
    }
  }
}
