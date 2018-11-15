const db = require('../../utils/db')

TemplateInstance = {}

Orm.register('template_instance', 'TemplateInstance')

TemplateInstance.get = async id => {
  const instances = await TemplateInstance.getAll([id])

  if (instances.length < 1)
    throw new Error.ResourceNotFound(`Template instance ${id} not found`)

  return instances[0]
}

TemplateInstance.getAll = async ids => {
  const res = await db.query.promise('template/instance/get', [ids])
  return res.rows
}

TemplateInstance.create = async ({origin, html, created_by, deals, contacts}) => {
  const template = await Template.get(origin)

  const url = await render({template, html})

  const res = await db.query.promise('template/instance/insert', [
    origin,
    html,
    created_by,
    deals,
    contacts
  ])

  return TemplateInstance.get(res.rows[0].id)
}
