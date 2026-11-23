export type UserRole = 'owner' | 'instructor' | 'telemarketing' | 'staff';

export type Language = 'en' | 'es';

export interface DemoUser {
  id: string;
  name: string;
  firstName: string;
  role: UserRole;
  titleEn: string;
  titleEs: string;
  assignedClassIds: string[];
  avatarInitials: string;
  email: string;
}

export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface AcademyClass {
  id: string;
  name: string;
  program: string;
  weekday: Weekday;
  startDate: string; // YYYY-MM-DD
  weeks: number;
  currentWeek: number;
  instructorIds: string[];
  status: 'active' | 'completed';
  defaultCourseTotal: number;
  defaultDeposit: number;
  defaultFirstClassPayment: number;
}

export interface EnrollmentChecklist {
  depositConfirmed: boolean;
  webSubscriptionConfirmed: boolean;
  welcomeEmailSent: boolean;
  attendanceConfirmedBySidney: boolean;
}

export type EnrollmentStatus = 'pending' | 'enrolled' | 'completed' | 'dropped';

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  program: string;
  classId: string;
  courseTotal: number;
  depositExpected: number;
  firstClassPayment: number;
  fixedWeeklyAmount?: number | null;
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate: string; // YYYY-MM-DD
  schoolAccess: boolean;
  googleReview: boolean;
  source: string;
  enrolledByUserId: string;
  enrolledByName: string;
  accommodations: string;
  notes: string;
  checklist: EnrollmentChecklist;
}

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'zelle'
  | 'venmo'
  | 'cash_app'
  | 'check'
  | 'other';

export type PaymentCategory = 'deposit' | 'first_class' | 'weekly' | 'adjustment';

export interface Payment {
  id: string;
  receiptNumber: string; // e.g., LVB-00031
  studentId: string;
  classId: string;
  week: number; // 0 for deposit, 1..N for class weeks
  date: string; // YYYY-MM-DD
  amount: number;
  method: PaymentMethod;
  category: PaymentCategory;
  collectorId: string;
  collectorName: string;
  notes: string;
  createdAt: string; // ISO timestamp
  status: 'confirmed' | 'pending' | 'void';
  locked: boolean;
  cashHandoffId?: string;
  depositId?: string;
}

export interface Deposit {
  id: string;
  receiptNumber: string;
  studentId: string;
  classId: string;
  amount: number;
  method: PaymentMethod;
  date: string; // YYYY-MM-DD
  collectorId: string;
  collectorName: string;
  notes: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
  confirmedByUserId?: string;
  confirmedByName?: string;
  confirmedAt?: string;
}

export type AttendanceStatus = 'P' | 'A' | 'C' | 'E';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  week: number;
  date: string;
  status: AttendanceStatus;
  notes: string;
  recordedByUserId: string;
  updatedAt: string;
}

export interface ClassLogSubmission {
  id: string;
  classId: string;
  week: number;
  date: string;
  submittedByUserId: string;
  submittedByName: string;
  submittedAt: string;
}

export interface CashHandoff {
  id: string;
  date: string; // YYYY-MM-DD
  collectorId: string;
  collectorName: string;
  paymentIds: string[];
  transactionCount: number;
  expectedCash: number;
  cardTotal: number;
  digitalTotal: number;
  overallTotal: number;
  receivedCash?: number;
  variance?: number;
  status: 'pending' | 'confirmed' | 'flagged';
  submittedAt: string;
  confirmedByUserId?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  flagNote?: string;
}

export type MakeupStatus = 'open' | 'scheduled' | 'completed' | 'cleared';

export interface MissedClassRecord {
  id: string;
  studentId: string;
  classId: string;
  originalWeek: number;
  originalDate: string;
  attendanceStatus: 'A' | 'E';
  makeupStatus: MakeupStatus;
  scheduledMakeupDate?: string;
  notes: string;
  clearedByUserId?: string;
  clearedByName?: string;
  clearedAt?: string;
}

export type TourOutcome = 'pending' | 'arrived' | 'no_show' | 'enrolled';

export interface StudioTour {
  id: string;
  visitorName: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  programInterest: string;
  assignedStaffId: string;
  assignedStaffName: string;
  outcome: TourOutcome;
  notes: string;
  linkedStudentId?: string;
}

export type ReportCategory =
  | 'immediate_assistance'
  | 'supplies'
  | 'complaints'
  | 'general';

export interface WeeklyReport {
  id: string;
  category: ReportCategory;
  subject: string;
  description: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  date: string;
  submittedByUserId: string;
  submittedByName: string;
  status: 'open' | 'in_review' | 'resolved';
  assignedToUserId?: string;
  ownerResponse?: string;
  updatedAt: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export interface TaskChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  createdById: string;
  createdByName: string;
  priority: PriorityLevel;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  checklist: TaskChecklistItem[];
  notes: string;
}

export interface ProjectStep {
  id: string;
  title: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  timeframe: string;
  ownerId: string;
  ownerName: string;
  steps: ProjectStep[];
  notes: string;
}

export type InventoryCategory =
  | 'Acrylic & Liquid Monomer'
  | 'Gel & Builder Systems'
  | 'Tools, Brushes & Implements'
  | 'Sanitation & Disposables'
  | 'Student Kits & Packaging';

export type LeadTimeFlag = 'none' | 'china' | 'legacy_nails';

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unitCost: number;
  supplier: string;
  leadTimeFlag: LeadTimeFlag;
  lastUpdated: string;
  notes: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  location: string;
  attendeeIds: string[];
  description: string;
  visibility: 'invited' | 'owner_only';
  createdByUserId: string;
}

export type SuggestionStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'declined'
  | 'implemented';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  suggestedByUserId: string;
  suggestedByName: string;
  department: string;
  date: string;
  status: SuggestionStatus;
  ownerNotes?: string;
}

export interface ActivityItem {
  id: string;
  type:
    | 'payment'
    | 'cash_handoff'
    | 'deposit_received'
    | 'deposit_confirmed'
    | 'enrollment'
    | 'attendance'
    | 'report'
    | 'inventory'
    | 'tour';
  title: string;
  detail: string;
  actorName: string;
  timestamp: string;
  targetRoute: string;
  targetId?: string;
}

export interface PolicySettings {
  telemarketingCanSeeBalances: boolean;
}

export interface AppState {
  currentUserId: string | null;
  language: Language;
  nextReceiptNumber: number;
  policy: PolicySettings;
  users: DemoUser[];
  classes: AcademyClass[];
  students: Student[];
  payments: Payment[];
  deposits: Deposit[];
  attendance: AttendanceRecord[];
  classLogSubmissions: ClassLogSubmission[];
  cashHandoffs: CashHandoff[];
  missedClasses: MissedClassRecord[];
  tours: StudioTour[];
  reports: WeeklyReport[];
  tasks: Task[];
  projects: Project[];
  inventory: InventoryProduct[];
  meetings: Meeting[];
  suggestions: Suggestion[];
  activities: ActivityItem[];
}
