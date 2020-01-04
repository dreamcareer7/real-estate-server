const am = require('../utils/async_middleware.js')
const promisify = require('../utils/promisify')

const Gallery = require('../models/Gallery')
const GalleryItem = require('../models/Gallery/item')


const zipGallery = async (req, res) => {
  const deal = await promisify(Deal.get)(req.params.id)
  const gallery = await Gallery.get(deal.gallery)

  const stream = await Gallery.zip(gallery)
  stream.pipe(res)
}

const router = function (app) {
  app.get('/gallery.zip', auth, access, am(zipGallery))

}

module.exports = router
