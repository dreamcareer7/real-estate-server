--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: shortlisted; Type: SCHEMA; Schema: -; Owner: ashkan
--

CREATE SCHEMA shortlisted;


ALTER SCHEMA shortlisted OWNER TO ashkan;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE addresses (
    type character varying(10),
    title character varying(255),
    subtitle character varying(255),
    street_number character varying(20),
    street_name character varying(255),
    city character varying(255),
    state character varying(20),
    state_code character varying(5),
    zip_code character varying(10),
    neighborhood character varying(255),
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    street_suffix character varying(20),
    unit_number character varying(20)
);


ALTER TABLE addresses OWNER TO ashkan;

--
-- Name: agencies; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE agencies (
    type character varying(10),
    name character varying(255),
    phone_number character varying(20),
    address text,
    id uuid DEFAULT uuid_generate_v1() NOT NULL
);


ALTER TABLE agencies OWNER TO ashkan;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
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
-- Name: events; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE events (
    action character varying(10),
    "timestamp" timestamp without time zone,
    subject_type character varying(10),
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    subject_id uuid,
    user_id uuid
);


ALTER TABLE events OWNER TO ashkan;

--
-- Name: feed; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE feed (
    id uuid DEFAULT uuid_generate_v1(),
    listing_id uuid,
    user_id uuid,
    saved boolean,
    passed boolean,
    create_time timestamp without time zone DEFAULT now()
);


ALTER TABLE feed OWNER TO ashkan;

--
-- Name: listings; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE listings (
    id uuid DEFAULT uuid_generate_v1(),
    property_id uuid,
    alerting_agent uuid,
    listing_agent_id uuid,
    listing_agency_id uuid,
    "timestamp" timestamp without time zone
);


ALTER TABLE listings OWNER TO ashkan;

--
-- Name: logs; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE logs (
    "time" time without time zone,
    level text,
    message text,
    meta jsonb,
    id uuid DEFAULT uuid_generate_v1()
);


ALTER TABLE logs OWNER TO ashkan;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE properties (
    id uuid DEFAULT uuid_generate_v1(),
    property_type character varying(20),
    bedroom_count integer,
    bathroom_count integer,
    distance_unit integer,
    address_id uuid,
    description text,
    square_distance double precision
);


ALTER TABLE properties OWNER TO ashkan;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE sessions (
    id uuid DEFAULT uuid_generate_v1(),
    device_uuid uuid,
    device_name character varying(255),
    client_version character varying(30),
    created_time timestamp without time zone DEFAULT now()
);


ALTER TABLE sessions OWNER TO ashkan;

--
-- Name: test; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE test (
    id uuid DEFAULT uuid_generate_v1(),
    value character varying(256)
);


ALTER TABLE test OWNER TO ashkan;

--
-- Name: tokens; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE tokens (
    id uuid DEFAULT uuid_generate_v1(),
    token character varying(60),
    client_id uuid,
    type character varying(10),
    user_id uuid,
    expire_date timestamp without time zone
);


ALTER TABLE tokens OWNER TO ashkan;

--
-- Name: users; Type: TABLE; Schema: public; Owner: ashkan; Tablespace: 
--

CREATE TABLE users (
    username character varying(30),
    first_name character varying(30),
    last_name character varying(30),
    email character varying(50),
    phone_number character varying(20),
    type character varying(10),
    created_time timestamp without time zone DEFAULT now(),
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    agency_id uuid,
    password character varying(512),
    address_id uuid
);


ALTER TABLE users OWNER TO ashkan;

--
-- Name: addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan; Tablespace: 
--

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan; Tablespace: 
--

ALTER TABLE ONLY agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: events_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan; Tablespace: 
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: ashkan; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


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

