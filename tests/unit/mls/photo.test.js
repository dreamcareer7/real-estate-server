const { expect } = require('chai')
const Photo = require('../../../lib/models/Photo')
const { createContext } = require('../helper')

const json = require('./json/photo')

const savePhoto = async () => {
  const ids = await Photo.create(json)
  expect(ids).to.be.an('array').and.to.have.lengthOf(2)
}

const deleteMissing = async () => {
  await savePhoto()
  const photo = json[0]
  await Photo.deleteMissing(photo.listing_mui, photo.mls, [photo.matrix_unique_id])
}

describe('MLS Photo', () => {
  createContext()

  it('should save some photos', savePhoto)
  it('should delete missing photos', deleteMissing)
})
