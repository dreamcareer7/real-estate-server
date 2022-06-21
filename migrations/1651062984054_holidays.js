const Holidays = require('date-holidays')
const { keyBy } = require('lodash')

const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
]

const rules = [
  {
    template_type: 'ChineseNewYear',
    name: 'Chinese New Year',
    rule: 'chinese 01-0-01',
  },
  {
    template_type: 'FourthOfJuly',
    name: 'Independence Day',
    rule: '07-04 and if sunday then next monday if saturday then previous friday',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2021-11-04',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2022-10-24',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2023-11-13',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2024-10-31',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2025-10-20',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2026-11-09',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2027-10-28',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2028-11-15',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2029-11-05',
  },
  {
    template_type: 'Diwali',
    name: 'Deepavali',
    rule: '2030-10-25',
  },
  {
    template_type: 'Ramadan',
    name: 'First day of Ramadan',
    rule: '1 Ramadan',
  },
  {
    template_type: 'Kwanzaa',
    name: 'Kwanzaa',
    rule: '12-26',
  },
  {
    template_type: 'BoxingDay',
    name: 'Boxing Day',
    rule: '12-26',
  },
  {
    template_type: 'EidalFitr',
    name: 'End of Ramadan (Eid al-Fitr)',
    rule: '1 Shawwal',
  },
]

const load = async () => {
  const holidays = new Holidays()

  for (const holiday of rules) {
    const set = holidays.setHoliday(holiday.rule, {
      name: holiday.name,
      type: 'observance',
    })

    if (!set) throw `Cannot set holiday ${holiday.name}`
  }

  return holidays
}

const insert =
  'INSERT INTO holidays(name, starts_at, ends_at, template_type) VALUES ($1, $2, $3, $4)'

const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  const Holidays = await load()

  const by_name = keyBy(rules, 'name')

  for (let year = 2022; year <= 2030; year++) {
    const holidays = Holidays.getHolidays(year)

    for (const holiday of holidays) {
      const { name, start, end } = holiday
      const { template_type } = by_name[name]

      await conn.query(insert, [name, start, end, template_type])
    }
  }

  await conn.query('COMMIT')

  conn.release()
}

exports.up = (cb) => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
