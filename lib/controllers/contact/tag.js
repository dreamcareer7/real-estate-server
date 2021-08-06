const { expect } = require('chai')

const ContactTag = require('../../models/Contact/tag')

const { getCurrentBrand } = require('./common')

async function getAllTags(req, res) {
  if (req.query.users) {
    expect(req.query.users).to.be.an('array')
  }

  const tags = await ContactTag.getAll(
    getCurrentBrand(),
    req.query.users
  )

  return res.collection(tags)
}

async function createTag(req, res) {
  await ContactTag.create(
    getCurrentBrand(),
    req.user.id,
    req.body.tag,
    req.body.touch_freq
  )

  res.status(204)
  res.end()
}

async function renameTag(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const src = req.params.tag
  const dst = req.body.tag

  await ContactTag.rename(brand_id, user_id, src, dst)

  res.status(204)
  res.end()
}

async function updateTagTouchFreq(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const tag = req.params.tag

  await ContactTag.update_touch_frequency(brand_id, user_id, tag, req.body.touch_freq)

  res.status(204)
  res.end()  
}

async function patchTag(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const src = req.params.tag
  const { tag: dst, touch_freq } = req.body

  if (typeof dst === 'string') {
    await ContactTag.rename(brand_id, user_id, src, dst)
  }

  if (typeof touch_freq === 'number') {
    await ContactTag.update_touch_frequency(brand_id, user_id, src, touch_freq)
  }

  res.status(204)
  res.end()
}

async function deleteTag(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const tag = req.params.tag
  const case_sensitive = req.query.case_sensitive || true

  await ContactTag.delete(brand_id, user_id, [tag], case_sensitive)

  res.status(204)
  res.end()  
}

async function deleteTags(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const tags = req.body.tags
  const case_sensitive = req.query.case_sensitive || true

  await ContactTag.delete(brand_id, user_id, tags, case_sensitive)

  res.status(204)
  res.end()  
}

module.exports = {
  getAllTags,
  createTag,
  deleteTags,
  renameTag,
  patchTag,
  updateTagTouchFreq,
  deleteTag
}
