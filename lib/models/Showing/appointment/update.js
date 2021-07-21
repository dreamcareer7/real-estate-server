const db = require('../../../utils/db')

/**
 * @param {UUID} appointmentId
 * @param {boolean} feedbackEmailSent
 * @returns {Promise}
 */
async function updateFeedbackEmailSent (appointmentId, feedbackEmailSent) {
  return db.update('showing/appointment/update_feedback_email_sent', [
    appointmentId,
    feedbackEmailSent
  ])
}

module.exports = {
  updateFeedbackEmailSent,
}
