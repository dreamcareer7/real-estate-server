const { expect } = require('chai')

const { chooseAddressAmongAttributes } = require('../../../lib/models/Microsoft/workers/contacts/people/helpers/attributes')

const addressAttr = (
  label, type, text, index = 0, updatedAt = 0, isPrimary = false
) => ({
  label,
  attribute_type: type,
  text,
  index,
  updated_at: updatedAt,
  is_primary: isPrimary
})

describe('Microsoft', () => {
  describe('Contact Attributes', () => {
    describe('.normzlizeAttributes()', () => {})
    
    describe('.chooseAddressAmongAttributes()', () => {
      it('returns null when attributes are empty', () => {
        expect(chooseAddressAmongAttributes(undefined, 'foo')).to.be.null
        expect(chooseAddressAmongAttributes(null, 'foo')).to.be.null
        expect(chooseAddressAmongAttributes([], 'foo')).to.be.null
      })
      
      it('maps rechat-address props. to microsoft address props.', () => {
        const attrs = [
          addressAttr('blah', 'country', 'foo'),
          addressAttr('blah', 'state', 'bar'),
          addressAttr('blah', 'city', 'baz'),
          addressAttr('blah', 'street_name', 'qux'),
          addressAttr('blah', 'postal_code', 'nux'),
        ]
        
        const microsoftAddr = {
          countryOrRegion: 'foo',
          state: 'bar',
          city: 'baz',
          street: 'qux',
          postalCode: 'nux',
        }

        expect(chooseAddressAmongAttributes(attrs, 'blah'))
          .to.be.deep.equal(microsoftAddr)
      })
      
      it('prefers to choose a primary address with highest index...', () => {
        const attrs = [
          /* Index #0 */
          addressAttr('blah', 'country', 'foo1', 0, 1, false),
          addressAttr('blah', 'state', 'bar1', 0, 2, false),
          addressAttr('blah', 'city', 'baz1', 0, 3, false),
          addressAttr('blah', 'street_name', 'qux1', 0, 4, false),
          addressAttr('blah', 'postal_code', 'nux1', 0, 5, false),

          /* Index #1 */
          addressAttr('blah', 'country', 'foo2', 1, 1, true),
          addressAttr('blah', 'state', 'bar2', 1, 2, true),
          addressAttr('blah', 'city', 'baz2', 1, 3, true),
          addressAttr('blah', 'street_name', 'qux2', 1, 4, true),
          addressAttr('blah', 'postal_code', 'nux2', 1, 5, true),

          /* Index #2 */
          addressAttr('blah', 'country', 'foo3', 2, 1, true),
          /* When we've got two attributes with same index,
           * the newer one will be selected: */
          addressAttr('blah', 'state', 'bar3-old', 2, 2, true),
          addressAttr('blah', 'state', 'bar3-new', 2, 3, true),
          /* And if theoretically the attributes are same,
           * even for update time, second one will be selected: */
          addressAttr('blah', 'city', 'baz3-1st', 2, 3, true),
          addressAttr('blah', 'city', 'baz3-2nd', 2, 3, true),
          addressAttr('blah', 'street_name', 'qux3', 2, 4, true),
          addressAttr('blah', 'postal_code', 'nux3', 2, 5, true),

          /* Index #3 */
          addressAttr('blah', 'country', 'foo4', 3, 1, false),
          addressAttr('blah', 'state', 'bar4', 3, 2, false),
          addressAttr('blah', 'city', 'baz4', 3, 3, false),
          addressAttr('blah', 'street_name', 'qux4', 3, 4, false),
          addressAttr('blah', 'postal_code', 'nux4', 3, 5, false),

          /* Index #4 */
          /* This one will be ignored due to its different label: */
          addressAttr('BlaH', 'country', 'foo5', 4, 10, true),
          addressAttr('BlaH', 'state', 'bar5', 4, 10, true),
          addressAttr('BlaH', 'city', 'baz5', 4, 10, true),
          addressAttr('BlaH', 'street_name', 'qux5', 4, 10, true),
          addressAttr('BlaH', 'postal_code', 'nux5', 4, 10, true),
        ]

        const selected = {
          countryOrRegion: 'foo3',
          state: 'bar3-new',
          city: 'baz3-2nd',
          street: 'qux3',
          postalCode: 'nux3',
        }

        expect(chooseAddressAmongAttributes(attrs, 'blah'))
          .to.be.deep.equal(selected)
      })
    })

    describe('.generateMContacts()', () => {})
  })
})
