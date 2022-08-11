const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')


/**
 * @param {{ brand: UUID; origin?: UUID; contacts?: UUID[]; status?: 'Active' | 'Stopped' | 'Completed'; created_by?: UUID }} arg1
 */
const filter = async ({brand, origin, contacts, status, created_by}) => {
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
      q.where(`
        EXISTS (
          SELECT
            fs.id FROM flows_steps AS fs
          WHERE
            fs.executed_at IS NULL AND fs.deleted_at IS NULL AND fs.flow = flows.id
        )`)
    } else {
      q.where(`
        NOT EXISTS (
          SELECT
            fs.id FROM flows_steps AS fs
          WHERE
            fs.executed_at IS NULL AND fs.deleted_at IS NULL AND fs.flow = flows.id
        )`)
    }
  }

  if (origin) q.where('origin = ?', origin)

  if (Array.isArray(contacts)) q.where('contact = ANY(?)', sq.SqArray.from(contacts))

  if (created_by) q.where('created_by = ?', created_by)
  return db.selectIds(q)
}


module.exports =  {
  filter
}
