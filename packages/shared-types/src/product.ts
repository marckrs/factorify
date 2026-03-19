export interface Product {
  id:          string
  name:        string
  slug:        string
  description: string
  status:      'development' | 'beta' | 'live' | 'sunset'
  mrr:         number
  created_at:  string
}

export interface Feature {
  id:         string
  product_id: string
  title:      string
  priority:   'critical' | 'high' | 'normal' | 'low'
  status:     'backlog' | 'in_progress' | 'done' | 'cancelled'
  agent:      string
}
