const QueryBuilder = require('../query')
const Contact = require('../../../Contact/access')

class ContactBaseQueryBuilder extends QueryBuilder {
  constructor(drilldowns, filters, user_id, brand_id) {
    // @ts-ignore
    super({}, drilldowns, filters, user_id, brand_id)
  }

  async authorize() {
    if (!this.user_id || !this.brand_id) {
      throw Error.Unauthorized('Unauthorized access to analytical data')
    }

    await Contact.limitBrandAccess(this.user_id, this.brand_id)
  }
}

module.exports = ContactBaseQueryBuilder
