export interface User {
  id:         string
  email:      string
  name:       string
  plan:       'starter' | 'pro' | 'agency'
  product_id: string
  created_at: string
}
