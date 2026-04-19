import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { MasterPortfolioManager } from "@/components/master-portfolio-manager";
import { MasterServicesManager } from "@/components/master-services-manager";
import { createMasterIfNotExists } from "@/lib/auth/service";
import { requireUserRole } from "@/lib/auth/server";
import { getPortfolioDashboardData, resolveMasterProfile } from "@/lib/portfolio-service";

export default async function MasterProfilePage() {
  noStore();
  await createMasterIfNotExists();
  const master = await requireUserRole("master", "/login");
  const portfolioData = await getPortfolioDashboardData(master.id);
  const profile = resolveMasterProfile(master, portfolioData.profile);

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel master-hero master-profile-hero">
          <div className="master-hero__copy">
            <div className="master-hero__header">
              <span className="eyebrow master-hero__label">Управление профилем</span>
              <div className="master-hero__actions">
                <Link className="ghost-button" href="/master/dashboard">
                  Назад в кабинет
                </Link>
                <Link className="ghost-button" href="/">
                  На главную
                </Link>
                <form action={logoutAction}>
                  <button className="ghost-button" type="submit">
                    Выйти
                  </button>
                </form>
              </div>
            </div>
            <h1 className="page-title">Профиль мастера</h1>
            <p className="lead">
              Редактируйте информацию, портфолио и прайс, которые видит клиент на главной странице.
            </p>
            <div className="master-dashboard-nav">
              <a className="ghost-button" href="#about-manager">
                О мастере
              </a>
              <a className="ghost-button" href="#portfolio-manager">
                Портфолио
              </a>
              <a className="ghost-button" href="#services-manager">
                Прайс
              </a>
            </div>
          </div>
        </section>

        <section className="master-profile-overview section-space">
          <article className="panel stack-card">
            <span className="eyebrow">Профиль</span>
            <div className="stat section-space">
              <strong>{profile.display_name || master.nickname || "Без имени"}</strong>
              <span className="muted">отображается в hero и блоке «О мастере»</span>
            </div>
          </article>
          <a className="master-profile-preview-card master-profile-preview-card--link" href="#portfolio-manager">
            <span className="eyebrow">Портфолио</span>
            <strong>{portfolioData.items.length}</strong>
            <span className="muted">работ на публичной странице</span>
          </a>
          <a className="master-profile-preview-card master-profile-preview-card--link" href="#services-manager">
            <span className="eyebrow">Прайс</span>
            <strong>{portfolioData.services.length}</strong>
            <span className="muted">услуг доступны клиентам</span>
          </a>
        </section>

        <div className="section-space" id="about-manager">
          <MasterPortfolioManager
            certificates={portfolioData.certificates}
            items={portfolioData.items}
            profile={profile}
          />
        </div>

        <div className="section-space">
          <MasterServicesManager services={portfolioData.services} />
        </div>
      </div>
    </main>
  );
}
