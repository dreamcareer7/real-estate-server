const Crypto = require('../../Crypto')
const Orm = require('../../Orm/registry')
const Showing = require('../showing/token')
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
  },
})

Orm.register('showing_appointment_public', 'ShowingAppointmentPublic', {
  getAll: getAllPublic,
  publicize(data) {
    data.token = Crypto.encryptObject({ id: data.id })
    data.cancel_token = Crypto.encryptObject({ id: data.id, time: data.time })
    if (data.showing) {
      data.showing = Showing.encodeToken(data.showing)
    }
  },
  associations: {
    showing: {
      model: 'ShowingPublic',
      enabled: false,
    },
  },
})
