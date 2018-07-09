const db = require('../../utils/db')

Template = {}

Orm.register('template', 'Template')

Template.create = async ({name, ratio, brand, template_type, template}) => {
  const res = await db.query.promise('template/insert', [
    name,
    ratio,
    brand,
    template_type,
    template
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

Template.getForUser = async user_id => {
  const res = await db.query.promise('template/for-user', [user_id])
  const ids = res.rows.map(r => r.id)

  return Template.getAll(ids)
}