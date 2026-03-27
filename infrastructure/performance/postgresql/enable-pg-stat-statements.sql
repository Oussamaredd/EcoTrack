create extension if not exists pg_stat_statements;

alter system set shared_preload_libraries = 'pg_stat_statements';
alter system set pg_stat_statements.max = 10000;
alter system set pg_stat_statements.track = all;
select pg_reload_conf();
