const Path = require('path')
const db = require('../../utils/db')
const renderThumbnail = require('./thumbnail/render')
const render = require('./render')
const promisify = require('../../utils/promisify')

const BrandTemplate = {}

Orm.register('brand_template', 'BrandTemplate', BrandTemplate)

BrandTemplate.get = async id => {
  const templates = await BrandTemplate.getAll([id])

  if (templates.length < 1)
    throw new Error.ResourceNotFound(`Brand template ${id} not found`)

  return templates[0]
}

BrandTemplate.getAll = async ids => {
  const { rows } = await db.query.promise('template/brand/get', [ids])
  return rows
}

BrandTemplate.getForBrand = async ({types, mediums, brand}) => {
  const res = await db.query.promise('template/brand/for-brand', [brand, types, mediums])
  const ids = res.rows.map(r => r.id)

  return BrandTemplate.getAll(ids)
}

BrandTemplate.allow = async (template_id, brand_id) => {
  return db.query.promise('template/brand/allow', [
    template_id,
    brand_id
  ])
}

BrandTemplate.updateThumbnails = async ({id, thumbnail, preview}) => {
  return db.query.promise('template/brand/update-thumbnails', [
    id,
    thumbnail.id,
    preview.id
  ])
}

BrandTemplate.delete = async id => {
  return db.query.promise('template/brand/delete', [
    id
  ])
}

BrandTemplate.generateThumbnail = async brand_template => {
  const brand = await Brand.get(brand_template.brand)
  const template = await Template.get(brand_template.template)
  const file = await AttachedFile.get(template.file)

  let html
  try {
    html = (await promisify(AttachedFile.download)(file.id)).toString()
  } catch(e) {
    Context.log(`Could not find index file for template ${template.id}`)
    return
  }

  const populated = await renderThumbnail({
    html,
    template,
    brand
  })
  const p1 = thumbnail({template, html: populated, brand})
  const p2 = preview({template, html: populated, brand})

  const [
    thumbnailFile,
    previewFile
  ] = await Promise.all([p1, p2])

  return BrandTemplate.updateThumbnails({
    id: brand_template.id,
    thumbnail: thumbnailFile,
    preview: previewFile
  })
}

const thumbnail = params => {
  return save({
    ...params,
    width: 400,
    height: 800,
    type: 'thumbnail'
  })
}

const preview = params => {
  return save({
    ...params,
    type: 'preview'
  })
}

const save = async ({template, html, width, height, type, brand}) => {
  const index = await AttachedFile.get(template.file)

  const ext = template.video ? 'mp4' : 'png'

  const filename = `${type}.${ext}`
  const path = `${Path.dirname(index.path)}/${brand.id}`

  const relations = [
    {
      role: 'Template',
      role_id: template.id
    }
  ]

  const { file, presigned } = await AttachedFile.preSave({
    filename,
    path,
    relations,
    public: false,
    keyname: type
  })

  const id = await render({
    html,
    width,
    height,
    presigned,
    template
  })

  Context.log(`${type} of ${template.id} for ${brand.name} by ${id}`)

  return file
}

const enableSharedTemplates = async brand => {
  // Enables shared templates for new brokerages
  if (brand.brand_type !== Brand.BROKERAGE)
    return

  if (brand.parent)
    return

  return db.query.promise('template/brand/allow-shared', [
    brand.id
  ])
}

Brand.on('create', enableSharedTemplates)

BrandTemplate.associations = {
  template: {
    model: 'Template',
    enabled: true
  },

  thumbnail: {
    model: 'AttachedFile',
    optional: true,
    enabled: true
  },

  preview: {
    model: 'AttachedFile',
    optional: true,
    enabled: true
  }
}


module.exports = BrandTemplate
