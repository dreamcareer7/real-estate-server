const { expect } = require('chai')
const { ShowingHubClient } = require('./client')
const client = new ShowingHubClient()

async function getToken() {
  const token = await client.getToken()
  expect(token).not.to.be.null.and.undefined
  expect(await client.getToken()).to.be.equal(token)
}

async function callGetListing() {
  const listing = await client.api.appListingGetDetail('1a114a6e-3dca-4924-93c6-08d98a94d4de')
  expect(listing.data.isSuccessful).to.be.true
  expect(listing.data.results).to.have.length(1)
}

describe('ShowingHub Client', function() {
  it('should get a token', getToken)
  it('should call apis using the token', callGetListing)
})
