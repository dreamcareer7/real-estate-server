const Holidays = require('date-holidays')
const { keyBy } = require('lodash')
const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `DELETE FROM holidays
    WHERE template_type = 'September11'`,

  `DELETE FROM holidays
    WHERE template_type = 'PatriotsDay'`,
  'COMMIT'
]


const rules = [
  {
    template_type: 'PatriotsDay',
    name: "Patriots' Day",
    rule: '3rd monday in April'
  },

  {
    template_type: 'September11',
    name: "September 11",
    rule: '09-11'
  }
]

const load = async () => {
  const holidays = new Holidays

  for(holiday of rules) {
    const set = holidays.setHoliday(holiday.rule, {
      name: holiday.name,
      type: 'observance'
    })

    if (!set)
      throw `Cannot set holiday ${holiday.name}`
  }

  return holidays
}

const insert = 'INSERT INTO holidays(name, starts_at, ends_at, template_type) VALUES ($1, $2, $3, $4)'

const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  const Holidays = await load()

  const by_name = keyBy(rules, 'name')

  for(let year = 2021; year <= 2050; year++) {
    const holidays = Holidays.getHolidays(year)

    for(const holiday of holidays) {
      const { name, start, end } = holiday
      const { template_type } = by_name[name]

      await conn.query(insert, [
        name,
        start,
        end,
        template_type
      ])
    }
  }

  await conn.query('COMMIT')

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
