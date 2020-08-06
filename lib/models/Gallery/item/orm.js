const Orm = require('../../Orm/registry')

const { getAll } = require('./item')

const associations = {
  file: {
    enabled: true,
    model: 'AttachedFile'
  }
}


Orm.register('gallery_item', 'GalleryItem', {
  getAll,
  associations
})