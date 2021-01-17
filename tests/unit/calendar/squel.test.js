const { expect } = require('chai')
const sq = require('../../../lib/utils/squel_extensions')

describe('Squel', () => {
  it('should render SqArray values correctly in .toString()', (done) => {
    const q = sq.select({ rawNesting: true })
      .field('id')
      .from('analytics.calendar')
      .where('object_type = ANY(?)', sq.SqArray.from(['contact_attribute']))

    expect(q.toString()).to.be.equal('SELECT id FROM analytics.calendar WHERE (object_type = ANY(\'{contact_attribute}\'))')

    const p = q.toParam()
    expect(p.values[0]).to.have.members(['contact_attribute'])

    done()
  })
})