export interface Subscription {
  id:            string
  user_id:       string
  product_id:    string
  plan:          string
  price_brl:     number
  status:        'active' | 'cancelled' | 'past_due'
  stripe_id:     string
  created_at:    string
  cancelled_at?: string
}
