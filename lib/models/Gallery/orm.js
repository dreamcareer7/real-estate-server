const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const associations = {
  items: {
    collection: true,
    model: 'GalleryItem'
  }
}


Orm.register('gallery', 'Gallery', {
  getAll,
  associations
})