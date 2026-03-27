select
  queryid,
  calls,
  round(total_exec_time::numeric, 2) as total_exec_time_ms,
  round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
  rows,
  shared_blks_hit,
  shared_blks_read,
  query
from pg_stat_statements
order by total_exec_time desc
limit 20;
