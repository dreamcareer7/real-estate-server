const db = require('../../utils/db')

Template = {}

require('./instance')
require('./asset')

Orm.register('template', 'Template')

Template.create = async ({name, width, height, brand, template_type, medium}) => {
  const res = await db.query.promise('template/insert', [
    name,
    width,
    height,
    brand,
    template_type,
    medium
  ])

  return Template.get(res.rows[0].id)
}

Template.get = async id => {
  const templates = await Template.getAll([id])

  if (templates.length < 1)
    throw new Error.ResourceNotFound(`Template ${id} not found`)

  return templates[0]
}

Template.getAll = async ids => {
  const res = await db.query.promise('template/get', [ids])
  return res.rows
}

Template.getForUser = async ({user, types, mediums}) => {
  const res = await db.query.promise('template/for-user', [user, types, mediums])
  const ids = res.rows.map(r => r.id)

  return Template.getAll(ids)
}
