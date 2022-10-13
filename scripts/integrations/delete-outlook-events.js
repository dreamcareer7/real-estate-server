#!/usr/bin/env node

require('colors')
const { strict: assert } = require('assert')
const sql = require('../../lib/utils/sql')

const getClient = require('../../lib/models/Microsoft/client')
const Context = require('../../lib/models/Context')

const MicrosoftCredential = require('../../lib/models/Microsoft/credential/get')
const MicrosoftCalendar = require('../../lib/models/Microsoft/calendar/get')
const CrmTask = require('../../lib/models/Task/delete')
const MicrosoftCalendarEvent = {
  ...require('../../lib/models/Microsoft/calendar_events/delete'),
  ...require('../../lib/models/Microsoft/calendar_events/get'),
}

/** @typedef {Record<string, any>} MicrosoftCredential */
/** @typedef {Record<string, any>} MicrosoftCalendarEvent */
/** @typedef {Record<string, any>} MicrosoftCalendar */

const SQL = {
  findTasksByEventIds: `
    SELECT ct.id
    FROM calendar_integration AS ci
    JOIN crm_tasks AS ct ON ct.id = ci.crm_task
    WHERE ci.origin = 'microsoft'
      AND ci.microsoft_id = ANY($1::uuid[])
  `,
  deleteIntegrationsByEventId: `
    UPDATE calendar_integration
    SET deleted_at = now(),
        updated_at = now()
    WHERE deleted_at IS NULL
      AND origin = 'microsoft'
      AND microsoft_id = ANY($1::uuid[])
  `,
}

/** @param {string} s */
const truncate = (s, n = 10) => (s.length > n) ? s.slice(0, n - 1) + '&hellip;' : s

/**
 * @param {string} query
 * @returns {Promise<UUID[]>}
 */
async function getEventIds (query) {
  assert(query?.trim?.(), 'query is required')

  const results = await sql.select(query)
  assert(results?.length, 'empty resultset')
  assert(results[0].id, 'query must select `id`')

  return [...new Set(results.map(r => r.id).filter(Boolean))]
}

/**
 * @param {import('commander').OptionValues} opts
 * @returns {Promise<MicrosoftCredential>}
 */
async function getMicrosoftCredential (opts) {
  assert(opts.credential?.trim?.(), 'Microsoft credential is required')
  const cred = await MicrosoftCredential.get(opts.credential)

  if (opts.user) {
    assert.equal(cred.user, opts.user, `cred.user !== ${opts.user}`)
  }

  if (opts.brand) {
    assert.equal(cred.brand, opts.brand, `cred.brand !== ${opts.brand}`)
  }

  return cred
}

/**
 * @param {MicrosoftCredential} cred
 * @param {MicrosoftCalendar} cal
 * @param {MicrosoftCalendarEvent[]} events
 */
async function deleteEvents (cred, cal, events) {
  assert.equal(cred.id, cal.microsoft_credential)
  assert(events.every(e => e.microsoft_credential === cred.id))
  assert(events.every(e => e.microsoft_calendar === cal.id))

  const client = await getClient(cred.id, 'calendar')

  const { failed } = await client.batchDeleteEvents(
    events.map((event, index) => ({
      requestId: index + 1,
      calendarId: cal.calendar_id,
      eventId: event.event_id,
    }))
  )

  if (failed?.length) {
    // error
  }

  await MicrosoftCalendarEvent.bulkDelete(
    events.map(event => ({
      microsoft_credential: cred.id,
      microsoft_calendar: cal.id,
      event_id: event.event_id,
    }))
  )

  Context.log('Deleting calendar integrations by event IDs...')
  await sql.update(SQL.deleteIntegrationsByEventId, events.map(e => e.event_id))
}

/**
 * @param {MicrosoftCalendarEvent[]} events
 * @param {import('commander').OptionValues} opts
 */
function validateEvents (events, opts) {
  for (const e of events) {
    if (opts.credential) {
      assert.equal(e.microsoft_credential, opts.credential, `event.microsoft_credential !== ${opts.credential}`)
    }
    if (opts.calendarId) {
      assert.equal(e.microsoft_calendar, opts.calendarId, `event.microsoft_credential !== ${opts.credential}`)
    }
  }
}

/** @param {import('commander').program} program */
function initProgram (program) {
  program
    .option('-q, --query <query>', 'SQL query that selects Microsoft event *ID*s')
    .option('-C, --calendar <calendarId>', 'Microsoft calendar ID')
    .option('-c, --credential <credential>', 'Microsoft credential')
    .option('-d, --dry-run', 'Dry run?')
}

/** @param {import('commander').program} program */
async function deleteOutlookEvents (program) {
  const opts = program.opts()

  assert(opts.credential?.trim?.(), 'credential is required')
  assert(opts.calendar?.trim?.(), 'calendar is required')
  assert(opts.query?.trim?.(), 'query is required')

  const cred = await getMicrosoftCredential(opts)
  const cal = await MicrosoftCalendar.get(opts.calendar)

  const eventIds = await getEventIds(opts.query)
  const events = await MicrosoftCalendarEvent.getAll(eventIds)
  validateEvents(events, opts)

  Context.log('Finding tasks by event IDs...')
  const taskIds = await sql.selectIds(SQL.findTasksByEventIds, [eventIds])

  if (!opts.dryRun) {
    await deleteEvents(cred, cal, events)
    await CrmTask.deleteAll(taskIds)
    return
  }

  // dry-run...

  Context.log('Running in dry-run mode...')
  Context.log('-'.repeat(40))
  Context.log(`Credential ID: ${cred.id}`.green)
  Context.log(`Calendar Local ID: ${cal.id}`.green)
  Context.log(`Calendar Remote ID: ${cal.calendar_id}`.green)
  Context.log('-'.repeat(40))
  Context.log(`[!] ${eventIds.length} Microsoft events will be deleted.`.yellow)
  Context.log(`[!] ${taskIds.length} CRM tasks will be deleted.`.yellow)
  Context.log('-'.repeat(40))

  Context.log('A sample of events that will be deleted:')
  console.table(
    events
      .slice(0, 10)
      .map(e => ({ id: e.id, subject: truncate(e.subject) }))
  )

  Context.log('A sample of task IDs that will be deleted:')
  console.table(taskIds.slice(0, 10))

  Context.log('Rolling back as it was a dry-run. Ignore the process exit code.')
  throw new Error('Rollback')
}

if (require.main === module) {
  require('../../lib/models/Context/util').runInContext(
    'delete-outlook-events',
    deleteOutlookEvents,
    initProgram,
  ).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
