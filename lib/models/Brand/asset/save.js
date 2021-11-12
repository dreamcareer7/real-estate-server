const AttachedFile = require('../../AttachedFile')
const promisify = require('../../../utils/promisify')
const db = require('../../../utils/db')

const { get } = require('./get')

const createFromRequest = async (brand_id, req) => {
  const path = `brands/${brand_id}/assets`

  const { file, fields } = await promisify(AttachedFile.saveFromRequest)({
    req,
    path,
    public: true
  })

  const res = await db.query.promise('brand/asset/insert', [
    req.user.id,
    brand_id,
    file.id,
    fields.label,
    fields.template_type,
    fields.medium
  ])

  return get(res.rows[0].id)
}

const _delete = async id => {
  return db.query.promise('brand/asset/delete', [id])
}

module.exports = {
  createFromRequest,
  delete: _delete
}
