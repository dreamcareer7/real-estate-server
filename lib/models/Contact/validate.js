const validator = require('../../utils/validator.js')

const schema = require('./schemas').contact
const _validate = validator.promise.bind(null, schema)

async function validate(contacts) {
  for (const contact of contacts) {
    await _validate(contact)
  }
}

module.exports = {
  validate,
}
