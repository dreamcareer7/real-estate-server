export interface ILtsLead {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  company: string;
  tag: string | string[];
  note: string;  // any additional data

  address: string; // listing address
  message: string; // user's message
  lead_source: string;
  listing_number: string;  // listing mls number

  // with the following two fields specified, we will try
  // to find a user with the matching info for sending lead
  // email notification. otherwise, the email will be sent
  // to the user associated with the lead capture link.
  agent_mlsid: string;
  office_mlsid: string;
}

export type ELeadSourceType =
  | 'Website'
  | 'Zillow'
  | 'Realtor'
  | 'Showing'
  | 'Studio'
  ;

export interface ILtsLeadUrlMetadata {
  brand: UUID;
  user: UUID;
  protocol: TLeadProtocol;
  mls?: string[];
  source?: ELeadSourceType;
  notify?: boolean;
}
