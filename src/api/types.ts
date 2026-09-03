/**
 * Hand-written for the endpoints in use. These mirror docs/openapi.json exactly.
 *
 * They get replaced by types.gen.ts generated from that spec once there are
 * enough of them to be worth a generator. Trim as we build.
 * @spec openapi.json #/components/schemas
 */

/** The list envelope on every collection. */
export interface ListResponse<T> {
  object: 'list';
  url: string | null;
  has_more: boolean;
  next_cursor: string | null;
  previous_cursor: string | null;
  data: T[];
}

/** @spec DonorListItemV1 */
export interface DonorListItem {
  object: string;
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  organization: string | null;
  phone: string | null;
  role: 'Individual' | 'Organization';
}

/**
 * @spec DonorQuickStatsV1 - embedded on the DETAIL endpoint only.
 * Absent from DonorListItemV1, which is why anything donor-level costs N+1.
 */
export interface DonorQuickStats {
  object: string;
  lifetime_total: number | null;
  lifetime_gift_count: number | null;
  year_total: number | null;
  year_gift_count: number | null;
  last_gift: number | null;
  last_gift_date: number | null;
  include_soft_credits: boolean;
}

/** @spec DonorDetailV1 */
export interface DonorDetail extends Omit<DonorListItem, 'organization'> {
  quick_stats: DonorQuickStats;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  organization_name: string | null;
  notes: string | null;
  include_soft_credits: boolean;
}

/** @spec GiftV1 - `date` is epoch SECONDS, like every date in their REST responses. */
export interface Gift {
  object: string;
  id: number;
  donor_id: number;
  type: string | null;
  gift_type: string | null;
  amount: number | null;
  subject: string | null;
  description: string | null;
  fund_id: string | null;
  campaign_id: number | null;
  is_completed: boolean;
  gift_acknowledgement_sent: boolean;
  date: number;
  soft_credits: unknown[] | null;
}

/** @spec DonorActivityV1 - id is source-local, unique only within a source. */
export interface DonorActivity {
  object: string;
  id: number;
  source: 'Logged' | 'Email' | 'Sms' | 'Award' | 'GeneralApplication';
  activity_type: string | null;
  subject: string | null;
  description: string | null;
  date: number;
  amount: number | null;
  fund_id: string | null;
}

/** @spec AwardCycleV1 */
export interface AwardCycle {
  object: string;
  id: number;
  name: string | null;
  is_current: boolean;
  is_next: boolean;
  application_start_date: number | null;
  application_end_date: number | null;
}

/** @spec FundListItemV1 */
export interface Fund {
  object: string;
  id: number;
  fund_id: string | null;
  remaining_balance: number | null;
  fund_type: string | null;
  is_endowed: boolean;
}

/** @spec AwardedStudentV1 */
export interface AwardedStudent {
  object: string;
  id: number;
  scholarship_id: number;
  scholarship_name: string | null;
  fund_id: string | null;
  student_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  awarded_date: number | null;
  awarded_amount: number;
}
