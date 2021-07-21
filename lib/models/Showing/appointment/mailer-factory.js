const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')
const Orm = require('../../Orm')

const { templates } = AppointmentMailer

/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {INotification & HasUser} NotificationWithUser */
/** @typedef {INotificationPopulated & HasUser} NotificationPopulatedWithUser */
/** @typedef {{ send: () => Promise<IModel[]> }} CompoundMailer */
/** @typedef {{ user: string }} HasUser */

/**
 * @param {NotificationPopulatedWithUser} notif
 * @param {'confirm' | 'cancel' | null} [action=null]
 * @returns {IUser | null}
 */
function subscribedUser (notif, action = null) {
  assert.equal(notif.object_class, 'ShowingAppointment')
  assert.equal(typeof notif.user, 'string')

  const role = notif?.objects?.[0]?.showing?.roles?.find?.(
    r => r.user.id === notif.user
  )

  if (!role) { return null }

  if (!action) { return role.user }

  const adt = `${action}_delivery_type`
  
  return role[adt]?.includes('email') ? role.user : null
}

/**
 * @param {AppointmentMailer[]} mailers
 * @returns {CompoundMailer}
 */
function compoundMailer (mailers) {
  return {
    send: () => Promise.all(mailers.map(m => m.send()))
  }
}

/**
 * @param {NotificationWithUser} notifObj
 * @param {string[]=} [associations]
 * @returns {Promise<NotificationPopulatedWithUser>}
 */
async function populateNotification (notifObj, associations = [
  'notification.subjects',
  'notification.objects',
  'showing_appointment.approvals',
  'showing_appointment.contact',
  'showing_appointment.showing',
  'showing_role.user',
  'showing.gallery',
  'showing.roles',
]) {
  assert.equal(/** @type {any} */(notifObj).type, 'notification')

  return Orm.populate({ models: [notifObj], associations }).then(arr => arr[0])
}

/**
 * @param {ShowingAppointment} apptObj
 * @param {string[]=} [associations]
 * @returns {Promise<ShowingAppointmentPopulated>}
 */
async function populateAppointment (apptObj, associations = [
  'showing_appointment.approvals',
  'showing_appointment.contact',
  'showing_appointment.showing',
  'showing_role.user',
  'showing.gallery',
  'showing.roles',
]) {
  assert.equal(/** @type {any} */(apptObj).type, 'showing_appointment')

  return Orm.populate({ models: [apptObj], associations }).then(arr => arr[0])
}

/**
 * Generates mailer objects for the notification
 * @param {NotificationWithUser} notifObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forNotification (notifObj) {
  assert.equal(notifObj.object_class, 'ShowingAppointment')

  switch (notifObj.subject_class) {
    case 'Contact':
      return forBuyerOriginatedNotification(notifObj)
    case 'ShowingRole':
      return forSellerOriginatedNotification(notifObj)
    default:
      assert.fail(`Invalid subject-class for showing-notification: ${notifObj.subject_class}`)  
  }
}

/**
 * @param {NotificationWithUser} notifObj
 * @returns {Promise<AppointmentMailer?>}
 */
async function forBuyerOriginatedNotification (notifObj) {
  assert.equal(notifObj.subject_class, 'Contact')
  
  const notif = await populateNotification(notifObj)

  let user = subscribedUser(notif)
  if (!user) { return null }
  
  switch(notif.action) {
    case 'Created':
      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Buyer Booked',
        template: templates.toSeller('buyer_booked'),
      })
      
    case 'Rescheduled':
      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Buyer Rescheduled',
        template: templates.toSeller('buyer_rescheduled'),
      })
      
    case 'Canceled':
      user = subscribedUser(notif, 'cancel')
      if (!user) { return null }
      
      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Buyer Canceled',
        template: templates.toSeller('buyer_canceled'),
      })

    case 'GaveFeedbackFor':
      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Buyer Gave Feedback',
        template: templates.toSeller('buyer_sent_feedback'),
      })
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }
  
  return null
}

/**
 * @param {NotificationWithUser} notifObj
 * @returns {Promise<AppointmentMailer?>}
 */
async function forSellerOriginatedNotification (notifObj) {
  assert.equal(notifObj.subject_class, 'ShowingRole')

  const notif = await populateNotification(notifObj)
  
  let user
  
  switch (notif.action) {
    case 'Confirmed':
      user = subscribedUser(notif, 'confirm')
      if (!user) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Another Seller Agent Confirmed',
        template: templates.toSeller('another_seller_confirmed')
      })
      
    case 'Canceled':
      user = subscribedUser(notif, 'cancel')
      if (!user) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Another Seller Agent Canceled',
        template: templates.toSeller('another_seller_canceled')
      })
      
    case 'Rejected':
      user = subscribedUser(notif, 'cancel')
      if (!user) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Another Seller Agent Rejected',
        template: templates.toSeller('another_seller_rejected')
      })
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }

  return null
}

/**
 * Creates a mailer to send get-feedback email to buyer
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forGetFeedbackEmail (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'What\'s Your Feedback',
    template: templates.toBuyer('get_feedback'),
    customBindings: {
      /* TODO: WIP */
    },
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forConfirmedAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Appointment Confirmed',
    template: templates.toBuyer('seller_confirmed'),
    customBindings: {
      // TODO: WIP
    }
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forRejectedAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Appointment Rejected',
    template: templates.toBuyer('seller_rejected'),
    customBindings: {
      // TODO: WIP
    }
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forRequestedAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)

  if (appt.showing.approval_type === 'None') {
    return new AppointmentMailer({
      to: [appt.contact.email],
      title: 'Appointment Requested and Automatically Approved',
      template: templates.toBuyer('booked_auto_approved'),
      customBindings: {
        // TODO: WIP
      }
    })
  }
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Appointment Requested',
    template: templates.toBuyer('booked'),
    customBindings: {
      // TODO: WIP
    }
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forCanceledAppointmentAfterConfirm (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Appointment Canceled after Confirm',
    template: templates.toBuyer('seller_canceled_after_confirm'),
    customBindings: {
      // TODO: WIP
    }
  })  
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forRescheduledAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Appointment Rescheduled',
    template: templates.toBuyer('rescheduled'),
    customBindings: {
      // TODO: WIP
    }
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<CompoundMailer?>}
 */
async function forReceivedFeedback (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  const users = appt.showing.roles.map(r => r.user)

  return compoundMailer([
    new AppointmentMailer({
      to: [appt.contact.email],
      title: 'Feedback Sent',
      template: templates.toBuyer('feedback_sent'),
      customBindings: {
        // TODO: WIP
      }
    }),
    new AppointmentMailer({
      to: users.map(u => u.email),
      toUserIds: users.map(u => u.id),
      title: 'Feedback Received',
      template: templates.toSeller('buyer_sent_feedback'),
      customBindings: {
        // TODO: WIP
      }
    }),
  ])
}

module.exports = {
  forNotification,
  forBuyerOriginatedNotification,
  forSellerOriginatedNotification,
  forGetFeedbackEmail,
  forConfirmedAppointment,
  forRejectedAppointment,
  forRequestedAppointment,
  forCanceledAppointmentAfterConfirm,
  forRescheduledAppointment,
  forReceivedFeedback,
}
