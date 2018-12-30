const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const config = require('../../config')
const render = require('./render')
const EventEmitter = require('events').EventEmitter

TemplateInstance = new EventEmitter

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

const addRelation = async ({id, listing, deal, contact}) => {
  return db.query.promise('template/instance/relation/insert', [
    id,
    listing,
    deal,
    contact
  ])
}

TemplateInstance.create = async ({template, html, created_by, listings, deals, contacts}) => {

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

  await setBranch({id, file})

  if (deals)
    for (const deal of deals)
      await addRelation({
        id,
        deal
      })

  if (contacts)
    for(const contact of contacts)
      await addRelation({
        id,
        contact
      })

  if (listings)
    for(const listing of listings)
      await addRelation({
        id,
        listing
      })

  const instance = TemplateInstance.get(res.rows[0].id)

  TemplateInstance.emit('created', {instance, created_by, template, file})

  return instance
}

const setBranch = async ({id, file}) => {
  const b = {}
  b.template_instance = id
  b.action = 'ShareTemplateInstance'

  const url = Url.web({
    uri: '/branch',
  })
  b['$desktop_url'] = url
  b['$fallback_url'] = file.url

  const branch = await promisify(Branch.createURL)(b)

  await db.query.promise('template/instance/set-branch', [
    id,
    branch
  ])
}

TemplateInstance.share = async ({instance, text, recipients}) => {
  const file = await promisify(AttachedFile.get)(instance.file)

  const sms = {
    from: config.twilio.from,
    body: text + '\n' + instance.branch,
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

TemplateInstance.delete = async id => {
  return db.query.promise('template/instance/delete', [
    id
  ])
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
