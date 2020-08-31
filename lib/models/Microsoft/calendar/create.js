const db = require('../../../utils/db.js')


/**
 * @param {UUID} credentialId
 * @param {Object} calendar 
 */
const createLocal = async function (credentialId, calendar) {
  return db.insert('microsoft/calendar/insert',[
    credentialId,
    calendar.id,
    calendar.name || null,
    calendar.color || null,
    calendar.changeKey || null,
    calendar.canShare || null,
    calendar.canViewPrivateItems || null,
    calendar.canEdit || null,
    JSON.stringify(calendar.owner || {}),
    calendar.origin || 'rechat'
  ])
}


module.exports = {
  createLocal
}