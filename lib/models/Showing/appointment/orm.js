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
  },
})

Orm.register('showing_appointment_public', 'ShowingAppointmentPublic', {
  getAll: getAllPublic,
  associations: {
    showing: {
      model: 'ShowingPublic',
      enabled: false,
    },
  },
})
