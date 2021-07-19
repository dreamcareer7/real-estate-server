const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')

const { templates } = AppointmentMailer

/** @typedef {require('../../../../types/models/Notification').INotificationPopulated} NotificationPopulated */
/** @typedef {require('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {require('../../../../types/models/User').IUserBase} User */
/** @typedef {*} AppointmentMailer */

/**
 * Returns true, when the notification object contains an auto-approved showing
 * @param {NotificationPopulated} notif
 * @returns {boolean}
 */
function containsAutoApproveShowing (notif) { // eslint-disable-line no-unused-vars
  assert.equal(notif.object_class, 'ShowingAppointment')
  return notif.objects[0].showing.approal_type === 'None'
}

/**
 * Generates mailer objects for the notification
 * @param {NotificationPopulated} notif
 * @returns {AppointmentMailer | null}
 */ 
function forNotification (notif) {
  assert.equal(notif.object_class, 'ShowingAppointment')

  switch (notif.subject_class) {
    case 'Contact':
      return forBuyerOriginatedNotification(notif)
    case 'ShowingRole':
      return forSellerOriginatedNotification(notif)
    default:
      assert.fail(`Invalid subject-class for showing-notification: ${notif.subject_class}`)  
  }
}

function forBuyerOriginatedNotification (notif) {
  assert.equal(notif.subject_class, 'Contact')
  
  switch(notif.action) {
    case 'Created':
      /* TODO: WIP */
      break
      
    case 'Rescheduled':
      /* TODO: WIP */
      break
      
    case 'Canceled':
      /* TODO: WIP */
      break

    case 'GaveFeedbackFor':
      /* TODO: WIP */
      break
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }
 
  return null
}

function forSellerOriginatedNotification (notif) {
  assert.equal(notif.subject_class, 'ShowingRole')
  
  switch (notif.action) {
    case 'Confirmed':
      /* TODO: WIP */
      break
      
    case 'Canceled':
      /* TODO: WIP */
      break
      
    case 'Rejected':
      /* TODO: WIP */
      break
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }

  return null
}

/**
 * Creates a mailer to send get-feedback email to buyer
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
function forGetFeedbackEmail (appt) {
  return AppointmentMailer({
    to: [appt.contact.email],
    title: 'What\'s Your Feedback',
    template: templates.toBuyer('get_feedback'),
    customBindings: {
      /* TODO: WIP */
    },
  })
}

module.exports = {
  forNotification,
  forBuyerOriginatedNotification,
  forSellerOriginatedNotification,
  forGetFeedbackEmail,
}
