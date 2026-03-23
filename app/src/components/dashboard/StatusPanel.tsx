const COUNT_FORMATTER = new Intl.NumberFormat("en-US");

export default function StatusPanel({
  statusBreakdown,
  total,
}: {
  statusBreakdown: Array<{ key: string; label: string; count: number }>;
  total: number;
}) {
  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <h2>Status distribution</h2>
        <p>Current workload by ticket state</p>
      </header>

      {statusBreakdown.length === 0 ? (
        <p className="dashboard-empty-state">No status data available yet.</p>
      ) : (
        <ul className="dashboard-status-list">
          {statusBreakdown.map((status) => {
            const widthPercent = total > 0 ? Math.round((status.count / total) * 100) : 0;
            const safeWidth = status.count > 0 ? Math.max(8, widthPercent) : 0;

            return (
              <li key={status.key} className="dashboard-status-item">
                <div className="dashboard-status-row">
                  <span>{status.label}</span>
                  <span>{COUNT_FORMATTER.format(status.count)}</span>
                </div>
                <div className="dashboard-status-track" aria-hidden="true">
                  <span style={{ width: `${safeWidth}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
