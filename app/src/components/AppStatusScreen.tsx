import BrandLogo from './branding/BrandLogo';

type AppStatusScreenProps = {
  title: string;
  message: string;
};

export default function AppStatusScreen({ title, message }: AppStatusScreenProps) {
  return (
    <section className="app-status-screen" aria-live="polite">
      <div className="app-status-card">
        <div className="app-status-brand">
          <BrandLogo imageClassName="app-status-logo" textClassName="app-status-wordmark" />
        </div>
        <span className="auth-status-spinner app-status-spinner" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </section>
  );
}
