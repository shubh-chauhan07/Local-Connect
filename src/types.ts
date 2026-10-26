// Core domain types for LocalConnect

export type Role = 'worker' | 'employer' | 'admin';

export type VerificationState = 'verified' | 'demo_verified' | 'unverified';

export type PayBasis = 'per_hour' | 'per_shift' | 'per_day' | 'per_task';

export type PaymentTiming = 'same_day' | 'end_of_shift' | 'weekly' | 'after_completion';

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cash_or_upi';

export type EmploymentType = 'one_day' | 'weekend' | 'event' | 'part_time' | 'temporary';

export type JobCategory =
  | 'retail'
  | 'event_support'
  | 'packing'
  | 'delivery'
  | 'restaurant'
  | 'warehouse'
  | 'office_support';

export type JobStatus = 'draft' | 'published' | 'paused' | 'completed';

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type ContactPreference = 'call' | 'whatsapp' | 'app_message' | 'email';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  verification: VerificationState;
  createdAt: string;
  avatarColor: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  preferredArea: string;
  areas: string[]; // Ahmedabad localities willing to work in
  skills: string[];
  availability: string[]; // e.g. ['Weekday mornings','Weekends','Evenings']
  experienceYears: number;
  bio: string;
  rating: number; // 0-5 sample
  ratingCount: number;
  completedJobs: number;
  profileCompletion: number; // 0-100
  workHistory: WorkHistoryItem[];
}

export interface WorkHistoryItem {
  id: string;
  employerName: string;
  jobTitle: string;
  category: JobCategory;
  completedOn: string;
  rating: number;
  review: string;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  businessName: string;
  category: JobCategory;
  address: string;
  area: string;
  city: string;
  phone: string;
  description: string;
  verification: VerificationState;
  rating: number;
  ratingCount: number;
  jobsPosted: number;
  establishedYear: number;
}

export interface Job {
  id: string;
  employerId: string; // employer profile id
  employerUserId: string;
  title: string;
  category: JobCategory;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  workersNeeded: number;
  location: string;
  area: string;
  city: string;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  employmentType: EmploymentType;
  payAmount: number;
  payBasis: PayBasis;
  paymentTiming: PaymentTiming;
  paymentMethod: PaymentMethod;
  requirements: string[];
  contactPreference: ContactPreference;
  benefits: string[];
  status: JobStatus;
  createdAt: string;
  verification: VerificationState; // mirrors employer at posting time
  applicantsCount: number;
}

export interface Application {
  id: string;
  jobId: string;
  workerUserId: string;
  employerUserId: string;
  status: ApplicationStatus;
  message: string;
  appliedAt: string;
  updatedAt: string;
}

export interface SavedJob {
  id: string;
  jobId: string;
  workerUserId: string;
  savedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type:
    | 'application_received'
    | 'application_status'
    | 'job_status_changed'
    | 'saved_job'
    | 'report_update'
    | 'system';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterUserId: string;
  targetType: 'job' | 'user';
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'dismissed' | 'suspended';
  createdAt: string;
}

export interface Review {
  id: string;
  reviewerUserId: string;
  targetType: 'worker' | 'employer';
  targetId: string; // profile id
  jobId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Database {
  users: User[];
  workerProfiles: WorkerProfile[];
  employerProfiles: EmployerProfile[];
  jobs: Job[];
  applications: Application[];
  savedJobs: SavedJob[];
  notifications: NotificationItem[];
  reports: Report[];
  reviews: Review[];
  seededAt: string;
}

// ---- Label maps ----
export const CATEGORY_LABELS: Record<JobCategory, string> = {
  retail: 'Retail & Stores',
  event_support: 'Event Support',
  packing: 'Packing & Dispatch',
  delivery: 'Delivery',
  restaurant: 'Restaurant Help',
  warehouse: 'Warehouse',
  office_support: 'Office Support',
};

export const CATEGORY_ICONS: Record<JobCategory, string> = {
  retail: 'ShoppingBag',
  event_support: 'PartyPopper',
  packing: 'Package',
  delivery: 'Bike',
  restaurant: 'UtensilsCrossed',
  warehouse: 'Warehouse',
  office_support: 'Briefcase',
};

export const PAY_BASIS_LABELS: Record<PayBasis, string> = {
  per_hour: 'per hour',
  per_shift: 'per shift',
  per_day: 'per day',
  per_task: 'per task',
};

export const PAYMENT_TIMING_LABELS: Record<PaymentTiming, string> = {
  same_day: 'Same day',
  end_of_shift: 'End of shift',
  weekly: 'Weekly',
  after_completion: 'After completion',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  cash_or_upi: 'Cash or UPI',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  one_day: 'One day',
  weekend: 'Weekend',
  event: 'Event',
  part_time: 'Part-time',
  temporary: 'Temporary',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  completed: 'Completed',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const CONTACT_PREF_LABELS: Record<ContactPreference, string> = {
  call: 'Phone call',
  whatsapp: 'WhatsApp',
  app_message: 'In-app message',
  email: 'Email',
};

export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  verified: 'Verified',
  demo_verified: 'Demo Verified',
  unverified: 'Not Verified',
};
