const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleContactGroup = {}



GoogleContactGroup.getAll = async (ids) => {
  const contactGroups = await db.select('google/contact_group/get', [ids])

  return contactGroups
}

GoogleContactGroup.get = async (id) => {
  const contactGroups = await GoogleContactGroup.getAll([id])

  if (contactGroups.length < 1)
    throw Error.ResourceNotFound(`Google-Contact-Group ${id} not found`)

  return contactGroups[0]
}

GoogleContactGroup.getByResourceName = async (resource_name) => {
  const ids = await db.selectIds('google/contact_group/get_by_resource_name', [resource_name])

  if (ids.length < 1)
    return null

  return GoogleContactGroup.get(ids[0])
}

GoogleContactGroup.create = async (google_credential, meta) => {
  return db.insert('google/contact_group/insert',[
    google_credential,
    meta.resourceName,
    meta
  ])
}

GoogleContactGroup.delete = async (resource_name) => {
  return db.update('google/contact_group/soft_delete', [ resource_name, new Date() ])
}



Orm.register('googleContactGroup', 'GoogleContactGroup', GoogleContactGroup)

module.exports = GoogleContactGroup