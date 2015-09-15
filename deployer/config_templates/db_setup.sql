CREATE USER {pg_worker_username} PASSWORD '{pg_worker_password}';
CREATE USER {pg_web_username} PASSWORD '{pg_web_password}';
CREATE ROLE {pg_worker_groupname};
GRANT {pg_worker_groupname} TO {pg_worker_username};
CREATE DATABASE {database_name} ENCODING = 'UTF8';
GRANT ALL ON DATABASE {database_name} TO {pg_worker_groupname};