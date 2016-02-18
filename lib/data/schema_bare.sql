--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5beta1
-- Dumped by pg_dump version 9.5beta1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: ashkan
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO ashkan;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET search_path = public, pg_catalog;

--
-- Name: client_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE client_type AS ENUM (
    'Buyer',
    'Seller',
    'Unknown'
);


ALTER TYPE client_type OWNER TO ashkan;

--
-- Name: country_code_3; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE country_code_3 AS ENUM (
    'AFG',
    'ALA',
    'ALB',
    'DZA',
    'ASM',
    'AND',
    'AGO',
    'AIA',
    'ATA',
    'ATG',
    'ARG',
    'ARM',
    'ABW',
    'AUS',
    'AUT',
    'AZE',
    'BHS',
    'BHR',
    'BGD',
    'BRB',
    'BLR',
    'BEL',
    'BLZ',
    'BEN',
    'BMU',
    'BTN',
    'BOL',
    'BES',
    'BIH',
    'BWA',
    'BVT',
    'BRA',
    'IOT',
    'VGB',
    'BRN',
    'BGR',
    'BFA',
    'BDI',
    'KHM',
    'CMR',
    'CAN',
    'CPV',
    'CYM',
    'CAF',
    'TCD',
    'CHL',
    'CHN',
    'CXR',
    'CCK',
    'COL',
    'COM',
    'COG',
    'COD',
    'COK',
    'CRI',
    'HRV',
    'CUB',
    'CUW',
    'CYP',
    'CZE',
    'DNK',
    'DJI',
    'DMA',
    'DOM',
    'ECU',
    'EGY',
    'SLV',
    'GNQ',
    'ERI',
    'EST',
    'ETH',
    'FLK',
    'FRO',
    'FJI',
    'FIN',
    'FRA',
    'GUF',
    'PYF',
    'ATF',
    'GAB',
    'GMB',
    'GEO',
    'DEU',
    'GHA',
    'GIB',
    'GRC',
    'GRL',
    'GRD',
    'GLP',
    'GUM',
    'GTM',
    'GGY',
    'GIN',
    'GNB',
    'GUY',
    'HTI',
    'HMD',
    'VAT',
    'HND',
    'HKG',
    'HUN',
    'ISL',
    'IND',
    'IDN',
    'CIV',
    'IRN',
    'IRQ',
    'IRL',
    'IMN',
    'ISR',
    'ITA',
    'JAM',
    'JPN',
    'JEY',
    'JOR',
    'KAZ',
    'KEN',
    'KIR',
    'KWT',
    'KGZ',
    'LAO',
    'LVA',
    'LBN',
    'LSO',
    'LBR',
    'LBY',
    'LIE',
    'LTU',
    'LUX',
    'MAC',
    'MKD',
    'MDG',
    'MWI',
    'MYS',
    'MDV',
    'MLI',
    'MLT',
    'MHL',
    'MTQ',
    'MRT',
    'MUS',
    'MYT',
    'MEX',
    'FSM',
    'MDA',
    'MCO',
    'MNG',
    'MNE',
    'MSR',
    'MAR',
    'MOZ',
    'MMR',
    'NAM',
    'NRU',
    'NPL',
    'NLD',
    'NCL',
    'NZL',
    'NIC',
    'NER',
    'NGA',
    'NIU',
    'NFK',
    'PRK',
    'MNP',
    'NOR',
    'OMN',
    'PAK',
    'PLW',
    'PSE',
    'PAN',
    'PNG',
    'PRY',
    'PER',
    'PHL',
    'PCN',
    'POL',
    'PRT',
    'PRI',
    'QAT',
    'KOS',
    'REU',
    'ROU',
    'RUS',
    'RWA',
    'BLM',
    'SHN',
    'KNA',
    'LCA',
    'MAF',
    'SPM',
    'VCT',
    'WSM',
    'SMR',
    'STP',
    'SAU',
    'SEN',
    'SRB',
    'SYC',
    'SLE',
    'SGP',
    'SXM',
    'SVK',
    'SVN',
    'SLB',
    'SOM',
    'ZAF',
    'SGS',
    'KOR',
    'SSD',
    'ESP',
    'LKA',
    'SDN',
    'SUR',
    'SJM',
    'SWZ',
    'SWE',
    'CHE',
    'SYR',
    'TWN',
    'TJK',
    'TZA',
    'THA',
    'TLS',
    'TGO',
    'TKL',
    'TON',
    'TTO',
    'TUN',
    'TUR',
    'TKM',
    'TCA',
    'TUV',
    'UGA',
    'UKR',
    'ARE',
    'GBR',
    'USA',
    'UMI',
    'VIR',
    'URY',
    'UZB',
    'VUT',
    'VEN',
    'VNM',
    'WLF',
    'ESH',
    'YEM',
    'ZMB',
    'ZWE'
);


ALTER TYPE country_code_3 OWNER TO ashkan;

--
-- Name: country_name; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE country_name AS ENUM (
    'Afghanistan',
    'Åland Islands',
    'Albania',
    'Algeria',
    'American Samoa',
    'Andorra',
    'Angola',
    'Anguilla',
    'Antarctica',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Aruba',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bermuda',
    'Bhutan',
    'Bolivia',
    'Bonaire',
    'Bosnia and Herzegovina',
    'Botswana',
    'Bouvet Island',
    'Brazil',
    'British Indian Ocean Territory',
    'British Virgin Islands',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Cape Verde',
    'Cayman Islands',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Christmas Island',
    'Cocos (Keeling) Islands',
    'Colombia',
    'Comoros',
    'Republic of the Congo',
    'DR Congo',
    'Cook Islands',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Curaçao',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Ethiopia',
    'Falkland Islands',
    'Faroe Islands',
    'Fiji',
    'Finland',
    'France',
    'French Guiana',
    'French Polynesia',
    'French Southern and Antarctic Lands',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Gibraltar',
    'Greece',
    'Greenland',
    'Grenada',
    'Guadeloupe',
    'Guam',
    'Guatemala',
    'Guernsey',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Heard Island and McDonald Islands',
    'Vatican City',
    'Honduras',
    'Hong Kong',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Ivory Coast',
    'Iran',
    'Iraq',
    'Ireland',
    'Isle of Man',
    'Israel',
    'Italy',
    'Jamaica',
    'Japan',
    'Jersey',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Macau',
    'Macedonia',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Martinique',
    'Mauritania',
    'Mauritius',
    'Mayotte',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Montserrat',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Caledonia',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'Niue',
    'Norfolk Island',
    'North Korea',
    'Northern Mariana Islands',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Pitcairn Islands',
    'Poland',
    'Portugal',
    'Puerto Rico',
    'Qatar',
    'Kosovo',
    'Réunion',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Barthélemy',
    'Saint Helena, Ascension and Tristan da Cunha',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Martin',
    'Saint Pierre and Miquelon',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'São Tomé and Príncipe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Sint Maarten',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Georgia',
    'South Korea',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Svalbard and Jan Mayen',
    'Swaziland',
    'Sweden',
    'Switzerland',
    'Syria',
    'Taiwan',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tokelau',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Turks and Caicos Islands',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
    'United States Minor Outlying Islands',
    'United States Virgin Islands',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Venezuela',
    'Vietnam',
    'Wallis and Futuna',
    'Western Sahara',
    'Yemen',
    'Zambia',
    'Zimbabwe'
);


ALTER TYPE country_name OWNER TO ashkan;

