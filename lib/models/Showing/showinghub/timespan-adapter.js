const { strict: assert } = require('assert')
const groupBy = require('lodash/groupBy')
const utils = require('./utils')

/* eslint yoda:0 */

/** @typedef {import('../availability/types').ShowingAvailabilityInput} ShowingAvailabilityInput */
/** @typedef {import('../availability/types').ShowingAvailability} ShowingAvailability */
/** @typedef {import('../availability/types').DayOfWeek} DayOfWeek */
/** @typedef {import('./types').ReoccurringRestrictionEntity} ReoccurringRestriction */
/** @typedef {import('./types').RestrictionEntity} Restriction */
/** @typedef {[from: number, to: number]} Timespan */

const MILLIS = 1
const SECOND = 1000 * MILLIS
const DAY = 24 * 60 * 60 * SECOND
const WEEK = 7 * DAY
const LONG_TIME = 365 * DAY
const MANY_WEEKS = Math.floor(LONG_TIME / WEEK)

const FROM = 0
const TO = 1

/** @type {readonly DayOfWeek[]} */
const WEEKDAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
])

/**
 * @param {number} ts
 * @returns {number}
 */
function startOfDay (ts) {
  return Math.floor(ts / DAY) * DAY
}

/**
 * @param {number} ts
 * @returns {number}
 */
function startOfNextDay (ts) {
  if (ts % DAY === 0) { return ts }
  return startOfDay(ts + DAY)
}

/**
 * @param {number | DayOfWeek} weekday
 * @returns {number}
 */
function weekdayToMillis (weekday) {
  if (typeof weekday === 'string') {
    weekday = WEEKDAYS.indexOf(weekday)
  }
  
  if (typeof weekday === 'number') {
    assert(0 <= weekday && weekday <= 6, 'weekday must be in [0, 6]')
    return weekday * DAY
  }

  throw new Error(`Invalid week day: ${weekday}`)
}

/**
 * @param {number} weekday
 * @returns {DayOfWeek}
 */
function weekdayName (weekday) {
  assert(0 <= weekday && weekday <= 6, 'weekday must be between 0 and 6')
  return WEEKDAYS[weekday]
}

/**
 * @param {number} from
 * @param {number} to
 * @returns {Timespan}
 */
function timespan (from, to) {
  assert(from !== to, '`from` cannot be equal to `to`')
  return from < to ? [from, to] : [to, from]
}

/**
 * @param {Timespan} s1
 * @param {Timespan} s2
 * @returns {boolean}
 */
timespan.collids = function (s1, s2) {
  const [from1, to1] = s1
  const [from2, to2] = s2

  return (from1 <= from2 && from2 <= to1) || (from2 <= from1 && from1 <= to2)
}

/**
 * @param {Timespan} s1
 * @param {Timespan} s2
 * @returns {boolean}
 */
timespan.expand = function (s1, s2) {
  if (!timespan.collids(s1, s2)) { return false }

  s1[FROM] = Math.min(s1[FROM], s2[FROM])
  s1[TO] = Math.max(s1[TO], s2[TO])
  return true
}

/** 
 * @param {Timespan[]} timespans
 * @param {number} from
 * @param {number} to
 */
timespan.pushTo = function (timespans, from, to) {
  if (from === to) { return }

  const newSpan = timespan(from, to)
  
  for (const span of timespans) {
    if (timespan.expand(span, newSpan)) {
      return
    }
  }

  timespans.push(newSpan)
}

/**
 * @param {Timespan[]} spans 
 * @returns {Timespan[]}
 */
timespan.inverse = function (spans) {
  if (!spans.length) { return [] }
  
  spans = [...spans].sort((s1, s2) => s1[TO] - s2[TO])
  
  const lower = Math.min(...spans.flat())
  const upper = Math.max(...spans.flat())

  const start = startOfDay(lower)
  const end = startOfNextDay(upper)

  const inversed = []
  
  for (let i = 0, len = spans.length; i < len; i++) {
    const curr = spans[i]
    const next = spans[i + 1]

    if (i === 0) {   
      timespan.pushTo(inversed, start, curr[FROM] - 1)
    }

    if (next) {
      timespan.pushTo(inversed, curr[TO], next[FROM] - 1)
    }

    if (!next) {
      timespan.pushTo(inversed, curr[TO], end)
    }
  }
  
  return inversed
}

/**
 * @param {Timespan} span
 * @returns {Timespan[]}
 */
timespan.splitOneInDays = function (span) {
  const margin = startOfNextDay(span[FROM])

  if (span[TO] > margin) {
    return [timespan(span[FROM], margin - 1), timespan(margin, span[TO])]
  }

  return [span]
}

/**
 * @param {Timespan[]} spans
 * @returns {Record<number, Timespan[]>}
 */
