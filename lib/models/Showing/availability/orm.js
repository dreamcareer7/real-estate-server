const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing_availability', 'ShowingAvailability', {
  getAll,

  /**
   * @param {import('./types').ShowingAvailability} data
   */
  publicize(data) {
    data.availability = [data.availability.lower, data.availability.upper]
  },
  associations: {
    brand: {
      model: 'Brand',
      enabled: false,
    },
    user: {
      model: 'User',
      enabled: false,
    },
  },
})
