const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const publicize = model => {
  if (model.disable_sensitive_integrations_for_nonagents === null)
    delete model.disable_sensitive_integrations_for_nonagents

  if (model.enable_liveby === null)
    delete model.enable_liveby

  if (model.enable_open_house_requests === null)
    delete model.enable_open_house_requests

  if (model.enable_yard_sign_requests === null)
    delete model.enable_yard_sign_requests
}

Orm.register('brand_settings', 'BrandSettings', {
  publicize,
  getAll
})
