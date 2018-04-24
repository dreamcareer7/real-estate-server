const { registerSuite } = intern.getInterface('object')
const {expect} = intern.getPlugin('chai')
const {AddressIndexHelper} = require('../../../lib/models/MSGraph/util')

registerSuite('Address indexer', {
  tests: {
    
    'Gets correct index for address'() {
      const indexer = new AddressIndexHelper()
      let index = indexer.getIndexFor('Home')
      expect(index).to.equal(1)
      index = indexer.getIndexFor('Home')
      expect(index).to.equal(1)
      index = indexer.getIndexFor('Business')
      expect(index).to.equal(2)
      index = indexer.getIndexFor('Home')
      expect(index).to.equal(1)
      index = indexer.getIndexFor('Cool')
      expect(index).to.equal(3)
      index = indexer.getIndexFor('Home')
      expect(index).to.equal(1)
    }
  }
})