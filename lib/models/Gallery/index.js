const db = require('../../utils/db')
const JSZip = require('jszip')
const { keyBy, intersection } = require('lodash')
const AttachedFile = require('../AttachedFile')
const Crypto = require('../Crypto')
const Orm = require('../Orm')

const Gallery = {}

const GalleryItem = require('./item')

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

Gallery.zip = async (gallery, _items) => {
  const items = await GalleryItem.getAll(intersection(gallery.items, _items))
  const files = await AttachedFile.getAll(items.map(i => i.file))
  const indexed = keyBy(files, 'id')

  const zip = new JSZip()

  for(const item of items) {
    const file = indexed[item.file]
    const name = `${item.order}-${file.name}`
    const stream = await AttachedFile.downloadAsStream(file)

    const options = {
      binary: true,
      comment: item.name
    }

    zip.file(name, stream, options)
  }

  return zip.generateNodeStream()
}

Gallery.generateZipLink = async ({gallery, user, items}) => {
  const data = {
    gallery: gallery.id,
    user: user.id,
    date: new Date(),
    items
  }

  const hash = Crypto.encrypt(JSON.stringify(data))

  return Url.api({
    uri: `/gallery/${gallery.id}.zip`,
    query: {
      hash
    }
  })
}

Gallery.associations = {
  items: {
    collection: true,
    model: 'GalleryItem'
  }
}

module.exports = Gallery
