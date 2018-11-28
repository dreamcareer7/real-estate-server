const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const config = require('../../config')
const render = require('./render')

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

const addRelation = async ({id, deal, contact}) => {
  return db.query.promise('template/instance/relation/insert', [
    id,
    deal,
    contact
  ])
}

TemplateInstance.create = async ({template, html, created_by, deals, contacts}) => {

  const relations = []

  const filename = template.video ? 'video.mp4' : 'image.png'

  const path = 'templates/instances'


  const { presigned, file } = await AttachedFile.preSave({
    path,
    filename,
    user: created_by,
    relations,
    public: true
  })

  await render({template, html, presigned})

  const res = await db.query.promise('template/instance/insert', [
    template.id,
    html,
    created_by.id,
    file.id
  ])

  const { id } = res.rows[0]


  deals && deals.forEach(async deal => {
    return addRelation({
      id,
      deal
    })
  })

  contacts && contacts.forEach(async contact => {
    return addRelation({
      id,
      contact
    })
  })

  return TemplateInstance.get(res.rows[0].id)
}

TemplateInstance.share = async ({instance, text, recipients}) => {
  const file = await promisify(AttachedFile.get)(instance.file)

  const b = {}
  b.template_instance = instance.id
  b.action = 'ShareTemplateInstance'

  b['$desktop_url'] = file.url
  b['$fallback_url'] = file.url

  const branch = await promisify(Branch.createURL)(b)

  const sms = {
    from: config.twilio.from,
    body: text + '\n' + branch,
    image: file.preview_url
  }

  for(const to of recipients)
    await promisify(SMS.send)({
      ...sms,
      to
    })
}

TemplateInstance.getByUser = async user => {
  const res = await db.query.promise('template/instance/by-user', [
    user
  ])

  const ids = res.rows.map(r => r.id)

  return TemplateInstance.getAll(ids)
}

TemplateInstance.associations = {
  file: {
    model: 'AttachedFile'
  },

  template: {
    model: 'Template',
    enabled: false
  }
}