\set zone_id '''' :zone_id ''''

explain (analyze, buffers, verbose)
select
  zcs.zone_id,
  z.name as zone_name,
  zcs.latest_aggregate_id,
  zcs.window_start,
  zcs.window_end,
  zcs.measurements_count,
  zcs.average_fill_level_percent,
  zcs.min_fill_level_percent,
  zcs.max_fill_level_percent,
  zcs.high_fill_count,
  zcs.trend_slope_per_hour,
  zcs.schema_version,
  zcs.updated_at
from analytics.zone_current_state zcs
inner join core.zones z on zcs.zone_id = z.id
where (:zone_id = '' or zcs.zone_id = cast(:zone_id as uuid))
order by zcs.updated_at desc
limit 20;
