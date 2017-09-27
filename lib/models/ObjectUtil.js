const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const _u = require('lodash')

ObjectUtil = {}

ObjectUtil.cleanPhoneNumber = function (number) {
  return number.replace(/[|&;$%@"<>(),\ ]/g, '')
}

ObjectUtil.makeRegexps = function (strings) {
  return strings.map(function (r) {
    return '.*' + r + '.*'
  })
}

ObjectUtil.trimLeadingZeros = function (value) {
  return value.replace(/^0*/g, '')
}

ObjectUtil.obfuscateString = function (string) {
  const start = parseInt(string.length / 4)
  const end = parseInt(string.length - (start))

  return string.substring(0, start) +
    Array(end - start + 1).join('x') +
    string.substring(end, string.length)
}

ObjectUtil.formatPhoneNumberForDialing = function (phone_number) {
  if (!phone_number)
    return null

  // Remove leading zeros
  try {
    phone_number = phone_number.replace(/^0/, '')
    const n = pnu.parse(phone_number, 'US')
    const fmt = pnu.formatNumberForMobileDialing(n)
    if (_u.isEmpty(fmt))
      throw Error.Validation(`${phone_number} is not a valid phone number.`)
    return fmt
  } catch (err) {
    throw Error.Validation(`${phone_number} is not a valid phone number.`)
  }
}

ObjectUtil.getCurrentUser = function() {
  return process.domain ? (process.domain.user ? process.domain.user.id : undefined) : undefined
}

module.exports = function () {}
