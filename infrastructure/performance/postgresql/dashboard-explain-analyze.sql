\set start_date '''' :start_date ''''

explain (analyze, buffers, verbose)
select
  created_at,
  updated_at
from support.tickets
where created_at >= cast(:start_date as timestamptz)
   or updated_at >= cast(:start_date as timestamptz);

explain (analyze, buffers, verbose)
select
  id,
  title,
  status,
  support_category,
  created_at,
  updated_at
from support.tickets
order by created_at desc
limit 10;
