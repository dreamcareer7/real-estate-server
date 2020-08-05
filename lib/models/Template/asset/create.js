const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const AttachedFile = require('../../AttachedFile')

const { get } = require('./get')

const createFromRequest = async req => {
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

  return get(res.rows[0].id)
}

module.exports = {
  createFromRequest
}