--
-- Name: currency_code; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE currency_code AS ENUM (
    'AFN',
    'EUR',
    'ALL',
    'DZD',
    'USD',
    'AOA',
    'XCD',
    'ARS',
    'AMD',
    'AWG',
    'AUD',
    'AZN',
    'BSD',
    'BHD',
    'BDT',
    'BBD',
    'BYR',
    'BZD',
    'BMD',
    'BTN',
    'BOB',
    'BAM',
    'BWP',
    'NOK',
    'BRL',
    'BND',
    'BGN',
    'BIF',
    'KHR',
    'XAF',
    'CAD',
    'CVE',
    'KYD',
    'CLF',
    'CNY',
    'COP',
    'KMF',
    'CDF',
    'NZD',
    'CRC',
    'HRK',
    'CUC',
    'ANG',
    'CZK',
    'DJF',
    'DOP',
    'EGP',
    'SVC',
    'ERN',
    'ETB',
    'FKP',
    'DKK',
    'FJD',
    'XPF',
    'GMD',
    'GEL',
    'GHS',
    'GIP',
    'GTQ',
    'GBP',
    'GNF',
    'GYD',
    'HTG',
    'HNL',
    'HKD',
    'HUF',
    'ISK',
    'INR',
    'IDR',
    'IRR',
    'IQD',
    'JMD',
    'JPY',
    'JOD',
    'KZT',
    'KES',
    'KWD',
    'KGS',
    'LAK',
    'LBP',
    'LSL',
    'LRD',
    'LYD',
    'CHF',
    'LTL',
    'MOP',
    'MKD',
    'MGA',
    'MWK',
    'MYR',
    'MVR',
    'MRO',
    'MUR',
    'MXN',
    'MDL',
    'MNT',
    'MZN',
    'MMK',
    'NAD',
    'NPR',
    'NIO',
    'XOF',
    'NGN',
    'KPW',
    'OMR',
    'PKR',
    'ILS',
    'PAB',
    'PGK',
    'PYG',
    'PEN',
    'PHP',
    'PLN',
    'QAR',
    'RON',
    'RUB',
    'RWF',
    'SHP',
    'WST',
    'STD',
    'SAR',
    'RSD',
    'SCR',
    'SLL',
    'SGD',
    'SDB',
    'SOS',
    'ZAR',
    'KRW',
    'SSP',
    'LKR',
    'SDG',
    'SRD',
    'SZL',
    'SEK',
    'CHE',
    'SYP',
    'TWD',
    'TJS',
    'TZS',
    'THB',
    'TOP',
    'TTD',
    'TND',
    'TRY',
    'TMT',
    'UGX',
    'UAH',
    'AED',
    'UYI',
    'UZS',
    'VUV',
    'VEF',
    'VND',
    'MAD',
    'YER',
    'ZMK',
    'ZWL'
);


ALTER TYPE currency_code OWNER TO ashkan;

--
-- Name: geo_confidence; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE geo_confidence AS ENUM (
    'Google_ROOFTOP',
    'Google_RANGE_INTERPOLATED',
    'Google_GEOMETRIC_CENTER',
    'Google_APPROXIMATE',
    'Bing_High',
    'Bing_Medium',
    'Bing_Low',
    'OSM_NA'
);


ALTER TYPE geo_confidence OWNER TO ashkan;

--
-- Name: geo_confidence_bing; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE geo_confidence_bing AS ENUM (
    'High',
    'Medium',
    'Low'
);


ALTER TYPE geo_confidence_bing OWNER TO ashkan;

--
-- Name: geo_confidence_google; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE geo_confidence_google AS ENUM (
    'APPROXIMATE',
    'RANGE_INTERPOLATED',
    'GEOMETRIC_CENTER',
    'ROOFTOP'
);


ALTER TYPE geo_confidence_google OWNER TO ashkan;

--
-- Name: geo_source; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE geo_source AS ENUM (
    'OSM',
    'Google',
    'Yahoo',
    'Bing',
    'Geonames',
    'Unknown',
    'None'
);


ALTER TYPE geo_source OWNER TO ashkan;

--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE listing_status AS ENUM (
    'Active',
    'Sold',
    'Pending',
    'Temp Off Market',
    'Leased',
    'Active Option Contract',
    'Active Contingent',
    'Active Kick Out',
    'Withdrawn',
    'Expired',
    'Cancelled',
    'Withdrawn Sublisting',
    'Incomplete',
    'Unknown',
    'Out Of Sync',
    'Incoming'
);


ALTER TYPE listing_status OWNER TO ashkan;

--
-- Name: mam_behaviour; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE mam_behaviour AS ENUM (
    'A',
    'N',
    'R'
);


ALTER TYPE mam_behaviour OWNER TO ashkan;

--
-- Name: mam_direction; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE mam_direction AS ENUM (
    'I',
    'O'
);


ALTER TYPE mam_direction OWNER TO ashkan;

--
-- Name: message_room_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE message_room_status AS ENUM (
    'Active',
    'Inactive',
    'Restricted',
    'Blocked'
);


ALTER TYPE message_room_status OWNER TO ashkan;

--
-- Name: message_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE message_type AS ENUM (
    'TopLevel',
    'SubLevel'
);


ALTER TYPE message_type OWNER TO ashkan;

--
-- Name: notification_action; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE notification_action AS ENUM (
    'Liked',
    'Composed',
    'Edited',
    'Added',
    'Removed',
    'Posted',
    'Favorited',
    'Changed',
    'Created',
    'Shared',
    'Arrived',
    'Toured',
    'Accepted',
    'Declined',
    'Joined',
    'Left',
    'Archived',
    'Deleted',
    'Opened',
    'Closed',
    'Pinned',
    'Sent',
    'Invited',
    'PriceDropped',
    'StatusChanged',
    'BecameAvailable',
    'TourRequested',
    'IsDue',
    'Assigned',
    'Withdrew'
);


ALTER TYPE notification_action OWNER TO ashkan;

--
-- Name: notification_object_class; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE notification_object_class AS ENUM (
    'Recommendation',
    'Listing',
    'Message',
    'Comment',
    'Room',
    'HotSheet',
    'Photo',
    'Video',
    'Document',
    'Tour',
    'Co-Shopper',
    'Price',
    'Status',
    'MessageRoom',
    'Shortlist',
    'User',
    'Alert',
    'Invitation',
    'Task',
    'Transaction',
    'Contact'
);


ALTER TYPE notification_object_class OWNER TO ashkan;

--
-- Name: office_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE office_status AS ENUM (
    'N',
    'Deceased',
    '',
    'Terminated',
    'Active',
    'Inactive'
);


ALTER TYPE office_status OWNER TO ashkan;

--
-- Name: property_subtype; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE property_subtype AS ENUM (
    'MUL-Apartment/5Plex+',
    'MUL-Fourplex',
    'MUL-Full Duplex',
    'MUL-Multiple Single Units',
    'MUL-Triplex',
    'LSE-Apartment',
    'LSE-Condo/Townhome',
    'LSE-Duplex',
    'LSE-Fourplex',
    'LSE-House',
    'LSE-Mobile',
    'LSE-Triplex',
    'LND-Commercial',
    'LND-Farm/Ranch',
    'LND-Residential',
    'RES-Condo',
    'RES-Farm/Ranch',
    'RES-Half Duplex',
    'RES-Single Family',
    'RES-Townhouse',
    'COM-Lease',
    'COM-Sale',
    'COM-Sale or Lease (Either)',
    'COM-Sale/Leaseback (Both)',
    'Unknown'
);


ALTER TYPE property_subtype OWNER TO ashkan;

--
-- Name: property_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE property_type AS ENUM (
    'Residential',
    'Residential Lease',
    'Multi-Family',
    'Commercial',
    'Lots & Acreage',
    'Unknown'
);


ALTER TYPE property_type OWNER TO ashkan;

--
-- Name: recommendation_eav_action; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE recommendation_eav_action AS ENUM (
    'Favorited',
    'Read',
    'TourRequested',
    'Hid'
);


ALTER TYPE recommendation_eav_action OWNER TO ashkan;

--
-- Name: recommendation_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE recommendation_status AS ENUM (
    'Unacknowledged',
    'Pinned',
    'Unpinned'
);


ALTER TYPE recommendation_status OWNER TO ashkan;

--
-- Name: recommendation_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE recommendation_type AS ENUM (
    'Listing',
    'Agent',
    'Bank',
    'Card',
    'User'
);


ALTER TYPE recommendation_type OWNER TO ashkan;

--
-- Name: room_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE room_status AS ENUM (
    'New',
    'Searching',
    'Touring',
    'OnHold',
    'Closing',
    'ClosedCanceled',
    'ClosedSuccess',
    'Archived'
);


ALTER TYPE room_status OWNER TO ashkan;

--
-- Name: room_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE room_type AS ENUM (
    'Group',
    'Direct'
);


ALTER TYPE room_type OWNER TO ashkan;

--
-- Name: source_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE source_type AS ENUM (
    'MLS',
    'Zillow',
    'RCRRE',
    'Trulia',
    'Realtor'
);


ALTER TYPE source_type OWNER TO ashkan;

