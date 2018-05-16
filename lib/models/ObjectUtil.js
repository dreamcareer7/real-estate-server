const pnu = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const _ = require('lodash')

const ObjectUtil = {
  cleanPhoneNumber(number) {
    return number.replace(/[|&;$%@"<>(), ]/g, '')
  },

  makeRegexps(strings) {
    return strings.map(function(r) {
      return '.*' + r + '.*'
    })
  },

  trimLeadingZeros(value) {
    return value.replace(/^0*/g, '')
  },

  obfuscateString(string) {
    const start = parseInt(string.length / 4)
    const end = parseInt(string.length - start)

    return (
      string.substring(0, start) +
      Array(end - start + 1).join('x') +
      string.substring(end, string.length)
    )
  },

  formatPhoneNumberForDialing(phone_number) {
    if (!phone_number) return null

    // Remove leading zeros
    try {
      phone_number = phone_number.replace(/^0/, '')
      const n = pnu.parse(phone_number, 'US')
      const fmt = pnu.formatNumberForMobileDialing(n)
      if (_.isEmpty(fmt))
        throw Error.Validation(`${phone_number} is not a valid phone number.`)
      return fmt
    } catch (err) {
      throw Error.Validation(`${phone_number} is not a valid phone number.`)
    }
  },

  /**
   * @returns {UUID}
   */
  getCurrentUser() {
    return process.domain
      ? process.domain.user ? process.domain.user.id : undefined
      : undefined
  }
}

global['ObjectUtil'] = ObjectUtil
module.exports = ObjectUtil
