const { expect } = require('chai')
const Photo = require('../../../lib/models/Photo')
const { createContext } = require('../helper')

const json = require('./json/photo')

const savePhoto = async () => {
  const id = await Photo.create(json[0])
  expect(id).to.be.a('string')
}

const bulkSavePhotos = async () => {
  const ids = await Photo.createMany(json)
  expect(ids).to.have.length(2)
}

const deleteMissing = async () => {
  await savePhoto()
  const photo = json[0]
  await Photo.deleteMissing(photo.listing_mui, photo.mls, [photo.matrix_unique_id])
}

describe('MLS Photo', () => {
  createContext()

  it('should save a photo', savePhoto)
  it('should save multiple photos at once', bulkSavePhotos)
  it('should delete missing photos', deleteMissing)
})
