const db = require('../../utils/db')

const GalleryItem = {}
Orm.register('gallery_item', 'GalleryItem', GalleryItem)

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

GalleryItem.update = async item => {
  await db.query.promise('gallery/item/update', [
    item.id,
    item.name,
    item.order,
    item.file
  ])

  return GalleryItem.get(item.id)
}

GalleryItem.delete = async item => {
  return db.query.promise('gallery/item/delete', [item.id])
}

GalleryItem.sort = async pairs => {
  await db.query.promise('gallery/item/sort', [
    JSON.stringify(pairs)
  ])

  return GalleryItem.getAll(pairs.map(pair => pair.id))
}

GalleryItem.associations = {
  file: {
    enabled: true,
    model: 'AttachedFile'
  }
}


module.exports = GalleryItem
