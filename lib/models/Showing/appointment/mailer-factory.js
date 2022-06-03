const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')
const Orm = require('../../Orm')
const utils = require('./mailer-utils')

const { templates } = AppointmentMailer

/** @typedef {import('./types').ShowingAppointment} ShowingAppointment */
/** @typedef {import('./types').ShowingAppointmentPopulated} ShowingAppointmentPopulated */
/** @typedef {INotification & HasUser} NotificationWithUser */
/** @typedef {INotificationPopulated & HasUser} NotificationPopulatedWithUser */
/** @typedef {{ user: string }} HasUser */

/**
 * @param {NotificationPopulatedWithUser} notif
 * @param {'confirm' | 'cancel' | null} [action=null]
 * @returns {ShowingRolePopulated | null}
 */
function subscribedRole (notif, action = null) {
  assert.equal(notif.object_class, 'ShowingAppointment')

  const userId = notif.user ?? notif.specific
  assert.equal(typeof userId, 'string')

  const roles = notif?.objects?.[0]?.showing?.roles
  assert(
    Array.isArray(roles) && roles?.length,
    `Unable to extract roles from notification ${notif.id}`,
  )

  const role = roles.find(r => r.user_id === userId) ?? null
  if (!role || !action) { return role }

  return role[`${action}_notification_type`].includes('email') ? role : null
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
  'showing.listing',
  'showing.roles',
  'showing_approval.role',
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
  'showing.listing',
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

  // TODO: filter non-email notifications using the poller query
  if (notifObj.transports && !notifObj.transports.includes('email')) {
    return null
  }

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
  
  let role = subscribedRole(notif)
  if (!role) {
    Context.log('forBuyerOriginatedNotification - missing subscribed user')
    return null
  }
  
  switch(notif.action) {
    case 'Created':
      Context.log('MailerFactory - Appointment Requested. Role Email: ' + role.email)
      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Buyer Booked',
        template: templates.toSeller('buyer_booked'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          approveUrl: await utils.shortApprovalLinkTo('confirm', appt, role.user),
          rejectUrl: await utils.shortApprovalLinkTo('reject', appt, role.user),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractBuyerContactBindings(appt),
        },
      })
      
    case 'Rescheduled':
      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Buyer Rescheduled',
        template: templates.toSeller('buyer_rescheduled'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          approveUrl: await utils.shortApprovalLinkTo('confirm', appt, role.user),
          rejectUrl: await utils.shortApprovalLinkTo('reject', appt, role.user),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractBuyerContactBindings(appt),          
        },
      })
      
    case 'Canceled':
      role = subscribedRole(notif, 'cancel')
      Context.log('ContactCanceledAppointment - subscribedRole: ' + (role?.id || '?'))
      if (!role) { return null }
      
      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Buyer Canceled',
        template: templates.toSeller('buyer_canceled'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractBuyerContactBindings(appt),
        },
      })

    case 'GaveFeedbackFor':
      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Buyer Gave Feedback',
        template: templates.toSeller('buyer_sent_feedback'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractBuyerContactBindings(appt),
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
  
  let role
  
  switch (notif.action) {
    case 'Confirmed':
      role = subscribedRole(notif, 'confirm')
      if (!role) { return null }

      const urls = {}
      if (appt.showing.approval_type === 'Any') {
        urls.cancelUrl = await utils.shortApprovalLinkTo('cancel', appt, role.user)
      } else if (appt.showing.approval_type === 'All') {
        urls.approveUrl = await utils.shortApprovalLinkTo('confirm', appt, role.user)
        urls.rejectUrl = await utils.shortApprovalLinkTo('reject', appt, role.user)
      }

      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Another Seller Agent Confirmed',
        template: templates.toSeller('another_seller_confirmed'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          listing: await utils.extractListingBindings(appt),
          contact: utils.extractBuyerContactBindings(appt),
          ...urls,
        },
      })
      
    case 'Canceled':
      role = subscribedRole(notif, 'cancel')
      if (!role) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Another Seller Agent Canceled',
        template: templates.toSeller('another_seller_canceled'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          canceler: await utils.extractApprovalBindings(appt, false),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractSellerContactBindings(appt),
        },
      })
      
    case 'Rejected':
      role = subscribedRole(notif, 'cancel')
      if (!role) { return null }

      return new AppointmentMailer({
        notification: notif,
        to: [role.email],
        toUserIds: [role.user.id],
        title: 'Another Seller Agent Rejected',
        template: templates.toSeller('another_seller_rejected'),
        customBindings: {
          firstName: role.first_name,
          time: utils.formatTime(appt, role.user.timezone),
          rejecter: await utils.extractApprovalBindings(appt, false),
          listing: await utils.extractListingBindings(appt),
          contact: await utils.extractSellerContactBindings(appt),
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
    to: [appt.email],
    title: 'What\'s Your Feedback',
    template: templates.toBuyer('get_feedback'),
    customBindings: {
      firstName: appt.first_name,
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      feedbackUrl: await utils.shortLinkTo('feedback', appt),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
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
    to: [appt.email],
    title: 'Appointment Confirmed',
    template: templates.toBuyer('seller_confirmed'),
    customBindings: {
      firstName: appt.first_name,
      listing: await utils.extractListingBindings(appt),
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      instruction: /** @type {*} */(appt.showing).instructions,
      contact: await utils.extractSellerContactBindings(appt),
    },
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forRejectedAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.email],
    title: 'Appointment Rejected',
    template: templates.toBuyer('seller_rejected'),
    customBindings: {
      firstName: appt.first_name,
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
      rejecter: await utils.extractApprovalBindings(appt, false),
    },
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forRequestedAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)
 
  assert.notEqual(
    appt.showing.approval_type,
    'None',
    `Appointment ${appt.id} should be auto confirmed`,
  )
  
  return new AppointmentMailer({
    to: [appt.email],
    title: 'Appointment Requested',
    template: templates.toBuyer('booked'),
    customBindings: {
      firstName: appt.first_name,
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      rescheduleUrl: await utils.shortLinkTo('reschedule', appt),
      cancelUrl: await utils.shortLinkTo('cancel', appt),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
    },
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forAutoConfirmedAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)

  assert.equal(
    appt.showing.approval_type,
    'None',
    `Appointment ${appt.id} needs confirmation`,
  )

  return new AppointmentMailer({
    to: [appt.email],
    title: 'Appointment Requested and Automatically Approved',
    template: templates.toBuyer('booked_auto_approved'),
    customBindings: {
      firstName: appt.first_name,
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      rescheduleUrl: await utils.shortLinkTo('reschedule', appt),
      cancelUrl: await utils.shortLinkTo('cancel', appt),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
    },
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forCanceledAppointmentAfterConfirm (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.email],
    title: 'Appointment Canceled after Confirm',
    template: templates.toBuyer('seller_canceled_after_confirm'),
    customBindings: {
      firstName: appt.first_name,
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      canceler: await utils.extractApprovalBindings(appt, false),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
    },
  })  
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */ 
async function forRescheduledAppointment (apptObj) {
  const appt = await populateAppointment(apptObj)
  
  return new AppointmentMailer({
    to: [appt.email],
    title: 'Appointment Rescheduled',
    template: templates.toBuyer('rescheduled'),
    customBindings: {
      firstName: appt.first_name,
      time: utils.formatTime(appt, utils.buyerTimezone(appt)),
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
    },
  })
}

/**
 * @param {ShowingAppointment} apptObj
 * @returns {Promise<AppointmentMailer?>}
 */
async function forReceivedFeedback (apptObj) {
  const appt = await populateAppointment(apptObj)

  return new AppointmentMailer({
    to: [appt.email],
    title: 'Feedback Sent',
    template: templates.toBuyer('feedback_sent'),
    customBindings: {
      firstName: appt.first_name,
      listing: await utils.extractListingBindings(appt),
      contact: await utils.extractSellerContactBindings(appt),
    },
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
    lst.mapUrl || (lst.mapUrl = await utils.staticMap({ center: 'Tehran', markers: ['Tehran'] }))
    lst.photoUrl || (lst.photoUrl = 'https://i.ibb.co/d6SQC6z/listing.png')
  }

  const cont = bindings.contact
  if (cont) {
    cont.avatarUrl || (cont.avatarUrl = 'https://i.ibb.co/8DGMHmv/agent.png')
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
  populateAppointment,
  populateNotification,
  forNotification,
  forBuyerOriginatedNotification,
  forSellerOriginatedNotification,
  forGetFeedbackEmail,
  forConfirmedAppointment,
  forRejectedAppointment,
  forRequestedAppointment,
  forAutoConfirmedAppointment,
  forCanceledAppointmentAfterConfirm,
  forRescheduledAppointment,
  forReceivedFeedback,
  renderMock,
}
