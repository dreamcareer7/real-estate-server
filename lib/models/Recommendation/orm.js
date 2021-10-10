const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const associations = {
  users: {
    collection: true,
    model: 'User'
  },

  listing: {
    optional: true,
    model: 'Listing'
  },

  compact_listing: {
    optional: true,
    enabled: false,
    model: 'CompactListing',
    id: (r, cb) => cb(null, r.listing)
  },

  favorited_by: {
    collection: true,
    model: 'User',
    default_value: () => []
  },

  hid_by: {
    collection: true,
    model: 'User',
    default_value: () => []
  }
}


Orm.register('recommendation', 'Recommendation', {
  getAll,
  associations
})
