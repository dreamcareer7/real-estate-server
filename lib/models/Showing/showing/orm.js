const Orm = require('../../Orm/registry')

const { getAll, getAllForBuyer } = require('./get')
const { encodeToken } = require('./token')

Orm.register('showing', 'Showing', {
  getAll,
  publicize(showing) {
    showing.token = encodeToken(showing)
  },
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

Orm.register('showing_public', 'ShowingPublic', {
  getAll: getAllForBuyer,
  associations: {
    availabilities: {
      model: 'ShowingAvailability',
      collection: true,
      enabled: true
    },
    listing: {
      model: 'Listing',
      enabled: true
    },
    agent: {
      model: 'Agent',
      enabled: true
    },
    gallery: {
      model: 'Gallery',
      enabled: false
    }
  }
})
