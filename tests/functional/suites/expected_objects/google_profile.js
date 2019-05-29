const v = require('./validation.js')

module.exports = {
  id: String,
  type: String,
  user: String,
  brand: String,
  email: String,
  messages_total: Number,
  threads_total: Number,
  history_id: Number,
  access_token: String,
  refresh_token: String,
  expiry_date: String,
  scope: String,
  last_profile_sync_at: String,
  contacts_sync_token: String,
  last_contacts_sync_at: String,
  contact_groups_sync_token: String,
  last_contact_groups_sync_at: String,
  messages_sync_token: String,
  last_messages_sync_at: String,
  revoked: Boolean,
  created_at: String,
  updated_at: String,
  deleted_at: String
}
