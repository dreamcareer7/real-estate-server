const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const associations = {
  origin: {
    model: 'BrandFlow',
    enabled: false,
    collection: false,
    optional: true
  },
  steps: {
    model: 'FlowStep',
    enabled: true,
    collection: true,
    optional: false
  },
  contact: {
    model: 'Contact',
    enabled: false,
  }
}


Orm.register('flow', 'Flow', {
  getAll,
  associations
})
