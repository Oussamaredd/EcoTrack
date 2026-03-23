const formatStatusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";

const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return "No timestamp";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "No timestamp";
  }

  const diffMs = Date.now() - parsedDate.getTime();
  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return `${diffDays}d ago`;
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getTicketStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus === "completed" || normalizedStatus === "closed") {
    return "dashboard-ticket-status-completed";
  }
  if (normalizedStatus === "in_progress") {
    return "dashboard-ticket-status-progress";
  }
  return "dashboard-ticket-status-open";
};

export default function RecentTicketsPanel({
  recentTickets,
}: {
  recentTickets: Array<{
    id: string;
    name: string;
    status: string;
    contextLabel: string;
    lastUpdate: string | null;
  }>;
}) {
  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <h2>Recent ticket activity</h2>
        <p>Latest updates in your workspace</p>
      </header>

      {recentTickets.length === 0 ? (
        <p className="dashboard-empty-state">No recent ticket updates yet.</p>
      ) : (
        <ul className="dashboard-ticket-feed">
          {recentTickets.map((ticket) => (
            <li key={ticket.id} className="dashboard-ticket-item">
              <div className="dashboard-ticket-details">
                <p className="dashboard-ticket-name">{ticket.name}</p>
                <p className="dashboard-ticket-meta">
                  {ticket.contextLabel} - {formatRelativeTime(ticket.lastUpdate)}
                </p>
              </div>
              <span
                className={`dashboard-ticket-status ${getTicketStatusClass(
                  ticket.status,
                )}`}
              >
                {formatStatusLabel(ticket.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
