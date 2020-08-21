const Orm = require('../../Orm/registry')
const Url       = require('../../Url')

const { getAll } = require('./get')


const publicize = model => {
  model.url = Url.api({
    uri: `/auth/saml/${model.id}`
  })

  delete model.config
  delete model.client
  delete model.identifier
}


Orm.register('sso_provider', 'SsoProvider', {
  getAll,
  publicize
})