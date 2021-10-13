CREATE TYPE showinghub_required_participant AS ENUM (
  'ListingAgent',
  'BuyingAgent',
  'BothBuyingAndListingAgent',
  'NoParticipants'
);
CREATE TYPE showinghub_showing_method AS ENUM (
  'InPersonOnly',
  'VirtualOnly',
  'InPersonAndVirtual'
);
CREATE TYPE showinghub_confirmation_method AS ENUM (
  'AutoApprove',
  'ConfirmationRequired',
  'ShowingInstructionsOnly'
);
CREATE TYPE showinghub_showing_status AS ENUM (
  'Showable',
  'NotShowable',
  'Suspended'
);

CREATE TABLE showinghub.showable_listings (
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
  showings_allowed showinghub_showing_status NOT NULL
)