CREATE TABLE contacts_duplicate_clusters (
  contact uuid REFERENCES contacts(id),
  cluster int,
  PRIMARY KEY (contact, cluster)
);

CREATE INDEX contacts_duplicate_clusters_contact_idx ON contacts_duplicate_clusters (contact);
CREATE INDEX contacts_duplicate_clusters_cluster_idx ON contacts_duplicate_clusters (cluster);

CREATE SEQUENCE contact_duplicate_cluster_seq;
