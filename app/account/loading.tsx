export default function AccountLoading() {
  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel account-hero account-loading-block">
          <div className="loading-line loading-line--short" />
          <div className="loading-line loading-line--title" />
          <div className="loading-line loading-line--medium" />
        </section>

        <section className="page-columns section-space">
          <div className="panel stack-card account-loading-block">
            <div className="loading-line loading-line--short" />
            <div className="loading-line loading-line--medium" />
            <div className="loading-line loading-line--medium" />
          </div>
          <div className="panel stack-card account-loading-block">
            <div className="loading-line loading-line--short" />
            <div className="loading-line loading-line--medium" />
            <div className="loading-line loading-line--medium" />
          </div>
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

