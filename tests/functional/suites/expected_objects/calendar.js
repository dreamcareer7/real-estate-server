const v = require('./validation.js')

const object_types_enum = function (val) {
  const enumArr = ['crm_task', 'deal_context', 'contact_attribute', 'contact', 'email_campaign']
  
  if( enumArr.indexOf(val) < 0 )
    throw 'Object_type is not valid'

  return
}


module.exports = {
  id: String,
  created_by: String,
  title: String,

  object_type: object_types_enum,
  event_type: String,
  type_label: String,

  timestamp: Number,
  date: String,
  next_occurence: String,
  timestamp_readable: String,
  timestamp_midday: String,
  
  recurring: Boolean,
  users: v.optionalArray,
  status: String,
  metadata: v.optionalObject,
  
  type: 'calendar_event'
}
