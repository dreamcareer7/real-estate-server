const db = require('../../utils/db')


const get = async id => {
  const galleries = await getAll([id])

  if (galleries.length < 1) {
    throw Error.ResourceNotFound(`Gallery ${id} not found`)
  }

  return galleries[0]
}

const getAll = async ids => {
  const res = await db.query.promise('gallery/get', [ids])

  return res.rows
}


module.exports = {
  get,
  getAll
}