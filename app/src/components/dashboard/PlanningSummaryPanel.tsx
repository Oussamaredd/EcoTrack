const COUNT_FORMATTER = new Intl.NumberFormat("en-US");

export default function PlanningSummaryPanel({
  ecoKpis,
}: {
  ecoKpis?: { containers?: number; zones?: number; tours?: number };
}) {
  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <h2>EcoTrack KPIs</h2>
        <p>Containers, zones, and tours tracked by the planning domain.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="dashboard-kpi-card">
          <p className="dashboard-kpi-label">Containers</p>
          <p className="dashboard-kpi-value">
            {COUNT_FORMATTER.format(ecoKpis?.containers ?? 0)}
          </p>
        </div>
        <div className="dashboard-kpi-card">
          <p className="dashboard-kpi-label">Zones</p>
          <p className="dashboard-kpi-value">
            {COUNT_FORMATTER.format(ecoKpis?.zones ?? 0)}
          </p>
        </div>
        <div className="dashboard-kpi-card">
          <p className="dashboard-kpi-label">Tours</p>
          <p className="dashboard-kpi-value">
            {COUNT_FORMATTER.format(ecoKpis?.tours ?? 0)}
          </p>
        </div>
      </div>
    </article>
  );
}
