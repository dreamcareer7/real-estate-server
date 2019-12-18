const db = require('../../../utils/db')
const render = require('./render')
const renderThumbnail = require('../render')
const request = require('request-promise-native')
const uuid = require('node-uuid')

const generate = async ({brand, template}) => {
  const html = await request(`${template.url}/index.html`)

  const populated = await render({
    html,
    template,
    brand
  })

  const p1 = thumbnail({template, html: populated, brand})
  const p2 = preview({template, html: populated, brand})

  return Promise.all([p1, p2])
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
  const {
    id,
    name,
    variant,
    video,
    updated_at
  } = template

  const ext = video ? 'mp4' : 'png'

  const filename = `${type}.${ext}`
  const path = `marketing/templates/${id}/${variant}/${updated_at}/${brand.id}`
  const relations = [
    { role: 'Template', role_id: template.id }
  ]

  const { file, presigned } = await AttachedFile.preSave({
    filename,
    path,
    relations,
    public: true
  })

  await renderThumbnail({
    html,
    width,
    height,
    presigned,
    template
  })

  return file
}

const markAsValid = async id => {
  return db.query.promise('template/thumbnail/validate', [id])
}

Template.generateThumbnails = async () => {
  const { rows } = await db.query.promise('template/thumbnail/get-invalids', [])

  const promises = []

  for(const row of rows) {
    const template = await Template.get(row.template)
    const brand = await Brand.get(row.brand)

    promises.push(generate({brand, template}))
    promises.push(markAsValid(row.id))
  }

  Promise.all(promises)
}
