const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE SCHEMA showinghub',
  `CREATE TYPE showinghub_required_participant AS ENUM (
    'ListingAgent',
    'BuyingAgent',
    'BothBuyingAndListingAgent',
    'NoParticipants'
  )`,
  `CREATE TYPE showinghub_showing_method AS ENUM (
    'InPersonOnly',
    'VirtualOnly',
    'InPersonAndVirtual'
  )`,
  `CREATE TYPE showinghub_confirmation_method AS ENUM (
    'AutoApprove',
    'ConfirmationRequired',
    'ShowingInstructionsOnly'
  )`,
  `CREATE TYPE showinghub_showing_status AS ENUM (
    'Showable',
    'NotShowable',
    'Suspended'
  )`,
  `CREATE TABLE showinghub.showable_listings (
    id uuid PRIMARY KEY,
    application_id uuid NOT NULL,
  
    listing_id text NOT NULL,
    created_on timestamp NOT NULL,
  
    upi text,
    address1 text,
    city text,
    state text,
    zip_code text,
  
    list_agent_mls_id text,
    list_agent_name text,
    list_agent_license_state_affirmation boolean,
    list_agent_license_number text,
    list_agent_license_state text,
  
    showable_start_date timestamp not null,
    showable_end_date timestamp,
  
    showing_instructions text,
    required_participants showinghub_required_participant NOT NULL,
    showing_method showinghub_showing_method NOT NULL,
    confirmation_type showinghub_confirmation_method NOT NULL,
    showings_allowed showinghub_showing_status NOT NULL,
  
    showing uuid REFERENCES showings (id)
  )`,
  'CREATE INDEX showable_listings_showing_id_idx ON showinghub.showable_listings (showing)',
  `CREATE TYPE showinghub_appointment_type AS ENUM (
    'FirstShowing',
    'SecondShowing',
    'ThirdShowing',
    'AgentPreview',
    'Appraisal',
    'BrokerPriceOpinion',
    'Inspection',
    'Maintenance'
  )`,
  `CREATE TYPE showinghub_appointment_method AS ENUM (
    'InPersonOnly',
    'VirtualOnly',
    'InPersonAndVirtual'
  )`,
  `CREATE TYPE showinghub_appointment_status AS ENUM (
    'Confirmed',
    'Cancelled',
    'Requested',
    'Denied'
  )`,
  `CREATE TABLE showinghub.appointments (
    id uuid PRIMARY KEY,
  
    created_on timestamp,
    modified_on timestamp,
  
    actual_start_date timestamp NOT NULL,
    actual_end_date timestamp NOT NULL,
    appointment_type showinghub_appointment_type,
    appointment_method showinghub_appointment_method,
  
    buying_agent_id text,
    buying_agent_name text,
    buying_agent_license_state_affirmation boolean,
    buying_agent_license_number text,
    buying_agent_license_state text,
    buying_agent_mls_id text,
  
    appointment_status showinghub_appointment_status NOT NULL,
    appointment uuid REFERENCES showings_appointments (id)
  )
  `,
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
