const { expect } = require('chai')
const Crypto = require('../../Crypto')

/**
 * Returns an encrypted token based on a few appointment details
 * @param {import('./types').ShowingAppointment} appointment
 */
function encodeToken(appointment) {
  return Crypto.encryptObject({
    id: appointment.id,
    time: appointment.time
  })
}

/**
 * Returns an encrypted token based on a few appointment details
 * @param {string} token
 * @returns {UUID}
 */
function decodeToken(token) {
  const payload = Crypto.decryptJSON(token)
  try {
    expect(payload).to.have.keys(['id', 'time', 'contact'])
  } catch {
    throw Error.ResourceNotFound('Invalid appointment token!!')
  }

  return payload.id
}

module.exports = {
  encodeToken,
  decodeToken,
}
