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
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -; Tablespace: 
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


--
-- Name: agencies; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE agencies (
    type character varying(10),
    name character varying(255),
    phone_number character varying(20),
    address text,
    id uuid DEFAULT uuid_generate_v1() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE clients (
    id uuid DEFAULT uuid_generate_v1(),
    version character varying(10),
    response jsonb,
    secret character varying(255),
    name character varying(255)
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE events (
    action character varying(10),
    "timestamp" timestamp without time zone,
    subject_type character varying(10),
    id uuid DEFAULT uuid_generate_v1() NOT NULL,
    subject_id uuid,
    user_id uuid
);


--
-- Name: feed; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE feed (
    id uuid DEFAULT uuid_generate_v1(),
    listing_id uuid,
    user_id uuid,
    saved boolean,
    passed boolean,
    create_time timestamp without time zone DEFAULT now()
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE listings (
    id uuid DEFAULT uuid_generate_v1(),
    property_id uuid,
    alerting_agent uuid,
    listing_agent_id uuid,
    listing_agency_id uuid,
    "timestamp" timestamp without time zone
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -; Tablespace: 
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


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE sessions (
    id uuid DEFAULT uuid_generate_v1(),
    device_uuid uuid,
    device_name character varying(255),
    client_version character varying(30),
    created_time timestamp without time zone DEFAULT now()
);


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE tokens (
    id uuid DEFAULT uuid_generate_v1(),
    token character varying(60),
    client_id uuid,
    type character varying(10),
    user_id uuid,
    expire_date timestamp without time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -; Tablespace: 
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


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY addresses (type, title, subtitle, street_number, street_name, city, state, state_code, zip_code, neighborhood, id, street_suffix, unit_number) FROM stdin;
\N	title	subtitle	1	South	Herndon	Virginia	VA	22070	\N	70e4c34a-7645-11e4-94fd-0024d71b10fc	Court	22
\N	title	subtitle	414	Cardinal	Monroe	Louisiana	LA	71208	\N	70e4d89e-7645-11e4-82f1-0024d71b10fc	Court	3
\N	title	subtitle	791	Pierstorff	Grand Junction	Colorado	CO	81505	\N	70e50490-7645-11e4-898d-0024d71b10fc	Plaza	91
\N	title	subtitle	8191	Mosinee	Hicksville	New York	NY	11854	\N	70e55b98-7645-11e4-a8ef-0024d71b10fc	Parkway	95
\N	title	subtitle	6	Meadow Ridge	Everett	Washington	WA	98206	\N	70e56c3c-7645-11e4-bb49-0024d71b10fc	Way	43
\N	title	subtitle	83758	Loftsgordon	Hollywood	Florida	FL	33023	\N	70e589f6-7645-11e4-93a4-0024d71b10fc	Circle	4
\N	title	subtitle	2	Division	Tacoma	Washington	WA	98424	\N	70e5b002-7645-11e4-b0f7-0024d71b10fc	Circle	46
\N	title	subtitle	00200	Loomis	Memphis	Tennessee	TN	38109	\N	70e5bc82-7645-11e4-94fd-0024d71b10fc	Alley	12
\N	title	subtitle	933	Melvin	Jacksonville	Florida	FL	32255	\N	70e5d884-7645-11e4-898d-0024d71b10fc	Park	70
\N	title	subtitle	4213	School	Worcester	Massachusetts	MA	01605	\N	70e5eba8-7645-11e4-b30a-0024d71b10fc	Point	1
\N	title	subtitle	61	Bellgrove	Salt Lake City	Utah	UT	84170	\N	70e5f53a-7645-11e4-82f1-0024d71b10fc	Drive	34
\N	title	subtitle	4	Derek	Little Rock	Arkansas	AR	72215	\N	70e61aba-7645-11e4-a8ef-0024d71b10fc	Junction	44
\N	title	subtitle	2	Rieder	Cape Coral	Florida	FL	33915	\N	70e641e8-7645-11e4-8fac-0024d71b10fc	Plaza	99
\N	title	subtitle	9546	Paget	Corona	California	CA	92883	\N	70e66fce-7645-11e4-b0f7-0024d71b10fc	Park	87
\N	title	subtitle	93760	Memorial	Atlanta	Georgia	GA	30392	\N	70e68c20-7645-11e4-898d-0024d71b10fc	Road	81
\N	title	subtitle	04063	Buena Vista	Kissimmee	Florida	FL	34745	\N	70e69dd2-7645-11e4-b30a-0024d71b10fc	Alley	98
\N	title	subtitle	4936	Pepper Wood	Lake Worth	Florida	FL	33462	\N	70e6b614-7645-11e4-bb49-0024d71b10fc	Park	90
\N	title	subtitle	598	Dovetail	Redwood City	California	CA	94064	\N	70e6c028-7645-11e4-9eb0-0024d71b10fc	Center	97
\N	title	subtitle	63995	Harbort	East Saint Louis	Illinois	IL	62205	\N	70e6f0de-7645-11e4-94fd-0024d71b10fc	Street	22
\N	title	subtitle	614	Surrey	Albany	Georgia	GA	31704	\N	70e70132-7645-11e4-82f1-0024d71b10fc	Way	88
\N	title	subtitle	74062	Ludington	Washington	District of Columbia	DC	20380	\N	70e71438-7645-11e4-b30a-0024d71b10fc	Road	66
\N	title	subtitle	3	Ryan	Minneapolis	Minnesota	MN	55402	\N	70e7182a-7645-11e4-93a4-0024d71b10fc	Way	71
\N	title	subtitle	645	Dapin	Farmington	Michigan	MI	48335	\N	70e71d98-7645-11e4-b0f7-0024d71b10fc	Park	16
\N	title	subtitle	312	Pleasure	Evansville	Indiana	IN	47719	\N	70e7912e-7645-11e4-a8ef-0024d71b10fc	Court	8
\N	title	subtitle	08157	Schurz	Sacramento	California	CA	95838	\N	70e7928c-7645-11e4-bb49-0024d71b10fc	Hill	61
\N	title	subtitle	631	South	Columbia	South Carolina	SC	29225	\N	70e7bc3a-7645-11e4-94fd-0024d71b10fc	Alley	14
\N	title	subtitle	08616	Village	Little Rock	Arkansas	AR	72215	\N	70e8012c-7645-11e4-a8ef-0024d71b10fc	Lane	60
\N	title	subtitle	6	Transport	Peoria	Illinois	IL	61640	\N	70e82d14-7645-11e4-8fac-0024d71b10fc	Place	27
\N	title	subtitle	8844	Sachs	Miami	Florida	FL	33153	\N	70e87e7c-7645-11e4-898d-0024d71b10fc	Way	83
\N	title	subtitle	05433	Acker	Houston	Texas	TX	77070	\N	70e8b784-7645-11e4-b0f7-0024d71b10fc	Place	57
\N	title	subtitle	8	Messerschmidt	Spokane	Washington	WA	99215	\N	70e8bb58-7645-11e4-93a4-0024d71b10fc	Trail	19
\N	title	subtitle	30	Porter	Anaheim	California	CA	92805	\N	70e8f230-7645-11e4-bb49-0024d71b10fc	Plaza	35
\N	title	subtitle	85651	Saint Paul	Paterson	New Jersey	NJ	07522	\N	70e8ff5a-7645-11e4-82f1-0024d71b10fc	Parkway	33
\N	title	subtitle	4511	Eastlawn	Van Nuys	California	CA	91406	\N	70e92cb4-7645-11e4-b30a-0024d71b10fc	Hill	85
\N	title	subtitle	245	Leroy	Waco	Texas	TX	76711	\N	70e95720-7645-11e4-bb49-0024d71b10fc	Parkway	56
\N	title	subtitle	69	Dawn	Moreno Valley	California	CA	92555	\N	70e967f6-7645-11e4-94fd-0024d71b10fc	Plaza	57
\N	title	subtitle	93275	1st	Terre Haute	Indiana	IN	47812	\N	70e96fee-7645-11e4-898d-0024d71b10fc	Alley	68
\N	title	subtitle	17	Valley Edge	Amarillo	Texas	TX	79176	\N	70e9a3e2-7645-11e4-b0f7-0024d71b10fc	Junction	84
\N	title	subtitle	5	Elmside	Philadelphia	Pennsylvania	PA	19125	\N	70e9bd6e-7645-11e4-bb49-0024d71b10fc	Alley	74
\N	title	subtitle	49	Stephen	Washington	District of Columbia	DC	20436	\N	70e9c5b6-7645-11e4-9eb0-0024d71b10fc	Lane	61
\N	title	subtitle	9204	Hermina	Memphis	Tennessee	TN	38143	\N	70e9d60a-7645-11e4-93a4-0024d71b10fc	Avenue	9
\N	title	subtitle	9	Tennessee	Saint Paul	Minnesota	MN	55108	\N	70e9ee60-7645-11e4-898d-0024d71b10fc	Place	26
\N	title	subtitle	2752	Summerview	Topeka	Kansas	KS	66629	\N	70e9f8ba-7645-11e4-a8ef-0024d71b10fc	Circle	8
\N	title	subtitle	6	Holmberg	Bradenton	Florida	FL	34205	\N	70ea088c-7645-11e4-b0f7-0024d71b10fc	Avenue	100
\N	title	subtitle	067	Mesta	Norfolk	Virginia	VA	23520	\N	70ea164c-7645-11e4-b30a-0024d71b10fc	Alley	64
\N	title	subtitle	45	Morningstar	Ashburn	Virginia	VA	22093	\N	70ea25f6-7645-11e4-bb49-0024d71b10fc	Pass	13
\N	title	subtitle	7	Carioca	Tulsa	Oklahoma	OK	74193	\N	70ea35f0-7645-11e4-94fd-0024d71b10fc	Avenue	22
\N	title	subtitle	93821	Rockefeller	Indianapolis	Indiana	IN	46207	\N	70ea4626-7645-11e4-82f1-0024d71b10fc	Point	36
\N	title	subtitle	36	Homewood	Carol Stream	Illinois	IL	60158	\N	70ea5986-7645-11e4-898d-0024d71b10fc	Plaza	37
\N	title	subtitle	6	Farragut	Rochester	New York	NY	14683	\N	70ea63ae-7645-11e4-9eb0-0024d71b10fc	Drive	77
\N	title	subtitle	51	Old Shore	Troy	Michigan	MI	48098	\N	70ea7600-7645-11e4-93a4-0024d71b10fc	Plaza	73
\N	title	subtitle	762	Fordem	Jacksonville	Florida	FL	32215	\N	70ea9432-7645-11e4-a8ef-0024d71b10fc	Park	85
\N	title	subtitle	65433	Messerschmidt	Atlanta	Georgia	GA	30311	\N	70ea9f18-7645-11e4-b0f7-0024d71b10fc	Terrace	94
\N	title	subtitle	02323	Bluejay	Washington	District of Columbia	DC	20310	\N	70eab048-7645-11e4-b30a-0024d71b10fc	Lane	61
\N	title	subtitle	332	Surrey	Chico	California	CA	95973	\N	70eabc64-7645-11e4-8fac-0024d71b10fc	Way	43
\N	title	subtitle	6494	Hayes	San Jose	California	CA	95138	\N	70eaca7e-7645-11e4-898d-0024d71b10fc	Center	50
\N	title	subtitle	710	Reindahl	Glendale	Arizona	AZ	85305	\N	70eadd70-7645-11e4-bb49-0024d71b10fc	Avenue	96
\N	title	subtitle	6931	Cody	Arlington	Virginia	VA	22244	\N	70eaee82-7645-11e4-94fd-0024d71b10fc	Park	76
\N	title	subtitle	44	Jenna	Spokane	Washington	WA	99210	\N	70eb012e-7645-11e4-b0f7-0024d71b10fc	Drive	99
\N	title	subtitle	9	Thackeray	Kansas City	Missouri	MO	64193	\N	70eb36b2-7645-11e4-a8ef-0024d71b10fc	Street	5
\N	title	subtitle	7	Westerfield	Sacramento	California	CA	94286	\N	70eb517e-7645-11e4-82f1-0024d71b10fc	Park	64
\N	title	subtitle	4	Maple	Palmdale	California	CA	93591	\N	70eb645c-7645-11e4-9eb0-0024d71b10fc	Lane	79
\N	title	subtitle	40	Kensington	Seattle	Washington	WA	98148	\N	70eb8ae0-7645-11e4-898d-0024d71b10fc	Pass	8
\N	title	subtitle	2	Florence	Las Vegas	Nevada	NV	89178	\N	70eb9ecc-7645-11e4-b0f7-0024d71b10fc	Way	84
\N	title	subtitle	87264	Lien	Houston	Texas	TX	77223	\N	70ebaf34-7645-11e4-94fd-0024d71b10fc	Way	89
\N	title	subtitle	87	Clove	Dallas	Texas	TX	75323	\N	70ebbda8-7645-11e4-a8ef-0024d71b10fc	Road	35
\N	title	subtitle	9935	Huxley	Warren	Ohio	OH	44485	\N	70ebd554-7645-11e4-8fac-0024d71b10fc	Street	94
\N	title	subtitle	38	Karstens	Lubbock	Texas	TX	79452	\N	70ebddb0-7645-11e4-93a4-0024d71b10fc	Point	30
\N	title	subtitle	6595	Monterey	Birmingham	Alabama	AL	35295	\N	70ebead0-7645-11e4-9eb0-0024d71b10fc	Pass	34
\N	title	subtitle	779	Chinook	San Antonio	Texas	TX	78260	\N	70ecd454-7645-11e4-9eb0-0024d71b10fc	Road	43
\N	title	subtitle	2	Kipling	Lehigh Acres	Florida	FL	33972	\N	70ebf818-7645-11e4-b30a-0024d71b10fc	Point	26
\N	title	subtitle	61454	Kingsford	Green Bay	Wisconsin	WI	54313	\N	70ec66cc-7645-11e4-b30a-0024d71b10fc	Way	19
\N	title	subtitle	8	Southridge	Cincinnati	Ohio	OH	45254	\N	70ec0d08-7645-11e4-898d-0024d71b10fc	Point	59
\N	title	subtitle	2754	Victoria	Fort Worth	Texas	TX	76105	\N	70ecb244-7645-11e4-898d-0024d71b10fc	Park	10
\N	title	subtitle	87	Rusk	Houston	Texas	TX	77240	\N	70ed2378-7645-11e4-898d-0024d71b10fc	Circle	99
\N	title	subtitle	1434	Old Shore	Tucson	Arizona	AZ	85754	\N	70ed9790-7645-11e4-898d-0024d71b10fc	Plaza	65
\N	title	subtitle	5057	Tomscot	Bozeman	Montana	MT	59771	\N	70ee9406-7645-11e4-898d-0024d71b10fc	Park	28
\N	title	subtitle	29807	Kensington	Philadelphia	Pennsylvania	PA	19178	\N	70ec1d98-7645-11e4-b0f7-0024d71b10fc	Circle	49
\N	title	subtitle	6	Mitchell	Peoria	Illinois	IL	61605	\N	70ed1ec8-7645-11e4-b0f7-0024d71b10fc	Trail	40
\N	title	subtitle	87335	Russell	San Rafael	California	CA	94913	\N	70f195b6-7645-11e4-b0f7-0024d71b10fc	Lane	25
\N	title	subtitle	3	Mayfield	Jamaica	New York	NY	11431	\N	70ec2612-7645-11e4-a8ef-0024d71b10fc	Lane	18
\N	title	subtitle	779	2nd	Erie	Pennsylvania	PA	16510	\N	70ec9282-7645-11e4-a8ef-0024d71b10fc	Avenue	29
\N	title	subtitle	37744	Mariners Cove	Escondido	California	CA	92030	\N	70ed1662-7645-11e4-a8ef-0024d71b10fc	Crossing	1
\N	title	subtitle	2	Butternut	Fort Wayne	Indiana	IN	46825	\N	70ef7c86-7645-11e4-a8ef-0024d71b10fc	Parkway	85
\N	title	subtitle	8954	Hagan	El Paso	Texas	TX	79928	\N	70ec408e-7645-11e4-82f1-0024d71b10fc	Trail	77
\N	title	subtitle	80020	La Follette	Springfield	Illinois	IL	62718	\N	70ecdda0-7645-11e4-82f1-0024d71b10fc	Place	5
\N	title	subtitle	43530	Ryan	Brooklyn	New York	NY	11215	\N	70f0aae8-7645-11e4-82f1-0024d71b10fc	Center	53
\N	title	subtitle	35	Monterey	Cleveland	Ohio	OH	44185	\N	70f17ac2-7645-11e4-82f1-0024d71b10fc	Avenue	78
\N	title	subtitle	8347	Killdeer	San Antonio	Texas	TX	78235	\N	70f50322-7645-11e4-82f1-0024d71b10fc	Lane	42
\N	title	subtitle	3051	South	Birmingham	Alabama	AL	35231	\N	70ec4f0c-7645-11e4-93a4-0024d71b10fc	Hill	25
\N	title	subtitle	31480	Buell	Tallahassee	Florida	FL	32314	\N	70ecbcd0-7645-11e4-93a4-0024d71b10fc	Crossing	58
\N	title	subtitle	14	Dexter	San Luis Obispo	California	CA	93407	\N	70f30900-7645-11e4-93a4-0024d71b10fc	Lane	35
\N	title	subtitle	33	Cottonwood	Canton	Ohio	OH	44720	\N	70f3bfc6-7645-11e4-93a4-0024d71b10fc	Avenue	50
\N	title	subtitle	36	Lighthouse Bay	Jacksonville	Florida	FL	32277	\N	70ec5682-7645-11e4-bb49-0024d71b10fc	Way	65
\N	title	subtitle	59	Kedzie	Louisville	Kentucky	KY	40298	\N	70eca826-7645-11e4-bb49-0024d71b10fc	Junction	72
\N	title	subtitle	9198	Katie	Raleigh	North Carolina	NC	27605	\N	70ec72ca-7645-11e4-8fac-0024d71b10fc	Trail	34
\N	title	subtitle	01	Bayside	Atlanta	Georgia	GA	31196	\N	70ec87d8-7645-11e4-94fd-0024d71b10fc	Terrace	34
\N	title	subtitle	5	Morning	Madison	Wisconsin	WI	53785	\N	70ece746-7645-11e4-94fd-0024d71b10fc	Street	43
\N	title	subtitle	90	Sutherland	Akron	Ohio	OH	44393	\N	70ef0af8-7645-11e4-94fd-0024d71b10fc	Trail	46
\N	title	subtitle	47	Buell	Roanoke	Virginia	VA	24020	\N	70efca60-7645-11e4-94fd-0024d71b10fc	Place	83
\.


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY agencies (type, name, phone_number, address, id) FROM stdin;
\N	Skimia	6-(569)884-7724	\N	70cfa9c4-7645-11e4-bb49-0024d71b10fc
\N	Chatterbridge	8-(391)717-8597	\N	70cff280-7645-11e4-b30a-0024d71b10fc
\N	Centidel	1-(775)323-0429	\N	70d06ed6-7645-11e4-898d-0024d71b10fc
\N	Jaxbean	9-(473)998-6962	\N	70d09dc0-7645-11e4-93a4-0024d71b10fc
\N	Devpoint	7-(456)337-8781	\N	70d0b38c-7645-11e4-a8ef-0024d71b10fc
\N	Divape	5-(508)530-0904	\N	70d11ee4-7645-11e4-b0f7-0024d71b10fc
\N	Myworks	8-(050)207-0412	\N	70d19dba-7645-11e4-82f1-0024d71b10fc
\N	Edgeclub	0-(246)022-2351	\N	70d1a44a-7645-11e4-8fac-0024d71b10fc
\N	Yotz	9-(982)304-4019	\N	70d1dcda-7645-11e4-a8ef-0024d71b10fc
\N	Jaxnation	9-(791)665-5936	\N	70d1e4d2-7645-11e4-bb49-0024d71b10fc
\N	Devpulse	8-(827)502-5416	\N	70d22096-7645-11e4-9eb0-0024d71b10fc
\N	Roomm	8-(615)246-8065	\N	70d2836a-7645-11e4-82f1-0024d71b10fc
\N	Fadeo	3-(095)497-6328	\N	70d2a246-7645-11e4-8fac-0024d71b10fc
\N	Teklist	3-(226)859-2737	\N	70d317b2-7645-11e4-b0f7-0024d71b10fc
\N	Gabvine	5-(223)911-3314	\N	70d33490-7645-11e4-bb49-0024d71b10fc
\N	Yamia	2-(045)139-2607	\N	70d35de4-7645-11e4-94fd-0024d71b10fc
\N	Shuffledrive	9-(257)505-7180	\N	70d38698-7645-11e4-82f1-0024d71b10fc
\N	Chatterpoint	6-(236)786-6250	\N	70d38fe4-7645-11e4-8fac-0024d71b10fc
\N	Mymm	5-(939)373-2764	\N	70d444ac-7645-11e4-82f1-0024d71b10fc
\N	Skiba	4-(941)353-5941	\N	70d44c7c-7645-11e4-bb49-0024d71b10fc
\N	Jabbertype	7-(397)559-9827	\N	70d45686-7645-11e4-93a4-0024d71b10fc
\N	Skyba	9-(490)274-8293	\N	70d569ae-7645-11e4-898d-0024d71b10fc
\N	Thoughtmix	7-(974)886-9669	\N	70d5721e-7645-11e4-94fd-0024d71b10fc
\N	Blogspan	1-(515)265-3413	\N	70d57b06-7645-11e4-a8ef-0024d71b10fc
\N	Fliptune	5-(929)985-0919	\N	70d5865a-7645-11e4-b0f7-0024d71b10fc
\N	Topdrive	0-(456)528-9881	\N	70d58eb6-7645-11e4-93a4-0024d71b10fc
\N	Feedmix	4-(617)181-4781	\N	70d66642-7645-11e4-b0f7-0024d71b10fc
\N	Kwilith	1-(252)881-4883	\N	70d66f0c-7645-11e4-898d-0024d71b10fc
\N	Skinte	7-(591)425-1033	\N	70d67916-7645-11e4-9eb0-0024d71b10fc
\N	Brightbean	3-(972)448-4526	\N	70d6d7f8-7645-11e4-8fac-0024d71b10fc
\N	Wordware	8-(289)168-2155	\N	70d7032c-7645-11e4-94fd-0024d71b10fc
\N	Voonyx	0-(137)516-3854	\N	70d753b8-7645-11e4-b0f7-0024d71b10fc
\N	Feedmix	8-(005)212-8239	\N	70d7cf64-7645-11e4-a8ef-0024d71b10fc
\N	Pixope	7-(074)887-2965	\N	70d7dafe-7645-11e4-9eb0-0024d71b10fc
\N	Leenti	2-(563)314-4009	\N	70d7e35a-7645-11e4-bb49-0024d71b10fc
\N	Fatz	8-(635)882-7479	\N	70d841ec-7645-11e4-b0f7-0024d71b10fc
\N	Jamia	5-(858)813-2175	\N	70d84c1e-7645-11e4-93a4-0024d71b10fc
\N	Kanoodle	1-(419)933-9667	\N	70d876bc-7645-11e4-898d-0024d71b10fc
\N	Eare	3-(068)455-7555	\N	70d87e1e-7645-11e4-94fd-0024d71b10fc
\N	Yozio	1-(417)501-2853	\N	70d8abfa-7645-11e4-9eb0-0024d71b10fc
\N	Skalith	4-(846)756-2388	\N	70d8ea48-7645-11e4-8fac-0024d71b10fc
\N	Jabbersphere	4-(931)754-2645	\N	70d96090-7645-11e4-bb49-0024d71b10fc
\N	Quimm	1-(561)200-9969	\N	70d97a6c-7645-11e4-82f1-0024d71b10fc
\N	Jetwire	6-(597)032-1365	\N	70d986b0-7645-11e4-93a4-0024d71b10fc
\N	Meevee	0-(578)735-0309	\N	70d9938a-7645-11e4-94fd-0024d71b10fc
\N	Topicstorm	0-(733)808-8335	\N	70d9f1e0-7645-11e4-8fac-0024d71b10fc
\N	Zoombox	2-(476)296-4433	\N	70db0986-7645-11e4-a8ef-0024d71b10fc
\N	Kwideo	6-(126)355-4602	\N	70db12dc-7645-11e4-93a4-0024d71b10fc
\N	Zoomdog	9-(576)161-1651	\N	70db1ac0-7645-11e4-bb49-0024d71b10fc
\N	Thoughtstorm	8-(455)264-0848	\N	70db23b2-7645-11e4-898d-0024d71b10fc
\N	Wordware	0-(976)187-5493	\N	70db2b50-7645-11e4-8fac-0024d71b10fc
\N	Dynava	7-(207)387-6951	\N	70dba120-7645-11e4-a8ef-0024d71b10fc
\N	Gabcube	7-(395)640-5878	\N	70dc0584-7645-11e4-bb49-0024d71b10fc
\N	Oyondu	7-(189)481-6522	\N	70dc0fac-7645-11e4-b30a-0024d71b10fc
\N	Mydo	3-(648)768-9767	\N	70dc193e-7645-11e4-8fac-0024d71b10fc
\N	Topicstorm	9-(744)806-8303	\N	70dc2dd4-7645-11e4-93a4-0024d71b10fc
\N	Ooba	0-(980)987-5530	\N	70dc6df8-7645-11e4-a8ef-0024d71b10fc
\N	Vipe	9-(090)127-9197	\N	70dcc8de-7645-11e4-b0f7-0024d71b10fc
\N	Livetube	6-(752)890-8538	\N	70dcd158-7645-11e4-898d-0024d71b10fc
\N	Dabfeed	2-(894)630-1488	\N	70dcda40-7645-11e4-8fac-0024d71b10fc
\N	Brightbean	8-(360)093-0227	\N	70dd4368-7645-11e4-a8ef-0024d71b10fc
\N	Feedfish	9-(354)220-1187	\N	70dd4b1a-7645-11e4-9eb0-0024d71b10fc
\N	Feedfire	3-(643)863-3150	\N	70dd9a84-7645-11e4-82f1-0024d71b10fc
\N	Yozio	2-(853)214-9388	\N	70dda38a-7645-11e4-898d-0024d71b10fc
\N	Oodoo	4-(905)232-0510	\N	70ddfba0-7645-11e4-8fac-0024d71b10fc
\N	Meejo	8-(460)990-2834	\N	70de4dd0-7645-11e4-93a4-0024d71b10fc
\N	Talane	9-(672)400-8591	\N	70de5686-7645-11e4-9eb0-0024d71b10fc
\N	Jaxbean	4-(079)902-7726	\N	70ded91c-7645-11e4-898d-0024d71b10fc
\N	Livefish	4-(823)055-5919	\N	70dee3b2-7645-11e4-b0f7-0024d71b10fc
\N	Innojam	7-(072)867-1239	\N	70df4eec-7645-11e4-a8ef-0024d71b10fc
\N	Photospace	9-(574)881-6273	\N	70dfaea0-7645-11e4-898d-0024d71b10fc
\N	Youfeed	1-(721)314-3758	\N	70dfd204-7645-11e4-bb49-0024d71b10fc
\N	Quimm	5-(142)695-1027	\N	70dfdc4a-7645-11e4-9eb0-0024d71b10fc
\N	Fanoodle	5-(561)131-1736	\N	70e00094-7645-11e4-b30a-0024d71b10fc
\N	Nlounge	2-(974)678-1271	\N	70e024c0-7645-11e4-a8ef-0024d71b10fc
\N	Oozz	8-(771)785-4645	\N	70e0626e-7645-11e4-898d-0024d71b10fc
\N	Devbug	2-(789)151-5352	\N	70e0cd80-7645-11e4-82f1-0024d71b10fc
\N	Twitterbeat	1-(321)152-9649	\N	70e0d7da-7645-11e4-a8ef-0024d71b10fc
\N	Wordpedia	0-(374)811-9660	\N	70e0e0a4-7645-11e4-b0f7-0024d71b10fc
\N	Meemm	6-(018)550-8332	\N	70e0e7fc-7645-11e4-94fd-0024d71b10fc
\N	Skyndu	6-(245)628-4562	\N	70e13bd0-7645-11e4-8fac-0024d71b10fc
\N	Buzzbean	5-(923)886-9884	\N	70e22676-7645-11e4-82f1-0024d71b10fc
\N	Skiba	1-(819)848-3887	\N	70e22e1e-7645-11e4-bb49-0024d71b10fc
\N	Fatz	4-(118)851-1582	\N	70e23670-7645-11e4-b0f7-0024d71b10fc
\N	Yodel	8-(336)880-4935	\N	70e2414c-7645-11e4-94fd-0024d71b10fc
\N	Pixonyx	7-(475)910-7966	\N	70e2ffa6-7645-11e4-82f1-0024d71b10fc
\N	Brainsphere	4-(367)271-5286	\N	70e30582-7645-11e4-bb49-0024d71b10fc
\N	Twitterlist	3-(599)411-7147	\N	70e30e2e-7645-11e4-9eb0-0024d71b10fc
\N	Eidel	8-(832)110-0527	\N	70e347c2-7645-11e4-b0f7-0024d71b10fc
\N	Flashset	7-(868)421-0841	\N	70e34f7e-7645-11e4-93a4-0024d71b10fc
\N	Eidel	5-(142)942-0745	\N	70e3a154-7645-11e4-82f1-0024d71b10fc
\N	Jatri	1-(935)032-0515	\N	70e3a9d8-7645-11e4-b30a-0024d71b10fc
\N	Buzzster	1-(951)349-5073	\N	70e40630-7645-11e4-b0f7-0024d71b10fc
\N	Jayo	2-(067)851-7004	\N	70e40d9c-7645-11e4-9eb0-0024d71b10fc
\N	Livepath	4-(337)955-5165	\N	70e4154e-7645-11e4-8fac-0024d71b10fc
\N	Yombu	4-(967)188-5000	\N	70e46058-7645-11e4-b30a-0024d71b10fc
\N	Youbridge	0-(860)935-5873	\N	70e48132-7645-11e4-82f1-0024d71b10fc
\N	Dabshots	7-(064)197-2414	\N	70e49cc6-7645-11e4-b0f7-0024d71b10fc
\N	Yamia	2-(701)583-8443	\N	70e4a2e8-7645-11e4-9eb0-0024d71b10fc
\N	Yambee	4-(941)052-9237	\N	70e4a914-7645-11e4-93a4-0024d71b10fc
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY clients (id, version, response, secret, name) FROM stdin;
bf0da47e-7226-11e4-905b-0024d71b10fc	0.1	{"type": "session", "api_base_url": "https://api.shortlisted.com:443", "client_version_status": "UPGRADE_AVAILABLE"}	secret	Unit Test
bf0da47e-7226-11e4-905b-0024d71b10fc	0.1	{"type": "session", "api_base_url": "https://api.shortlisted.com:443", "client_version_status": "UPGRADE_AVAILABLE"}	secret	Unit Test
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY events (action, "timestamp", subject_type, id, subject_id, user_id) FROM stdin;
view	46868-08-16 12:50:57.999872	listing	253550cc-741f-11e4-8605-0024d71b10fc	7cc88bc8-7100-11e4-905b-0024d71b10fc	74a1aa38-7100-11e4-905b-0024d71b10fc
view	46871-05-27 12:21:16	listing	1f68bc84-74eb-11e4-a451-0024d71b10fc	7cc88bc8-7100-11e4-905b-0024d71b10fc	74a1aa38-7100-11e4-905b-0024d71b10fc
\.


--
-- Data for Name: feed; Type: TABLE DATA; Schema: public; Owner: -
--

COPY feed (id, listing_id, user_id, saved, passed, create_time) FROM stdin;
\.


--
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY listings (id, property_id, alerting_agent, listing_agent_id, listing_agency_id, "timestamp") FROM stdin;
70fff174-7645-11e4-898d-0024d71b10fc	70cf98ee-7645-11e4-94fd-0024d71b10fc	\N	70ed564a-7645-11e4-8fac-0024d71b10fc	70cfa9c4-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.749
70fffe30-7645-11e4-93a4-0024d71b10fc	70d123f8-7645-11e4-bb49-0024d71b10fc	\N	70eda140-7645-11e4-b30a-0024d71b10fc	70d19dba-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.75
70ffffc0-7645-11e4-8fac-0024d71b10fc	70d0ca70-7645-11e4-9eb0-0024d71b10fc	\N	70edb0fe-7645-11e4-a8ef-0024d71b10fc	70d0b38c-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.752
70fff142-7645-11e4-b30a-0024d71b10fc	70d0aea0-7645-11e4-94fd-0024d71b10fc	\N	70ee1328-7645-11e4-94fd-0024d71b10fc	70d11ee4-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.753
7100c20c-7645-11e4-93a4-0024d71b10fc	70d1e0a4-7645-11e4-b0f7-0024d71b10fc	\N	70ee9f32-7645-11e4-bb49-0024d71b10fc	70d1e4d2-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.754
7100c63a-7645-11e4-898d-0024d71b10fc	70d29eea-7645-11e4-898d-0024d71b10fc	\N	70ef6822-7645-11e4-898d-0024d71b10fc	70d2a246-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.756
7100f29a-7645-11e4-b30a-0024d71b10fc	70d2127c-7645-11e4-94fd-0024d71b10fc	\N	70ef3726-7645-11e4-8fac-0024d71b10fc	70d22096-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.757
7100f9de-7645-11e4-8fac-0024d71b10fc	70d333e6-7645-11e4-a8ef-0024d71b10fc	\N	70efa760-7645-11e4-9eb0-0024d71b10fc	70d33490-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.758
7101b6b2-7645-11e4-93a4-0024d71b10fc	70d389f4-7645-11e4-898d-0024d71b10fc	\N	70f04990-7645-11e4-a8ef-0024d71b10fc	70d38fe4-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.764
71022bd8-7645-11e4-898d-0024d71b10fc	70d3676c-7645-11e4-9eb0-0024d71b10fc	\N	70f01830-7645-11e4-898d-0024d71b10fc	70d38698-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.765
71026eea-7645-11e4-8fac-0024d71b10fc	70d447b8-7645-11e4-b0f7-0024d71b10fc	\N	70f0ea80-7645-11e4-a8ef-0024d71b10fc	70d44c7c-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.77
7102e942-7645-11e4-898d-0024d71b10fc	70d58b78-7645-11e4-82f1-0024d71b10fc	\N	70f24510-7645-11e4-a8ef-0024d71b10fc	70d58eb6-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.775
710350c6-7645-11e4-b30a-0024d71b10fc	70d5762e-7645-11e4-9eb0-0024d71b10fc	\N	70f250e6-7645-11e4-9eb0-0024d71b10fc	70d57b06-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.777
71037754-7645-11e4-93a4-0024d71b10fc	70d6738a-7645-11e4-82f1-0024d71b10fc	\N	70f2e880-7645-11e4-898d-0024d71b10fc	70d67916-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.788
710417c2-7645-11e4-b30a-0024d71b10fc	70d6b6ba-7645-11e4-bb49-0024d71b10fc	\N	70f351f8-7645-11e4-94fd-0024d71b10fc	70d6d7f8-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.791
71042028-7645-11e4-8fac-0024d71b10fc	70d7c1ae-7645-11e4-898d-0024d71b10fc	\N	70f32e8a-7645-11e4-a8ef-0024d71b10fc	70d7cf64-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.791
71047802-7645-11e4-898d-0024d71b10fc	70d7dee6-7645-11e4-94fd-0024d71b10fc	\N	70f511dc-7645-11e4-8fac-0024d71b10fc	70d7e35a-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.796
71049ac6-7645-11e4-93a4-0024d71b10fc	70d8d80a-7645-11e4-b0f7-0024d71b10fc	\N	70f60966-7645-11e4-b30a-0024d71b10fc	70d8ea48-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.801
7104e364-7645-11e4-b30a-0024d71b10fc	70d92ea4-7645-11e4-898d-0024d71b10fc	\N	70f6063c-7645-11e4-a8ef-0024d71b10fc	70d96090-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.802
71050916-7645-11e4-8fac-0024d71b10fc	70da1206-7645-11e4-898d-0024d71b10fc	\N	70f6e674-7645-11e4-94fd-0024d71b10fc	70db0986-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.805
7105c20c-7645-11e4-93a4-0024d71b10fc	70db27b8-7645-11e4-b0f7-0024d71b10fc	\N	70f7a2a8-7645-11e4-93a4-0024d71b10fc	70db2b50-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.811
7105edb8-7645-11e4-b30a-0024d71b10fc	70dc1312-7645-11e4-b0f7-0024d71b10fc	\N	70f8066c-7645-11e4-bb49-0024d71b10fc	70dc193e-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.813
7105fa60-7645-11e4-8fac-0024d71b10fc	70dc0afc-7645-11e4-898d-0024d71b10fc	\N	70f86a4e-7645-11e4-b30a-0024d71b10fc	70dc0fac-7645-11e4-b30a-0024d71b10fc	2014-11-27 18:25:34.815
71062f8a-7645-11e4-898d-0024d71b10fc	70d98a48-7645-11e4-9eb0-0024d71b10fc	\N	70f6cb44-7645-11e4-b0f7-0024d71b10fc	70d9938a-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.806
7106b2de-7645-11e4-93a4-0024d71b10fc	70dcd6d0-7645-11e4-b30a-0024d71b10fc	\N	70f92d4e-7645-11e4-a8ef-0024d71b10fc	70dcda40-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.821
7106b84c-7645-11e4-b30a-0024d71b10fc	70dcf2d2-7645-11e4-94fd-0024d71b10fc	\N	70f92fa6-7645-11e4-b0f7-0024d71b10fc	70dd4368-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.822
7106e2f4-7645-11e4-8fac-0024d71b10fc	70ddf86c-7645-11e4-b30a-0024d71b10fc	\N	70f98140-7645-11e4-bb49-0024d71b10fc	70ddfba0-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.823
7106fba4-7645-11e4-898d-0024d71b10fc	70dd9eb2-7645-11e4-bb49-0024d71b10fc	\N	70fa0386-7645-11e4-b30a-0024d71b10fc	70dda38a-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.827
71075680-7645-11e4-b30a-0024d71b10fc	70de52da-7645-11e4-94fd-0024d71b10fc	\N	70fa145c-7645-11e4-9eb0-0024d71b10fc	70de5686-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.828
710783bc-7645-11e4-93a4-0024d71b10fc	70df54e6-7645-11e4-8fac-0024d71b10fc	\N	70facdd4-7645-11e4-a8ef-0024d71b10fc	70dfaea0-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.832
7107caca-7645-11e4-898d-0024d71b10fc	70dfd54c-7645-11e4-93a4-0024d71b10fc	\N	70fb8616-7645-11e4-898d-0024d71b10fc	70dfdc4a-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.835
7107e4ec-7645-11e4-8fac-0024d71b10fc	70e034ce-7645-11e4-8fac-0024d71b10fc	\N	70fb9a48-7645-11e4-9eb0-0024d71b10fc	70e0626e-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.837
71082204-7645-11e4-b30a-0024d71b10fc	70e0cac4-7645-11e4-b30a-0024d71b10fc	\N	70fb9782-7645-11e4-b0f7-0024d71b10fc	70e0cd80-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.839
71085cf6-7645-11e4-93a4-0024d71b10fc	70e22676-7645-11e4-b30a-0024d71b10fc	\N	70fc74cc-7645-11e4-93a4-0024d71b10fc	70e22676-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.842
7108af62-7645-11e4-898d-0024d71b10fc	70e22eb4-7645-11e4-9eb0-0024d71b10fc	\N	70fc858e-7645-11e4-94fd-0024d71b10fc	70e22e1e-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.844
7108b32c-7645-11e4-8fac-0024d71b10fc	70e2847c-7645-11e4-898d-0024d71b10fc	\N	70fd0f18-7645-11e4-b30a-0024d71b10fc	70e2ffa6-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.846
710903ea-7645-11e4-b30a-0024d71b10fc	70e352d0-7645-11e4-94fd-0024d71b10fc	\N	70fe567a-7645-11e4-82f1-0024d71b10fc	70e3a154-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.855
71094bca-7645-11e4-898d-0024d71b10fc	70e3a578-7645-11e4-bb49-0024d71b10fc	\N	70feb84a-7645-11e4-b30a-0024d71b10fc	70e3a9d8-7645-11e4-b30a-0024d71b10fc	2014-11-27 18:25:34.857
710957e6-7645-11e4-8fac-0024d71b10fc	70e409b4-7645-11e4-a8ef-0024d71b10fc	\N	710057ae-7645-11e4-9eb0-0024d71b10fc	70e40d9c-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.869
71095a7a-7645-11e4-93a4-0024d71b10fc	70e41166-7645-11e4-93a4-0024d71b10fc	\N	7101100e-7645-11e4-bb49-0024d71b10fc	70e4154e-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.876
71097e1a-7645-11e4-b30a-0024d71b10fc	70e49e2e-7645-11e4-a8ef-0024d71b10fc	\N	7103a9cc-7645-11e4-82f1-0024d71b10fc	70e4a2e8-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.89
70fff142-7645-11e4-bb49-0024d71b10fc	70d06ecc-7645-11e4-8fac-0024d71b10fc	\N	70ed4862-7645-11e4-9eb0-0024d71b10fc	70d09dc0-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.748
70fff174-7645-11e4-b0f7-0024d71b10fc	70d00810-7645-11e4-82f1-0024d71b10fc	\N	70ed1c2a-7645-11e4-bb49-0024d71b10fc	70d06ed6-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.745
710009ac-7645-11e4-82f1-0024d71b10fc	70d1a72e-7645-11e4-898d-0024d71b10fc	\N	70edbaa4-7645-11e4-b0f7-0024d71b10fc	70d1dcda-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.752
70fffe30-7645-11e4-a8ef-0024d71b10fc	70cfbc02-7645-11e4-b0f7-0024d71b10fc	\N	70ed4448-7645-11e4-82f1-0024d71b10fc	70cff280-7645-11e4-b30a-0024d71b10fc	2014-11-27 18:25:34.74
710025e0-7645-11e4-94fd-0024d71b10fc	70d19db0-7645-11e4-b30a-0024d71b10fc	\N	70edd70a-7645-11e4-9eb0-0024d71b10fc	70d1a44a-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.753
7100d436-7645-11e4-b0f7-0024d71b10fc	70d2228a-7645-11e4-93a4-0024d71b10fc	\N	70ef6368-7645-11e4-b30a-0024d71b10fc	70d2836a-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.757
71010640-7645-11e4-82f1-0024d71b10fc	70d2b3b2-7645-11e4-b30a-0024d71b10fc	\N	70efb124-7645-11e4-82f1-0024d71b10fc	70d317b2-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.759
7101767a-7645-11e4-9eb0-0024d71b10fc	70d3d2a6-7645-11e4-b30a-0024d71b10fc	\N	70f02208-7645-11e4-b30a-0024d71b10fc	70d444ac-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.762
71021b20-7645-11e4-b0f7-0024d71b10fc	70d3394a-7645-11e4-93a4-0024d71b10fc	\N	70f01e52-7645-11e4-8fac-0024d71b10fc	70d35de4-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.765
71025e78-7645-11e4-bb49-0024d71b10fc	70d58092-7645-11e4-bb49-0024d71b10fc	\N	70f0f21e-7645-11e4-898d-0024d71b10fc	70d5865a-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.769
71026eea-7645-11e4-9eb0-0024d71b10fc	70d45190-7645-11e4-a8ef-0024d71b10fc	\N	70f0febc-7645-11e4-8fac-0024d71b10fc	70d45686-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.771
7102e294-7645-11e4-82f1-0024d71b10fc	70d56cec-7645-11e4-8fac-0024d71b10fc	\N	70f21a90-7645-11e4-898d-0024d71b10fc	70d5721e-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.774
710301ac-7645-11e4-b0f7-0024d71b10fc	70d533c6-7645-11e4-b30a-0024d71b10fc	\N	70f22814-7645-11e4-93a4-0024d71b10fc	70d569ae-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.776
7103443c-7645-11e4-a8ef-0024d71b10fc	70d61160-7645-11e4-b30a-0024d71b10fc	\N	70f2404c-7645-11e4-8fac-0024d71b10fc	70d66642-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.777
7103567a-7645-11e4-bb49-0024d71b10fc	70d66a5c-7645-11e4-a8ef-0024d71b10fc	\N	70f28552-7645-11e4-94fd-0024d71b10fc	70d66f0c-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.777
71036a16-7645-11e4-9eb0-0024d71b10fc	70d6db9a-7645-11e4-93a4-0024d71b10fc	\N	70f314cc-7645-11e4-8fac-0024d71b10fc	70d7032c-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.779
7103c2e0-7645-11e4-b0f7-0024d71b10fc	70d73572-7645-11e4-b30a-0024d71b10fc	\N	70f3130a-7645-11e4-82f1-0024d71b10fc	70d753b8-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.79
71040c6e-7645-11e4-a8ef-0024d71b10fc	70d7d234-7645-11e4-82f1-0024d71b10fc	\N	70f34be0-7645-11e4-b30a-0024d71b10fc	70d7dafe-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.79
71043770-7645-11e4-9eb0-0024d71b10fc	70d82004-7645-11e4-8fac-0024d71b10fc	\N	70f517cc-7645-11e4-93a4-0024d71b10fc	70d841ec-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.795
7104708c-7645-11e4-b0f7-0024d71b10fc	70d872d4-7645-11e4-a8ef-0024d71b10fc	\N	70f52b0e-7645-11e4-b30a-0024d71b10fc	70d876bc-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.796
71048158-7645-11e4-94fd-0024d71b10fc	70d8827e-7645-11e4-bb49-0024d71b10fc	\N	70f5534a-7645-11e4-9eb0-0024d71b10fc	70d8abfa-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.796
71048856-7645-11e4-82f1-0024d71b10fc	70d846ba-7645-11e4-b30a-0024d71b10fc	\N	70f5f692-7645-11e4-b0f7-0024d71b10fc	70d84c1e-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.8
7104db1c-7645-11e4-9eb0-0024d71b10fc	70d87bb2-7645-11e4-82f1-0024d71b10fc	\N	70f5f962-7645-11e4-93a4-0024d71b10fc	70d87e1e-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.802
7104ec56-7645-11e4-a8ef-0024d71b10fc	70d9760c-7645-11e4-b30a-0024d71b10fc	\N	70f61ab4-7645-11e4-82f1-0024d71b10fc	70d97a6c-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.803
71052004-7645-11e4-bb49-0024d71b10fc	70d97d50-7645-11e4-a8ef-0024d71b10fc	\N	70f663ac-7645-11e4-bb49-0024d71b10fc	70d986b0-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.804
710556be-7645-11e4-94fd-0024d71b10fc	70d9dfb6-7645-11e4-b0f7-0024d71b10fc	\N	70f6dcce-7645-11e4-9eb0-0024d71b10fc	70d9f1e0-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.807
7105b03c-7645-11e4-82f1-0024d71b10fc	70db1ea8-7645-11e4-82f1-0024d71b10fc	\N	70f6eeb2-7645-11e4-8fac-0024d71b10fc	70db23b2-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.808
7105c798-7645-11e4-bb49-0024d71b10fc	70db1552-7645-11e4-9eb0-0024d71b10fc	\N	70f747ae-7645-11e4-bb49-0024d71b10fc	70db1ac0-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.809
7105daf8-7645-11e4-9eb0-0024d71b10fc	70dc017e-7645-11e4-82f1-0024d71b10fc	\N	70f7ae92-7645-11e4-82f1-0024d71b10fc	70dc0584-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.812
7105fae2-7645-11e4-a8ef-0024d71b10fc	70db326c-7645-11e4-94fd-0024d71b10fc	\N	70f7b3b0-7645-11e4-b0f7-0024d71b10fc	70dba120-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.812
7105fdbc-7645-11e4-b0f7-0024d71b10fc	70db0986-7645-11e4-b30a-0024d71b10fc	\N	70f6e71e-7645-11e4-82f1-0024d71b10fc	70db12dc-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.807
71064e16-7645-11e4-94fd-0024d71b10fc	70dc2a96-7645-11e4-94fd-0024d71b10fc	\N	70f863f0-7645-11e4-898d-0024d71b10fc	70dc2dd4-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.816
7106977c-7645-11e4-bb49-0024d71b10fc	70dcccf8-7645-11e4-bb49-0024d71b10fc	\N	70f88e5c-7645-11e4-82f1-0024d71b10fc	70dcd158-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.816
71069c18-7645-11e4-a8ef-0024d71b10fc	70dc3414-7645-11e4-9eb0-0024d71b10fc	\N	70f8b9b8-7645-11e4-bb49-0024d71b10fc	70dc6df8-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.817
7106a1d6-7645-11e4-82f1-0024d71b10fc	70dcc636-7645-11e4-82f1-0024d71b10fc	\N	70f8b3dc-7645-11e4-8fac-0024d71b10fc	70dcc8de-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.818
7106c2d8-7645-11e4-b0f7-0024d71b10fc	70dd97fa-7645-11e4-b0f7-0024d71b10fc	\N	70f98424-7645-11e4-8fac-0024d71b10fc	70dd9a84-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.823
7106c3e6-7645-11e4-9eb0-0024d71b10fc	70dd4584-7645-11e4-93a4-0024d71b10fc	\N	70f93668-7645-11e4-9eb0-0024d71b10fc	70dd4b1a-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.822
7106f726-7645-11e4-94fd-0024d71b10fc	70de01cc-7645-11e4-a8ef-0024d71b10fc	\N	70f9fecc-7645-11e4-898d-0024d71b10fc	70de4dd0-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.826
710759dc-7645-11e4-82f1-0024d71b10fc	70ded566-7645-11e4-82f1-0024d71b10fc	\N	70fa11c8-7645-11e4-b0f7-0024d71b10fc	70ded91c-7645-11e4-898d-0024d71b10fc	2014-11-27 18:25:34.828
71076666-7645-11e4-9eb0-0024d71b10fc	70dee8da-7645-11e4-b30a-0024d71b10fc	\N	70fa56c4-7645-11e4-bb49-0024d71b10fc	70df4eec-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.829
710771d8-7645-11e4-bb49-0024d71b10fc	70dfccdc-7645-11e4-82f1-0024d71b10fc	\N	70facdd4-7645-11e4-b30a-0024d71b10fc	70dfd204-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.831
71077a3e-7645-11e4-a8ef-0024d71b10fc	70deddc2-7645-11e4-bb49-0024d71b10fc	\N	70fabc18-7645-11e4-94fd-0024d71b10fc	70dee3b2-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.832
71078e3e-7645-11e4-b0f7-0024d71b10fc	70dfe384-7645-11e4-94fd-0024d71b10fc	\N	70fb1f6e-7645-11e4-8fac-0024d71b10fc	70e00094-7645-11e4-b30a-0024d71b10fc	2014-11-27 18:25:34.833
7107c2f0-7645-11e4-94fd-0024d71b10fc	70e02128-7645-11e4-b0f7-0024d71b10fc	\N	70fae7d8-7645-11e4-82f1-0024d71b10fc	70e024c0-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.834
71082786-7645-11e4-82f1-0024d71b10fc	70e0e48c-7645-11e4-93a4-0024d71b10fc	\N	70fbf2f4-7645-11e4-bb49-0024d71b10fc	70e0e7fc-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.839
71083c3a-7645-11e4-9eb0-0024d71b10fc	70e0d226-7645-11e4-bb49-0024d71b10fc	\N	70fbf920-7645-11e4-82f1-0024d71b10fc	70e0d7da-7645-11e4-a8ef-0024d71b10fc	2014-11-27 18:25:34.839
71083faa-7645-11e4-bb49-0024d71b10fc	70e13914-7645-11e4-898d-0024d71b10fc	\N	70fc80e8-7645-11e4-b30a-0024d71b10fc	70e13bd0-7645-11e4-8fac-0024d71b10fc	2014-11-27 18:25:34.841
7108450e-7645-11e4-a8ef-0024d71b10fc	70e0dcc6-7645-11e4-9eb0-0024d71b10fc	\N	70fc4952-7645-11e4-898d-0024d71b10fc	70e0e0a4-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.841
71089c52-7645-11e4-b0f7-0024d71b10fc	70e2322e-7645-11e4-93a4-0024d71b10fc	\N	70fcbd10-7645-11e4-82f1-0024d71b10fc	70e23670-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.843
7108b976-7645-11e4-94fd-0024d71b10fc	70e34b5a-7645-11e4-898d-0024d71b10fc	\N	70fd3718-7645-11e4-93a4-0024d71b10fc	70e34f7e-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.847
7108e3c4-7645-11e4-bb49-0024d71b10fc	70e23c24-7645-11e4-a8ef-0024d71b10fc	\N	70fd1472-7645-11e4-9eb0-0024d71b10fc	70e2414c-7645-11e4-94fd-0024d71b10fc	2014-11-27 18:25:34.847
7108ea0e-7645-11e4-82f1-0024d71b10fc	70e30136-7645-11e4-b30a-0024d71b10fc	\N	70fd7782-7645-11e4-82f1-0024d71b10fc	70e30582-7645-11e4-bb49-0024d71b10fc	2014-11-27 18:25:34.849
7108f1e8-7645-11e4-9eb0-0024d71b10fc	70e344ac-7645-11e4-a8ef-0024d71b10fc	\N	70fd99a6-7645-11e4-bb49-0024d71b10fc	70e347c2-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.849
7108fca6-7645-11e4-a8ef-0024d71b10fc	70e309ec-7645-11e4-8fac-0024d71b10fc	\N	70fe45f4-7645-11e4-8fac-0024d71b10fc	70e30e2e-7645-11e4-9eb0-0024d71b10fc	2014-11-27 18:25:34.854
71094fbc-7645-11e4-b0f7-0024d71b10fc	70e40252-7645-11e4-898d-0024d71b10fc	\N	70ff3dba-7645-11e4-94fd-0024d71b10fc	70e40630-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.86
7109683a-7645-11e4-94fd-0024d71b10fc	70e418be-7645-11e4-94fd-0024d71b10fc	\N	71022476-7645-11e4-94fd-0024d71b10fc	70e46058-7645-11e4-b30a-0024d71b10fc	2014-11-27 18:25:34.88
71096eac-7645-11e4-82f1-0024d71b10fc	70e4645e-7645-11e4-bb49-0024d71b10fc	\N	71025824-7645-11e4-b30a-0024d71b10fc	70e48132-7645-11e4-82f1-0024d71b10fc	2014-11-27 18:25:34.882
71097780-7645-11e4-bb49-0024d71b10fc	70e4967c-7645-11e4-898d-0024d71b10fc	\N	7102f2ca-7645-11e4-94fd-0024d71b10fc	70e49cc6-7645-11e4-b0f7-0024d71b10fc	2014-11-27 18:25:34.885
71098356-7645-11e4-9eb0-0024d71b10fc	70e4a914-7645-11e4-8fac-0024d71b10fc	\N	7103bc28-7645-11e4-94fd-0024d71b10fc	70e4a914-7645-11e4-93a4-0024d71b10fc	2014-11-27 18:25:34.891
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY properties (id, property_type, bedroom_count, bathroom_count, distance_unit, address_id, description, square_distance) FROM stdin;
70d00810-7645-11e4-82f1-0024d71b10fc	\N	1	3	\N	70e50490-7645-11e4-898d-0024d71b10fc	Morbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.	\N
70d06ecc-7645-11e4-8fac-0024d71b10fc	\N	2	2	\N	70e55b98-7645-11e4-a8ef-0024d71b10fc	Aliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.	\N
70d19db0-7645-11e4-b30a-0024d71b10fc	\N	2	4	\N	70e5d884-7645-11e4-898d-0024d71b10fc	Nulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.	\N
70d0ca70-7645-11e4-9eb0-0024d71b10fc	\N	3	2	\N	70e589f6-7645-11e4-93a4-0024d71b10fc	Donec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.	\N
70d2228a-7645-11e4-93a4-0024d71b10fc	\N	4	1	\N	70e5f53a-7645-11e4-82f1-0024d71b10fc	Vestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.	\N
70d2127c-7645-11e4-94fd-0024d71b10fc	\N	4	2	\N	70e61aba-7645-11e4-a8ef-0024d71b10fc	Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.	\N
70d1e0a4-7645-11e4-b0f7-0024d71b10fc	\N	4	1	\N	70e5eba8-7645-11e4-b30a-0024d71b10fc	Duis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.	\N
70d29eea-7645-11e4-898d-0024d71b10fc	\N	3	4	\N	70e641e8-7645-11e4-8fac-0024d71b10fc	Aenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.	\N
70d333e6-7645-11e4-a8ef-0024d71b10fc	\N	1	2	\N	70e68c20-7645-11e4-898d-0024d71b10fc	Praesent id massa id nisl venenatis lacinia. Aenean sit amet justo. Morbi ut odio.	\N
70d3394a-7645-11e4-93a4-0024d71b10fc	\N	3	2	\N	70e69dd2-7645-11e4-b30a-0024d71b10fc	Morbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.	\N
70d3d2a6-7645-11e4-b30a-0024d71b10fc	\N	1	4	\N	70e6b614-7645-11e4-bb49-0024d71b10fc	Cras mi pede, malesuada in, imperdiet et, commodo vulputate, justo. In blandit ultrices enim. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.\n\nProin interdum mauris non ligula pellentesque ultrices. Phasellus id sapien in sapien iaculis congue. Vivamus metus arcu, adipiscing molestie, hendrerit at, vulputate vitae, nisl.	\N
70d3676c-7645-11e4-9eb0-0024d71b10fc	\N	2	2	\N	70e6c028-7645-11e4-9eb0-0024d71b10fc	Vestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.	\N
70d447b8-7645-11e4-b0f7-0024d71b10fc	\N	1	1	\N	70e7182a-7645-11e4-93a4-0024d71b10fc	Nulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.\n\nCras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.	\N
70d533c6-7645-11e4-b30a-0024d71b10fc	\N	3	3	\N	70e71438-7645-11e4-b30a-0024d71b10fc	Morbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.	\N
70d5762e-7645-11e4-9eb0-0024d71b10fc	\N	4	3	\N	70e7912e-7645-11e4-a8ef-0024d71b10fc	Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.\n\nNullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.	\N
70d58b78-7645-11e4-82f1-0024d71b10fc	\N	2	1	\N	70e7928c-7645-11e4-bb49-0024d71b10fc	Proin eu mi. Nulla ac enim. In tempor, turpis nec euismod scelerisque, quam turpis adipiscing lorem, vitae mattis nibh ligula nec sem.\n\nDuis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.	\N
70d45190-7645-11e4-a8ef-0024d71b10fc	\N	4	2	\N	70e70132-7645-11e4-82f1-0024d71b10fc	Cras mi pede, malesuada in, imperdiet et, commodo vulputate, justo. In blandit ultrices enim. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.	\N
70d58092-7645-11e4-bb49-0024d71b10fc	\N	1	2	\N	70e71d98-7645-11e4-b0f7-0024d71b10fc	Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.	\N
70d61160-7645-11e4-b30a-0024d71b10fc	\N	4	3	\N	70e8012c-7645-11e4-a8ef-0024d71b10fc	Phasellus in felis. Donec semper sapien a libero. Nam dui.	\N
70d66a5c-7645-11e4-a8ef-0024d71b10fc	\N	3	1	\N	70e82d14-7645-11e4-8fac-0024d71b10fc	Quisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.	\N
70d56cec-7645-11e4-8fac-0024d71b10fc	\N	3	2	\N	70e7bc3a-7645-11e4-94fd-0024d71b10fc	In hac habitasse platea dictumst. Morbi vestibulum, velit id pretium iaculis, diam erat fermentum justo, nec condimentum neque sapien placerat ante. Nulla justo.\n\nAliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.	\N
70d73572-7645-11e4-b30a-0024d71b10fc	\N	3	3	\N	70e8f230-7645-11e4-bb49-0024d71b10fc	Suspendisse potenti. In eleifend quam a odio. In hac habitasse platea dictumst.	\N
70d6738a-7645-11e4-82f1-0024d71b10fc	\N	1	2	\N	70e87e7c-7645-11e4-898d-0024d71b10fc	Suspendisse potenti. In eleifend quam a odio. In hac habitasse platea dictumst.	\N
70d7c1ae-7645-11e4-898d-0024d71b10fc	\N	1	1	\N	70e8ff5a-7645-11e4-82f1-0024d71b10fc	Maecenas ut massa quis augue luctus tincidunt. Nulla mollis molestie lorem. Quisque ut erat.\n\nCurabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.	\N
70d6b6ba-7645-11e4-bb49-0024d71b10fc	\N	3	2	\N	70e8b784-7645-11e4-b0f7-0024d71b10fc	Integer tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.\n\nPraesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.	\N
70d7d234-7645-11e4-82f1-0024d71b10fc	\N	2	1	\N	70e92cb4-7645-11e4-b30a-0024d71b10fc	Aliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.	\N
70d6db9a-7645-11e4-93a4-0024d71b10fc	\N	3	2	\N	70e8bb58-7645-11e4-93a4-0024d71b10fc	Fusce consequat. Nulla nisl. Nunc nisl.	\N
70d8827e-7645-11e4-bb49-0024d71b10fc	\N	4	3	\N	70e9a3e2-7645-11e4-b0f7-0024d71b10fc	Praesent id massa id nisl venenatis lacinia. Aenean sit amet justo. Morbi ut odio.	\N
70d2b3b2-7645-11e4-b30a-0024d71b10fc	\N	1	3	\N	70e66fce-7645-11e4-b0f7-0024d71b10fc	Morbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.	\N
70d7dee6-7645-11e4-94fd-0024d71b10fc	\N	4	3	\N	70e95720-7645-11e4-bb49-0024d71b10fc	In sagittis dui vel nisl. Duis ac nibh. Fusce lacus purus, aliquet at, feugiat non, pretium quis, lectus.	\N
70db326c-7645-11e4-94fd-0024d71b10fc	\N	2	3	\N	70ea9432-7645-11e4-a8ef-0024d71b10fc	Curabitur at ipsum ac tellus semper interdum. Mauris ullamcorper purus sit amet nulla. Quisque arcu libero, rutrum ac, lobortis vel, dapibus at, diam.	\N
70dc2a96-7645-11e4-94fd-0024d71b10fc	\N	3	3	\N	70eaca7e-7645-11e4-898d-0024d71b10fc	In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.	\N
70dcf2d2-7645-11e4-94fd-0024d71b10fc	\N	1	3	\N	70eb517e-7645-11e4-82f1-0024d71b10fc	In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.\n\nNulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.	\N
70de52da-7645-11e4-94fd-0024d71b10fc	\N	4	3	\N	70ebead0-7645-11e4-9eb0-0024d71b10fc	Donec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.\n\nDuis bibendum. Morbi non quam nec dui luctus rutrum. Nulla tellus.	\N
70dfe384-7645-11e4-94fd-0024d71b10fc	\N	1	3	\N	70ec1d98-7645-11e4-b0f7-0024d71b10fc	Duis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.\n\nIn hac habitasse platea dictumst. Morbi vestibulum, velit id pretium iaculis, diam erat fermentum justo, nec condimentum neque sapien placerat ante. Nulla justo.	\N
70e352d0-7645-11e4-94fd-0024d71b10fc	\N	4	1	\N	70ee9406-7645-11e4-898d-0024d71b10fc	In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.\n\nNulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.	\N
70e418be-7645-11e4-94fd-0024d71b10fc	\N	1	1	\N	70f17ac2-7645-11e4-82f1-0024d71b10fc	Fusce consequat. Nulla nisl. Nunc nisl.	\N
70d82004-7645-11e4-8fac-0024d71b10fc	\N	2	1	\N	70e967f6-7645-11e4-94fd-0024d71b10fc	Nam ultrices, libero non mattis pulvinar, nulla pede ullamcorper augue, a suscipit nulla elit ac nulla. Sed vel enim sit amet nunc viverra dapibus. Nulla suscipit ligula in lacus.	\N
70df54e6-7645-11e4-8fac-0024d71b10fc	\N	2	1	\N	70ec0d08-7645-11e4-898d-0024d71b10fc	Integer tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.\n\nPraesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.	\N
70e034ce-7645-11e4-8fac-0024d71b10fc	\N	2	3	\N	70ec5682-7645-11e4-bb49-0024d71b10fc	Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.\n\nEtiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem.	\N
70e309ec-7645-11e4-8fac-0024d71b10fc	\N	1	4	\N	70ed9790-7645-11e4-898d-0024d71b10fc	Cras mi pede, malesuada in, imperdiet et, commodo vulputate, justo. In blandit ultrices enim. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.	\N
70e4a914-7645-11e4-8fac-0024d71b10fc	\N	1	2	\N	70f50322-7645-11e4-82f1-0024d71b10fc	Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.\n\nIn quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.	\N
70cfbc02-7645-11e4-b0f7-0024d71b10fc	\N	1	1	\N	70e4d89e-7645-11e4-82f1-0024d71b10fc	Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.	\N
70d846ba-7645-11e4-b30a-0024d71b10fc	\N	3	1	\N	70e9bd6e-7645-11e4-bb49-0024d71b10fc	Mauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.	\N
70d9760c-7645-11e4-b30a-0024d71b10fc	\N	1	3	\N	70ea088c-7645-11e4-b0f7-0024d71b10fc	Quisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.\n\nPhasellus in felis. Donec semper sapien a libero. Nam dui.	\N
70db0986-7645-11e4-b30a-0024d71b10fc	\N	3	1	\N	70ea63ae-7645-11e4-9eb0-0024d71b10fc	Donec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.	\N
70dcd6d0-7645-11e4-b30a-0024d71b10fc	\N	4	3	\N	70eb36b2-7645-11e4-a8ef-0024d71b10fc	Etiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem.\n\nPraesent id massa id nisl venenatis lacinia. Aenean sit amet justo. Morbi ut odio.	\N
70ddf86c-7645-11e4-b30a-0024d71b10fc	\N	2	2	\N	70ebaf34-7645-11e4-94fd-0024d71b10fc	Aliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.\n\nSed ante. Vivamus tortor. Duis mattis egestas metus.	\N
70dee8da-7645-11e4-b30a-0024d71b10fc	\N	4	3	\N	70ebf818-7645-11e4-b30a-0024d71b10fc	Duis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.\n\nDonec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.	\N
70e0cac4-7645-11e4-b30a-0024d71b10fc	\N	3	1	\N	70ec66cc-7645-11e4-b30a-0024d71b10fc	Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.	\N
70e22676-7645-11e4-b30a-0024d71b10fc	\N	3	4	\N	70ecb244-7645-11e4-898d-0024d71b10fc	Duis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.	\N
70e30136-7645-11e4-b30a-0024d71b10fc	\N	4	2	\N	70ed1ec8-7645-11e4-b0f7-0024d71b10fc	Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.	\N
70d872d4-7645-11e4-a8ef-0024d71b10fc	\N	2	2	\N	70e96fee-7645-11e4-898d-0024d71b10fc	Praesent id massa id nisl venenatis lacinia. Aenean sit amet justo. Morbi ut odio.\n\nCras mi pede, malesuada in, imperdiet et, commodo vulputate, justo. In blandit ultrices enim. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.	\N
70d97d50-7645-11e4-a8ef-0024d71b10fc	\N	3	3	\N	70e9f8ba-7645-11e4-a8ef-0024d71b10fc	Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.	\N
70de01cc-7645-11e4-a8ef-0024d71b10fc	\N	1	4	\N	70ebbda8-7645-11e4-a8ef-0024d71b10fc	In quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.	\N
70e23c24-7645-11e4-a8ef-0024d71b10fc	\N	4	1	\N	70ecd454-7645-11e4-9eb0-0024d71b10fc	Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.\n\nEtiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem.	\N
70e344ac-7645-11e4-a8ef-0024d71b10fc	\N	3	2	\N	70ed2378-7645-11e4-898d-0024d71b10fc	Vestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.\n\nIn congue. Etiam justo. Etiam pretium iaculis justo.	\N
70e409b4-7645-11e4-a8ef-0024d71b10fc	\N	4	3	\N	70efca60-7645-11e4-94fd-0024d71b10fc	Curabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.\n\nPhasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.	\N
70e49e2e-7645-11e4-a8ef-0024d71b10fc	\N	4	1	\N	70f3bfc6-7645-11e4-93a4-0024d71b10fc	Mauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.\n\nNullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.	\N
70d0aea0-7645-11e4-94fd-0024d71b10fc	\N	4	2	\N	70e56c3c-7645-11e4-bb49-0024d71b10fc	Vestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.\n\nDuis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.	\N
70d1a72e-7645-11e4-898d-0024d71b10fc	\N	2	2	\N	70e5bc82-7645-11e4-94fd-0024d71b10fc	In congue. Etiam justo. Etiam pretium iaculis justo.	\N
70d87bb2-7645-11e4-82f1-0024d71b10fc	\N	2	1	\N	70e9c5b6-7645-11e4-9eb0-0024d71b10fc	Praesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.\n\nMorbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.	\N
70db1ea8-7645-11e4-82f1-0024d71b10fc	\N	4	1	\N	70ea4626-7645-11e4-82f1-0024d71b10fc	Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.	\N
70dc017e-7645-11e4-82f1-0024d71b10fc	\N	3	4	\N	70ea9f18-7645-11e4-b0f7-0024d71b10fc	Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.	\N
70dcc636-7645-11e4-82f1-0024d71b10fc	\N	1	2	\N	70eaee82-7645-11e4-94fd-0024d71b10fc	Mauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.\n\nNullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.	\N
70ded566-7645-11e4-82f1-0024d71b10fc	\N	3	3	\N	70ebd554-7645-11e4-8fac-0024d71b10fc	Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.	\N
70dfccdc-7645-11e4-82f1-0024d71b10fc	\N	1	4	\N	70ec2612-7645-11e4-a8ef-0024d71b10fc	Integer tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.	\N
70d123f8-7645-11e4-bb49-0024d71b10fc	\N	2	2	\N	70e5b002-7645-11e4-b0f7-0024d71b10fc	Proin interdum mauris non ligula pellentesque ultrices. Phasellus id sapien in sapien iaculis congue. Vivamus metus arcu, adipiscing molestie, hendrerit at, vulputate vitae, nisl.\n\nAenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.	\N
70d8d80a-7645-11e4-b0f7-0024d71b10fc	\N	4	1	\N	70e9d60a-7645-11e4-93a4-0024d71b10fc	In quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.	\N
70d9dfb6-7645-11e4-b0f7-0024d71b10fc	\N	3	1	\N	70ea35f0-7645-11e4-94fd-0024d71b10fc	Aenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.\n\nCurabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.	\N
70dc1312-7645-11e4-b0f7-0024d71b10fc	\N	3	1	\N	70eab048-7645-11e4-b30a-0024d71b10fc	Aliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.	\N
70db27b8-7645-11e4-b0f7-0024d71b10fc	\N	4	2	\N	70ea7600-7645-11e4-93a4-0024d71b10fc	Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.	\N
70dd97fa-7645-11e4-b0f7-0024d71b10fc	\N	3	1	\N	70eb8ae0-7645-11e4-898d-0024d71b10fc	Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.	\N
70e02128-7645-11e4-b0f7-0024d71b10fc	\N	3	2	\N	70ec408e-7645-11e4-82f1-0024d71b10fc	Vestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.	\N
70d92ea4-7645-11e4-898d-0024d71b10fc	\N	1	2	\N	70e9ee60-7645-11e4-898d-0024d71b10fc	Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.\n\nVestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.	\N
70da1206-7645-11e4-898d-0024d71b10fc	\N	4	2	\N	70ea25f6-7645-11e4-bb49-0024d71b10fc	Integer ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.\n\nNam ultrices, libero non mattis pulvinar, nulla pede ullamcorper augue, a suscipit nulla elit ac nulla. Sed vel enim sit amet nunc viverra dapibus. Nulla suscipit ligula in lacus.	\N
70dc0afc-7645-11e4-898d-0024d71b10fc	\N	3	3	\N	70eabc64-7645-11e4-8fac-0024d71b10fc	Duis bibendum. Morbi non quam nec dui luctus rutrum. Nulla tellus.\n\nIn sagittis dui vel nisl. Duis ac nibh. Fusce lacus purus, aliquet at, feugiat non, pretium quis, lectus.	\N
70e13914-7645-11e4-898d-0024d71b10fc	\N	3	2	\N	70eca826-7645-11e4-bb49-0024d71b10fc	Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.\n\nQuisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.	\N
70e2847c-7645-11e4-898d-0024d71b10fc	\N	1	1	\N	70ece746-7645-11e4-94fd-0024d71b10fc	Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.	\N
70e34b5a-7645-11e4-898d-0024d71b10fc	\N	3	3	\N	70ed1662-7645-11e4-a8ef-0024d71b10fc	Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.	\N
70e40252-7645-11e4-898d-0024d71b10fc	\N	3	2	\N	70ef7c86-7645-11e4-a8ef-0024d71b10fc	Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.	\N
70e4967c-7645-11e4-898d-0024d71b10fc	\N	2	4	\N	70f30900-7645-11e4-93a4-0024d71b10fc	Nullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.	\N
70d98a48-7645-11e4-9eb0-0024d71b10fc	\N	3	4	\N	70ea164c-7645-11e4-b30a-0024d71b10fc	In congue. Etiam justo. Etiam pretium iaculis justo.	\N
70db1552-7645-11e4-9eb0-0024d71b10fc	\N	2	3	\N	70ea5986-7645-11e4-898d-0024d71b10fc	Nullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.\n\nMorbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.	\N
70dc3414-7645-11e4-9eb0-0024d71b10fc	\N	4	2	\N	70eadd70-7645-11e4-bb49-0024d71b10fc	Nam ultrices, libero non mattis pulvinar, nulla pede ullamcorper augue, a suscipit nulla elit ac nulla. Sed vel enim sit amet nunc viverra dapibus. Nulla suscipit ligula in lacus.\n\nCurabitur at ipsum ac tellus semper interdum. Mauris ullamcorper purus sit amet nulla. Quisque arcu libero, rutrum ac, lobortis vel, dapibus at, diam.	\N
70e0dcc6-7645-11e4-9eb0-0024d71b10fc	\N	3	4	\N	70ec72ca-7645-11e4-8fac-0024d71b10fc	Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.	\N
70e22eb4-7645-11e4-9eb0-0024d71b10fc	\N	1	4	\N	70ecbcd0-7645-11e4-93a4-0024d71b10fc	Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.	\N
70dcccf8-7645-11e4-bb49-0024d71b10fc	\N	3	2	\N	70eb012e-7645-11e4-b0f7-0024d71b10fc	Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.\n\nQuisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.	\N
70dd9eb2-7645-11e4-bb49-0024d71b10fc	\N	2	4	\N	70eb9ecc-7645-11e4-b0f7-0024d71b10fc	Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.\n\nInteger ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.	\N
70deddc2-7645-11e4-bb49-0024d71b10fc	\N	4	4	\N	70ebddb0-7645-11e4-93a4-0024d71b10fc	Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.	\N
70e0d226-7645-11e4-bb49-0024d71b10fc	\N	1	2	\N	70ec87d8-7645-11e4-94fd-0024d71b10fc	Morbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.	\N
70e3a578-7645-11e4-bb49-0024d71b10fc	\N	1	3	\N	70ef0af8-7645-11e4-94fd-0024d71b10fc	Duis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.	\N
70e4645e-7645-11e4-bb49-0024d71b10fc	\N	2	4	\N	70f195b6-7645-11e4-b0f7-0024d71b10fc	Vestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.\n\nIn congue. Etiam justo. Etiam pretium iaculis justo.	\N
70cf98ee-7645-11e4-94fd-0024d71b10fc	\N	1	1	\N	70e4c34a-7645-11e4-94fd-0024d71b10fc	Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.	\N
70d389f4-7645-11e4-898d-0024d71b10fc	\N	1	1	\N	70e6f0de-7645-11e4-94fd-0024d71b10fc	Phasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.	\N
70dd4584-7645-11e4-93a4-0024d71b10fc	\N	3	2	\N	70eb645c-7645-11e4-9eb0-0024d71b10fc	Nulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.	\N
70dfd54c-7645-11e4-93a4-0024d71b10fc	\N	2	2	\N	70ec4f0c-7645-11e4-93a4-0024d71b10fc	Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.\n\nFusce consequat. Nulla nisl. Nunc nisl.	\N
70e0e48c-7645-11e4-93a4-0024d71b10fc	\N	1	2	\N	70ec9282-7645-11e4-a8ef-0024d71b10fc	Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.\n\nInteger ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.	\N
70e2322e-7645-11e4-93a4-0024d71b10fc	\N	4	3	\N	70ecdda0-7645-11e4-82f1-0024d71b10fc	Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.\n\nNullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.	\N
70e41166-7645-11e4-93a4-0024d71b10fc	\N	4	2	\N	70f0aae8-7645-11e4-82f1-0024d71b10fc	Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.	\N
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY sessions (id, device_uuid, device_name, client_version, created_time) FROM stdin;
17e35b2e-7223-11e4-86cd-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:09:37.813557
2eb7c18c-7223-11e4-ae70-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:10:16.115447
51926950-7223-11e4-a705-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:11:14.590952
65d7cf18-7223-11e4-9350-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:11:48.600245
85fa08ec-7223-11e4-b283-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:12:42.511637
9d9e1e48-7223-11e4-9c54-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:13:22.175311
a0559954-7223-11e4-9c54-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:13:26.734022
dcfd403c-7223-11e4-bfc0-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:15:08.495872
ed703794-7223-11e4-aeb5-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:15:36.092873
22d0192c-7224-11e4-a2ef-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:17:05.640497
614fc436-7224-11e4-afb9-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:18:50.495891
d9f90152-7226-11e4-b980-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:36:31.92363
e11da1a4-7226-11e4-9c4e-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:36:43.907715
eddc2e74-7226-11e4-9471-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:37:05.289174
fc238aa4-7226-11e4-86d4-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:37:29.244941
180baa6c-7227-11e4-a9df-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:38:16.064628
1c3eb1b0-7227-11e4-a9df-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.3	2014-11-22 12:38:23.111608
1f584690-7227-11e4-a9df-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:38:28.312399
95192674-7227-11e4-b475-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:41:45.868251
e5ca1284-7229-11e4-aab8-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 12:58:20.240327
6ea494b4-725a-11e4-9541-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-22 18:45:45.685537
ab7f7520-7313-11e4-83a2-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-23 16:51:44.677851
d0acfc6e-7313-11e4-9974-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-23 16:52:47.052315
ce1621f8-741f-11e4-b465-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-25 00:51:07.831796
1d1b2eee-74eb-11e4-9372-0024d71b10fc	ac285b9d-6c5a-48f7-a704-7d6f12d70bfe	iPhone Emulator	0.1	2014-11-26 01:06:28.24119
\.


--
-- Data for Name: tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY tokens (id, token, client_id, type, user_id, expire_date) FROM stdin;
e3af97a4-7412-11e4-a109-0024d71b10fc	26Ghy7vJM+UkCAdstS9OXJTF/Az6b90KaJSBYQJroyY=	bf0da47e-7226-11e4-905b-0024d71b10fc	access	13d5262e-7229-11e4-905b-0024d71b10fc	2014-11-25 23:18:40.606
e3b061a2-7412-11e4-9de5-0024d71b10fc	qBN83yro74aibmCzfPkdkcFbyV/WdN1ZhKbH1p+iSU8=	bf0da47e-7226-11e4-905b-0024d71b10fc	refresh	13d5262e-7229-11e4-905b-0024d71b10fc	\N
1f6218b6-74eb-11e4-a451-0024d71b10fc	k9huNiHgZfKLqcoQ/vWOKIeta8AhoSiD4/SNJJ/ysBc=	bf0da47e-7226-11e4-905b-0024d71b10fc	access	3aaa6a98-741d-11e4-a1b5-0024d71b10fc	2014-11-27 01:06:32.059
1f63597e-74eb-11e4-9372-0024d71b10fc	kylKpmyRvbbGW1zmXmK0CH4pTEGgdsvbYvUFCoiAke4=	bf0da47e-7226-11e4-905b-0024d71b10fc	refresh	3aaa6a98-741d-11e4-a1b5-0024d71b10fc	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY users (username, first_name, last_name, email, phone_number, type, created_time, id, agency_id, password, address_id) FROM stdin;
test	John	Doe	j.doe@host.tld	\N	user	2014-11-25 00:32:41.506672	3aaa6a98-741d-11e4-a1b5-0024d71b10fc	\N	password	\N
twebb0	Terry	Webb	twebb0@buzzfeed.com	8-(946)845-1788	agent	2014-11-27 18:25:34.736322	70ed1c2a-7645-11e4-bb49-0024d71b10fc	70d06ed6-7645-11e4-898d-0024d71b10fc	1111	\N
dfields0	Denise	Fields	dfields0@salon.com	0-(850)407-9217	agent	2014-11-27 18:25:34.737381	70ed4448-7645-11e4-82f1-0024d71b10fc	70cff280-7645-11e4-b30a-0024d71b10fc	1111	\N
jgraham0	Joshua	Graham	jgraham0@ning.com	5-(289)737-7634	agent	2014-11-27 18:25:34.737495	70ed4862-7645-11e4-9eb0-0024d71b10fc	70d09dc0-7645-11e4-93a4-0024d71b10fc	1111	\N
jsanders0	Janice	Sanders	jsanders0@huffingtonpost.com	5-(086)093-0446	agent	2014-11-27 18:25:34.737904	70ed564a-7645-11e4-8fac-0024d71b10fc	70cfa9c4-7645-11e4-bb49-0024d71b10fc	1111	\N
rmoore0	Robert	Moore	rmoore0@moonfruit.com	3-(071)433-9658	agent	2014-11-27 18:25:34.739612	70eda140-7645-11e4-b30a-0024d71b10fc	70d19dba-7645-11e4-82f1-0024d71b10fc	1111	\N
flawrence0	Frank	Lawrence	flawrence0@sphinn.com	1-(806)566-4314	agent	2014-11-27 18:25:34.740171	70edb0fe-7645-11e4-a8ef-0024d71b10fc	70d0b38c-7645-11e4-a8ef-0024d71b10fc	1111	\N
gmitchell0	Gerald	Mitchell	gmitchell0@yandex.ru	9-(813)772-5610	agent	2014-11-27 18:25:34.740311	70edbaa4-7645-11e4-b0f7-0024d71b10fc	70d1dcda-7645-11e4-a8ef-0024d71b10fc	1111	\N
rdaniels0	Ruby	Daniels	rdaniels0@about.com	5-(421)693-5849	agent	2014-11-27 18:25:34.741129	70edd70a-7645-11e4-9eb0-0024d71b10fc	70d1a44a-7645-11e4-8fac-0024d71b10fc	1111	\N
dstewart0	Diana	Stewart	dstewart0@nasa.gov	7-(790)542-9867	agent	2014-11-27 18:25:34.7426	70ee1328-7645-11e4-94fd-0024d71b10fc	70d11ee4-7645-11e4-b0f7-0024d71b10fc	1111	\N
cfoster0	Christopher	Foster	cfoster0@senate.gov	7-(603)697-9308	agent	2014-11-27 18:25:34.746186	70ee9f32-7645-11e4-bb49-0024d71b10fc	70d1e4d2-7645-11e4-bb49-0024d71b10fc	1111	\N
jbarnes0	Justin	Barnes	jbarnes0@posterous.com	0-(627)228-9737	agent	2014-11-27 18:25:34.75007	70ef3726-7645-11e4-8fac-0024d71b10fc	70d22096-7645-11e4-9eb0-0024d71b10fc	1111	\N
knelson0	Katherine	Nelson	knelson0@miitbeian.gov.cn	1-(315)151-2796	agent	2014-11-27 18:25:34.751187	70ef6368-7645-11e4-b30a-0024d71b10fc	70d2836a-7645-11e4-82f1-0024d71b10fc	1111	\N
aturner0	Angela	Turner	aturner0@w3.org	9-(966)816-2457	agent	2014-11-27 18:25:34.751376	70ef6822-7645-11e4-898d-0024d71b10fc	70d2a246-7645-11e4-8fac-0024d71b10fc	1111	\N
pcunningham0	Paula	Cunningham	pcunningham0@usda.gov	5-(761)753-0793	agent	2014-11-27 18:25:34.75304	70efa760-7645-11e4-9eb0-0024d71b10fc	70d33490-7645-11e4-bb49-0024d71b10fc	1111	\N
dcollins0	Doris	Collins	dcollins0@e-recht24.de	7-(448)808-1441	agent	2014-11-27 18:25:34.75334	70efb124-7645-11e4-82f1-0024d71b10fc	70d317b2-7645-11e4-b0f7-0024d71b10fc	1111	\N
wtaylor0	Willie	Taylor	wtaylor0@hexun.com	2-(122)720-1748	agent	2014-11-27 18:25:34.755959	70f01830-7645-11e4-898d-0024d71b10fc	70d38698-7645-11e4-82f1-0024d71b10fc	1111	\N
scooper0	Steven	Cooper	scooper0@vinaora.com	2-(652)134-4350	agent	2014-11-27 18:25:34.75611	70f01e52-7645-11e4-8fac-0024d71b10fc	70d35de4-7645-11e4-94fd-0024d71b10fc	1111	\N
acunningham0	Andrew	Cunningham	acunningham0@imgur.com	8-(835)966-8793	agent	2014-11-27 18:25:34.756245	70f02208-7645-11e4-b30a-0024d71b10fc	70d444ac-7645-11e4-82f1-0024d71b10fc	1111	\N
wjenkins0	Wayne	Jenkins	wjenkins0@exblog.jp	0-(494)460-8828	agent	2014-11-27 18:25:34.757217	70f04990-7645-11e4-a8ef-0024d71b10fc	70d38fe4-7645-11e4-8fac-0024d71b10fc	1111	\N
lbarnes0	Linda	Barnes	lbarnes0@123-reg.co.uk	5-(878)830-1866	agent	2014-11-27 18:25:34.761352	70f0ea80-7645-11e4-a8ef-0024d71b10fc	70d44c7c-7645-11e4-bb49-0024d71b10fc	1111	\N
mmorris0	Michael	Morris	mmorris0@earthlink.net	1-(638)177-8643	agent	2014-11-27 18:25:34.761564	70f0f21e-7645-11e4-898d-0024d71b10fc	70d5865a-7645-11e4-b0f7-0024d71b10fc	1111	\N
jparker0	Jeremy	Parker	jparker0@deliciousdays.com	3-(698)483-7082	agent	2014-11-27 18:25:34.761895	70f0febc-7645-11e4-8fac-0024d71b10fc	70d45686-7645-11e4-93a4-0024d71b10fc	1111	\N
eknight0	Elizabeth	Knight	eknight0@webnode.com	9-(908)057-6618	agent	2014-11-27 18:25:34.769104	70f21a90-7645-11e4-898d-0024d71b10fc	70d5721e-7645-11e4-94fd-0024d71b10fc	1111	\N
pcooper0	Paula	Cooper	pcooper0@mtv.com	3-(990)568-9455	agent	2014-11-27 18:25:34.769399	70f22814-7645-11e4-93a4-0024d71b10fc	70d569ae-7645-11e4-898d-0024d71b10fc	1111	\N
wchapman0	Wayne	Chapman	wchapman0@tamu.edu	8-(936)326-1427	agent	2014-11-27 18:25:34.770044	70f2404c-7645-11e4-8fac-0024d71b10fc	70d66642-7645-11e4-b0f7-0024d71b10fc	1111	\N
bwood0	Barbara	Wood	bwood0@behance.net	0-(780)251-4456	agent	2014-11-27 18:25:34.770154	70f24510-7645-11e4-a8ef-0024d71b10fc	70d58eb6-7645-11e4-93a4-0024d71b10fc	1111	\N
dperry0	Dennis	Perry	dperry0@fc2.com	3-(568)346-9942	agent	2014-11-27 18:25:34.770474	70f250e6-7645-11e4-9eb0-0024d71b10fc	70d57b06-7645-11e4-a8ef-0024d71b10fc	1111	\N
pboyd0	Pamela	Boyd	pboyd0@ezinearticles.com	0-(360)823-0538	agent	2014-11-27 18:25:34.771781	70f28552-7645-11e4-94fd-0024d71b10fc	70d66f0c-7645-11e4-898d-0024d71b10fc	1111	\N
cpierce0	Cynthia	Pierce	cpierce0@feedburner.com	8-(752)256-4633	agent	2014-11-27 18:25:34.774321	70f2e880-7645-11e4-898d-0024d71b10fc	70d67916-7645-11e4-9eb0-0024d71b10fc	1111	\N
jmartin0	Janet	Martin	jmartin0@ftc.gov	2-(906)717-1748	agent	2014-11-27 18:25:34.775432	70f3130a-7645-11e4-82f1-0024d71b10fc	70d753b8-7645-11e4-b0f7-0024d71b10fc	1111	\N
rspencer0	Ruby	Spencer	rspencer0@netvibes.com	7-(427)743-1125	agent	2014-11-27 18:25:34.775491	70f314cc-7645-11e4-8fac-0024d71b10fc	70d7032c-7645-11e4-94fd-0024d71b10fc	1111	\N
cwilson0	Charles	Wilson	cwilson0@ft.com	1-(103)123-7222	agent	2014-11-27 18:25:34.77618	70f32e8a-7645-11e4-a8ef-0024d71b10fc	70d7cf64-7645-11e4-a8ef-0024d71b10fc	1111	\N
bberry0	Bruce	Berry	bberry0@surveymonkey.com	2-(976)174-7513	agent	2014-11-27 18:25:34.776934	70f34be0-7645-11e4-b30a-0024d71b10fc	70d7dafe-7645-11e4-9eb0-0024d71b10fc	1111	\N
shunt0	Sandra	Hunt	shunt0@jugem.jp	5-(583)069-1253	agent	2014-11-27 18:25:34.777028	70f351f8-7645-11e4-94fd-0024d71b10fc	70d6d7f8-7645-11e4-8fac-0024d71b10fc	1111	\N
jbowman0	Jeffrey	Bowman	jbowman0@sciencedirect.com	0-(076)923-0647	agent	2014-11-27 18:25:34.788524	70f511dc-7645-11e4-8fac-0024d71b10fc	70d7e35a-7645-11e4-bb49-0024d71b10fc	1111	\N
rrobinson0	Robert	Robinson	rrobinson0@examiner.com	4-(527)745-4858	agent	2014-11-27 18:25:34.788696	70f517cc-7645-11e4-93a4-0024d71b10fc	70d841ec-7645-11e4-b0f7-0024d71b10fc	1111	\N
cmcdonald0	Chris	Mcdonald	cmcdonald0@odnoklassniki.ru	4-(499)415-5019	agent	2014-11-27 18:25:34.789233	70f52b0e-7645-11e4-b30a-0024d71b10fc	70d876bc-7645-11e4-898d-0024d71b10fc	1111	\N
dryan0	Donald	Ryan	dryan0@sphinn.com	8-(873)344-5031	agent	2014-11-27 18:25:34.790238	70f5534a-7645-11e4-9eb0-0024d71b10fc	70d8abfa-7645-11e4-9eb0-0024d71b10fc	1111	\N
cpayne0	Catherine	Payne	cpayne0@google.com.hk	5-(543)034-5266	agent	2014-11-27 18:25:34.794402	70f5f692-7645-11e4-b0f7-0024d71b10fc	70d84c1e-7645-11e4-93a4-0024d71b10fc	1111	\N
hward0	Howard	Ward	hward0@php.net	5-(365)162-4866	agent	2014-11-27 18:25:34.794485	70f5f962-7645-11e4-93a4-0024d71b10fc	70d87e1e-7645-11e4-94fd-0024d71b10fc	1111	\N
jturner0	Joshua	Turner	jturner0@webmd.com	9-(814)975-5611	agent	2014-11-27 18:25:34.794823	70f6063c-7645-11e4-a8ef-0024d71b10fc	70d96090-7645-11e4-bb49-0024d71b10fc	1111	\N
cfoster0	Charles	Foster	cfoster0@myspace.com	1-(875)438-1724	agent	2014-11-27 18:25:34.794901	70f60966-7645-11e4-b30a-0024d71b10fc	70d8ea48-7645-11e4-8fac-0024d71b10fc	1111	\N
kknight0	Karen	Knight	kknight0@answers.com	4-(310)863-6983	agent	2014-11-27 18:25:34.795345	70f61ab4-7645-11e4-82f1-0024d71b10fc	70d97a6c-7645-11e4-82f1-0024d71b10fc	1111	\N
jgray0	Jeremy	Gray	jgray0@usda.gov	9-(327)091-4858	agent	2014-11-27 18:25:34.797075	70f663ac-7645-11e4-bb49-0024d71b10fc	70d986b0-7645-11e4-93a4-0024d71b10fc	1111	\N
ljackson0	Louis	Jackson	ljackson0@quantcast.com	0-(657)295-1298	agent	2014-11-27 18:25:34.799856	70f6cb44-7645-11e4-b0f7-0024d71b10fc	70d9938a-7645-11e4-94fd-0024d71b10fc	1111	\N
vrobinson0	Victor	Robinson	vrobinson0@globo.com	6-(670)643-0418	agent	2014-11-27 18:25:34.800334	70f6dcce-7645-11e4-9eb0-0024d71b10fc	70d9f1e0-7645-11e4-8fac-0024d71b10fc	1111	\N
jmendoza0	Janice	Mendoza	jmendoza0@walmart.com	5-(752)550-6153	agent	2014-11-27 18:25:34.800559	70f6e674-7645-11e4-94fd-0024d71b10fc	70db0986-7645-11e4-a8ef-0024d71b10fc	1111	\N
amccoy0	Alice	Mccoy	amccoy0@arizona.edu	1-(083)607-7579	agent	2014-11-27 18:25:34.800596	70f6e71e-7645-11e4-82f1-0024d71b10fc	70db12dc-7645-11e4-93a4-0024d71b10fc	1111	\N
tscott0	Terry	Scott	tscott0@narod.ru	2-(734)776-3183	agent	2014-11-27 18:25:34.800807	70f6eeb2-7645-11e4-8fac-0024d71b10fc	70db23b2-7645-11e4-898d-0024d71b10fc	1111	\N
tcarr0	Theresa	Carr	tcarr0@mit.edu	9-(086)176-0278	agent	2014-11-27 18:25:34.802791	70f747ae-7645-11e4-bb49-0024d71b10fc	70db1ac0-7645-11e4-bb49-0024d71b10fc	1111	\N
tfuller0	Timothy	Fuller	tfuller0@dot.gov	1-(265)698-8309	agent	2014-11-27 18:25:34.805334	70f7a2a8-7645-11e4-93a4-0024d71b10fc	70db2b50-7645-11e4-8fac-0024d71b10fc	1111	\N
lgreene0	Lori	Greene	lgreene0@moonfruit.com	1-(439)831-1805	agent	2014-11-27 18:25:34.805643	70f7ae92-7645-11e4-82f1-0024d71b10fc	70dc0584-7645-11e4-bb49-0024d71b10fc	1111	\N
dmyers0	Denise	Myers	dmyers0@deviantart.com	0-(092)687-7054	agent	2014-11-27 18:25:34.80579	70f7b3b0-7645-11e4-b0f7-0024d71b10fc	70dba120-7645-11e4-a8ef-0024d71b10fc	1111	\N
jholmes0	Jason	Holmes	jholmes0@google.nl	6-(645)112-3490	agent	2014-11-27 18:25:34.815547	70f92fa6-7645-11e4-b0f7-0024d71b10fc	70dd4368-7645-11e4-a8ef-0024d71b10fc	1111	\N
mbrooks0	Mildred	Brooks	mbrooks0@utexas.edu	3-(677)594-2333	agent	2014-11-27 18:25:34.821334	70fa11c8-7645-11e4-b0f7-0024d71b10fc	70ded91c-7645-11e4-898d-0024d71b10fc	1111	\N
lmorrison0	Lori	Morrison	lmorrison0@sciencedirect.com	6-(380)184-8898	agent	2014-11-27 18:25:34.831194	70fb9782-7645-11e4-b0f7-0024d71b10fc	70e0cd80-7645-11e4-82f1-0024d71b10fc	1111	\N
sholmes0	Sarah	Holmes	sholmes0@si.edu	9-(213)027-2714	agent	2014-11-27 18:25:34.807774	70f8066c-7645-11e4-bb49-0024d71b10fc	70dc193e-7645-11e4-8fac-0024d71b10fc	1111	\N
kwilliamson0	Kevin	Williamson	kwilliamson0@feedburner.com	7-(855)955-2729	agent	2014-11-27 18:25:34.812518	70f8b9b8-7645-11e4-bb49-0024d71b10fc	70dc6df8-7645-11e4-a8ef-0024d71b10fc	1111	\N
pstanley0	Phyllis	Stanley	pstanley0@japanpost.jp	7-(240)683-5527	agent	2014-11-27 18:25:34.81763	70f98140-7645-11e4-bb49-0024d71b10fc	70ddfba0-7645-11e4-8fac-0024d71b10fc	1111	\N
jstevens0	Jimmy	Stevens	jstevens0@myspace.com	3-(671)812-9423	agent	2014-11-27 18:25:34.823125	70fa56c4-7645-11e4-bb49-0024d71b10fc	70df4eec-7645-11e4-a8ef-0024d71b10fc	1111	\N
psmith0	Philip	Smith	psmith0@sbwire.com	8-(181)459-8794	agent	2014-11-27 18:25:34.83357	70fbf2f4-7645-11e4-bb49-0024d71b10fc	70e0e7fc-7645-11e4-94fd-0024d71b10fc	1111	\N
palvarez0	Paula	Alvarez	palvarez0@ca.gov	5-(868)585-8452	agent	2014-11-27 18:25:34.844461	70fd99a6-7645-11e4-bb49-0024d71b10fc	70e347c2-7645-11e4-b0f7-0024d71b10fc	1111	\N
dnichols0	Douglas	Nichols	dnichols0@marriott.com	6-(545)513-0755	agent	2014-11-27 18:25:34.867013	7101100e-7645-11e4-bb49-0024d71b10fc	70e4154e-7645-11e4-8fac-0024d71b10fc	1111	\N
dwallace0	Diana	Wallace	dwallace0@alexa.com	9-(051)778-7053	agent	2014-11-27 18:25:34.810198	70f863f0-7645-11e4-898d-0024d71b10fc	70dc2dd4-7645-11e4-93a4-0024d71b10fc	1111	\N
vgeorge0	Victor	George	vgeorge0@mail.ru	6-(378)579-0832	agent	2014-11-27 18:25:34.820854	70f9fecc-7645-11e4-898d-0024d71b10fc	70de4dd0-7645-11e4-93a4-0024d71b10fc	1111	\N
jmartinez0	Julia	Martinez	jmartinez0@yellowpages.com	6-(278)200-6124	agent	2014-11-27 18:25:34.830749	70fb8616-7645-11e4-898d-0024d71b10fc	70dfdc4a-7645-11e4-9eb0-0024d71b10fc	1111	\N
tburns0	Tina	Burns	tburns0@weather.com	2-(490)348-5021	agent	2014-11-27 18:25:34.83582	70fc4952-7645-11e4-898d-0024d71b10fc	70e0e0a4-7645-11e4-b0f7-0024d71b10fc	1111	\N
radams0	Russell	Adams	radams0@cnet.com	2-(105)426-8335	agent	2014-11-27 18:25:34.810365	70f86a4e-7645-11e4-b30a-0024d71b10fc	70dc0fac-7645-11e4-b30a-0024d71b10fc	1111	\N
croberts0	Cheryl	Roberts	croberts0@springer.com	9-(052)134-3221	agent	2014-11-27 18:25:34.820976	70fa0386-7645-11e4-b30a-0024d71b10fc	70dda38a-7645-11e4-898d-0024d71b10fc	1111	\N
kjones0	Kevin	Jones	kjones0@dropbox.com	4-(963)017-4367	agent	2014-11-27 18:25:34.826039	70facdd4-7645-11e4-b30a-0024d71b10fc	70dfd204-7645-11e4-bb49-0024d71b10fc	1111	\N
mbradley0	Michael	Bradley	mbradley0@macromedia.com	1-(576)996-7311	agent	2014-11-27 18:25:34.837176	70fc80e8-7645-11e4-b30a-0024d71b10fc	70e13bd0-7645-11e4-8fac-0024d71b10fc	1111	\N
atucker0	Amy	Tucker	atucker0@weebly.com	3-(432)677-5026	agent	2014-11-27 18:25:34.840871	70fd0f18-7645-11e4-b30a-0024d71b10fc	70e2ffa6-7645-11e4-82f1-0024d71b10fc	1111	\N
rrodriguez0	Robin	Rodriguez	rrodriguez0@telegraph.co.uk	8-(920)937-2557	agent	2014-11-27 18:25:34.851753	70feb84a-7645-11e4-b30a-0024d71b10fc	70e3a9d8-7645-11e4-b30a-0024d71b10fc	1111	\N
mlane0	Matthew	Lane	mlane0@unesco.org	1-(357)898-4511	agent	2014-11-27 18:25:34.875511	71025824-7645-11e4-b30a-0024d71b10fc	70e48132-7645-11e4-82f1-0024d71b10fc	1111	\N
khenry0	Katherine	Henry	khenry0@ycombinator.com	6-(435)382-7529	agent	2014-11-27 18:25:34.811468	70f88e5c-7645-11e4-82f1-0024d71b10fc	70dcd158-7645-11e4-898d-0024d71b10fc	1111	\N
kperkins0	Katherine	Perkins	kperkins0@gnu.org	9-(475)201-9254	agent	2014-11-27 18:25:34.826706	70fae7d8-7645-11e4-82f1-0024d71b10fc	70e024c0-7645-11e4-a8ef-0024d71b10fc	1111	\N
bcarr0	Benjamin	Carr	bcarr0@gravatar.com	2-(145)585-3752	agent	2014-11-27 18:25:34.833728	70fbf920-7645-11e4-82f1-0024d71b10fc	70e0d7da-7645-11e4-a8ef-0024d71b10fc	1111	\N
rward0	Ralph	Ward	rward0@tumblr.com	0-(894)420-9984	agent	2014-11-27 18:25:34.838767	70fcbd10-7645-11e4-82f1-0024d71b10fc	70e23670-7645-11e4-b0f7-0024d71b10fc	1111	\N
cpalmer0	Craig	Palmer	cpalmer0@dagondesign.com	6-(668)231-6948	agent	2014-11-27 18:25:34.843603	70fd7782-7645-11e4-82f1-0024d71b10fc	70e30582-7645-11e4-bb49-0024d71b10fc	1111	\N
ahudson0	Anna	Hudson	ahudson0@nyu.edu	9-(228)024-6340	agent	2014-11-27 18:25:34.849246	70fe567a-7645-11e4-82f1-0024d71b10fc	70e3a154-7645-11e4-82f1-0024d71b10fc	1111	\N
wgray0	William	Gray	wgray0@buzzfeed.com	0-(283)667-0376	agent	2014-11-27 18:25:34.884036	7103a9cc-7645-11e4-82f1-0024d71b10fc	70e4a2e8-7645-11e4-9eb0-0024d71b10fc	1111	\N
jmontgomery0	Jacqueline	Montgomery	jmontgomery0@umn.edu	9-(221)171-2445	agent	2014-11-27 18:25:34.812424	70f8b3dc-7645-11e4-8fac-0024d71b10fc	70dcc8de-7645-11e4-b0f7-0024d71b10fc	1111	\N
rsimmons0	Richard	Simmons	rsimmons0@webs.com	4-(430)961-8020	agent	2014-11-27 18:25:34.817717	70f98424-7645-11e4-8fac-0024d71b10fc	70dd9a84-7645-11e4-82f1-0024d71b10fc	1111	\N
sruiz0	Sean	Ruiz	sruiz0@hp.com	8-(870)229-1580	agent	2014-11-27 18:25:34.828108	70fb1f6e-7645-11e4-8fac-0024d71b10fc	70e00094-7645-11e4-b30a-0024d71b10fc	1111	\N
bwelch0	Brian	Welch	bwelch0@theglobeandmail.com	9-(490)244-6679	agent	2014-11-27 18:25:34.848858	70fe45f4-7645-11e4-8fac-0024d71b10fc	70e30e2e-7645-11e4-9eb0-0024d71b10fc	1111	\N
lmitchell0	Louis	Mitchell	lmitchell0@disqus.com	7-(009)916-0093	agent	2014-11-27 18:25:34.815476	70f92d4e-7645-11e4-a8ef-0024d71b10fc	70dcda40-7645-11e4-8fac-0024d71b10fc	1111	\N
rjackson0	Russell	Jackson	rjackson0@twitpic.com	9-(305)924-8487	agent	2014-11-27 18:25:34.826033	70facdd4-7645-11e4-a8ef-0024d71b10fc	70dfaea0-7645-11e4-898d-0024d71b10fc	1111	\N
arose0	Albert	Rose	arose0@com.com	8-(416)176-4702	agent	2014-11-27 18:25:34.815763	70f93668-7645-11e4-9eb0-0024d71b10fc	70dd4b1a-7645-11e4-9eb0-0024d71b10fc	1111	\N
dfranklin0	Debra	Franklin	dfranklin0@yale.edu	9-(597)556-1158	agent	2014-11-27 18:25:34.821404	70fa145c-7645-11e4-9eb0-0024d71b10fc	70de5686-7645-11e4-9eb0-0024d71b10fc	1111	\N
dmccoy0	Denise	Mccoy	dmccoy0@yelp.com	4-(418)172-7683	agent	2014-11-27 18:25:34.831251	70fb9a48-7645-11e4-9eb0-0024d71b10fc	70e0626e-7645-11e4-898d-0024d71b10fc	1111	\N
dromero0	Donna	Romero	dromero0@blinklist.com	6-(822)393-7494	agent	2014-11-27 18:25:34.841064	70fd1472-7645-11e4-9eb0-0024d71b10fc	70e2414c-7645-11e4-94fd-0024d71b10fc	1111	\N
mpeters0	Melissa	Peters	mpeters0@cafepress.com	2-(860)689-8503	agent	2014-11-27 18:25:34.862395	710057ae-7645-11e4-9eb0-0024d71b10fc	70e40d9c-7645-11e4-9eb0-0024d71b10fc	1111	\N
bboyd0	Beverly	Boyd	bboyd0@51.la	6-(873)439-7379	agent	2014-11-27 18:25:34.825603	70fabc18-7645-11e4-94fd-0024d71b10fc	70dee3b2-7645-11e4-b0f7-0024d71b10fc	1111	\N
cprice0	Carlos	Price	cprice0@statcounter.com	4-(296)330-6713	agent	2014-11-27 18:25:34.837299	70fc858e-7645-11e4-94fd-0024d71b10fc	70e22e1e-7645-11e4-bb49-0024d71b10fc	1111	\N
jburke0	Joe	Burke	jburke0@senate.gov	3-(501)585-4634	agent	2014-11-27 18:25:34.855139	70ff3dba-7645-11e4-94fd-0024d71b10fc	70e40630-7645-11e4-b0f7-0024d71b10fc	1111	\N
nphillips0	Nicholas	Phillips	nphillips0@nhs.uk	6-(568)963-1951	agent	2014-11-27 18:25:34.874084	71022476-7645-11e4-94fd-0024d71b10fc	70e46058-7645-11e4-b30a-0024d71b10fc	1111	\N
krussell0	Kathy	Russell	krussell0@ed.gov	0-(855)891-4804	agent	2014-11-27 18:25:34.879291	7102f2ca-7645-11e4-94fd-0024d71b10fc	70e49cc6-7645-11e4-b0f7-0024d71b10fc	1111	\N
dflores0	Diane	Flores	dflores0@bbb.org	1-(657)240-0845	agent	2014-11-27 18:25:34.88444	7103bc28-7645-11e4-94fd-0024d71b10fc	70e4a914-7645-11e4-93a4-0024d71b10fc	1111	\N
jjones0	Justin	Jones	jjones0@cpanel.net	5-(505)111-4704	agent	2014-11-27 18:25:34.836902	70fc74cc-7645-11e4-93a4-0024d71b10fc	70e22676-7645-11e4-82f1-0024d71b10fc	1111	\N
gperkins0	Gregory	Perkins	gperkins0@engadget.com	7-(432)165-8773	agent	2014-11-27 18:25:34.84197	70fd3718-7645-11e4-93a4-0024d71b10fc	70e34f7e-7645-11e4-93a4-0024d71b10fc	1111	\N
\.


--
-- Name: addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: events_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: public; Type: ACL; Schema: -; Owner: -
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

