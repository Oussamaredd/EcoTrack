const COUNT_FORMATTER = new Intl.NumberFormat("en-US");

const formatDayLabel = (dateKey: string) => {
  const parsedDate = new Date(dateKey);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString("en-US", { weekday: "short" });
};

export default function ActivityPanel({
  recentActivity,
  peakActivity,
}: {
  recentActivity: Array<{ date: string; created: number; updated: number }>;
  peakActivity: number;
}) {
  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <h2>7-day activity</h2>
        <p>Created vs updated ticket volume</p>
      </header>

      {recentActivity.length === 0 ? (
        <p className="dashboard-empty-state">
          No tracked activity in the last week.
        </p>
      ) : (
        <>
          <ul
            className="dashboard-activity-chart"
            aria-label="Ticket activity chart for the last seven days"
          >
            {recentActivity.map((item) => {
              const createdHeight =
                item.created > 0
                  ? Math.max(14, Math.round((item.created / peakActivity) * 100))
                  : 8;
              const updatedHeight =
                item.updated > 0
                  ? Math.max(14, Math.round((item.updated / peakActivity) * 100))
                  : 8;

              return (
                <li key={item.date} className="dashboard-activity-day">
                  <span className="dashboard-activity-label">
                    {formatDayLabel(item.date)}
                  </span>
                  <div className="dashboard-activity-bars" aria-hidden="true">
                    <span
                      className="dashboard-activity-bar dashboard-activity-bar-created"
                      style={{ height: `${createdHeight}%` }}
                    />
                    <span
                      className="dashboard-activity-bar dashboard-activity-bar-updated"
                      style={{ height: `${updatedHeight}%` }}
                    />
                  </div>
                  <span className="dashboard-activity-total">
                    {COUNT_FORMATTER.format(item.created + item.updated)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="dashboard-legend">
            <span>
              <i className="dashboard-legend-dot dashboard-legend-created" />
              Created
            </span>
            <span>
              <i className="dashboard-legend-dot dashboard-legend-updated" />
              Updated
            </span>
          </div>
        </>
      )}
    </article>
  );
}
