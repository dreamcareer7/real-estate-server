const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

TemplateAsset = {}

Orm.register('template_asset', 'TemplateAsset')

TemplateAsset.get = async id => {
  const assets = await TemplateAsset.getAll([id])

  if (assets.length < 1)
    throw new Error.ResourceNotFound(`Template asset ${id} not found`)

  return assets[0]
}

TemplateAsset.getAll = async ids => {
  const res = await db.query.promise('template/asset/get', [ids])
  return res.rows
}

TemplateAsset.createFromRequest = async req => {
  const path = 'templates/assets'

  const { file, fields } = await promisify(AttachedFile.saveFromRequest)({
    req,
    path,
    public: true
  })

  const { listing, contact, template } = fields

  const res = await db.query.promise('template/asset/insert', [
    req.user.id,
    template,
    file.id,
    listing,
    contact,
  ])

  return TemplateAsset.get(res.rows[0].id)
}

TemplateAsset.associations = {
  file: {
    model: 'AttachedFile'
  }
}
