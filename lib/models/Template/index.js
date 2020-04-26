const path = require('path')
const uuid = require('node-uuid')
const db = require('../../utils/db')

Template = {}

require('./instance')
require('./asset')
require('./thumbnail')
const BrandTemplate = require('./brand')

Orm.register('template', 'Template')

const setFile = async (name, variant, buffer) => {
  const filename = 'index.html'
  const keyname = 'index'

  const relations = []

  const path = `marketing/templates/${name}/${variant}/${uuid()}`

  const public = true

  const file = {
    filename,
    relations,
    path,
    public,
    buffer,
    keyname
  }

  return AttachedFile.saveFromBuffer(file)
}

Template.create = async template => {
  const {
    name,
    variant,
    inputs,
    brands = [],
    template_type,
    medium,
    html,
    mjml
  } = template

  let file, url
  if (html) {
    file = await setFile(name, variant, html)
    url = path.dirname(file.url)
  }

  const res = await db.query.promise('template/insert', [
    name,
    variant,
    template_type,
    medium,
    inputs,
    mjml,
    file ? file.id : null,
    url
  ])

  const id = res.rows[0].id

  for(const brand of brands)
    await BrandTemplate.allow(id, brand)

  const saved = await Template.get(id)

  await Template.generateThumbnails(saved)

  return saved
}

Template.get = async id => {
  const templates = await Template.getAll([id])

  if (templates.length < 1)
    throw new Error.ResourceNotFound(`Template ${id} not found`)

  return templates[0]
}

Template.getAll = async ids => {
  const { rows } = await db.query.promise('template/get', [ids])
  return rows
}

Template.publicize = template => {
  /* This is a hack to make web app work.
   * The lads have mixes up usage of template and template_instance.
   * And template_instance.file is there.
   * When we send a template with file = <something>
   * the treat it like a template_instance and expect template.file.url
   * which doesn't exist.
   */

  delete template.file
}
