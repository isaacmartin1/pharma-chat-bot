export interface Company {
  id: string
  name: string
  slug: string
  country: string
}

export interface User {
  id: string
  email: string
  name: string
  company_id: string
  role: string
  drug_name?: string
}

export interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Asset {
  id: string
  session_id: string
  asset_type: string
  email_category?: string
  html_content: string | null
  ready: number
  version: number
  updated_at: string
}

export interface Upload {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
}

export interface ComplianceCheck {
  id: string
  name: string
  status: 'green' | 'yellow' | 'red'
  message: string
}

export interface ComplianceResult {
  overall: 'pass' | 'warning' | 'fail'
  checks: ComplianceCheck[]
}

export interface SessionDetail {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  messages: Message[]
  latest_asset: Asset | null
}
