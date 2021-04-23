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
    if (data.showing) {
      data.id = Crypto.encryptObject({ id: data.id })
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
