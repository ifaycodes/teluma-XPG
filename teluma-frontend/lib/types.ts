export interface GrantDetails {
  eligibility_requirements?: string | null
  restrictions?: string | null
  required_documents?: string | null
}

export interface Grant {
  id: string
  name: string
  amount: string
  deadline: string
  link: string
  applied: boolean
  description?: string | null
  details?: GrantDetails | null
}

export interface FeedData {
  prime_match: Grant[]
  moderate_fit: Grant[]
  low_probability: Grant[]
  is_limited?: boolean
}

export interface VaultDocument {
  id: string
  name: string
  tag: string
  file_type: string
  file_size_bytes: number
  uploaded_at: string
  gcs_path: string
}

export interface StorageInfo {
  used_mb: number
  limit_mb: number
  used_bytes: number
  limit_bytes: number
  remaining_bytes: number
}

export interface DashboardData {
  user: {
    full_name: string | null
    email: string
    plan: string
  }
  storage: {
    used_bytes: number
    limit_bytes: number
    used_mb: number
    limit_mb: number
  }
  stats: {
    total_grants: number
    applications_pending: number
    applications_submitted: number
    vault_documents: number
  }
}

export interface ActiveRun {
  run_id: string
  status: string
  triggered_at: string
  current_step: string | null
  step_extradata: any
}

export interface HistoryRun {
  run_id: string
  status: string
  triggered_at: string
  completed_at: string | null
}

export interface AgentStep {
  action: string
  actor: 'user' | 'agent'
  extra_data: any
  timestamp: string
}

export interface Application {
  id: string
  grant_id: string
  grant_name: string
  grant_amount: string
  grant_deadline: string
  status: string
  outline_gcs_path: string | null
  proposal_gcs_path: string | null
  budget_gcs_path: string | null
  started_at: string
  submitted_at: string | null
}

export interface ChatMessage {
  role: 'user' | 'agent'
  message: string
  created_at: string
}

export interface AppNotification {
  id: string
  type: 'success' | 'failure' | 'info'
  title: string
  message: string | null
  read: boolean
  created_at: string
}
