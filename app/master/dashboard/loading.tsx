export default function MasterDashboardLoading() {
  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel master-hero account-loading-block">
          <div className="loading-line loading-line--short" />
          <div className="loading-line loading-line--title" />
          <div className="loading-line loading-line--medium" />
        </section>

        <section className="master-stats-grid section-space">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="panel stack-card account-loading-block" key={index}>
              <div className="loading-line loading-line--short" />
              <div className="loading-line loading-line--medium" />
            </div>
          ))}
        </section>

        <section className="panel stack-card section-space account-loading-block">
          <div className="loading-line loading-line--short" />
          <div className="loading-line loading-line--full" />
          <div className="loading-line loading-line--full" />
          <div className="loading-line loading-line--full" />
        </section>
      </div>
    </main>
  );
}

