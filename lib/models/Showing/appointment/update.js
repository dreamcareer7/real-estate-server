const db = require('../../../utils/db')

/**
 * @param {UUID} appointmentId
 * @param {UUID} feedbackEmailId
 * @returns {Promise}
 */
async function updateFeedbackEmail (appointmentId, feedbackEmailId) {
  return db.update('showing/appointment/update_feedback_email_sent', [
    appointmentId,
    feedbackEmailId,
  ])
}

module.exports = {
  updateFeedbackEmail,
}
