const Holidays = require('date-holidays')
const { keyBy } = require('lodash')

const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE holidays (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
    deleted_at timestamp without time zone,
    name TEXT NOT NULL,
    template_type template_type NOT NULL,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone
  )`
]

const rules = [
  {
    name: "New Year's Eve",
    template_type: 'NewYear',
    rule: '12-31',
  },

  {
    name: 'Christmas Eve',
    rule: '12-24',
    template_type: 'Christmas'
  },

  {
    template_type: 'StPatrick',
    rule: '03-17',
    name: 'St. Patrick’s Day'
  },

  {
    template_type: 'MLKDay',
    name: 'Martin Luther King Jr. Day',
    rule: '3rd monday in January'
  },

  {
    template_type: 'Valentines',
    name: "Valentine's Day",
    rule: '02-14'
  },

  {
    template_type: 'Easter',
    name: 'Easter',
    rule: 'easter'
  },

  {
    template_type: 'FathersDay',
    name: "Father's Day",
    rule: '3rd sunday in June'
  },

  {
    template_type: 'MothersDay',
    name: "Mother's Day",
    rule: '2nd sunday in May'
  },

  {
    template_type: 'MemorialDay',
    name: 'Memorial Day',
    rule: 'monday before 06-01'
  },

  {
    template_type: 'ChineseNewYear',
    name: 'Chinese New Year',
    rule: 'chinese 01-0-01'
  },

  {
    template_type: 'LaborDay',
    name: 'Labor Day',
    rule: 'monday in September'
  },

  {
    template_type: 'FourthOfJuly',
    name: 'Independence Day',
    rule: '07-04 and if sunday then next monday if saturday then previous friday'
  },

  {
    template_type: 'VeteransDay',
    name: 'Veterans Day',
    rule: '11-11'
  },

  {
    template_type: 'Thanksgiving',
    name: 'Thanksgiving',
    rule: '4th thursday in November'
  },

  {
    template_type: 'Halloween',
    name: 'Halloween',
    rule: '10-31 18:00'
  },

  {
    template_type: 'WomansDay',
    name: "International Woman's Day",
    rule: '03-08'
  },

  {
    template_type: 'RoshHashanah',
    name: 'Rosh Hashanah',
    rule: '1 Tishrei'
  },

  {
    template_type: 'Passover',
    name: 'Passover',
    rule: '15 Nisan'
  },

  {
    template_type: 'Hanukkah',
    name: 'Hanukkah',
    rule: '25 Kislev'
  },

  {
    template_type: 'PatriotsDay',
    name: "Patriot's Day",
    rule: '3rd monday in April'
  },

  {
    template_type: 'ColumbusDay',
    name: 'Columbus Day',
    rule: '2nd monday in October'
  }

  // Diwali
  // Kwanzaa
  // BackToSchool
  // DaylightSaving
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
