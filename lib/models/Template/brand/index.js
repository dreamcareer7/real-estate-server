const Path = require('path')

const db           = require('../../../utils/db')
const promisify    = require('../../../utils/promisify')
const { peanar }   = require('../../../utils/peanar')

const Context       = require('../../Context')
const AttachedFile  = require('../../AttachedFile')
const Brand         = require('../../Brand')
const BrandSettings = require('../../Brand/settings/get')

const renderThumbnail = require('../thumbnail/render')
const render   = require('../render')
const Template = require('../get')

const BrandTemplate = {
  ...require('./get')
}


const enableSharedTemplates = async brand => {
  // Enables shared templates for new brokerages
  if (brand.brand_type !== Brand.BROKERAGE) {
    return
  }

  if (brand.parent) {
    return
  }

  return db.query.promise('template/brand/allow-shared', [brand.id])
}

Brand.on('create', enableSharedTemplates)

BrandTemplate.allow = async (template_id, brand_id) => {
  return db.query.promise('template/brand/allow', [
    template_id,
    brand_id
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
    promises.push(generateThumbnail(row.id))

  await markAsValid(rows.map(r => r.id))

  return Promise.all(promises)
}

const setThumbnails = async ({id, thumbnail, preview}) => {
  return db.query.promise('template/brand/update-thumbnails', [
    id,
    thumbnail.id,
    preview.id
  ])
}

const _generateThumbnail = async id => {
  const brand_template = await BrandTemplate.get(id)
  const brand = await Brand.get(brand_template.brand)
  const { marketing_palette: palette } = await BrandSettings.getByBrand(brand.id)
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
    brand,
    palette
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
BrandTemplate.generateThumbnail = _generateThumbnail
// Exposed for scripts who need it

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

  await render({
    html,
    width,
    height,
    presigned,
    template
  })

  Context.log(`${type} of ${template.id} for ${brand.name}`)

  return file
}

BrandTemplate.invalidateByBrand = brand_id => {
  return db.query.promise('template/brand/invalidate-brand', [
    brand_id
  ])
}

module.exports = BrandTemplate
