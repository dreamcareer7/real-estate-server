const db = require('../../../utils/db.js')
const { encryptTokens } = require('../../../utils/kms')


const updateTokens = async (id, tokens) => {
  const { aToken, rToken } = await encryptTokens(tokens)

  return db.update('microsoft/credential/update_tokens', [
    aToken,
    rToken,
    tokens.id_token,
    (new Date().getTime() + (tokens.expires_in * 1000)),
    (new Date().getTime() + (tokens.ext_expires_in * 1000)),
    id
  ])
}

const updateSendEmailAfter = async (id, ts) => {
  return await db.select('microsoft/credential/update_send_email_after', [id, ts])
}

const disconnect = async (id) => {
  return db.update('microsoft/credential/disconnect', [id, new Date()])
}

const revoke = async (id) => {
  return db.update('microsoft/credential/revoke', [id])
}

const updateProfile = async (id, profile) => {
  return db.update('microsoft/credential/update_profile', [
    profile.displayName || null,
    profile.givenName || null,
    profile.surname || null,
    profile.photo || null,
    id
  ])
}

const updateRechatMicrosoftCalendar = async (id, calendarId) => {
  return db.update('microsoft/credential/update_rechat_mcalendar', [id, calendarId])
}

const resetRechatMicrosoftCalendar = async (id) => {
  return updateRechatMicrosoftCalendar(id, null)
}


module.exports = {
  updateTokens,
  updateSendEmailAfter,
  disconnect,
  revoke,
  updateProfile,
  updateRechatMicrosoftCalendar,
  resetRechatMicrosoftCalendar
}