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
    street_number character varying(20),
    street_name character varying(255),
    city character varying(255),
    state character varying(20),
    state_code character varying(5),
    zip_code character varying(10),
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
-- Name: agencies; Type: TABLE; Schema: public; Owner: emilsedgh; Tablespace: 
--

CREATE TABLE agencies (
    id integer NOT NULL,
    type character varying(10),
    name character varying(255),
    phone_number character varying(20),
    address text
);


ALTER TABLE agencies OWNER TO emilsedgh;

--
-- Name: agencies_id_seq; Type: SEQUENCE; Schema: public; Owner: emilsedgh
--

CREATE SEQUENCE agencies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE agencies_id_seq OWNER TO emilsedgh;

--
-- Name: agencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: emilsedgh
--

ALTER SEQUENCE agencies_id_seq OWNED BY agencies.id;


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
    first_name character varying(30),
    last_name character varying(30),
    email character varying(50),
    phone_number character varying(20),
    type character varying(10),
    created_time timestamp without time zone DEFAULT now(),
    agency_id integer
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

ALTER TABLE ONLY agencies ALTER COLUMN id SET DEFAULT nextval('agencies_id_seq'::regclass);


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

COPY addresses (id, type, title, subtitle, street_number, street_name, city, state, state_code, zip_code, neighborhood, user_id) FROM stdin;
\.


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('addresses_id_seq', 53, true);


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY agencies (id, type, name, phone_number, address) FROM stdin;
1	agency	AB	999999999	Worst Neighborhood
2	agency	AB	999999999	Worst Neighborhood
3	agency	AB	999999999	Worst Neighborhood
4	agency	AB	999999999	Worst Neighborhood
5	agency	AB	999999999	Worst Neighborhood
6	agency	AB	999999999	Worst Neighborhood
7	agency	AB	999999999	Worst Neighborhood
8	agency	AB	999999999	Worst Neighborhood
9	agency	AB	999999999	Worst Neighborhood
14	\N	foo	\N	\N
17	agency	AB	999999999	Worst Neighborhood
18	agency	AB	999999999	Worst Neighborhood
19	agency	ABA	999999999	Worst Neighborhood
20	agency	ABA	999999999	Worst Neighborhood
21	agency	ABA	999999999	Worst Neighborhood
22	agency	ABA	999999999	Worst Neighborhood
23	agency	ABA	999999999	Worst Neighborhood
24	agency	ABA	999999999	Worst Neighborhood
25	agency	ABA	999999999	Worst Neighborhood
26	agency	ABA	999999999	Worst Neighborhood
31	agency	ABA	999999999	Worst Neighborhood
35	agency	ABA	999999999	Worst Neighborhood
36	agency	ABA	999999999	Worst Neighborhood
37	agency	ABA	999999999	Worst Neighborhood
38	agency	ABA	999999999	Worst Neighborhood
39	agency	ABA	999999999	Worst Neighborhood
40	agency	ABA	999999999	Worst Neighborhood
41	agency	ABA	999999999	Worst Neighborhood
42	agency	ABA	999999999	Worst Neighborhood
43	agency	ABA	999999999	Worst Neighborhood
44	agency	ABA	999999999	Worst Neighborhood
45	agency	ABA	999999999	Worst Neighborhood
46	agency	ABA	999999999	Worst Neighborhood
47	agency	ABA	999999999	Worst Neighborhood
48	agency	ABA	999999999	Worst Neighborhood
49	agency	ABA	999999999	Worst Neighborhood
50	agency	ABA	999999999	Worst Neighborhood
\.


--
-- Name: agencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('agencies_id_seq', 61, true);


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY events (id, action, user_id, "timestamp", subject_type, subject_id) FROM stdin;
2	view	1	2014-11-18 00:51:01	listing	2
3	view	1	2014-11-18 00:51:24	listing	2
4	view	1	2014-11-18 00:52:10	listing	2
5	view	1	2014-11-18 00:52:53	listing	2
6	view	1	2014-11-18 00:54:48	listing	2
7	view	1	2014-11-18 00:55:02	listing	2
8	view	1	2014-11-18 00:57:26	listing	2
9	view	1	2014-11-18 00:57:49	listing	2
10	view	1	2014-11-18 00:58:06	listing	2
11	view	1	2014-11-18 00:59:20	listing	2
12	view	1	2014-11-18 00:59:29	listing	2
13	view	1	2014-11-18 01:00:31	listing	2
14	view	1	2014-11-18 01:00:33	listing	2
15	view	1	2014-11-18 01:39:04.131	listing	2
16	view	1	2014-11-18 01:39:39	listing	2
17	view	1	2014-11-18 01:40:07	listing	2
18	view	1	2014-11-18 01:40:17	listing	2
19	view	1	2014-11-18 01:40:35.501	listing	2
20	view	1	2014-11-18 01:41:31.083	listing	2
21	view	1	2014-11-18 01:41:33.971	listing	2
22	view	1	2014-11-18 01:44:35.888	listing	2
23	view	1	2014-11-18 01:45:00.321	listing	2
24	view	1	2014-11-18 01:45:12.864	listing	2
25	view	1	2014-11-18 01:46:05.478	listing	2
26	view	1	2014-11-18 01:46:25.739	listing	2
27	view	1	2014-11-18 01:47:02.024	listing	2
28	view	1	2014-11-18 14:01:40.54	listing	2
29	view	1	2014-11-18 14:05:25.175	listing	2
30	view	1	46850-12-24 19:03:11.000064	listing	2
31	view	1	46850-12-27 03:46:36	listing	2
32	view	1	46850-12-27 04:12:15.000064	listing	2
33	view	1	46851-01-03 23:27:18.000128	listing	2
34	view	1	46851-01-27 20:01:31.000064	listing	2
35	view	1	46851-01-27 23:51:20.999936	listing	2
36	view	1	46851-03-16 23:34:17.999872	listing	2
37	view	1	46852-04-30 03:03:23.000064	listing	2
38	view	1	46852-04-30 17:06:16.999936	listing	2
39	view	1	46852-05-01 05:00:36.999936	listing	2
40	view	1	46852-05-27 15:43:19.000064	listing	2
41	view	1	46852-06-29 12:11:32.999936	listing	2
42	view	1	46856-12-14 13:33:36	listing	2
\.


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('events_id_seq', 42, true);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: emilsedgh
--

COPY users (id, username, first_name, last_name, email, phone_number, type, created_time, agency_id) FROM stdin;
89	emilsedgh	Emil	Sedgh	\N	\N	agentt	2014-11-18 23:39:16.108473	2
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emilsedgh
--

SELECT pg_catalog.setval('users_id_seq', 118, true);


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

