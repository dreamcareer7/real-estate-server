const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')

const { templates } = AppointmentMailer

/** @typedef {require('../../../../types/models/Notification').INotificationPopulated} NotificationPopulated */
/** @typedef {require('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {require('../../../../types/models/User').IUserBase} User */
/** @typedef {*} AppointmentMailer */

/**
 * @param {NotificationPopulated} notif
 * @param {'confirm' | 'cancel' | null} [action=null]
 * @returns {User | null}
 */
function subscribedUser (notif, action = null) {
  assert.equal(notif.object_type, 'ShowingAppointment')
  assert.equal(typeof notif.user, 'string')

  const role = notif?.objects?.[0]?.showing?.roles?.find?.(
    r => r.user.id === notif.user
  )

  if (!role) { return null }

  if (!action) { return role.user }

  const adt = `${action}_delivery_type`
  
  return role[adt]?.includes('email') ? role.user : null
}

function compoundMailer (mailers) {
  return {
    send: async () => Promise.all(mailers.map(m => m.send()))
  }
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

function forSellerOriginatedNotification (notif) {
  assert.equal(notif.subject_class, 'ShowingRole')

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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
function forGetFeedbackEmail (appt) {
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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
async function forConfirmedAppointment (appt) {
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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
async function forRejectedAppointment (appt) {
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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
async function forRequestedAppointment (appt) {
  assert(appt.showing, 'missing appointment association: showing')

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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
async function forCanceledAppointmentAfterConfirm (appt) {
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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {AppointmentMailer}
 */ 
async function forRescheduledAppointment (appt) {
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
 * @param {ShowingAppointmentPopulated} appt
 * @returns {{ send: () => Promise<void> }}
 */
async function forReceivedFeedback (appt) {
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
