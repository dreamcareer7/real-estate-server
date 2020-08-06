const db = require('../../../utils/db')


const createAll = async items => {
  const { rows } = await db.query.promise('gallery/item/insert', [
    JSON.stringify(items)
  ])

  const ids = rows.map(r => r.id)

  return getAll(ids)
}

const get = async id => {
  const items = await getAll([id])

  if (items.length < 1) {
    throw Error.ResourceNotFound(`Gallery Item ${id} not found`)
  }

  return items[0]
}

const getAll = async ids => {
  const res = await db.query.promise('gallery/item/get', [ids])

  return res.rows
}

const update = async item => {
  await db.query.promise('gallery/item/update', [
    item.id,
    item.name,
    item.order,
    item.file
  ])

  return get(item.id)
}

const deleteByItemId = async item => {
  return db.query.promise('gallery/item/delete', [item.id])
}

const sort = async pairs => {
  await db.query.promise('gallery/item/sort', [
    JSON.stringify(pairs)
  ])

  return getAll(pairs.map(pair => pair.id))
}


module.exports = {
  createAll,
  get,
  getAll,
  update,
  delete: deleteByItemId,
  sort
}