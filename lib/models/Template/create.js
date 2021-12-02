const path = require('path')
const uuid = require('uuid')
const db = require('../../utils/db')

const BrandTemplate = require('./brand')
const AttachedFile = require('../AttachedFile')

const { get } = require('./get')

const extractVariables = require('./extract-variables')

const setFile = async (path, variant, buffer) => {
  const filename = 'index.html'
  const keyname = 'index'

  const relations = []

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

const create = async template => {
  const {
    name,
    variant,
    inputs,
    brands = [],
    template_type,
    medium,
    html,
    mjml,
    origin
  } = template

  const dest = `marketing/templates/${name}/${variant}`

  if (origin) {
    const originalTemplate = await get(origin)
    const src = (await AttachedFile.get(originalTemplate.file)).path.replace('index.html', '')

    AttachedFile.copyDir({
      bucket: 'public',
      src,
      dest 
    })
  }

  let file, url
  if (html) {
    file = await setFile(`${dest}/${uuid()}`, variant, html)
    url = path.dirname(file.url)
  }

  const variables = extractVariables(html)

  const res = await db.query.promise('template/insert', [
    name,
    variant,
    template_type,
    medium,
    inputs,
    variables,
    mjml,
    file ? file.id : null,
    url
  ])

  const id = res.rows[0].id

  for(const brand of brands)
    await BrandTemplate.allow(id, brand)

  return get(id)
}

module.exports = { create }
