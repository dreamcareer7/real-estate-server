const { expect } = require('chai')
const Crypto = require('../../Crypto')
const { get } = require('./get')

/**
 * Returns an encrypted token based on a few appointment details
 * @param {import('./types').ShowingAppointment} appointment
 */
function encodeToken(appointment) {
  return Crypto.encryptObject({
    id: appointment.id,
    time: appointment.time,
    contact: appointment.contact
  })
}

/**
 * Returns an encrypted token based on a few appointment details
 * @param {string} token
 * @returns {Promise<import('./types').ShowingAppointment>}
 */
async function decodeToken(token) {
  const payload = Crypto.decryptJSON(token)
  try {
    expect(payload).to.have.keys(['id', 'time', 'contact'])
  } catch {
    throw Error.ResourceNotFound('Invalid appointment token!!')
  }

  const appointment = await get(payload.id)
  if (!appointment || appointment.contact !== payload.contact || appointment.time.toISOString() !== payload.time) {
    throw Error.ResourceNotFound('Invalid appointment token!')
  }

  return appointment
}

module.exports = {
  encodeToken,
  decodeToken,
}
