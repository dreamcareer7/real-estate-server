const Crypto = require('../../Crypto')
const Orm = require('../../Orm/registry')
const { getAll, getAllPublic } = require('./get')

Orm.register('showing_appointment', 'ShowingAppointment', {
  getAll,
  associations: {
    contact: {
      model: 'Contact',
      enabled: false,
    },
    showing: {
      model: 'Showing',
      enabled: false,
    },
    approvals: {
      model: 'ShowingApproval',
      collection: true,
      enabled: false,
    },
    notifications: {
      model: 'ShowingAppointmentNotification',
      collection: true,
      enabled: false,
    }
  },
})

/**
 * Appointments tailored for public access. Does not expose real showing object and the associated contact object.
 */
Orm.register('showing_appointment_public', 'ShowingAppointmentPublic', {
  getAll: getAllPublic,
  publicize(data) {
    data.token = Crypto.encryptObject({ id: data.id })
    data.cancel_token = Crypto.encryptObject({ id: data.id, time: data.time })
  },
  associations: {
    showing: {
      model: 'ShowingPublic',
      enabled: false,
    },
  },
})