timespan.splitInDays = function (spans) {
  spans = spans.flatMap(timespan.splitOneInDays)

  return groupBy(spans, s => startOfDay(s[FROM]))
}

/**
 * @param {Timespan[]} timespans
 * @returns {ShowingAvailabilityInput[]}
 */
timespan.toShowingAvailabilityInputs = function (timespans) {
  const splitted = timespan.splitInDays(timespans)
  
  return Object.entries(splitted).flatMap(([dayStr, spans]) => {
    const day = Number(dayStr)
    const weekday = weekdayName(Math.floor(Number(day) / DAY))
    
    return spans.map(span => ({
      weekday,
      availability: [
        Math.floor((span[FROM] - day) / SECOND),
        Math.floor((span[TO] - day) / SECOND),
      ],
    }))   
  })
}

/**
 * @param {ShowingAvailability} avail
 * @returns {Timespan | null}
 */
timespan.fromShowingAvailability = function (avail) {
  const { lower, upper } = avail.availability
  if (!lower || !upper || lower === upper) { return null }
  
  const base = weekdayToMillis(avail.weekday)

  return timespan(
    base + lower * SECOND,
    base + upper * SECOND,
  )  
}

/**
 * @param {ShowingAvailability[]} avails
 * @returns {Timespan[]}
 */
timespan.fromShowingAvailabilities = function (avails) {
  const timespans = []

  for (const avail of avails) {
    const span = timespan.fromShowingAvailability(avail)
    if (!span) { continue }
    
    timespan.pushTo(timespans, ...span)  
  }

  return timespans
}

/**
 * @param {Timespan[]} timespans
 * @param {object} etc
 * @param {number} etc.beginDate
 * @returns {ReoccurringRestriction[]}
 */
timespan.toReocurringRestrictions = function (timespans, { beginDate }) {
  const dateTime = v => utils.dateTime(v) ?? assert.fail('Invalid date/time')

  beginDate = utils.getTime(beginDate)
  
  const splitted = timespan.splitInDays(timespans)

  return Object.entries(splitted).flatMap(([dayStr, spans]) => {
    const day = Number(dayStr)
    const weekday = weekdayName(Math.floor(Number(day) / DAY))
    
    return spans.map(([from, to]) => ({
      // XXX: belakhare string or number?
      dayOfWeek: /** @type {any} */ (weekday),

      // XXX: is it [really] required?
      showListingId: '',
      
      beginDate: dateTime(beginDate),
      numberOfWeeks: MANY_WEEKS,
      
      startDatetime: dateTime(beginDate + from),
      endDatetime: dateTime(beginDate + LONG_TIME + to),
    }))
  })
}

/**
 * @param {ReoccurringRestriction} reoRest
 * @returns {Timespan | null}
 */
timespan.fromReoccurringRestriction = function (reoRest) {
  const lower = utils.getTime(reoRest.startDatetime) % DAY
  const upper = utils.getTime(reoRest.endDatetime) % DAY
  if (lower === upper) { return null }
  
  const base = weekdayToMillis(reoRest.dayOfWeek)

  return timespan(
    base + lower,
    base + upper,
  )
}

/**
 * @param {ReoccurringRestriction[]} reoRests
 * @returns {Timespan[]}
 */
timespan.fromReoccurringRestrictions = function (reoRests) {
  const timespans = []

  for (const reoRest of reoRests) {
    const span = timespan.fromReoccurringRestriction(reoRest)
    if (!span) { continue }
    
    timespan.pushTo(timespans, ...span)
  }

  return timespans
}

/**
 * @param {object} args
 * @param {ShowingAvailability[]} args.availablities
 * @param {number} args.beginDate
 * @returns {{ restrictions: Restriction[], reoccurringRestrictions: ReoccurringRestriction[] }}
 */
function hubRestrictions ({ availablities: avails, beginDate }) {
  const availTimespans = timespan.fromShowingAvailabilities(avails)
  const restTimespans = timespan.inverse(availTimespans)

  return {
    reoccurringRestrictions: timespan.toReocurringRestrictions(restTimespans, { beginDate }),
    restrictions: [],
  }
}

/**
 * @param {object} args
 * @param {ReoccurringRestriction[]} args.reocurringRestrictions
 * @param {Restriction[]} args.restrictions[]
 * @returns {ShowingAvailabilityInput[]}
 */
function rechatAvailabilities ({
  reocurringRestrictions: reoRests,
  restrictions: _,
}) {
  const restTimespans = timespan.fromReoccurringRestrictions(reoRests)
  const availTimespans = timespan.inverse(restTimespans)

  return timespan.toShowingAvailabilityInputs(availTimespans)
}

module.exports = {
  hubRestrictions,
  rechatAvailabilities,
  timespan,
}
