const amanda = require('amanda')('json')
const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const date_regex = /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/i

const uuidAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (!propertyValue)
    return callback()

  if (propertyValue && propertyValue.match(uuid_regex))
    return callback()

  this.addError('Not a valid UUID')

  return callback()
}

const dateAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (propertyValue && propertyValue.match(date_regex))
    return callback()

  this.addError('Not a valid Date')

  return callback()
}

const phoneAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (!propertyValue)
    return callback()

  // If it starts with a 0, meaning local number we default to US/Canada +1
  const v = propertyValue.replace(/^0/, '+1')

  if (v && pnu.isPossibleNumberString(v, 'US'))
    return callback()

  this.addError('Not a valid Phone Number')

  return callback()
}

amanda.addAttribute('uuid', uuidAttribute)
amanda.addAttribute('date', dateAttribute)
amanda.addAttribute('phone', phoneAttribute)

function validate (schema, subject, cb) {
  amanda.validate(subject, schema, function (errors) {
    if (!errors)
      return cb()

    const details = {
      message:    'Validation Error',
      attributes: {}
    }

    for (let i = 0; i < errors.length; i++) {
      const err = errors[i]
      const property = err.property[0]

      if (!details.attributes[property])
        details.attributes[property] = []

      details.attributes[property].push(err.message)
    }

    return cb(Error.create(Error.VALIDATION, details))
  })
}

module.exports = validate
