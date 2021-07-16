const { strict: assert } = require('assert')
const AppointmentMailer = require('./mailer')
const Context = require('../../Context')

const { templates } = AppointmentMailer

function allSellersEmails (notif) {
  assert.equal(notif.object_class, 'ShowingAppointment')

  return notif.objects[0].showing.roles
    .map(r => r.user.email)
}

function allSellersEmailsExceptSubject (notif) {
  assert.equal(notif.object_class, 'ShowingAppointment')
  assert.equal(notif.subject_class, 'ShowingRole')
  
  return notif.objects[0].showing.roles
    .filter(r => r.id !== notif.subject)
    .map(r => r.user.email)
}

function buyerEmail (notif) {
  if (notif.subject_class === 'Contact') {
    return notif.subjects[0].email
  } else if (
    notif.object_class === 'ShowingAppointment'
      && notif.objects?.[0]?.contact?.email) {
    return notif.objects[0].contact.email
  }

  assert.fail(`Could not extract buyer email from notification object: ${notif.id}`)
}

function containsAutoApproveShowing (notif) {
  assert.equal(notif.object_class, 'ShowingAppointment')
  return notif.objects[0].showing.approal_type === 'None'
}

function mailerList (defaults = {}, mailers = []) {
  return {
    push: opts => mailers.push(new AppointmentMailer({ ...defaults, ...opts })),
    mailers,  
  } 
}

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
  
  switch(notif.action) {
    case 'Created':
      result.push({
        to: allSellersEmails(notif),
        title: 'Appointment Booked',
        template: templates.toSeller('buyer_booked'),
      })

      if (containsAutoApproveShowing(notif)) {
        result.push({
          to: [buyerEmail(notif)],
          title: 'Appointment Booked and auto-approved',
          template: templates.toBuyer('booked_auto_approved')
        })
      } else {
        result.push({
          to: [buyerEmail(notif)],
          title: 'Appointment Booked',
          template: templates.toBuyer('booked')          
        })
      }
      break
    case 'Rescheduled':
      result.push({
        to: allSellersEmails(notif),
        title: 'Appointment Rescheduled',
        template: templates.toSeller('buyer_rescheduled'),        
      })
      result.push({
        to: [buyerEmail(notif)],
        title: 'Appointment Rescheduled',
        template: templates.toBuyer('rescheduled')
      })
      break
    case 'Canceled':
      result.push({
        to: allSellersEmails(notif),
        title: 'Notification Canceled',
        template: templates.toSeller('buyer_canceled')
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
      result.push({
        to: allSellersEmailsExceptSubject(notif),
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
      result.push({
        to: allSellersEmailsExceptSubject(notif),
        title: 'Appointment Rejected by another Seller Role',
        template: templates.toSeller('another_seller_rejected'),
      })
      break
      
    default:
      Context.log(`Unknown action for showing-notification: ${notif.action}`)
  }

  return result.mailers
}

module.exports = {
  forNotification,
  forBuyerOriginatedNotification,
  forSellerOriginatedNotification,
}
