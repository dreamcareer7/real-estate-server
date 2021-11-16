const AttachedFile = require('../../AttachedFile')
const promisify = require('../../../utils/promisify')
const db = require('../../../utils/db')

const { getAll } = require('./get')

const createFromRequest = async req => {
  const path = 'brands/assets'

  const { file, fields } = await promisify(AttachedFile.saveFromRequest)({
    req,
    path,
    public: true
  })

  const res = await db.query.promise('brand/asset/insert', [
    req.user.id,
    fields.brands.split(','),
    file.id,
    fields.label,
    fields.template_type,
    fields.medium
  ])

  return getAll(res.rows.map(r => r.id))
}

const _delete = async id => {
  return db.query.promise('brand/asset/delete', [id])
}

module.exports = {
  createFromRequest,
  delete: _delete
}
