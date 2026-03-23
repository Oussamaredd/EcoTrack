import { ArrowRight, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminCenterPanel() {
  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel-header">
        <h2>Admin center</h2>
        <p>Configuration and governance tools are kept separate from daily operations.</p>
      </header>

      <ul className="dashboard-ticket-feed">
        <li className="dashboard-ticket-item">
          <div className="dashboard-ticket-details">
            <p className="dashboard-ticket-name">User administration</p>
            <p className="dashboard-ticket-meta">Manage user status and role assignments.</p>
          </div>
          <Link to="/app/admin" className="dashboard-ticket-status dashboard-ticket-status-open">
            <Users size={14} aria-hidden="true" /> Open
          </Link>
        </li>
        <li className="dashboard-ticket-item">
          <div className="dashboard-ticket-details">
            <p className="dashboard-ticket-name">Audit and system settings</p>
            <p className="dashboard-ticket-meta">Review audit history and update platform defaults.</p>
          </div>
          <Link to="/app/admin" className="dashboard-ticket-status dashboard-ticket-status-progress">
            <Shield size={14} aria-hidden="true" /> Open
          </Link>
        </li>
      </ul>

      <p>
        <Link to="/app/admin" className="dashboard-ticket-meta">
          Go to Admin Center <ArrowRight size={14} aria-hidden="true" style={{ verticalAlign: "text-bottom" }} />
        </Link>
      </p>
    </article>
  );
}