--
-- Name: tag_types; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE tag_types AS ENUM (
    'contact',
    'room',
    'listing',
    'user',
    'Contact',
    'Room',
    'Listing',
    'User'
);


ALTER TYPE tag_types OWNER TO ashkan;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE task_status AS ENUM (
    'New',
    'Done',
    'Later'
);


ALTER TYPE task_status OWNER TO ashkan;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE transaction_type AS ENUM (
    'Buyer',
    'Seller',
    'Buyer/Seller',
    'Lease'
);


ALTER TYPE transaction_type OWNER TO ashkan;

--
-- Name: user_on_room_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE user_on_room_status AS ENUM (
    'Active',
    'Muted'
);


ALTER TYPE user_on_room_status OWNER TO ashkan;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE user_status AS ENUM (
    'Deleted',
    'De-Activated',
    'Restricted',
    'Banned',
    'Active'
);


ALTER TYPE user_status OWNER TO ashkan;

--
-- Name: user_type; Type: TYPE; Schema: public; Owner: ashkan
--

CREATE TYPE user_type AS ENUM (
    'Client',
    'Agent'
);


ALTER TYPE user_type OWNER TO ashkan;

--
-- Name: falsify_email_confirmed(); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION falsify_email_confirmed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$                BEGIN                UPDATE users                SET email_confirmed = false                WHERE id = NEW.id;                RETURN NEW;                END;                $$;


ALTER FUNCTION public.falsify_email_confirmed() OWNER TO ashkan;

--
-- Name: falsify_phone_confirmed(); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION falsify_phone_confirmed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$                BEGIN                UPDATE users                SET phone_confirmed = false                WHERE id = NEW.id;                RETURN NEW;                END;                $$;


ALTER FUNCTION public.falsify_phone_confirmed() OWNER TO ashkan;

--
-- Name: first_agg(anyelement, anyelement); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION first_agg(anyelement, anyelement) RETURNS anyelement
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
        SELECT $1;
$_$;


ALTER FUNCTION public.first_agg(anyelement, anyelement) OWNER TO ashkan;

--
-- Name: fix_geocodes(); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION fix_geocodes() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
UPDATE addresses SET geocoded = NULL, location = NULL, corrupted = NULL, approximate = NULL, geo_source = 'None';
UPDATE addresses SET geocoded = TRUE, geo_source = 'Google', approximate = FALSE, corrupted = FALSE, location = location_google WHERE geo_confidence_google = 'ROOFTOP';
UPDATE addresses SET geocoded = TRUE, geo_source = 'Bing', approximate = FALSE, corrupted = FALSE, location = location_bing WHERE geo_confidence_bing = 'High' AND geocoded IS NOT TRUE;
UPDATE addresses SET geocoded = TRUE, geo_source = 'Google', approximate = FALSE, corrupted = FALSE, location = location_google WHERE geo_confidence_google = 'RANGE_INTERPOLATED' AND geocoded IS NOT TRUE;
UPDATE addresses SET geocoded = TRUE, geo_source = 'Google', approximate = FALSE, corrupted = FALSE, location = location_google WHERE geo_confidence_google = 'GEOMETRIC_CENTER' AND geocoded IS NOT TRUE AND (STRPOS(LOWER(geo_source_formatted_address_google), LOWER(postal_code)) > 0 AND STRPOS(LOWER(geo_source_formatted_address_google), LOWER(street_name)) > 0);
UPDATE addresses SET geocoded = TRUE, geo_source = 'Google', approximate = TRUE, corrupted = FALSE, location = location_google WHERE geo_confidence_google = 'GEOMETRIC_CENTER' AND geocoded IS NOT TRUE;
UPDATE addresses SET geocoded = TRUE, geo_source = 'Bing', approximate = TRUE, corrupted = FALSE, location = location_bing WHERE geo_confidence_google = 'APPROXIMATE' AND geocoded IS NOT TRUE AND (STRPOS(LOWER(geo_source_formatted_address_bing), LOWER(postal_code)) > 0 AND STRPOS(LOWER(geo_source_formatted_address_bing), LOWER(street_name)) > 0);
UPDATE addresses SET geocoded = TRUE, geo_source = 'Google', approximate = TRUE, corrupted = FALSE, location = location_google WHERE geo_confidence_google = 'APPROXIMATE' AND geocoded IS NOT TRUE AND (STRPOS(LOWER(geo_source_formatted_address_google), LOWER(postal_code)) > 0 AND STRPOS(LOWER(geo_source_formatted_address_google), LOWER(street_name)) > 0);
UPDATE addresses SET geocoded = TRUE, geo_source = 'Bing', approximate = TRUE, corrupted = FALSE, location = location_bing WHERE geo_confidence_google = 'APPROXIMATE' AND geocoded IS NOT TRUE AND (STRPOS(LOWER(geo_source_formatted_address_bing), LOWER(postal_code)) > 0);
UPDATE addresses SET geocoded = TRUE, geo_source = 'Google', approximate = TRUE, corrupted = FALSE, location = location_google WHERE geo_confidence_google = 'APPROXIMATE' AND geocoded IS NOT TRUE AND (STRPOS(LOWER(geo_source_formatted_address_google), LOWER(postal_code)) > 0);
UPDATE addresses SET geocoded = TRUE, geo_source = 'Bing', approximate = TRUE, corrupted = FALSE, location = location_bing WHERE geocoded IS NOT TRUE AND geocoded_bing IS TRUE;
END;
$$;


ALTER FUNCTION public.fix_geocodes() OWNER TO ashkan;

--
-- Name: last_agg(anyelement, anyelement); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION last_agg(anyelement, anyelement) RETURNS anyelement
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
        SELECT $2;
$_$;


ALTER FUNCTION public.last_agg(anyelement, anyelement) OWNER TO ashkan;

--
-- Name: sort_column(anyelement, character varying); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION sort_column(anyelement, character varying) RETURNS timestamp with time zone
    LANGUAGE sql
    AS $_$
  SELECT
    CASE $2
        WHEN 'Since_C' THEN $1.created_at
        WHEN 'Since_U' THEN $1.updated_at
        WHEN 'Max_C' THEN $1.created_at
        WHEN 'Max_U' THEN $1.updated_at
        WHEN 'Init_C' THEN $1.created_at
        WHEN 'Init_U' THEN $1.updated_at
    END
$_$;


ALTER FUNCTION public.sort_column(anyelement, character varying) OWNER TO ashkan;

--
-- Name: toggle_phone_confirmed(); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION toggle_phone_confirmed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$                BEGIN                UPDATE users                SET phone_confirmed = false                WHERE id = NEW.id;                RETURN NEW;                END;                $$;


ALTER FUNCTION public.toggle_phone_confirmed() OWNER TO ashkan;

--
-- Name: uuid_timestamp(uuid); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION uuid_timestamp(id uuid) RETURNS timestamp with time zone
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  select TIMESTAMP WITH TIME ZONE 'epoch' +
      ( ( ( ('x' || lpad(split_part(id::text, '-', 1), 16, '0'))::bit(64)::bigint) +
      (('x' || lpad(split_part(id::text, '-', 2), 16, '0'))::bit(64)::bigint << 32) +
      ((('x' || lpad(split_part(id::text, '-', 3), 16, '0'))::bit(64)::bigint&4095) << 48) - 122192928000000000) / 10) * INTERVAL '1 microsecond';
$$;


ALTER FUNCTION public.uuid_timestamp(id uuid) OWNER TO ashkan;

--
-- Name: wipe_everything(); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION wipe_everything() RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN    TRUNCATE TABLE messages_acks CASCADE;    TRUNCATE TABLE messages CASCADE;    TRUNCATE TABLE notifications_acks CASCADE;    TRUNCATE TABLE notifications CASCADE;    TRUNCATE TABLE recommendations_eav CASCADE;    TRUNCATE TABLE recommendations CASCADE;    TRUNCATE TABLE rooms_users CASCADE;    TRUNCATE TABLE rooms CASCADE;    TRUNCATE TABLE invitation_records CASCADE;    TRUNCATE TABLE alerts CASCADE;    TRUNCATE TABLE contacts CASCADE;    TRUNCATE TABLE notification_tokens CASCADE;    TRUNCATE TABLE password_recovery_records CASCADE;    TRUNCATE TABLE email_verifications CASCADE;    TRUNCATE TABLE phone_verifications CASCADE;END;$$;


