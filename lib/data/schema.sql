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
-- Name: addresses; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
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
    user_id uuid
);


ALTER TABLE addresses OWNER TO emilsedgh;

--
-- Name: agencies; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
--

CREATE TABLE agencies (
    type character varying(10),
    name character varying(255),
    phone_number character varying(20),
    address text,
    id uuid DEFAULT uuid_generate_v1() NOT NULL
);


ALTER TABLE agencies OWNER TO emilsedgh;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
--

CREATE TABLE clients (
    id uuid DEFAULT uuid_generate_v1(),
    version character varying(10),
    response jsonb,
    secret character varying(255),
    name character varying(255)
);


ALTER TABLE clients OWNER TO emilsedgh;

--
-- Name: events; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
--

CREATE TABLE events (
    action character varying(10),
    "timestamp" timestamp without time zone,
    subject_type character varying(10),
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    subject_id uuid,
    user_id uuid
);


ALTER TABLE events OWNER TO emilsedgh;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
--

CREATE TABLE sessions (
    id uuid DEFAULT uuid_generate_v1(),
    device_uuid uuid,
    device_name character varying(255),
    client_version character varying(30),
    created_time timestamp without time zone DEFAULT now()
);


ALTER TABLE sessions OWNER TO emilsedgh;

--
-- Name: tokens; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
--

CREATE TABLE tokens (
    id uuid DEFAULT uuid_generate_v1(),
    token character varying(60),
    client_id uuid,
    type character varying(10),
    user_id uuid,
    expire_date timestamp without time zone
);


ALTER TABLE tokens OWNER TO emilsedgh;

--
-- Name: users; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace:
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
    password character varying(512)
);


ALTER TABLE users OWNER TO emilsedgh;

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY addresses (type, title, subtitle, street_number, street_name, city, state, state_code, zip_code, neighborhood, id, user_id) FROM stdin;
\.



--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY clients (id, version, response, secret, name) FROM stdin;
bf0da47e-7226-11e4-905b-0024d71b10fc	0.1	{"type": "session", "api_base_url": "https://api.shortlisted.com:443", "client_version_status": "UPGRADE_AVAILABLE"}	secret	Unit Test
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY events (action, "timestamp", subject_type, id, subject_id, user_id) FROM stdin;
view	46868-08-16 12:50:57.999872	listing	253550cc-741f-11e4-8605-0024d71b10fc	7cc88bc8-7100-11e4-905b-0024d71b10fc	74a1aa38-7100-11e4-905b-0024d71b10fc
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY users (username, first_name, last_name, email, phone_number, type, created_time, id, agency_id, password) FROM stdin;
emilsedgh	emil	sedgh	\N	\N	user	2014-11-22 12:52:27.99155	13d5262e-7229-11e4-905b-0024d71b10fc	\N	12345
test	John	Doe	j.doe@host.tld	\N	user	2014-11-25 00:32:41.506672	3aaa6a98-741d-11e4-a1b5-0024d71b10fc	\N	password
\.


--
-- Name: addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: emilsedgh; Tablespace:
--

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: emilsedgh; Tablespace:
--

ALTER TABLE ONLY agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: events_pkey; Type: CONSTRAINT; Schema: public; Owner: emilsedgh; Tablespace:
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: emilsedgh; Tablespace:
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

