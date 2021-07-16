const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')
const map = require('lodash/map')

const { templates } = AppointmentMailer

/** @typedef {require('../../../../types/models/Notification').INotificationPopulated} NotificationPopulated */
/** @typedef {require('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {require('../../../../types/models/User').IUserBase} User */
/** @typedef {*} AppointmentMailer */

/**
 * Extract all [subscribed] seller users from notification object
 * @param {NotificationPopulated} notif
 * @param {string} [action] - action to filter (cancel/confirm)
 * @returns {User[]}
 */
function allSubscribedUsers (notif, action = null) {
  assert.equal(notif.object_class, 'ShowingAppointment')

  const roles = notif.objects[0].showing.roles

  if (!['cancel', 'confirm'].contains(action)) {
    return map(roles, 'user')
  }

  const actionDeliveryType = `${action}_delivery_type`

  return roles
    .filter(r => r[actionDeliveryType]?.contains?.('email'))
    .map(r => r.user)
}

/**
 * Filter subject user ID from supplied users array (if needed)
 * @param {NotificationPopulated} notif
 * @param {User[]} users
 * @returns {User[]}
 */
function filterSubjectUser (notif, users) {
  if (notif.subject_class !== 'ShowingRole') { return users }

  const subjectUserId = notif?.subjects?.[0]?.user_id

  if (!subjectUserId) {
    assert.fail('Could not get User ID from Showing Role')
  }

  return users.filter(u => u.id !== subjectUserId)
}

/**
 * Tries to extract buyer email from notification object
 * @param {NotificationPopulated} notif
 * @returns {string}
 */
function buyerEmail (notif) {
  if (notif.subject_class === 'Contact') {
    return notif.subjects[0].email
  } else if (
    notif.object_class === 'ShowingAppointment'
      && notif.objects?.[0]?.contact?.email
  ) {
    return notif.objects[0].contact.email
  }

  assert.fail(`Could not extract buyer email from notification object: ${notif.id}`)
}

/**
 * Returns true, when the notification object contains an auto-approved showing
 * @param {NotificationPopulated} notif
 * @returns {boolean}
 */
function containsAutoApproveShowing (notif) {
  assert.equal(notif.object_class, 'ShowingAppointment')
  return notif.objects[0].showing.approal_type === 'None'
}

/**
 * This is a helper function to simplify following factory functions
 * @param {*} defaults - Default params passed to Mailer constructor
 * @param {*[]} mailers - Initial mailer objects 
 * @returns {{ push: Function, mailers: AppointmentMailer[] }}
 */
function mailerList (defaults = {}, mailers = []) {
  return {
    push: opts => mailers.push(new AppointmentMailer({ ...defaults, ...opts })),
    mailers,  
  } 
}

/**
 * Generates mailer objects for the notification
 * @param {NotificationPopulated} notif
 * @returns {AppointmentMailer[]}
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
  const result = mailerList({ notification: notif })

  const users = allSubscribedUsers(notif)
  
  switch(notif.action) {
    case 'Created':
      result.push({
        to: map(users, 'email'),
        toUserIds: map(users, 'id'),
        title: 'Appointment Booked',
        template: templates.toSeller('buyer_booked'),

      })

      if (containsAutoApproveShowing(notif)) {
        result.push({
          to: [buyerEmail(notif)],
          title: 'Appointment Booked and auto-approved',
          template: templates.toBuyer('booked_auto_approved'),
        })
      } else {
        result.push({
          to: [buyerEmail(notif)],
          title: 'Appointment Booked',
          template: templates.toBuyer('booked'),      
        })
      }
      break
      
    case 'Rescheduled':
      result.push({
        to: map(users, 'email'),
        toUserIds: map(users, 'id'),
        title: 'Appointment Rescheduled',
        template: templates.toSeller('buyer_rescheduled'),        
      })
      result.push({
        to: [buyerEmail(notif)],
        title: 'Appointment Rescheduled',
        template: templates.toBuyer('rescheduled'),
      })
      break
      
    case 'Canceled':
      result.push({
        to: map(users, 'email'),
        toUserIds: map(users, 'id'),
        title: 'Appointment Canceled',
        template: templates.toSeller('buyer_canceled'),
      })
      break

    case 'GaveFeedbackFor':
      result.push({
        to: map(users, 'email'),
        toUserIds: map(users, 'id'),
        title: 'Feedback for Appointment',
        template: templates.toSeller('buyer_sent_feedback'),
      })
      break
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }
 
  return result.mailers
}

function forSellerOriginatedNotification (notif) {
  assert.equal(notif.subject_class, 'ShowingRole')
  const result = mailerList()

  let users = [], otherUsers = []
  
  switch (notif.action) {
    case 'Confirmed':
      result.push({
        to: [buyerEmail(notif)],
        title: 'Appointment Confirmed',
        template: templates.toBuyer('seller_confirmed'),
      })
      break
      
    case 'Canceled':
      result.push({
        to: [buyerEmail(notif)],
        title: 'Appointment Canceled',
        template: templates.toBuyer('seller_canceled_after_confirm'),
      })

      users = allSubscribedUsers(notif, 'cancel')
      otherUsers = filterSubjectUser(notif, users)
      result.push({
        to: map(otherUsers, 'email'),
        toUserIds: map(otherUsers, 'id'),
        title: 'Appointment Canceled by Another Seller Role',
        template: templates.toSeller('another_seller_canceled'),
      })
      break
      
    case 'Rejected':
      result.push({
        to: [buyerEmail('seller_rejected')],
        title: 'Appointment Rejected',
        template: templates.toBuyer('seller_rejected'),
      })

      users = allSubscribedUsers(notif, 'cancel')
      otherUsers = filterSubjectUser(notif, users)
      result.push({
        to: map(otherUsers, 'email'),
        toUserIds: map(otherUsers, 'id'),
        title: 'Appointment Rejected by another Seller Role',
        template: templates.toSeller('another_seller_rejected'),
      })
      break
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }

  return result.mailers
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
    }
  })
}

module.exports = {
  forNotification,
  forBuyerOriginatedNotification,
  forSellerOriginatedNotification,
  forGetFeedbackEmail,
}
