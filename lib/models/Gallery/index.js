const db = require('../../utils/db')

const Gallery = {}

require('./item')

Orm.register('gallery', 'Gallery', Gallery)

Gallery.get = async id => {
  const galleries = await Gallery.getAll([id])

  if (galleries.length < 1)
    throw Error.ResourceNotFound(`Gallery ${id} not found`)

  return galleries[0]
}

Gallery.getAll = async ids => {
  const res = await db.query.promise('gallery/get', [ids])
  return res.rows
}


Gallery.associations = {
  items: {
    collection: true,
    model: 'GalleryItem'
  }
}

module.exports = Gallery
