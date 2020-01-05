const db = require('../../../utils/db')
const render = require('./render')
const renderThumbnail = require('../render')
const promisify = require('../../../utils/promisify')
const Path = require('path')

Template.generateThumbnailForBrand = async ({brand, template}) => {
  const file = await AttachedFile.get(template.file)

  let html
  try {
    html = (await promisify(AttachedFile.download)(file.id)).toString()
  } catch(e) {
    Context.log(`Could not find index file for template ${template.id}`)
    return
  }

  const populated = await render({
    html,
    template,
    brand
  })
  const p1 = thumbnail({template, html: populated, brand})
  const p2 = preview({template, html: populated, brand})

  return Promise.all([p1, p2])
}

Template.generateThumbnails = async template => {
  const { rows } = await db.query.promise('template/thumbnail/allowed-brands', [
    template.id
  ])

  const ids = rows.map(r => r.brand)

  const brands = await Brand.getAll(ids)

  for(const brand of brands)
    await Template.generateThumbnailForBrand({
      template,
      brand
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
    public: true,
    keyname: type
  })

  const id = await renderThumbnail({
    html,
    width,
    height,
    presigned,
    template
  })

  Context.log(`${type} of ${template.id} for ${brand.name} by ${id}`)

  return file
}

const markAsValid = async id => {
  return db.query.promise('template/thumbnail/validate', [id])
}

Template.updateThumbnails = async () => {
  const { rows } = await db.query.promise('template/thumbnail/get-invalids', [])

  const promises = []

  for(const row of rows) {
    const template = await Template.get(row.template)
    const brand = await Brand.get(row.brand)

    promises.push(Template.generateThumbnailForBrand({brand, template}))
    promises.push(markAsValid(row.id))
  }

  Promise.all(promises)
}
