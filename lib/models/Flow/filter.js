const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')


/**
 * @param {{ brand: UUID; origin?: UUID; contacts?: UUID[]; status?: 'Active' | 'Stopped' | 'Completed' }} arg1
 */
const filter = async ({brand, origin, contacts, status}) => {
  const q = sq.select()
    .field('id')
    .from('flows')
    .where('brand = ?', brand)

  if (status === 'Stopped') {
    q.where('deleted_at IS NOT NULL')
  }
  else {
    q.where('deleted_at IS NULL')

    if (status === 'Active') {
      q.where('starts_at + (SELECT MAX(wait_for) FROM brands_flow_steps WHERE flow = flows.origin) >= now()')
    }
    else {
      q.where('starts_at + (SELECT MAX(wait_for) FROM brands_flow_steps WHERE flow = flows.origin) < now()')
    }
  }

  if (origin) q.where('origin = ?', origin)

  if (Array.isArray(contacts)) q.where('contact = ANY(?)', sq.SqArray.from(contacts))

  return db.selectIds(q)
}


module.exports =  {
  filter
}
