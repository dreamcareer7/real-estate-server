const Orm = require('../../Orm/registry')

const { getAll } = require('./subscription')

const publicize = async model => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}


Orm.register('microsoft_subscription', 'MicrosoftSubscription', {
  getAll,
  publicize
})