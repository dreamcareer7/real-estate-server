const Orm = require('../../../Orm/registry')
const { getAll } = require('./get')


const associations = {
  user: {
    model: 'User',
    enabled: false,
  }
}

// type, model_name
Orm.register('lead_channel', 'LeadChannel', {
  getAll,
  associations,
})
