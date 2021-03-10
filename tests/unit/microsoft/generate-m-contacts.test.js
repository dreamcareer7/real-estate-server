const { expect } = require('chai')

const { chooseAddressAmongAttributes } = require('../../../lib/models/Microsoft/workers/contacts/people/helpers/attributes')

describe('Microsoft', () => {
  describe('Contact Attributes', () => {
    describe('.normzlizeAttributes()', () => {})
    
    describe('.chooseAddressAmongAttributes()', () => {
      it('returns null when attributes are empty')
      it('maps rechat-address props. to microsoft address props.')
      it('prefers to choose a primary address with highest index...')
    })

    describe('.generateMContacts()', () => {})
  })
})
