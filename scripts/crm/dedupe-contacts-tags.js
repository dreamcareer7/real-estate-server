#!/usr/bin/env node

require('colors')
const { strict: assert } = require('assert')
const { program } = require('commander')

const sql = require('../../lib/utils/sql')
const belt = require('../../lib/utils/belt')
const Context = require('../../lib/models/Context')
const Contact = require('../../lib/models/Contact/manipulate')
const createContext = require('../workers/utils/create-context')

const DEFAULT_CHUNK_SIZE = 100
const DEFAULT_ROUNDS = 5
const DEFAULT_MAX_CONTEXTS = 200

const BREAK = Symbol('break')

const SQL = {
  findSomeContactsWithDuplicateTags: `
    SELECT id, tag, "user", created_by, brand FROM contacts
    WHERE deleted_at IS NULL
      AND brand IS NOT NULL
      AND array_length(tag, 1) <> (
        SELECT count(DISTINCT trim(lower(each_tag))) FROM unnest(tag) AS each_tag
      )
    LIMIT $1::int
  `
}

/**
 * @param {string} prefix
 * @param {number} maxContexts
 * @param {() => any} fn
 */
async function runInContexts (prefix, maxContexts, fn) {
  let result = null

  for (let i = 1; i <= maxContexts; ++i) {
    const id = `${prefix}-${i}`
    const { context, rollback, commit } = await createContext({ id })

    await context.run(async () => {
      try {
        result = await fn()
        await commit()
      } catch (err) {
        await rollback(err)
      }
    })

    if (result === BREAK) { return }
  }
}

/**
 * @param {number} [chunkSize]
 * @returns {Promise<number>} affected rows
 */
async function dedupeChunk (chunkSize = DEFAULT_CHUNK_SIZE) {
  const contacts = await sql.select(
    SQL.findSomeContactsWithDuplicateTags,
    [chunkSize],
  )
  if (!contacts.length) { return 0 }

  for (const contact of contacts) {
    if (!contact.brand) {
      Context.warn(`Contact ${contact.id} doesn't have brand.`)
    }
    if (!contact.user) {
      Context.warn(`Contact ${contact.id} doesn't have an owner (user). creator user (created_by) will be used instead`)
    }

    await Contact.updateTags(
      [contact.id],
      belt.uniqCaseInsensitive(contact.tag),
      contact.user || contact.created_by,
      contact.brand,
      true,
    )
  }

  return contacts.length
}

/**
 * @param {number} [chunkSize]
 * @param {number} [rounds]
 */
async function dedupeAll (
  chunkSize = DEFAULT_CHUNK_SIZE,
  rounds = DEFAULT_ROUNDS,
  maxContexts = DEFAULT_MAX_CONTEXTS,
) {
  let affectedRows = -1

  await runInContexts('dedupe-contacts-tags', maxContexts, async () => {
    for (let r = 1; affectedRows && r <= rounds; ++r) {
      Context.log(`Round ${r}...`)
      affectedRows = await dedupeChunk(chunkSize)
      Context.log(`Fixed ${affectedRows} contacts`)
    }

    return affectedRows || BREAK
  })

  if (affectedRows > 0) {
    Context.warn(`After fixing ${rounds} * ${maxContexts} chunks, it seems there are more contacts with duplicate tags.`.yellow)
    Context.warn('Probably you should run me one more time.'.yellow)
  }
}

if (require.main === module) {
  const opts = program
    .usage('[options]')
    .option('-c, --chunk-size <chunkSize>', 'Chunk size', String(DEFAULT_CHUNK_SIZE))
    .option('-r, --rounds <rounds>', 'Rounds', String(DEFAULT_ROUNDS))
    .option('-x, --max-contexts <maxContexts', 'Max contexts', String(DEFAULT_MAX_CONTEXTS))
    .parse(process.argv)
    .opts()

  const chunkSize = Number(opts.chunkSize)
  const rounds = Number(opts.rounds)
  const maxContexts = Number(opts.maxContexts)

  assert(Number.isSafeInteger(chunkSize) && chunkSize > 0)
  assert(Number.isSafeInteger(rounds) && rounds > 0)
  assert(Number.isSafeInteger(maxContexts) && rounds > 0)

  dedupeAll(chunkSize, rounds, maxContexts).then(
    () => process.exit(0),
    err => {
      console.error(err)
      process.exit(1)
    },
  )
}

module.exports = {
  dedupeChunk,
  dedupeAll,
}