ALTER FUNCTION public.wipe_everything() OWNER TO ashkan;

--
-- Name: within_page(anyelement, character varying, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: ashkan
--

CREATE FUNCTION within_page(anyelement, character varying, timestamp with time zone) RETURNS boolean
    LANGUAGE sql
    AS $_$
  SELECT
    CASE $2
      WHEN 'Since_C' THEN $1.created_at >  $3
      WHEN 'Max_C'   THEN $1.created_at <= $3
      WHEN 'Since_U' THEN $1.updated_at >  $3
      WHEN 'Max_U'   THEN $1.updated_at <= $3
      WHEN 'Init_C'  THEN $1.created_at <= NOW()
      WHEN 'Init_U'  THEN $1.updated_at <= NOW()
      ELSE TRUE
    END
$_$;


ALTER FUNCTION public.within_page(anyelement, character varying, timestamp with time zone) OWNER TO ashkan;

SET search_path = topology, pg_catalog;

--
-- Name: _st_remedgecheck(character varying, integer, integer, integer, integer); Type: FUNCTION; Schema: topology; Owner: ashkan
--

CREATE FUNCTION _st_remedgecheck(tname character varying, tid integer, eid integer, lf integer, rf integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  sql text;
  fidary int[];
  rec RECORD;
BEGIN
  -- Check that no TopoGeometry references the edge being removed
  sql := 'SELECT r.topogeo_id, r.layer_id'
      || ', l.schema_name, l.table_name, l.feature_column '
      || 'FROM topology.layer l INNER JOIN '
      || quote_ident(tname)
      || '.relation r ON (l.layer_id = r.layer_id) '
      || 'WHERE l.level = 0 AND l.feature_type = 2 '
      || ' AND l.topology_id = ' || tid
      || ' AND abs(r.element_id) = ' || eid ;



  FOR rec IN EXECUTE sql LOOP
    RAISE EXCEPTION 'TopoGeom % in layer % (%.%.%) cannot be represented dropping edge %',
            rec.topogeo_id, rec.layer_id,
            rec.schema_name, rec.table_name, rec.feature_column,
            eid;
  END LOOP;

  IF lf != rf THEN -- {

    RAISE NOTICE 'Deletion of edge % joins faces % and %',
                    eid, lf, rf;

    -- check if any topo_geom is defined only by one of the
    -- joined faces. In such case there would be no way to adapt
    -- the definition in case of healing, so we'd have to bail out
    --
    fidary = ARRAY[lf, rf];
    sql := 'SELECT t.* from ('
      || 'SELECT r.topogeo_id, r.layer_id'
      || ', l.schema_name, l.table_name, l.feature_column'
      || ', array_agg(r.element_id) as elems '
      || 'FROM topology.layer l INNER JOIN '
      || quote_ident(tname)
      || '.relation r ON (l.layer_id = r.layer_id) '
      || 'WHERE l.level = 0 AND l.feature_type = 3 '
      || ' AND l.topology_id = ' || tid
      || ' AND r.element_id = ANY (' || quote_literal(fidary)
      || ') group by r.topogeo_id, r.layer_id, l.schema_name, l.table_name, '
      || ' l.feature_column ) t';

    -- No surface can be defined by universal face
    IF lf != 0 AND rf != 0 THEN -- {
      sql := sql || ' WHERE NOT t.elems @> ' || quote_literal(fidary);
    END IF; -- }





    FOR rec IN EXECUTE sql LOOP
      RAISE EXCEPTION 'TopoGeom % in layer % (%.%.%) cannot be represented healing faces % and %',
            rec.topogeo_id, rec.layer_id,
            rec.schema_name, rec.table_name, rec.feature_column,
            rf, lf;
    END LOOP;

  END IF; -- } two faces healed...
END
$$;


ALTER FUNCTION topology._st_remedgecheck(tname character varying, tid integer, eid integer, lf integer, rf integer) OWNER TO ashkan;

SET search_path = public, pg_catalog;

--
-- Name: first(anyelement); Type: AGGREGATE; Schema: public; Owner: ashkan
--

CREATE AGGREGATE first(anyelement) (
    SFUNC = first_agg,
    STYPE = anyelement
);


ALTER AGGREGATE public.first(anyelement) OWNER TO ashkan;

--
-- Name: last(anyelement); Type: AGGREGATE; Schema: public; Owner: ashkan
--

CREATE AGGREGATE last(anyelement) (
    SFUNC = last_agg,
    STYPE = anyelement
);


ALTER AGGREGATE public.last(anyelement) OWNER TO ashkan;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE addresses (
    title text,
    subtitle text,
    street_number text,
    street_name text,
    city text,
    state text,
    state_code text,
    postal_code text,
    neighborhood text,
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    street_suffix text,
    unit_number text,
    country country_name NOT NULL,
    country_code country_code_3 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    location_google geometry(Point,4326),
    matrix_unique_id bigint,
    geocoded boolean DEFAULT false,
    geo_source geo_source DEFAULT 'None'::geo_source,
    partial_match_google boolean DEFAULT false,
    county_or_parish text,
    direction text,
    street_dir_prefix text,
    street_dir_suffix text,
    street_number_searchable text,
    geo_source_formatted_address_google text,
    geocoded_google boolean,
    geocoded_bing boolean,
    location_bing geometry(Point,4326),
    geo_source_formatted_address_bing text,
    geo_confidence_google geo_confidence_google,
    geo_confidence_bing geo_confidence_bing,
    location geometry(Point,4326),
    approximate boolean,
    corrupted boolean,
    corrupted_google boolean,
    corrupted_bing boolean,
    deleted_at timestamp with time zone
);


ALTER TABLE addresses OWNER TO ashkan;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE agents (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    email text,
    mlsid text NOT NULL,
    fax text,
    full_name text,
    first_name text,
    last_name text,
    middle_name text,
    phone_number text,
    nar_number text,
    office_mui integer,
    status text,
    office_mlsid text,
    work_phone text,
    generational_name text,
    matrix_unique_id integer NOT NULL,
    matrix_modified_dt timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE agents OWNER TO ashkan;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE alerts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    currency currency_code NOT NULL,
    minimum_price double precision NOT NULL,
    maximum_price double precision NOT NULL,
    minimum_square_meters double precision NOT NULL,
    maximum_square_meters double precision NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    location geometry(Point,4326),
    room uuid NOT NULL,
    minimum_bedrooms smallint NOT NULL,
    minimum_bathrooms double precision NOT NULL,
    cover_image_url text,
    property_type property_type NOT NULL,
    property_subtypes property_subtype[] NOT NULL,
    points geometry(Polygon,4326),
    horizontal_distance double precision NOT NULL,
    vertical_distance double precision NOT NULL,
    minimum_year_built smallint,
    pool boolean,
    title text,
    minimum_lot_square_meters double precision,
    maximum_lot_square_meters double precision,
    maximum_year_built smallint,
    dom smallint,
    cdom smallint,
    deleted_at timestamp with time zone,
    listing_statuses listing_status[] DEFAULT '{Active}'::listing_status[] NOT NULL,
    open_house boolean NOT NULL,
    minimum_sold_date timestamp with time zone
);


ALTER TABLE alerts OWNER TO ashkan;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE attachments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user" uuid,
    url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    info jsonb
);


ALTER TABLE attachments OWNER TO ashkan;

--
-- Name: attachments_eav; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE attachments_eav (
    id uuid DEFAULT uuid_generate_v4(),
    object uuid NOT NULL,
    attachment uuid NOT NULL
);


ALTER TABLE attachments_eav OWNER TO ashkan;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE clients (
    id uuid DEFAULT uuid_generate_v1(),
    version character varying(10),
    response jsonb,
    secret character varying(255),
    name character varying(255)
);


ALTER TABLE clients OWNER TO ashkan;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE contacts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user" uuid NOT NULL,
    contact_user uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    first_name text,
    last_name text,
    phone_number text,
    deleted_at timestamp with time zone,
    email text,
    cover_image_url text,
    profile_image_url text,
    invitation_url text,
    company text,
    address jsonb,
    birthday timestamp with time zone
);


ALTER TABLE contacts OWNER TO ashkan;

--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE email_verifications (
    id uuid DEFAULT uuid_generate_v1(),
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    email text
);


ALTER TABLE email_verifications OWNER TO ashkan;

