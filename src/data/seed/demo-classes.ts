import type { AcademyClass } from '../../types';

export const DEMO_CLASSES: AcademyClass[] = [
  {
    id: 'class-tue-nails',
    name: 'Tuesday Nail Foundations',
    program: 'Nail Technician Foundations',
    weekday: 'Tuesday',
    startDate: '2026-11-03',
    weeks: 6,
    currentWeek: 4,
    instructorIds: ['user-marisol'],
    status: 'active',
    defaultCourseTotal: 250,
    defaultDeposit: 50,
    defaultFirstClassPayment: 50,
  },
  {
    id: 'class-thu-nails',
    name: 'Thursday Acrylic & Gel Mastery',
    program: 'Acrylic & Gel Artistry',
    weekday: 'Thursday',
    startDate: '2026-10-29',
    weeks: 6,
    currentWeek: 4,
    instructorIds: ['user-julietha'],
    status: 'active',
    defaultCourseTotal: 450,
    defaultDeposit: 75,
    defaultFirstClassPayment: 75,
  },
];
