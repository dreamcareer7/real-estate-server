const JSZip = require('jszip')
const { keyBy, intersection } = require('lodash')

const AttachedFile = require('../AttachedFile')
const Crypto = require('../Crypto')
const Url    = require('../Url')

const GalleryItem = require('./item')


/*
 * For server#1605.
 * Windows Explorer is unable to extract Zip files when files inside them have
 * filenames including "dos characters". https://datacadamia.com/lang/dos/character
 *
 * Replacing them with an _ is also Google Drive's approach
 */
const encode = name => {
  return name.replace(/[|><\]&%@[:^]/g, '_')
}

const zip = async (gallery, _items) => {
  const items = await GalleryItem.getAll(intersection(gallery.items, _items))
  const files = await AttachedFile.getAll(items.map(i => i.file))
  const indexed = keyBy(files, 'id')

  const zip = new JSZip()

  for(const item of items) {
    const file = indexed[item.file]
    const name = `${item.order.toString().padStart(2, 0)}-${encode(file.name)}`
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
  zip,
  generateZipLink
}
