export interface Card {
  id: number;
  board_list_id: number;
  title: string | null;
  invoice?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  checked: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  country_label_id?: number | null;
  country_label_ids?: number[] | null;
  intake_label_id?: number | null;
  service_area_id?: number | null;
  service_area_ids?: number[] | null;
  due_date?: string | null;
  payment_done?: boolean;
  dependant_payment_done?: boolean;
  is_archived?: boolean;
  members?: CardMember[];
}

export interface List {
  id: number;
  board_id: number;
  title: string;
  category?: 0 | 1 | 2 | null;
  position: number;
  created_at: string;
  updated_at: string;
  cards: Card[];
}

export interface Board {
  id: number;
  name: string;
  city_id: number;
  created_at: string;
  updated_at: string;
  lists: List[];
}

export interface Activity {
  id: number;
  card_id?: number;
  list_id?: number;
  user_name: string;
  action: string;
  details?: string;
  attachment_path?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  created_at: string;
}

export interface ActivityCardSummary {
  id: number;
  board_list_id?: number;
  invoice?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  boardList?: {
    id: number;
    title: string;
  } | null;
  board_list?: {
    id: number;
    title: string;
  } | null;
}

export interface ActivityListSummary {
  id: number;
  title: string;
}

export interface BoardActivity extends Activity {
  card?: ActivityCardSummary | null;
  list?: ActivityListSummary | null;
}

export interface Profile {
  first_name?: string | null;
  role_id?: number | null;
}

export interface CardMember {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role_id?: number | null;
}

export interface LabelOption {
  id: number;
  name: string;
}

export interface CardLabelBadge {
  name: string;
  kind: "country" | "intake" | "serviceArea";
}
