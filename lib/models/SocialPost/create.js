const db = require('../../utils/db')
const { hasAccessForCreate } = require('./access')
const { get: getFacebookPage } = require('../Facebook/pages/get')
const { expect } = require('../../utils/validator')
/**
 * Insert social post into database
 * @param {UUID} createdBy - user id
 * @param {UUID} brand - brand id
 * @param {import('./types').SocialPostInsertInput} userInput
 * @returns {Promise<UUID>}
 */

const create = async (createdBy, brand, userInput) => { 
  expect(userInput.due_at).to.be.date
  
  if (userInput.caption) {
    // 2200 is the maximum caption length according to this doc
    // https://developers.facebook.com/docs/instagram-api/reference/error-codes
    expect(userInput.caption).to.be.a('string', 'caption field should be string').and.to.have.length.lessThan(2200, 'caption cannot be more than 2200 characters')    
  }

  expect(userInput.facebookPage).to.be.uuid
  expect(userInput.templateInstance).to.be.uuid
  const fbPage = await getFacebookPage(userInput.facebookPage)
  if (!fbPage) {
    throw Error.ResourceNotFound('Facebook page not found')
  }

  if (!(await hasAccessForCreate({ brand, facebookPage: userInput.facebookPage }))) {
    throw Error.Forbidden('Access denied')
  }

  const socialPostId = await db.insert('social_post/insert', [
    createdBy,
    brand,
    userInput.templateInstance,
    userInput.facebookPage,
    new Date(userInput.due_at).getTime() / 1000,
    userInput.caption,
  ])

  return socialPostId
}

module.exports = {
  create,
}
