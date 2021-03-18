const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing', 'Showing', {
  getAll,
  associations: {
    availabilities: {
      model: 'ShowingAvailability',
      collection: true,
      enabled: false
    },
    appointments: {
      model: 'ShowingAppointment',
      collection: true,
      enabled: false
    },
    roles: {
      model: 'ShowingRole',
      collection: true,
      enabled: false
    },
    deal: {
      model: 'Deal',
      enabled: false
    },
    listing: {
      model: 'Listing',
      enabled: false
    },
    feedback_template: {
      model: 'TemplateInstance',
      enabled: false
    },
    gallery: {
      model: 'Gallery',
      enabled: false
    }
  }
})
