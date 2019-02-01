const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./json/photo')

const savePhoto = async () => {
  const id = await Photo.create(json)
  expect(id).to.be.a('string')
}

const deleteMissing = async () => {
  await savePhoto()
  await Photo.deleteMissing(json.listing_mui, [json.matrix_unique_id])
}

describe('MLS Photo', () => {
  createContext()

  it('should save a photo', savePhoto)
  it('should delete missing photos', deleteMissing)
})
