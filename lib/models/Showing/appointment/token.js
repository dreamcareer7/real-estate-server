const { expect } = require('chai')
const Crypto = require('../../Crypto')
const { get } = require('./get')

/**
 * Returns an encrypted token based on a few appointment details
 * @param {import('./types').ShowingAppointment} appointment
 */
function encodeToken(appointment) {
  const raw = JSON.stringify({
    id: appointment.id,
    time: appointment.time,
    contact: appointment.contact,
  })
  return Buffer.from(Crypto.encrypt(raw)).toString('base64')
}

/**
 * Returns an encrypted token based on a few appointment details
 * @param {string} token
 * @returns {Promise<import('./types').ShowingAppointment>}
 */
async function decodeToken(token) {
  const encrypted = Buffer.from(token, 'base64').toString('ascii')
  const payload = JSON.parse(Crypto.decrypt(encrypted))
  try {
    expect(payload).to.have.keys(['id', 'time', 'contact'])
  } catch {
    throw Error.ResourceNotFound('Invalid appointment token!')
  }

  const appointment = await get(payload.id)
  if (!appointment || appointment.contact !== payload.contact || appointment.time !== payload.time) {
    throw Error.ResourceNotFound('Invalid appointment token!')
  }

  return appointment
}

module.exports = {
  encodeToken,
  decodeToken,
}
