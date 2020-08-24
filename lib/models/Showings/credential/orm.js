const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const publicize = async model => {
  delete model.password

  return model
}

Orm.register('showings_credentials', 'ShowingsCredential', {
  getAll,
  publicize
})
