const Path = require('path')
const Context = require('../Context')
const db = require('../../utils/db')
const renderThumbnail = require('./thumbnail/render')
const render = require('./render')
const promisify = require('../../utils/promisify')
const { peanar } = require('../../utils/peanar')
const AttachedFile = require('../AttachedFile')
const Orm = require('../Orm')
const Brand = require('../Brand')
const Template = require('./index')

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

const setThumbnails = async ({id, thumbnail, preview}) => {
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

BrandTemplate.updateThumbnails = async () => {
  const { rows } = await db.query.promise('template/brand/get-invalids', [])

  const promises = []

  for(const row of rows)
    promises.push(generateThumbnail(row.id, row.brand))

  await markAsValid(rows.map(r => r.id))

  return Promise.all(promises)
}

const _generateThumbnail = async (id, brand_id)  => {
  const brand_template = await BrandTemplate.get(id)
  const brand = await Brand.get(brand_id)
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
  const p1 = thumbnail({template, html: populated, brand, index: file})
  const p2 = preview({template, html: populated, brand, index: file})

  const [
    thumbnailFile,
    previewFile
  ] = await Promise.all([p1, p2])

  return setThumbnails({
    id: brand_template.id,
    thumbnail: thumbnailFile,
    preview: previewFile
  })
}

const markAsValid = async ids => {
  return db.query.promise('template/brand/validate', [ids])
}

const generateThumbnail = peanar.job({
  handler: _generateThumbnail,
  exchange: 'brand_template_thumbnail',
  name: 'brand_template_thumbnail',
  queue: 'brand_template_thumbnail',
  error_exchange: 'brand_template_thumbnail.error',
  max_retries: 10,
  retry_delay: 10000,
  retry_exchange: 'brand_template_thumbnail.retry',
})

const thumbnail = params => {
  return save({
    ...params,
    width: 400,
    height: 800,
    type: 'thumbnail',
  })
}

const preview = params => {
  return save({
    ...params,
    type: 'preview'
  })
}

const save = async ({template, html, width, height, type, brand, index}) => {
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

BrandTemplate.invalidateByBrand = brand_id => {
  return db.query.promise('template/brand/invalidate-brand', [
    brand_id
  ])
}

BrandTemplate.regenerateForAllBrands = async template => {
  const { rows } = await db.query.promise('template/brand/allowed-brands', [
    template.id
  ])

  const ids = rows.map(r => r.brand)
  const brand_templates = await BrandTemplate.getAll(ids)

  for(const brand_template of brand_templates)
    await BrandTemplate.generateThumbnail(brand_template)
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
