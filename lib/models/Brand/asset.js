const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

const BrandAsset = {}

BrandAsset.createFromRequest = async (brand_id, req) => {
  const path = `brands/${brand_id}/assets`

  const { file } = await promisify(AttachedFile.saveFromRequest)({
    req,
    path,
    public: true
  })

  const res = await db.query.promise('brand/asset/insert', [
    req.user.id,
    brand_id,
    file.id
  ])

  return BrandAsset.get(res.rows[0].id)
}

BrandAsset.get = async id => {
  const assets = await BrandAsset.getAll([id])
  if (assets.length < 1)
    throw Error.ResourceNotFound(`Brand Asset ${id} not found`)

  return assets[0]
}

BrandAsset.getAll = async ids => {
  const { rows } = await db.query.promise('brand/asset/get', [ids])
  return rows
}

BrandAsset.getByBrand = async brand => {
  const { rows } = await db.query.promise('brand/asset/by-brand', [brand])
  const ids = rows.map(r => r.id)
  return BrandAsset.getAll(ids)
}

BrandAsset.delete = async id => {
  return db.query.promise('brand/asset/delete', [id])
}

BrandAsset.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('brand_asset', 'BrandAsset', BrandAsset)

module.exports = BrandAsset
