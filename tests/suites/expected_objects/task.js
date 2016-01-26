var transaction = require('./transaction.js');
var v = require('../../../lib/utils/response_validation.js');

module.exports =
{
  "type": String,
  "id": String,
  "title": String,
  "due_date": v.optionalNumber,
  "status": String,
  "transaction": v.optionalString,
  "created_at": v.optionalNumber,
  "updated_at": v.optionalNumber,
  "deleted_at": v.optionalNumber,
  "contacts": v.optionalStringArray,
  "attachments": v.optionalArray
};