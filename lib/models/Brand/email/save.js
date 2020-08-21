const db = require('../../../utils/db')

const { get } = require('./get')

const create = async email => {
  const id = await db.insert('brand/email/insert', [
    email.created_by,
    email.brand,
    email.name,
    email.goal,
    email.subject,
    email.include_signature,
    email.body
  ])

  return get(id)
}

const update = async email => {
  await db.update('brand/email/update', [
    email.id,
    email.name,
    email.goal,
    email.subject,
    email.include_signature,
    email.body
  ])

  return get(email.id)
}

const _delete = async id => {
  await db.update('brand/email/remove', [
    id
  ])
}

module.exports = {
  create,
  update,
  delete: _delete
}
