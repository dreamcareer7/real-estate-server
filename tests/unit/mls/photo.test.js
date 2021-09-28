const { expect } = require('chai')
const Photo = require('../../../lib/models/Photo')
const { createContext } = require('../helper')
const sql = require('../../../lib/utils/sql')

const json = require('./json/photo')

async function findPhoto ({ matrix_unique_id, mls }) {
  const query = `SELECT * FROM photos WHERE
                   matrix_unique_id = $1::text
                   AND mls = $2::mls LIMIT 1`
  
  return sql.selectOne(query, [matrix_unique_id, mls])
}

const savePhoto = async () => {
  const ids = await Photo.create(json)
  expect(ids).to.be.an('array').and.to.have.lengthOf(2)
}

const deleteMissing = async () => {
  await savePhoto()
  const photo = json[0]
  await Photo.deleteMissing(photo.listing_mui, photo.mls, [photo.matrix_unique_id])
}

async function updateSomePhotos () {
  await Photo.create([json[0], json[1]])

  const photoObj1 = {
    ...json[0],
    revision: json[0].revision + 1,
    url: json[0].url + '-new',
    listing_mui: String(json[0].listing_mui),
  }

  const photoObj2 = {
    ...json[1],
    revision: json[1].revision + 1,
    url: json[1].url + 'new',
    listing_mui: String(json[1].listing_mui),
  }
  
  await Photo.create([photoObj1, photoObj2])

  const photo1 = await findPhoto(photoObj1)
  const photo2 = await findPhoto(photoObj2)
  
  expect(photo1).to.be.an('object')
    .that.includes(photoObj1)

  expect(photo2).to.be.an('object')
    .that.includes(photoObj2)
}

describe('MLS Photo', () => {
  createContext()

  it('should save some photos', savePhoto)
  it('should delete missing photos', deleteMissing)
  it('should upsert some photos', updateSomePhotos)
})
