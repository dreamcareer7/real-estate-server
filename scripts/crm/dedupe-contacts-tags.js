#!/usr/bin/env node

require('colors')
const { strict: assert } = require('assert')

const sql = require('../../lib/utils/sql')
const belt = require('../../lib/utils/belt')
const Context = require('../../lib/models/Context')
const Contact = require('../../lib/models/Contact/manipulate')

const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_ROUNDS = 100

const SQL = {
  findSomeContactsWithDuplicateTags: `
    SELECT id, tag FROM contacts
    WHERE array_length(tag, 1) <> (
      SELECT count(DISTINCT trim(lower(each_tag))) FROM unnest(tag) AS each_tag
    )
    LIMIT $1::int
  `
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
    await Contact.updateTags(
      [contact.id],
      belt.uniqCaseInsensitive(contact.tag),
      contact.user,
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
) {
  let affectedRows = -1

  for (let r = 1; affectedRows && r <= rounds; ++r) {
    Context.log(`Round ${r}...`)
    affectedRows = await dedupeChunk(chunkSize)
    Context.log(`Fixed ${affectedRows} contacts`)
  }

  if (affectedRows > 0) {
    Context.warn(`After ${rounds} rounds, it seems there are more contacts with duplicate tags.`.yellow)
    Context.warn('Probably you should run me one more time.'.yellow)
  }
}

/** @param {import('commander').program} program */
function initProgram (program) {
  program
    .option('-c, --chunk-size <chunkSize>', 'Chunk size', String(DEFAULT_CHUNK_SIZE))
    .option('-r, --rounds <rounds>', 'Rounds', String(DEFAULT_ROUNDS))
}

/** @param {import('commander').program} program */
async function dedupeContactsTags (program) {
  const opts = program.opts()
  const chunkSize = Number(opts.chunkSize)
  const rounds = Number(opts.rounds)

  assert(Number.isSafeInteger(chunkSize) && chunkSize > 0)
  assert(Number.isSafeInteger(rounds) && rounds > 0)
  assert(!opts.brand, 'brand option is not supported')
  assert(!opts.user, 'user option is not supported')

  return dedupeAll(chunkSize, rounds)
}

if (require.main === module) {
  const { runInContext } = require('../../lib/models/Context/util')

  runInContext(
    'dedupe-contacts-tags',
    dedupeContactsTags,
    initProgram,
  ).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
