const JSZip = require('jszip')
const { keyBy, intersection } = require('lodash')

const db = require('../../utils/db')
const AttachedFile = require('../AttachedFile')
const Crypto = require('../Crypto')
const Url    = require('../Url')

const GalleryItem = require('./item')


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

const zip = async (gallery, _items) => {
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

const generateZipLink = async ({gallery, user, items}) => {
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


module.exports = {
  get,
  getAll,
  zip,
  generateZipLink
}