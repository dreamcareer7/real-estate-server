const { expect, assert } = require('chai')
const { match } = require('sinon')

const Context = require('../../../lib/models/Context')
const { createContext } = require('../helper')
const helper = require('./helper')

const {
  SpiedAppointmentNotification,
  SpiedNotification,
  Appointment,
  SpiedEmail,
  FakeSMS,
  defaults,
} = helper

/** @param {Partial<INotificationInput>} notif */
function assertOneNotif (notif) {
  assert(
    SpiedNotification.create.calledOnce,
    `${SpiedNotification.create.callCount} notification(s) issued`,
  )

  assert(
    SpiedNotification.create.calledOnceWithMatch(notif),
    'Notification is not issued correctly',
  )
}

/** @param {string} to */
function assertSmsSent (to) {
  const sent = FakeSMS.send.calledWithMatch({ to })
  
  assert(sent, 'SMS is not sent')
}

/**
 * @param {string} to
 * @param {string} [subject]
 */
function assertEmailSent (to, subject) {
  const sent = SpiedEmail.create.calledWithMatch({
    to: [to],
    ...(subject ? { subject } : null),
  })
  
  assert(sent, 'Email is not sent or is sent with a wrong subject')
}

describe('Showing/notification', () => {
  createContext()
  
  beforeEach(helper.setup)
  afterEach(helper.cleanup)
  
  context('when a buyer requests...', () => {
    it('sends SMS and Email to the buyer and issues notification for subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'All',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: ['push'],
            cancel_notification_type: [],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: [],
            cancel_notification_type: [],            
          }),
        ],
      })
      const apptId = await helper.request(showingId)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Appointment Requested')

      assertOneNotif({
        subject_class: 'Contact',
        action: 'Created',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: ['push'],
      })
    })
  })

  context('when the buyer cancels', () => {
    it('sends SMS to the buyer and issues notification for subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'All',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: [],
            cancel_notification_type: ['sms'],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: [],
            cancel_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)

      SpiedEmail.create.resetHistory()
      SpiedNotification.create.resetHistory()
      
      await helper.cancel(apptId)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assert(SpiedEmail.create.notCalled, 'An email also has been sent to the buyer')

      assertOneNotif({
        subject_class: 'Contact',
        action: 'Canceled',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: ['sms'],
      })
    })
  })
  
  context('when an appt. is auto confirmed', () => {
    it('sends SMS and Email to the buyer and issues notification for subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'None',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: ['email'],
            cancel_notification_type: [],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: [],
            cancel_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Appointment Requested and Automatically Approved')

      assertOneNotif({
        subject_class: 'Contact', // misleading!
        action: 'Confirmed',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: ['email'],
      })
    })
  })

  context('when buyer reschedules after confirm (go and show)', () => {
    it('sends "Automatically Confirmed" SMS and Email to the buyer and issues "Confirmed" notification for the subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'None',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: ['push'],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)
      helper.resetFakeHistory()
      await helper.reschedule(apptId)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Appointment Requested and Automatically Approved')

      assertOneNotif({
        subject_class: 'Contact', // misleading!
        action: 'Confirmed',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: ['push'],
      })
    })
  })

  context('when buyer reschedules after confirm (confirmation required)', () => {
    it('sends "Automatically Confirmed" SMS and Email to the buyer and issues "Confirmed" notification for the subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'Any',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: [],
            cancel_notification_type: [],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: ['email'],
            cancel_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)
      await helper.approval(Context.get('user'), apptId)
      helper.resetFakeHistory()
      await helper.reschedule(apptId)

      const contact = defaults.request.contact
      assert(FakeSMS.send.calledOnce, 'no SMS has been sent to the buyer')
      assertEmailSent(contact.email, 'Appointment Rescheduled')

      assertOneNotif({
        subject_class: 'Contact',
        action: 'Rescheduled',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user2'),
        transports: ['email'],
      })
    })
  })

  context('when a role rejects', () => {
    it('sends SMS and Email to the buyer and issues notification for the subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'Any',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: ['push'],
            cancel_notification_type: ['push', 'sms', 'email'],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: [],
            cancel_notification_type: ['sms'],
          }),
        ],
      })
      const apptId = await helper.request(showingId)
      helper.resetFakeHistory()
      await helper.approval(Context.get('user'), apptId, false)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Appointment Rejected')

      assertOneNotif({
        subject_class: 'ShowingRole',
        action: 'Rejected',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user2'),
        transports: ['sms'],
      })
    })
  })

  context('when an appt. is confirmed', () => {
    it('sends SMS and Email to the buyer and issues notification for the subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'Any',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: ['push', 'sms', 'email'],
            cancel_notification_type: [],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: ['push'],
            cancel_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)
      helper.resetFakeHistory()
      await helper.approval(Context.get('user'), apptId, true)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Appointment Confirmed')
      
      assertOneNotif({
        subject_class: 'ShowingRole',
        action: 'Confirmed',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user2'),
        transports: ['push'],
      })
    })
  })

  context('when a role cancels', () => {
    it('sends SMS and Email to the buyer and issues notification for the subscribed roles', async () => {
      const showingId = await helper.create({
        approval_type: 'Any',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: [],
            cancel_notification_type: ['push'],
          }),
          helper.roleInput(Context.get('user2Object'), {
            role: 'Other',
            confirm_notification_type: [],
            cancel_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)
      await helper.approval(Context.get('user'), apptId, true)
      helper.resetFakeHistory()
      await helper.approval(Context.get('user2'), apptId, false)

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Appointment Canceled after Confirm')

      assertOneNotif({
        subject_class: 'ShowingRole',
        action: 'Canceled',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: ['push'],
      })
    })
  })

  context('when an appt. time is passed', () => {
    it('will be Canceled if its not Confirmed yet and roles notifications will be cleared', async () => {
      const showingId = await helper.create({
        approval_type: 'Any',
        roles: [helper.roleInput(Context.get('userObject'), {
          confirm_notification_type: [],
          cancel_notification_type: [],
        })],
      })
      const apptId = await helper.request(showingId)
      await helper.updateAppointmentTime(apptId)
      await Appointment.finalizeRecentlyDone()

      const appt = await Appointment.get(apptId)
      expect(appt.status).to.be.equal('Canceled')
      
      assert(
        SpiedAppointmentNotification.clearNotifications.calledOnce,
        `clearNotifications is called ${SpiedAppointmentNotification.clearNotifications.callCount} times`,
      )

      assert(
        SpiedAppointmentNotification.clearNotifications.calledOnceWith(
          Context.get('user'),
          apptId,
        ),
        'clearNotifications is not called with correct user and the appt.',
      )
    })

    it('will be Completed if its Confirmed', async () => {
      const showingId = await helper.create({
        approval_type: 'None',
        roles: [helper.roleInput(Context.get('userObject'), {
          confirm_notification_type: [],
          cancel_notification_type: [],
        })],
      })
      const apptId = await helper.request(showingId)
      await helper.updateAppointmentTime(apptId)
      helper.resetFakeHistory()
      await Appointment.finalizeRecentlyDone()

      const appt = await Appointment.get(apptId)
      expect(appt.status).to.be.equal('Completed')

      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'What\'s Your Feedback')
    })
  })
  
  context('when the buyer gives feedback', () => {
    it('Notifies everyone about the feedback', async () => {
      const showingId = await helper.create({
        approval_type: 'None',
        roles: [helper.roleInput(Context.get('userObject'), {
          confirm_notification_type: ['sms'],
          cancel_notification_type: ['sms'],
        })],
      })
      const apptId = await helper.request(showingId)
      await helper.updateAppointmentTime(apptId)
      await Appointment.finalizeRecentlyDone()
      helper.resetFakeHistory()

      await helper.feedback(apptId)
      
      const contact = defaults.request.contact
      assertSmsSent(contact.phone_number)
      assertEmailSent(contact.email, 'Feedback Sent')

      assertOneNotif({
        subject_class: 'Contact',
        action: 'GaveFeedbackFor',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: match.every(match.in(['email', 'push', 'sms'])),
      })
    })
  })

  context('when a role has got a notification', () => {
    it('does nothing for non-email notifications', async () => {
      const showingId = await helper.create({
        approval_type: 'None',
        roles: [helper.roleInput(Context.get('userObject'), {
          confirm_notification_type: ['push', 'sms'],
          cancel_notification_type: ['email', 'push', 'sms'],
        })],
      })
      const apptId = await helper.request(showingId)

      assertOneNotif({
        subject_class: 'Contact',
        action: 'Confirmed',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user'),
        transports: ['push', 'sms'],
      })

      helper.resetFakeHistory()
      await Appointment.sendEmailNotification()

      assert(
        SpiedEmail.create.notCalled,
        `${SpiedEmail.create.callCount} emails has been created`,
      )
    })

    it('sends an email for email notifications', async () => {
      const user2 = Context.get('user2Object')
      const showingId = await helper.create({
        approval_type: 'Any',
        roles: [
          helper.roleInput(Context.get('userObject'), {
            confirm_notification_type: [],
            cancel_notification_type: ['email', 'push', 'sms'],
          }),
          helper.roleInput(user2, {
            role: 'Other',
            confirm_notification_type: ['email'],
            cancel_notification_type: [],
          }),
        ],
      })
      const apptId = await helper.request(showingId)
      helper.resetFakeHistory()
      await helper.approval(Context.get('user'), apptId)

      assertOneNotif({
        subject_class: 'ShowingRole',
        action: 'Confirmed',
        object_class: 'ShowingAppointment',
        object: apptId,
        specific: Context.get('user2'),
        transports: ['email'],
      })

      helper.resetFakeHistory()
      await Appointment.sendEmailNotification()

      assert(
        SpiedEmail.create.calledTwice,
        `${SpiedEmail.create.callCount} emails has been created`,
      )

      assert(
        SpiedEmail.create.calledWithMatch({
          to: [user2.email],
          subject: 'Buyer Booked',
        }),
        '"Buyer Book" email is not sent',
      )

      assert(
        SpiedEmail.create.calledWithMatch({
          to: [user2.email],
          subject: 'Another Seller Agent Confirmed',
        }),
        '"Another Seller Agent Confirmed" email is not sent',
      )
    })
  })
})
