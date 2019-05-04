const v = require('../validation.js')

module.exports = {
  type: 'file',
  id: String,
  created_at: Number,
  updated_at: Number,
  deleted_at: v.optionalString,
  created_by: String,
  path: String,
  name: String,
  public: Boolean,
  url: String,
  preview_url: String,
  mime: String
}
