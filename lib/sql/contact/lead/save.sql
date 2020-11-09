WITH saved AS (
  INSERT INTO crm_leads (
    brand,
    "user",
    -- lead_owner,
    -- lead_id,
    data
  ) VALUES (
    $1::uuid,
    $2::uuid,
    $3::xml
  )
  RETURNING *
)
SELECT xmltable.*
  FROM saved,
       XMLTABLE('//LeadList/Lead'
                PASSING data
                COLUMNS note text PATH 'Contact/Note',
                        first_name text PATH 'Contact/Name/First',
                        last_name text PATH 'Contact/Name/Last',
                        email text PATH 'Contact/Email',
                        phone_number text PATH 'Contact/PhoneList/Phone/Number',
                        unit_number text PATH 'Contact/Address/UnitNumber',
                        street_number text PATH 'Contact/Address/StreetNumber',
                        country text PATH 'Contact/Address/Country',
                        owner_id text PATH 'LeadOwnerID',
                        lead_source text PATH 'LeadSource',
                        lead_subsource text PATH 'LeadSubsource',
                        listing_number text PATH 'ListingNumber',
                        agent_mlsid text PATH 'ListingAgentMLSID',
                        office_mlsid text PATH 'ListingOfficeMLSID'
       );