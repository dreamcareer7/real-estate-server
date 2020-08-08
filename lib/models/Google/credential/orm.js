const Orm = require('../../Orm/registry')

const { getAll } = require('./getAll')

const publicize = async model => {
  delete model.access_token
  delete model.refresh_token
  delete model.expiry_date
  delete model.contacts_sync_token
  delete model.contact_groups_sync_token
  delete model.messages_sync_history_id
  delete model.watcher_exp

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

Orm.register('google_credential', 'GoogleCredential', {
  getAll,
  publicize,
  associations
})