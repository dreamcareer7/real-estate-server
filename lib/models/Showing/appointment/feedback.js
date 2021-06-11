const { expect } = require('chai')
const db = require('../../../utils/db')

/**
 * @param {UUID} appointment 
 * @param {import('./types').AppointmentFeedback} feedback 
 */
async function setFeedback(appointment, feedback) {
  expect(feedback, 'questions and answers fields are mandatory').to.include.keys(['questions', 'answers'])
  if (feedback.comment) {
    expect(feedback.comment, 'Comment is an optional string').to.be.a.string
  }

  return db.update('showing/appointment/feedback', [
    appointment,
    JSON.stringify({
      questions: feedback.questions,
      answers: feedback.answers,
      comment: feedback.comment ?? null
    })
  ])
}

module.exports = {
  setFeedback,
}
