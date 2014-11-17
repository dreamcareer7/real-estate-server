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


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace: 
--

CREATE TABLE addresses (
    id integer NOT NULL,
    type character varying(10),
    title character varying(255),
    subtitle character varying(255),
    streetnumber character varying(20),
    streetname character varying(255),
    city character varying(255),
    state character varying(20),
    statecode character varying(5),
    postalcode character varying(10),
    neighborhood character varying(255),
    user_id integer
);


ALTER TABLE addresses OWNER TO emilsedgh;

--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: emilsedgh
--

CREATE SEQUENCE addresses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE addresses_id_seq OWNER TO emilsedgh;

--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: emilsedgh
--

ALTER SEQUENCE addresses_id_seq OWNED BY addresses.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace: 
--

CREATE TABLE events (
    id integer NOT NULL,
    action character varying(10),
    user_id integer,
    "timestamp" timestamp without time zone,
    subject_type character varying(10),
    subject_id integer
);


ALTER TABLE events OWNER TO emilsedgh;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: emilsedgh
--

CREATE SEQUENCE events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE events_id_seq OWNER TO emilsedgh;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: emilsedgh
--

ALTER SEQUENCE events_id_seq OWNED BY events.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace: 
--

CREATE TABLE users (
    id integer NOT NULL,
    username character varying(30),
    firstname character varying(30),
    lastname character varying(30),
    email character varying(50),
    phonenumber character varying(20),
    type character varying(10),
    created_time timestamp without time zone DEFAULT now()
);


ALTER TABLE users OWNER TO emilsedgh;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: emilsedgh
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO emilsedgh;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: emilsedgh
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: emilsedgh
--

ALTER TABLE ONLY addresses ALTER COLUMN id SET DEFAULT nextval('addresses_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: emilsedgh
--

ALTER TABLE ONLY events ALTER COLUMN id SET DEFAULT nextval('events_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: emilsedgh
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY addresses (id, type, title, subtitle, streetnumber, streetname, city, state, statecode, postalcode, neighborhood, user_id) FROM stdin;
\.


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('addresses_id_seq', 27, true);


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY events (id, action, user_id, "timestamp", subject_type, subject_id) FROM stdin;
\.


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('events_id_seq', 1, true);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY users (id, username, firstname, lastname, email, phonenumber, type, created_time) FROM stdin;
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('users_id_seq', 56, true);


--
-- Name: addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: emilsedgh; Tablespace: 
--

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: events_pkey; Type: CONSTRAINT; Schema: public; Owner: emilsedgh; Tablespace: 
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


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

