\set user_id '''' :user_id ''''

explain (analyze, buffers, verbose)
select
  count(*) as reports_submitted
from incident.citizen_reports
where reporter_user_id = cast(:user_id as uuid);

explain (analyze, buffers, verbose)
select
  count(*) as reports_resolved
from incident.citizen_reports
where reporter_user_id = cast(:user_id as uuid)
  and status = 'resolved';

explain (analyze, buffers, verbose)
select
  id,
  container_id,
  status,
  description,
  photo_url,
  reported_at
from incident.citizen_reports
where reporter_user_id = cast(:user_id as uuid)
order by reported_at desc
limit 20;
