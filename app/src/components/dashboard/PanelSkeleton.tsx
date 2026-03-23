export default function PanelSkeleton({ title }: { title: string }) {
  return (
    <article className="dashboard-panel" aria-busy="true">
      <header className="dashboard-panel-header">
        <h2>{title}</h2>
        <p>Loading panel data...</p>
      </header>
      <div className="dashboard-panel-skeleton" />
    </article>
  );
}
