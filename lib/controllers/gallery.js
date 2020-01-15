const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')

const Gallery = require('../models/Gallery')

const zipGallery = async (req, res) => {
  const { hash } = req.query

  expect(hash).to.be.a('string')

  const decrypted = Crypto.decrypt(hash)

  const data = JSON.parse(decrypted)

  const date = new Date(data.date)
  const expirey = new Date(date.getTime() + (15 * 16 * 1000))

  expect(new Date(), 'Download link is expired').to.be.below(expirey)

  const user = await User.get(data.user)
  Context.set({user})

  expect(req.params.id).to.equal(data.gallery)
  const gallery = await Gallery.get(data.gallery)

  expect(data.items).to.be.an('array')
  const stream = await Gallery.zip(gallery, data.items)
  stream.pipe(res)
}

const router = function (app) {
  app.get('/gallery/:id.zip', am(zipGallery))

}

module.exports = router
