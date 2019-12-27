const db = require('../../utils/db')

const GalleryItem = {}

GalleryItem.createAll = async items => {
  const { rows } = await db.query.promise('gallery/item/insert', [
    JSON.stringify(items)
  ])

  const ids = rows.map(r => r.id)

  return GalleryItem.getAll(ids)
}

GalleryItem.get = async id => {
  const items = await GalleryItem.getAll([id])

  if (items.length < 1)
    throw Error.ResourceNotFound(`Gallery Item ${id} not found`)

  return items[0]
}

GalleryItem.getAll = async ids => {
  const res = await db.query.promise('gallery/item/get', [ids])
  return res.rows
}

Orm.register('gallery_item', 'GalleryItem', GalleryItem)

module.exports = GalleryItem
