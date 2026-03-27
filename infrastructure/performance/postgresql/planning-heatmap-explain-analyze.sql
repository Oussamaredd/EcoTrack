\set zone_id '''' :zone_id ''''
\set lookback_start '''' :lookback_start ''''

explain (analyze, buffers, verbose)
select
  c.id as container_id,
  c.code,
  c.label,
  c.status,
  c.zone_id,
  z.name as zone_name,
  c.latitude,
  c.longitude,
  c.fill_level_percent as fallback_fill_level_percent,
  mr.average_fill_level_percent,
  mr.fill_level_delta_percent,
  mr.sensor_health_score,
  mr.window_end
from core.containers c
left join core.zones z on c.zone_id = z.id
left join iot.measurement_rollups_10m mr on mr.container_id = c.id
where (
    mr.window_end is null
    or mr.window_end >= cast(:lookback_start as timestamptz)
  )
  and (:zone_id = '' or c.zone_id = cast(:zone_id as uuid))
order by mr.window_end desc nulls last, c.updated_at desc
limit 2000;
