const Orm = require('../../Orm/registry')

const { getAll } = require('./getAll')

const publicize = async model => {
  delete model.access_token
  delete model.refresh_token
  delete model.id_token
  delete model.expires_in
  delete model.ext_expires_in

  model.profile_image_url = model.photo

  return model
}


const associations = {
  jobs: {
    collection: true,
    enabled: true,
    model: 'UsersJob'
  }
}

Orm.register('microsoft_credential', 'MicrosoftCredential', {
  getAll,
  publicize,
  associations
})