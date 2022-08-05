const Holidays = require('date-holidays')
const { keyBy } = require('lodash')

const db = require('../lib/utils/db')

const migrations = ['BEGIN']

const rules = [
  {
    template_type: 'JuneTeenth',
    name: 'Juneteenth',
    rule: '06-19 and if sunday then next monday if saturday then previous friday since 2021',
  },
  {
    template_type: 'Pride',
    name: 'First Day of Pride Month',
    rule: '06-01', //https://www.timeanddate.com/holidays/us/first-day-of-pride-month
  },
  {
    template_type: 'AsianAmericanAndPacificIslanderHeritageMonth',
    name: 'First Day Of Asian American and Pacific Islander Heritage Month',
    rule: 'May', // https://www.timeanddate.com/holidays/us/first-day-of-asian-pacific-american-heritage-month
  },
  {
    template_type: 'BlackHistoryMonth',
    name: 'First Day Of Black History Month',
    rule: '02-01', // https://www.timeanddate.com/holidays/us/first-day-of-black-history-month
  },
  {
    template_type: 'EarthDay',
    name: 'Earth Day',
    rule: '04-22', // https://www.timeanddate.com/holidays/un/earth-day
  },
  {
    template_type: 'CincoDeMayo',
    name: 'Cinco de Mayo',
    rule: '05-05', //https://www.timeanddate.com/holidays/us/cinco-de-mayo
  },
  {
    template_type: 'YomKippur',
    name: 'Yom Kippur',
    rule: '10 Tishrei', //https://www.timeanddate.com/holidays/us/yom-kippur-tx
  },
  {
    template_type: 'FirstDayOfSpring',
    name: 'First Day of Spring',
    rule: 'march equinox',
  },
  {
    template_type: 'FirstDayOfSummer',
    name: 'First Day of Summer',
    rule: 'june solstice',
  },
  {
    template_type: 'FirstDayOfFall',
    name: 'First Day of Fall',
    rule: 'september equinox',
  },
  {
    template_type: 'FirstDayOfWinter',
    name: 'First Day of Winter',
    rule: 'december solstice',
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
