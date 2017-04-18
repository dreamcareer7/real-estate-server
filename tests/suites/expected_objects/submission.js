const v = require('./validation.js')
const File = require('./file.js')

const submission = {
  type: 'form_submission',
  id: String,
  last_revision: String,
  state: String,
  formstack_id: Number,
  author: String,
  deal: String,
  title: String,
  file: File
}

const revision = {
  id: String,
  values: Object
}

module.exports = {submission, revision}