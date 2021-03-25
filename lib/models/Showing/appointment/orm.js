const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing_appointment', 'ShowingAppointment', {
  getAll,
  associations: {
    contact: {
      model: 'Contact',
      enabled: false
    },
    approvals: {
      model: 'ShowingApproval',
      collection: true,
      enabled: false
    }
  }
})