--
-- Name: foo; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE foo (
    a timestamp with time zone
);


ALTER TABLE foo OWNER TO ashkan;

--
-- Name: important_dates; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE important_dates (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    title text NOT NULL,
    transaction uuid NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE important_dates OWNER TO ashkan;

--
-- Name: invitation_records; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE invitation_records (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    invited_user uuid,
    email character varying(50),
    room uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    accepted boolean DEFAULT false,
    inviting_user uuid NOT NULL,
    deleted_at timestamp with time zone,
    phone_number text,
    url text NOT NULL,
    invitee_first_name text,
    invitee_last_name text
);


ALTER TABLE invitation_records OWNER TO ashkan;

--
-- Name: listings; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE listings (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    property_id uuid,
    alerting_agent_id uuid,
    listing_agent_id uuid,
    listing_agency_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cover_image_url text,
    currency currency_code,
    price double precision,
    gallery_image_urls text[],
    matrix_unique_id integer NOT NULL,
    original_price double precision,
    last_price double precision,
    low_price double precision,
    status listing_status NOT NULL,
    association_fee double precision,
    mls_number text,
    association_fee_frequency text,
    association_fee_includes text,
    association_type text,
    unexempt_taxes double precision,
    financing_proposed text,
    list_office_mui bigint,
    list_office_mls_id text,
    list_office_name text,
    list_office_phone text,
    possession text,
    co_list_office_mui bigint,
    co_list_office_mls_id text,
    co_list_office_name text,
    co_list_office_phone text,
    selling_office_mui bigint,
    selling_office_mls_id text,
    selling_office_name text,
    selling_office_phone text,
    co_selling_office_mui bigint,
    co_selling_office_mls_id text,
    co_selling_office_name text,
    co_selling_office_phone text,
    list_agent_mui bigint,
    list_agent_direct_work_phone text,
    list_agent_email text,
    list_agent_full_name text,
    list_agent_mls_id text,
    co_list_agent_mui bigint,
    co_list_agent_direct_work_phone text,
    co_list_agent_email text,
    co_list_agent_full_name text,
    co_list_agent_mls_id text,
    selling_agent_mui bigint,
    selling_agent_direct_work_phone text,
    selling_agent_email text,
    selling_agent_full_name text,
    selling_agent_mls_id text,
    co_selling_agent_mui bigint,
    co_selling_agent_direct_work_phone text,
    co_selling_agent_email text,
    co_selling_agent_full_name text,
    co_selling_agent_mls_id text,
    listing_agreement text,
    capitalization_rate text,
    compensation_paid text,
    date_available text,
    last_status listing_status,
    mls_area_major text,
    mls_area_minor text,
    mls text,
    move_in_date text,
    permit_address_internet_yn boolean,
    permit_comments_reviews_yn boolean,
    permit_internet_yn boolean,
    price_change_timestamp timestamp with time zone,
    matrix_modified_dt timestamp with time zone,
    property_association_fees text,
    showing_instructions_type text,
    special_notes text,
    tax_legal_description text,
    total_annual_expenses_include text,
    transaction_type text,
    virtual_tour_url_branded text,
    virtual_tour_url_unbranded text,
    active_option_contract_date text,
    keybox_type text,
    keybox_number text,
    close_date text,
    close_price double precision,
    back_on_market_date text,
    deposit_amount double precision,
    photo_count smallint,
    deleted_at timestamp with time zone,
    dom timestamp with time zone,
    cdom timestamp with time zone,
    buyers_agency_commission text,
    sub_agency_commission text
);


ALTER TABLE listings OWNER TO ashkan;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE messages (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    comment text,
    image_url text,
    document_url text,
    video_url text,
    recommendation uuid,
    author uuid,
    created_at timestamp with time zone DEFAULT clock_timestamp(),
    updated_at timestamp with time zone DEFAULT clock_timestamp(),
    room uuid NOT NULL,
    message_type message_type NOT NULL,
    deleted_at timestamp with time zone,
    notification uuid,
    image_thumbnail_url text,
    reference uuid
);


ALTER TABLE messages OWNER TO ashkan;

--
-- Name: messages_acks; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE messages_acks (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    message uuid NOT NULL,
    room uuid NOT NULL,
    "user" uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE messages_acks OWNER TO ashkan;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE migrations (
    created_at timestamp with time zone DEFAULT now(),
    state jsonb
);


ALTER TABLE migrations OWNER TO ashkan;

--
-- Name: mls_data; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE mls_data (
    id uuid DEFAULT uuid_generate_v1(),
    created_at timestamp with time zone DEFAULT now(),
    value jsonb,
    class character varying,
    resource character varying,
    matrix_unique_id integer
);


ALTER TABLE mls_data OWNER TO ashkan;

--
-- Name: mls_jobs; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE mls_jobs (
    id uuid DEFAULT uuid_generate_v1(),
    created_at timestamp with time zone DEFAULT now(),
    last_modified_date timestamp without time zone,
    last_id bigint,
    results integer,
    query text,
    is_initial_completed boolean DEFAULT false,
    name text,
    "limit" integer,
    "offset" integer
);


ALTER TABLE mls_jobs OWNER TO ashkan;

--
-- Name: notification_tokens; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE notification_tokens (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    "user" uuid NOT NULL,
    device_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE notification_tokens OWNER TO ashkan;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE notifications (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    object uuid NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    room uuid,
    action notification_action NOT NULL,
    object_class notification_object_class NOT NULL,
    subject uuid NOT NULL,
    auxiliary_object_class notification_object_class,
    auxiliary_object uuid,
    recommendation uuid,
    auxiliary_subject uuid,
    subject_class notification_object_class NOT NULL,
    auxiliary_subject_class notification_object_class,
    extra_subject_class notification_object_class,
    extra_object_class notification_object_class,
    deleted_at timestamp with time zone,
    exclude uuid,
    specific uuid
);


ALTER TABLE notifications OWNER TO ashkan;

--
-- Name: notifications_acks; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE notifications_acks (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    "user" uuid NOT NULL,
    notification uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE notifications_acks OWNER TO ashkan;

--
-- Name: offices; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE offices (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    board text,
    email text,
    fax text,
    office_mui integer,
    office_mls_id text,
    license_number text,
    address text,
    care_of text,
    city text,
    postal_code text,
    postal_code_plus4 text,
    state text,
    matrix_unique_id integer NOT NULL,
    matrix_modified_dt timestamp with time zone,
    mls text,
    mls_id text,
    mls_provider text,
    nar_number text,
    contact_mui text,
    contact_mls_id text,
    long_name text,
    name text,
    status office_status,
    phone text,
    other_phone text,
    st_address text,
    st_city text,
    st_country text,
    st_postal_code text,
    st_postal_code_plus4 text,
    st_state text,
    url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE offices OWNER TO ashkan;

--
-- Name: open_houses; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE open_houses (
    id uuid DEFAULT uuid_generate_v1(),
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    description text,
    listing_mui integer,
    refreshments text,
    type text,
    matrix_unique_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE open_houses OWNER TO ashkan;

--
-- Name: password_recovery_records; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE password_recovery_records (
    id uuid DEFAULT uuid_generate_v1(),
    email text NOT NULL,
    "user" uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + ((2)::double precision * '1 day'::interval)) NOT NULL
);


ALTER TABLE password_recovery_records OWNER TO ashkan;

--
-- Name: phone_verifications; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE phone_verifications (
    id uuid DEFAULT uuid_generate_v1(),
    code character(5),
    created_at timestamp with time zone DEFAULT now(),
    phone_number text NOT NULL
);


ALTER TABLE phone_verifications OWNER TO ashkan;

--
-- Name: photos; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE photos (
    id uuid DEFAULT uuid_generate_v1(),
    created_at timestamp with time zone DEFAULT now(),
    last_processed timestamp with time zone,
    error text,
    matrix_unique_id integer NOT NULL,
    listing_mui integer NOT NULL,
    description text,
    url text,
    "order" integer,
    exif jsonb
);


ALTER TABLE photos OWNER TO ashkan;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE properties (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    bedroom_count integer,
    bathroom_count double precision,
    address_id uuid,
    description text,
    square_meters double precision,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    matrix_unique_id bigint NOT NULL,
    property_type property_type NOT NULL,
    property_subtype property_subtype NOT NULL,
    lot_square_meters double precision,
    year_built smallint,
    accessibility_features text[],
    commercial_features text[],
    community_features text[],
    energysaving_features text[],
    exterior_features text[],
    interior_features text[],
    farmranch_features text[],
    fireplace_features text[],
    lot_features text[],
    parking_features text[],
    pool_features text[],
    security_features text[],
    bedroom_bathroom_features text[],
    parking_spaces_covered_total double precision,
    half_bathroom_count double precision,
    full_bathroom_count double precision,
    heating text[],
    flooring text[],
    utilities text[],
    utilities_other text[],
    architectural_style text,
    structural_style text,
    number_of_stories smallint,
    number_of_stories_in_building smallint,
    number_of_parking_spaces double precision,
    parking_spaces_carport double precision,
    parking_spaces_garage double precision,
    garage_length double precision,
    garage_width double precision,
    number_of_dining_areas smallint,
    number_of_living_areas smallint,
    fireplaces_total smallint,
    lot_number text,
    soil_type text,
    construction_materials text,
    construction_materials_walls text,
    foundation_details text,
    roof text,
    pool_yn boolean,
    handicap_yn boolean,
    elementary_school_name text,
    intermediate_school_name text,
    high_school_name text,
    junior_high_school_name text,
    middle_school_name text,
    primary_school_name text,
    senior_high_school_name text,
    school_district text,
    subdivision_name text,
    appliances_yn boolean,
    building_number text,
    ceiling_height double precision,
    green_building_certification text,
    green_energy_efficient text,
    lot_size double precision,
    lot_size_area double precision,
    lot_size_dimensions text,
    map_coordinates text,
    number_of_pets_allowed smallint,
    number_of_units smallint,
    pets_yn boolean,
    photo_count smallint,
    room_count smallint,
    subdivided_yn boolean,
    surface_rights text,
    unit_count smallint,
    year_built_details text,
    zoning text,
    security_system_yn boolean,
    deleted_at timestamp with time zone
);


ALTER TABLE properties OWNER TO ashkan;

--
-- Name: property_rooms; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE property_rooms (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    matrix_unique_id bigint,
    matrix_modified_dt timestamp with time zone,
    description text,
    length integer,
    width integer,
    features text,
    listing_mui bigint,
    listing uuid,
    level integer,
    type text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE property_rooms OWNER TO ashkan;

--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE recommendations (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    source source_type,
    source_url text,
    room uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    listing uuid NOT NULL,
    recommendation_type recommendation_type,
    matrix_unique_id bigint NOT NULL,
    referring_objects uuid[],
    deleted_at timestamp with time zone,
    hidden boolean DEFAULT false
);


ALTER TABLE recommendations OWNER TO ashkan;

--
-- Name: recommendations_eav; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE recommendations_eav (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    "user" uuid NOT NULL,
    action recommendation_eav_action NOT NULL,
    recommendation uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE recommendations_eav OWNER TO ashkan;

--
-- Name: rooms_room_code_seq; Type: SEQUENCE; Schema: public; Owner: ashkan
--

CREATE SEQUENCE rooms_room_code_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE rooms_room_code_seq OWNER TO ashkan;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE rooms (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    title text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status room_status DEFAULT 'New'::room_status,
    lead_agent uuid,
    room_code integer DEFAULT nextval('rooms_room_code_seq'::regclass) NOT NULL,
    deleted_at timestamp with time zone,
    room_type room_type NOT NULL,
    client_type client_type NOT NULL
);


ALTER TABLE rooms OWNER TO ashkan;

--
-- Name: rooms_users; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE rooms_users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    room uuid NOT NULL,
    "user" uuid NOT NULL,
    user_status user_on_room_status DEFAULT 'Active'::user_on_room_status NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    push_enabled boolean DEFAULT true
);


ALTER TABLE rooms_users OWNER TO ashkan;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE sessions (
    id uuid DEFAULT uuid_generate_v1(),
    device_uuid uuid,
    device_name character varying(255),
    client_version character varying(30),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE sessions OWNER TO ashkan;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE tags (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    entity uuid NOT NULL,
    tag character varying NOT NULL,
    type tag_types,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE tags OWNER TO ashkan;

--
-- Name: task_contacts; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE task_contacts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    task uuid NOT NULL,
    contact uuid NOT NULL
);


ALTER TABLE task_contacts OWNER TO ashkan;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE tasks (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    "user" uuid NOT NULL,
    title text,
    due_date timestamp with time zone,
    status task_status DEFAULT 'New'::task_status NOT NULL,
    transaction uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE tasks OWNER TO ashkan;

--
-- Name: transaction_contact_roles; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE transaction_contact_roles (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_contact uuid NOT NULL,
    role character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE transaction_contact_roles OWNER TO ashkan;

--
-- Name: transaction_contacts; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE transaction_contacts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction uuid NOT NULL,
    contact uuid NOT NULL
);


ALTER TABLE transaction_contacts OWNER TO ashkan;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE transactions (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    "user" uuid NOT NULL,
    title text,
    recommendation uuid,
    listing uuid,
    listing_data jsonb,
    transaction_type transaction_type NOT NULL,
    transaction_status listing_status NOT NULL,
    contract_price double precision,
    original_price double precision,
    sale_commission_rate double precision,
    buyer_sale_commission_split_share double precision,
    seller_sale_commission_split_share double precision,
    buyer_sale_commission_split double precision,
    seller_sale_commission_split double precision,
    broker_commission double precision,
    referral double precision,
    sale_commission_total double precision,
    earnest_money_amount double precision,
    earnest_money_held_by double precision,
    escrow_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE transactions OWNER TO ashkan;

--
-- Name: units; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE units (
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    dining_length integer,
    dining_width integer,
    kitchen_length integer,
    kitchen_width integer,
    lease integer,
    listing uuid,
    listing_mui bigint,
    living_length integer,
    living_width integer,
    master_length integer,
    master_width integer,
    matrix_unique_id bigint,
    matrix_modified_dt timestamp with time zone,
    full_bath integer,
    half_bath integer,
    beds integer,
    units integer,
    square_meters integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE units OWNER TO ashkan;

--
-- Name: users_user_code_seq; Type: SEQUENCE; Schema: public; Owner: ashkan
--

CREATE SEQUENCE users_user_code_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_user_code_seq OWNER TO ashkan;

--
-- Name: users; Type: TABLE; Schema: public; Owner: ashkan
--

CREATE TABLE users (
    username text,
    first_name text,
    last_name text,
    email text NOT NULL,
    phone_number text,
    created_at timestamp with time zone DEFAULT now(),
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    password character varying(512) NOT NULL,
    address_id uuid,
    cover_image_url text,
    profile_image_url text,
    updated_at timestamp with time zone DEFAULT now(),
    user_status user_status DEFAULT 'Active'::user_status NOT NULL,
    profile_image_thumbnail_url text,
    cover_image_thumbnail_url text,
    email_confirmed boolean DEFAULT false,
    timezone text DEFAULT 'CST'::text,
    user_code integer DEFAULT nextval('users_user_code_seq'::regclass) NOT NULL,
    user_type user_type DEFAULT 'Client'::user_type NOT NULL,
    deleted_at timestamp with time zone,
    phone_confirmed boolean DEFAULT false,
    agent uuid
);


ALTER TABLE users OWNER TO ashkan;

--
-- Name: addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: agents_matrix_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY agents
    ADD CONSTRAINT agents_matrix_unique_id_key UNIQUE (matrix_unique_id);


--
-- Name: agents_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: attachments_eav_object_attachment_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY attachments_eav
    ADD CONSTRAINT attachments_eav_object_attachment_key UNIQUE (object, attachment);


--
-- Name: attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: important_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY important_dates
    ADD CONSTRAINT important_dates_pkey PRIMARY KEY (id);


--
-- Name: invitation_records_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY invitation_records
    ADD CONSTRAINT invitation_records_pkey PRIMARY KEY (id);


--
-- Name: listings_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: matrix_unique_id; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY mls_data
    ADD CONSTRAINT matrix_unique_id UNIQUE (matrix_unique_id);


--
-- Name: messages_acks_message_room_user_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages_acks
    ADD CONSTRAINT messages_acks_message_room_user_key UNIQUE (message, room, "user");


--
-- Name: messages_acks_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages_acks
    ADD CONSTRAINT messages_acks_pkey PRIMARY KEY (id);


--
-- Name: messages_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notification_tokens
    ADD CONSTRAINT notification_tokens_pkey PRIMARY KEY (id);


--
-- Name: notification_tokens_user_device_token_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notification_tokens
    ADD CONSTRAINT notification_tokens_user_device_token_key UNIQUE ("user", device_token);


--
-- Name: notifications_acks_user_notification_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notifications_acks
    ADD CONSTRAINT notifications_acks_user_notification_key UNIQUE ("user", notification);


--
-- Name: notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offices_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY offices
    ADD CONSTRAINT offices_pkey PRIMARY KEY (id);


--
-- Name: open_houses_matrix_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY open_houses
    ADD CONSTRAINT open_houses_matrix_unique_id_key UNIQUE (matrix_unique_id);


--
-- Name: photos_matrix_unique_id_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY photos
    ADD CONSTRAINT photos_matrix_unique_id_key UNIQUE (matrix_unique_id);


--
-- Name: properties_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY property_rooms
    ADD CONSTRAINT property_rooms_pkey PRIMARY KEY (id);


--
-- Name: recommendations_eav_user_recommendation_action_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations_eav
    ADD CONSTRAINT recommendations_eav_user_recommendation_action_key UNIQUE ("user", recommendation, action);


--
-- Name: recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);


--
-- Name: recommendations_room_listing_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations
    ADD CONSTRAINT recommendations_room_listing_key UNIQUE (room, listing);


--
-- Name: rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: rooms_users_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms_users
    ADD CONSTRAINT rooms_users_pkey PRIMARY KEY (id);


--
-- Name: rooms_users_room_user_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms_users
    ADD CONSTRAINT rooms_users_room_user_key UNIQUE (room, "user");


--
-- Name: tags_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: task_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY task_contacts
    ADD CONSTRAINT task_contacts_pkey PRIMARY KEY (id);


--
-- Name: task_contacts_task_contact_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY task_contacts
    ADD CONSTRAINT task_contacts_task_contact_key UNIQUE (task, contact);


--
-- Name: tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: transaction_contact_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transaction_contact_roles
    ADD CONSTRAINT transaction_contact_roles_pkey PRIMARY KEY (id);


--
-- Name: transaction_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transaction_contacts
    ADD CONSTRAINT transaction_contacts_pkey PRIMARY KEY (id);


--
-- Name: transaction_contacts_transaction_contact_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transaction_contacts
    ADD CONSTRAINT transaction_contacts_transaction_contact_key UNIQUE (transaction, contact);


--
-- Name: transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: units_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users_email_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: addresses_location_gix; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX addresses_location_gix ON addresses USING gist (location);


--
-- Name: addresses_location_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX addresses_location_idx ON addresses USING btree (location);


--
-- Name: addresses_matrix_unique_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX addresses_matrix_unique_id_idx ON addresses USING btree (matrix_unique_id);


--
-- Name: alerts_cdom_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_cdom_idx ON alerts USING btree (cdom);


--
-- Name: alerts_created_by_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_created_by_idx ON alerts USING btree (created_by);


--
-- Name: alerts_dom_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_dom_idx ON alerts USING btree (dom);


--
-- Name: alerts_location_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_location_idx ON alerts USING btree (location);


--
-- Name: alerts_maximum_lot_square_meters_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_maximum_lot_square_meters_idx ON alerts USING btree (maximum_lot_square_meters);


--
-- Name: alerts_maximum_price_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_maximum_price_idx ON alerts USING btree (maximum_price);


--
-- Name: alerts_maximum_square_meters_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_maximum_square_meters_idx ON alerts USING btree (maximum_square_meters);


--
-- Name: alerts_maximum_year_built_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_maximum_year_built_idx ON alerts USING btree (maximum_year_built);


--
-- Name: alerts_minimum_lot_square_meters_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_minimum_lot_square_meters_idx ON alerts USING btree (minimum_lot_square_meters);


--
-- Name: alerts_minimum_price_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_minimum_price_idx ON alerts USING btree (minimum_price);


--
-- Name: alerts_minimum_square_meters_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_minimum_square_meters_idx ON alerts USING btree (minimum_square_meters);


--
-- Name: alerts_minimum_year_built_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_minimum_year_built_idx ON alerts USING btree (minimum_year_built);


--
-- Name: alerts_pool_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_pool_idx ON alerts USING btree (pool);


--
-- Name: alerts_property_subtypes_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_property_subtypes_idx ON alerts USING btree (property_subtypes);


--
-- Name: alerts_property_type_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_property_type_idx ON alerts USING btree (property_type);


--
-- Name: alerts_room_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX alerts_room_idx ON alerts USING btree (room);


--
-- Name: email_verifications_email_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX email_verifications_email_idx ON email_verifications USING btree (email);


--
-- Name: listings_matrix_unique_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX listings_matrix_unique_id_idx ON listings USING btree (matrix_unique_id);


--
-- Name: listings_mls_number_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX listings_mls_number_idx ON listings USING btree (mls_number);


--
-- Name: listings_price_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX listings_price_idx ON listings USING btree (price);


--
-- Name: listings_property_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX listings_property_id_idx ON listings USING btree (property_id);


--
-- Name: listings_status_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX listings_status_idx ON listings USING btree (status);


--
-- Name: messages_acks_message_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX messages_acks_message_idx ON messages_acks USING btree (message);


--
-- Name: messages_acks_room_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX messages_acks_room_idx ON messages_acks USING btree (room);


--
-- Name: messages_acks_user_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX messages_acks_user_idx ON messages_acks USING btree ("user");


--
-- Name: messages_author_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX messages_author_idx ON messages USING btree (author);


--
-- Name: messages_object_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX messages_object_idx ON messages USING btree (recommendation);


--
-- Name: messages_room_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX messages_room_idx ON messages USING btree (room);


--
-- Name: mls_data_matrix_unique_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX mls_data_matrix_unique_id_idx ON mls_data USING btree (matrix_unique_id);


--
-- Name: notification_tokens_user_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notification_tokens_user_idx ON notification_tokens USING btree ("user");


--
-- Name: notifications_auxiliary_object_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notifications_auxiliary_object_idx ON notifications USING btree (auxiliary_object);


--
-- Name: notifications_auxiliary_subject_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notifications_auxiliary_subject_idx ON notifications USING btree (auxiliary_subject);


--
-- Name: notifications_object_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notifications_object_idx ON notifications USING btree (object);


--
-- Name: notifications_recommendation_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notifications_recommendation_idx ON notifications USING btree (recommendation);


--
-- Name: notifications_room_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notifications_room_idx ON notifications USING btree (room);


--
-- Name: notifications_subject_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX notifications_subject_idx ON notifications USING btree (auxiliary_subject);


--
-- Name: offices_mui_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX offices_mui_idx ON offices USING btree (matrix_unique_id);


--
-- Name: open_houses_listing_mui_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX open_houses_listing_mui_idx ON open_houses USING btree (listing_mui);


--
-- Name: phone_verifications_phone_number; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX phone_verifications_phone_number ON phone_verifications USING btree (phone_number);


--
-- Name: properties_address_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_address_id_idx ON properties USING btree (address_id);


--
-- Name: properties_bedroom_count_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_bedroom_count_idx ON properties USING btree (bedroom_count);


--
-- Name: properties_full_bathroom_count_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_full_bathroom_count_idx ON properties USING btree (full_bathroom_count);


--
-- Name: properties_half_bathroom_count_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_half_bathroom_count_idx ON properties USING btree (half_bathroom_count);


--
-- Name: properties_lot_square_meters_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_lot_square_meters_idx ON properties USING btree (lot_square_meters);


--
-- Name: properties_matrix_unique_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX properties_matrix_unique_id_idx ON properties USING btree (matrix_unique_id);


--
-- Name: properties_pool_yn_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_pool_yn_idx ON properties USING btree (pool_yn);


--
-- Name: properties_property_subtype_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_property_subtype_idx ON properties USING btree (property_subtype);


--
-- Name: properties_property_type_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_property_type_idx ON properties USING btree (property_type);


--
-- Name: properties_square_meters_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_square_meters_idx ON properties USING btree (square_meters);


--
-- Name: properties_year_built_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX properties_year_built_idx ON properties USING btree (year_built);


--
-- Name: property_rooms_mui_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX property_rooms_mui_idx ON property_rooms USING btree (matrix_unique_id);


--
-- Name: recommendations_object_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX recommendations_object_idx ON recommendations USING btree (listing);


--
-- Name: recommendations_room_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX recommendations_room_idx ON recommendations USING btree (room);


--
-- Name: rooms_owner_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX rooms_owner_idx ON rooms USING btree (owner);


--
-- Name: rooms_users_room_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX rooms_users_room_idx ON rooms_users USING btree (room);


--
-- Name: rooms_users_user_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX rooms_users_user_idx ON rooms_users USING btree ("user");


--
-- Name: tags_entity_tag_type_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX tags_entity_tag_type_idx ON tags USING btree (entity, tag, type);


--
-- Name: transaction_contact_roles_transaction_contact_roles_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX transaction_contact_roles_transaction_contact_roles_idx ON transaction_contact_roles USING btree (transaction_contact, role);


--
-- Name: units_mui_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE UNIQUE INDEX units_mui_idx ON units USING btree (matrix_unique_id);


--
-- Name: users_address_id_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX users_address_id_idx ON users USING btree (address_id);


--
-- Name: users_user_code_idx; Type: INDEX; Schema: public; Owner: ashkan
--

CREATE INDEX users_user_code_idx ON users USING btree (user_code);


--
-- Name: falsify_email_confirmed; Type: TRIGGER; Schema: public; Owner: ashkan
--

CREATE TRIGGER falsify_email_confirmed AFTER UPDATE ON users FOR EACH ROW WHEN ((old.email IS DISTINCT FROM new.email)) EXECUTE PROCEDURE falsify_email_confirmed();


--
-- Name: falsify_phone_confirmed; Type: TRIGGER; Schema: public; Owner: ashkan
--

CREATE TRIGGER falsify_phone_confirmed AFTER UPDATE ON users FOR EACH ROW WHEN ((old.phone_number IS DISTINCT FROM new.phone_number)) EXECUTE PROCEDURE falsify_phone_confirmed();


--
-- Name: alerts_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY alerts
    ADD CONSTRAINT alerts_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: attachments_eav_attachment_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY attachments_eav
    ADD CONSTRAINT attachments_eav_attachment_fkey FOREIGN KEY (attachment) REFERENCES attachments(id);


--
-- Name: attachments_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT attachments_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: important_dates_transaction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY important_dates
    ADD CONSTRAINT important_dates_transaction_fkey FOREIGN KEY (transaction) REFERENCES transactions(id);


--
-- Name: invitation_records_invited_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY invitation_records
    ADD CONSTRAINT invitation_records_invited_user_fkey FOREIGN KEY (invited_user) REFERENCES users(id);


--
-- Name: invitation_records_inviting_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY invitation_records
    ADD CONSTRAINT invitation_records_inviting_user_fkey FOREIGN KEY (inviting_user) REFERENCES users(id);


--
-- Name: invitation_records_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY invitation_records
    ADD CONSTRAINT invitation_records_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: listings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY listings
    ADD CONSTRAINT listings_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id);


--
-- Name: message_rooms_users_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms_users
    ADD CONSTRAINT message_rooms_users_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: messages_acks_message_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages_acks
    ADD CONSTRAINT messages_acks_message_fkey FOREIGN KEY (message) REFERENCES messages(id);


--
-- Name: messages_acks_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages_acks
    ADD CONSTRAINT messages_acks_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: messages_acks_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages_acks
    ADD CONSTRAINT messages_acks_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: messages_author_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_author_fkey FOREIGN KEY (author) REFERENCES users(id);


--
-- Name: messages_notification_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_notification_fkey FOREIGN KEY (notification) REFERENCES notifications(id);


--
-- Name: messages_recommendation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_recommendation_fkey FOREIGN KEY (recommendation) REFERENCES recommendations(id);


--
-- Name: messages_reference_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_reference_fkey FOREIGN KEY (reference) REFERENCES messages(id);


--
-- Name: messages_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: notification_tokens_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notification_tokens
    ADD CONSTRAINT notification_tokens_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: notifications_acks_notification_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notifications_acks
    ADD CONSTRAINT notifications_acks_notification_fkey FOREIGN KEY (notification) REFERENCES notifications(id);


--
-- Name: notifications_acks_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notifications_acks
    ADD CONSTRAINT notifications_acks_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: notifications_recommendation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_recommendation_fkey FOREIGN KEY (recommendation) REFERENCES recommendations(id);


--
-- Name: notifications_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: password_recovery_records_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY password_recovery_records
    ADD CONSTRAINT password_recovery_records_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: properties_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY properties
    ADD CONSTRAINT properties_address_id_fkey FOREIGN KEY (address_id) REFERENCES addresses(id);


--
-- Name: property_rooms_listings_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY property_rooms
    ADD CONSTRAINT property_rooms_listings_fkey FOREIGN KEY (listing) REFERENCES listings(id);


--
-- Name: recommendations_eav_recommendation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations_eav
    ADD CONSTRAINT recommendations_eav_recommendation_fkey FOREIGN KEY (recommendation) REFERENCES recommendations(id);


--
-- Name: recommendations_eav_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations_eav
    ADD CONSTRAINT recommendations_eav_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: recommendations_object_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations
    ADD CONSTRAINT recommendations_object_fkey FOREIGN KEY (listing) REFERENCES listings(id);


--
-- Name: recommendations_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY recommendations
    ADD CONSTRAINT recommendations_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: rooms_lead_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms
    ADD CONSTRAINT rooms_lead_agent_fkey FOREIGN KEY (lead_agent) REFERENCES users(id);


--
-- Name: rooms_users_room_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms_users
    ADD CONSTRAINT rooms_users_room_fkey FOREIGN KEY (room) REFERENCES rooms(id);


--
-- Name: shortlists_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY rooms
    ADD CONSTRAINT shortlists_owner_fkey FOREIGN KEY (owner) REFERENCES users(id);


--
-- Name: task_contacts_contact_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY task_contacts
    ADD CONSTRAINT task_contacts_contact_fkey FOREIGN KEY (contact) REFERENCES contacts(id);


--
-- Name: task_contacts_task_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY task_contacts
    ADD CONSTRAINT task_contacts_task_fkey FOREIGN KEY (task) REFERENCES tasks(id);


--
-- Name: tasks_transaction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY tasks
    ADD CONSTRAINT tasks_transaction_fkey FOREIGN KEY (transaction) REFERENCES transactions(id);


--
-- Name: tasks_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY tasks
    ADD CONSTRAINT tasks_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: transaction_contacts_contact_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transaction_contacts
    ADD CONSTRAINT transaction_contacts_contact_fkey FOREIGN KEY (contact) REFERENCES contacts(id);


--
-- Name: transaction_contacts_roles_transaction_contact_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transaction_contact_roles
    ADD CONSTRAINT transaction_contacts_roles_transaction_contact_fkey FOREIGN KEY (transaction_contact) REFERENCES transaction_contacts(id);


--
-- Name: transaction_contacts_transaction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transaction_contacts
    ADD CONSTRAINT transaction_contacts_transaction_fkey FOREIGN KEY (transaction) REFERENCES transactions(id);


--
-- Name: transactions_listing_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transactions
    ADD CONSTRAINT transactions_listing_fkey FOREIGN KEY (listing) REFERENCES listings(id);


--
-- Name: transactions_recommendation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transactions
    ADD CONSTRAINT transactions_recommendation_fkey FOREIGN KEY (recommendation) REFERENCES recommendations(id);


--
-- Name: transactions_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY transactions
    ADD CONSTRAINT transactions_user_fkey FOREIGN KEY ("user") REFERENCES users(id);


--
-- Name: units_listings_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY units
    ADD CONSTRAINT units_listings_fkey FOREIGN KEY (listing) REFERENCES listings(id);


--
-- Name: users_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_address_id_fkey FOREIGN KEY (address_id) REFERENCES addresses(id);


--
-- Name: users_agents_agent_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ashkan
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_agents_agent_fkey FOREIGN KEY (agent) REFERENCES agents(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: ashkan
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM ashkan;
GRANT ALL ON SCHEMA public TO ashkan;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--
