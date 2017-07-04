const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()

ObjectUtil = {}

ObjectUtil.dereference = function (model, id, cb, force) {
  if (!global[model])
    return cb()

  if (model === 'Room' && !force)
    return cb(null, null)

  if (!global[model].get)
    return cb()

  return global[model].get(id, cb)
}

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
    return pnu.formatNumberForMobileDialing(n)
  } catch (err) {
    throw Error.Validation(`Invalid phone number: ${phone_number}`)
  }
}

ObjectUtil.getCurrentUser = function() {
  return process.domain ? (process.domain.user ? process.domain.user.id : undefined) : undefined
}

module.exports = function () {}
