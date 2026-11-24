import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="full-page">
      <div className="card narrow-card">
        <div className="state">
          <h3>Page not found</h3>
          <p>The page you are looking for does not exist.</p>
          <Link className="btn" href="/dashboard">
            Go to the dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
