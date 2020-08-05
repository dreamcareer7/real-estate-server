const db = require('../../utils/db')


const getAll = async ids => {
  const res = await db.query.promise('review/get', [ids])
  return res.rows
}

const get = async id => {
  const reviews = await getAll([id])

  if (reviews.length < 1)
    throw Error.ResourceNotFound(`Review ${id} not found`)

  return reviews[0]
}


module.exports = {
  getAll,
  get
}