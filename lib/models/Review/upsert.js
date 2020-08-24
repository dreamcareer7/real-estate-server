const db = require('../../utils/db')

const { get } = require('./get')


const create = async review => {
  const res = await db.query.promise('review/insert', [
    review.created_by,
    review.status
  ])

  return get(res.rows[0].id)
}

const update = async (id, review) => {
  await db.query.promise('review/update', [
    id,
    review.created_by,
    review.status
  ])
}


module.exports = {
  create,
  update
}