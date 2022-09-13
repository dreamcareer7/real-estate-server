const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const config = require('../../../config')
const Context = require('../../Context')
const render = require('../render')
const EventEmitter = require('events').EventEmitter
const mjml2html = require('mjml')
const AttachedFile = require('../../AttachedFile')
const Branch = require('../../Branch')
const SMS = require('../../SMS')
const Url = require('../../Url')

const {
  LETTER
} = require('../constants')

const TemplateInstance = new EventEmitter

Object.assign(TemplateInstance, require('./get'))

const addRelation = async ({id, listing, deal, contact}) => {
  return db.query.promise('template/instance/relation/insert', [
    id,
    listing,
    deal,
    contact
  ])
}

const prints = [
  LETTER
]

const IMAGE = 'IMAGE'
const PDF = 'PDF'

TemplateInstance.create = async ({template, html, created_by, listings, deals, contacts}) => {
  const relations = []

  let filename = 'image.png'
  let type = IMAGE

  if (template.video)
    filename = 'video.mp4'

  if (prints.includes(template.medium)) {
    filename = 'document.pdf'
    type = PDF
  }

  const path = 'templates/instances'

  const { presigned, file } = await AttachedFile.preSave({
    path,
    filename,
    user: created_by,
    relations,
    public: true
  })

  /* Sometimes what's passed as HTML is really MJML.
  *  In those cases we need to store the MJML Code (in $source)
  *  But we acually render it as html
  */
  const source = html

  if (template.mjml)
    html = mjml2html(html).html

  const width = template.medium === 'Website' ? 600 : undefined
  const maxHeight = template.medium === 'Website' ? 1600 : undefined

  await render({
    template,
    html,
    presigned,
    type,
    width,
    maxHeight
  })

  Context.log('Render Done')

  const res = await db.query.promise('template/instance/insert', [
    template.id,
    source,
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

  const instance = await TemplateInstance.get(res.rows[0].id)

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

  b.file = file

  const branch = await Branch.createURL(b)

  await db.query.promise('template/instance/set-branch', [
    id,
    branch
  ])
}

TemplateInstance.share = async ({instance, text, recipients}) => {
  const sms = {
    from: config.twilio.from,
    body: text + '\n' + instance.branch
  }

  for(const to of recipients)
    await promisify(SMS.send)({
      ...sms,
      to
    })
}

TemplateInstance.delete = async id => {
  return db.query.promise('template/instance/delete', [
    id
  ])
}

module.exports = TemplateInstance
