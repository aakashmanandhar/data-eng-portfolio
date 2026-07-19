GRANT USAGE ON SCHEMA bronze TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA bronze TO readonly_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bronze GRANT SELECT ON TABLES TO readonly_user;

GRANT USAGE ON SCHEMA dbt_dev_gold TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA dbt_dev_gold TO readonly_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dbt_dev_gold GRANT SELECT ON TABLES TO readonly_user;

GRANT USAGE ON SCHEMA dbt_dev_silver TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA dbt_dev_silver TO readonly_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA dbt_dev_silver GRANT SELECT ON TABLES TO readonly_user;