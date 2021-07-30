const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')
const Orm = require('../../Orm')
const utils = require('./utils')

const { templates } = AppointmentMailer

/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {INotification & HasUser} NotificationWithUser */
/** @typedef {INotificationPopulated & HasUser} NotificationPopulatedWithUser */
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
  'showing_approval.role',
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

  /** @type {ShowingAppointmentPopulated} */
  const appt = notif.objects[0]
  
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
        customBindings: {
          firstName: user.first_name,
          time: appt.time,
          approveUrl: await utils.shortApprovalLinkTo('approve', appt, user),
          rejectUrl: await utils.shortApprovalLinkTo('reject', appt, user),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractContactBindings(appt),
        },
      })
      
    case 'Rescheduled':
      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Buyer Rescheduled',
        template: templates.toSeller('buyer_rescheduled'),
        customBindings: {
          firstName: user.first_name,
          time: appt.time,
          approveUrl: await utils.shortApprovalLinkTo('approve', appt, user),
          rejectUrl: await utils.shortApprovalLinkTo('reject', appt, user),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractContactBindings(appt),          
        },
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
        customBindings: {
          firstName: user.first_name,
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractContactBindings(appt),
        },
      })

    case 'GaveFeedbackFor':
      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Buyer Gave Feedback',
        template: templates.toSeller('buyer_sent_feedback'),
        customBindings: {
          firstName: user.first_name,
          time: appt.time,
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractContactBindings(appt),
          feedback: await utils.extractFeedbackBindings(appt),
        },
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

  /** @type {ShowingAppointmentPopulated} */
  const appt = notif.objects[0]
  
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
        template: templates.toSeller('another_seller_confirmed'),
        customBindings: {
          firstName: user.first_name,
          time: appt.time,
          listing: await utils.extractListingBindings(appt),
        },
      })
      
    case 'Canceled':
      user = subscribedUser(notif, 'cancel')
      if (!user) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Another Seller Agent Canceled',
        template: templates.toSeller('another_seller_canceled'),
        customBindings: {
          firstName: user.first_name,
          time: appt.time,
          canceler: await utils.extractApprovalBindings(appt, false),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractContactBindings(appt),
        },
      })
      
    case 'Rejected':
      user = subscribedUser(notif, 'cancel')
      if (!user) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [user.email],
        toUserIds: [user.id],
        title: 'Another Seller Agent Rejected',
        template: templates.toSeller('another_seller_rejected'),
        customBindings: {
          firstName: user.first_name,
          time: appt.time,
          rejecter: await utils.extractApprovalBindings(appt, false),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractContactBindings(appt),
        },
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
      firstName: appt.contact.first_name,
      feedbackUrl: await utils.shortLinkTo('feedback', appt),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractContactBindings(appt),
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
      firstName: appt.contact.first_name,
      listing: await utils.extractListingBindings(appt),
      time: appt.time,
      instruction: /** @type {*} */(appt.showing).instructions,
      contact: await utils.extractContactBindings(appt),
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
      firstName: appt.contact.first_name,
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractContactBindings(appt),
      rejecter: await utils.extractApprovalBindings(appt, false),
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
        firstName: appt.contact.first_name,
        time: appt.time,
        listing: await utils.extractListingBindings(appt),
        contact: await utils.extractContactBindings(appt),
      }
    })
  }
  
  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Appointment Requested',
    template: templates.toBuyer('booked'),
    customBindings: {
      firstName: appt.contact.first_name,
      time: appt.time,
      rescheduleUrl: await utils.shortLinkTo('reschedule', appt),
      cancelUrl: await utils.shortLinkTo('cancel', appt),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractContactBindings(appt),
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
      firstName: '',
      time: appt.time,
      canceler: await utils.extractApprovalBindings(appt, false),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractContactBindings(appt),
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
      firstName: appt.contact.first_name,
      time: appt.time,
      listings: await utils.extractListingBindings(appt),
      contact: await utils.extractContactBindings(appt),
    }
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */
async function forReceivedFeedback (apptObj) {
  const appt = await populateAppointment(apptObj)

  return new AppointmentMailer({
    to: [appt.contact.email],
    title: 'Feedback Sent',
    template: templates.toBuyer('feedback_sent'),
    customBindings: {
      firstName: appt.contact.first_name,
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractContactBindings(appt),
    }
  })
}

/**
 * Used to render an email template using mock data. This just added for tests
 * @param {string} tpl - template name. example: 'to-buyer/booked'
 * @param {*} bindings
 * @param {boolean=} [open=true]
 */
async function renderMock (tpl, bindings, open = true) {
  const lst = bindings.listing
  if (lst) {
    lst.mapUrl || (lst.mapUrl = await utils.staticMap({ center: 'Tehran' }))
    lst.photoUrl || (lst.photoUrl = 'https://i.ibb.co/d6SQC6z/listing.png')
  }

  const cont = bindings.contact
  if (cont) {
    cont.avatarUrl || (cont.avatarUrl = 'https://i.ibb.co/8DGMHmv/agent.png')
  }

  if (bindings.listing && !bindings.listing.photoUrl) {
    bindings.listing.photoUrl
  }
  
  const promisify = require('../../../utils/promisify')
  const { mjml } = require('../../../utils/render')
  const { resolve } = require('path')
  const os = require('os')

  tpl = resolve(__dirname, '../../../mjml/showing/appointment', `${tpl}.mjml`)
  
  const resultPath = resolve(os.tmpdir(), `render${Math.random() * 1e5 | 0}.html`)
  const result = await promisify(mjml)(tpl, bindings)
  await require('fs/promises').writeFile(resultPath, result)

  console.info(`HTML saved to: ${resultPath}`)
  
  if (open) {
    const cmd = process.platform === 'win32' ? 'start' : 'xdg-open'
    require('child_process').execSync(`${cmd} ${resultPath}`)
  }
  
  return resultPath
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
  renderMock,
}
