const { expect } = require('chai')

const { ShowingHubClient } = require('./client')
const client = new ShowingHubClient()

async function getToken() {
  const token = await client.getToken()

  expect(token).not.to.be.null.and.undefined
}

describe('getToken', function() {
  it('should get a token', getToken)
})