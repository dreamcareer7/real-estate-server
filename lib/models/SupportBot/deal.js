const _ = require('lodash')

const promisify = require('../../utils/promisify')

const Orm = require('../Orm')
const Deal = require('../Deal/index')

const sql = require('./sql')

async function getDealById(deal_id) {
  const raw = await promisify(Deal.get)(deal_id)
  const deal = (await Orm.populate({
    models: [raw],
    associations: ['deal.roles', 'deal.brand']
  }))[0]

  deal.created_by = raw.created_by

  return deal
}

async function undeleteDeal(deal_id) {
  return sql.update('UPDATE deals SET deleted_at = NULL WHERE id = $1::uuid', [
    deal_id
  ])
}

async function deleteDeal(deal_id) {
  return sql.update('UPDATE deals SET deleted_at = NOW() WHERE id = $1::uuid', [
    deal_id
  ])
}

async function changeEnderType(deal_id, ender_type) {
  let enderTypeContext

  const user = (await sql.map(
    'SELECT created_by FROM deals WHERE id = $1',
    [deal_id],
    'created_by'
  ))[0]

  try {
    enderTypeContext = await sql.selectOne(`
      SELECT
        *
      FROM
        deal_context
      WHERE
        deal = $1
        AND key = 'ender_type'
      ORDER BY
        created_at DESC
      LIMIT 1
    `, [
      deal_id
    ])
  } catch (ex) {
    enderTypeContext = null
  }

  switch (ender_type) {
    case 'Normal':
      if (enderTypeContext) {
        await sql.update(
          `
          DELETE FROM deal_context WHERE id = $1
        `,
          [enderTypeContext.id]
        )
      }
      break
    default:
      if (enderTypeContext) {
        await sql.update(
          'UPDATE deal_context SET text = $2, value = $2, updated_at = now() WHERE id = $1',
          [enderTypeContext.id, ender_type]
        )
      } else {
        await Deal.saveContext({
          deal: deal_id,
          user: user,
          context: {
            ender_type: {
              value: ender_type,
              approved: true
            }
          }
        })
      }
  }
}

async function switchPrimaryAgent(old_pa, new_pa) {
  const current = await sql.select(`
    SELECT * FROM deals_roles WHERE id = ANY($1::uuid[])
  `, [[old_pa, new_pa]])

  const roles_index = _.keyBy(current, 'id')

  await sql.update('UPDATE deals_roles SET role = $1 WHERE id = $2', [
    roles_index[old_pa].role,
    new_pa
  ])

  await sql.update('UPDATE deals_roles SET role = $1 WHERE id = $2', [
    roles_index[new_pa].role,
    old_pa
  ])
}

module.exports = {
  getDealById,
  undeleteDeal,
  deleteDeal,
  changeEnderType,
  switchPrimaryAgent
}
