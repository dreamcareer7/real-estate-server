const validator = require('../../utils/validator.js')

const schema = require('./schemas').contact
const _validate = validator.promise.bind(null, schema)

async function validate(contacts) {
  for (const contact of contacts) {
    await _validate(contact)
  }
}

/** @param {IContact['touch_freq']} tf */
function validateTouchFreq (tf) {
  if (tf === null) { return }
  if (Number.isSafeInteger(tf) && Number(tf) >= 1) { return }

  throw Error.Validation('touch_freq must be null or or a safe integer greater then zero')
}

module.exports = {
  validate,
  validateTouchFreq,
}
