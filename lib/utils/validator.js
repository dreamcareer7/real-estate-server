const amanda = require('amanda')('json')
const chai = require('chai')
const expect = chai.expect

const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const date_regex = /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/i
const url_regex = /^(ftp|http|https):\/\/[^ "]+$/i
const types = require('../types')

const uuidAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (!propertyValue)
    return callback()

  if (propertyValue)
    expect(propertyValue).to.be.a('string')

  if (propertyValue && propertyValue.match(uuid_regex))
    return callback()

  this.addError(`${propertyValue} is not a valid uuid.`)

  return callback()
}

const dateAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (propertyValue)
    expect(propertyValue).to.be.a('string')

  if (propertyValue && propertyValue.match(date_regex))
    return callback()

  this.addError(`${propertyValue} is not a valid date.`)

  return callback()
}

const phoneAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (!propertyValue)
    return callback()

  if (propertyValue)
    expect(propertyValue).to.be.a('string')

  // If it starts with a 0, meaning local number we default to US/Canada +1
  const v = propertyValue.replace(/^0/, '+1')

  if (v && pnu.isPossibleNumberString(v, 'US'))
    return callback()

  this.addError(`${v} is not a valid phone number.`)

  return callback()
}

const urlAttribute = function (property, propertyValue, attributeValue, propertyAttributes, callback) {
  if (!attributeValue)
    return callback()

  if (!propertyValue)
    return callback()

  if (propertyValue)
    expect(propertyValue).to.be.a('string')

  if (propertyValue && propertyValue.match(url_regex))
    return callback()

  this.addError(`${propertyValue} is not a valid url.`)

  return callback()
}

amanda.addAttribute('uuid', uuidAttribute)
amanda.addAttribute('date', dateAttribute)
amanda.addAttribute('phone', phoneAttribute)
amanda.addAttribute('url', urlAttribute)

function validate (schema, subject, cb) {
  amanda.validate(subject, schema, function (errors) {
    if (!errors)
      return cb()

    const details = {
      message: 'Validation Error',
      attributes: {}
    }

    for (let i = 0; i < errors.length; i++) {
      const err = errors[i]
      const property = err.property[0]

      if (!details.attributes[property])
        details.attributes[property] = []

      details.attributes[property].push(err.message)
    }

    details.message += '\n' + JSON.stringify(details.attributes, null, 2)

    return cb(Error.create(Error.VALIDATION, details))
  })
}

validate.isUUID = (value) => {
  return value.match(uuid_regex)
}

validate.expect = chai.expect
validate.types = types
validate.promise = require('../utils/promisify')(validate)

chai.Assertion.addProperty('uuid', function() {
  new chai.Assertion(this._obj, chai.util.flag(this, 'message')).to.be.a('string')

  this.assert(
    this._obj.match(uuid_regex)
    , 'expected #{this} to be a uuid.'
    , 'expected #{this} not to be a uuid.'
  )
})

chai.Assertion.addProperty('date', function() {
  const obj = this._obj

  function isValidDateString(str) {
    const d = new Date(str)
  
    if (Object.prototype.toString.call(d) === '[object Date]') {
      if (isNaN(d.getTime())) {
        return false
      }
      return true
    }
    return false
  }

  this.assert(
    isValidDateString(obj)
    , 'expected #{this} to be a date string'
    , 'expected #{this} to not be a date string'
    , obj
  )

})

chai.Assertion.addProperty('mui', function() {
  new chai.Assertion(this._obj).not.to.be.an('array')
  new chai.Assertion(this._obj).not.to.be.NaN
  new chai.Assertion(this._obj).to.have.length.within(7,8)
})

chai.Assertion.addProperty('mlsid', function() {
  new chai.Assertion(this._obj).not.to.be.an('array')
  new chai.Assertion(this._obj).not.to.be.NaN
  new chai.Assertion(this._obj).to.have.length.gte(5)
})

chai.Assertion.addProperty('phone', function() {
  if (this._obj === null || this._obj === undefined || this._obj.length < 1) return
  new chai.Assertion(this._obj).to.be.a('string')

  const v = this._obj.replace(/^0/, '+1')

  this.assert(
    v && pnu.isPossibleNumberString(v, 'US'),
    'expected #{this} to be a valid US phone number.',
    'expected #{this} not to be a valid US phone number.'
  )
})

module.exports = validate
