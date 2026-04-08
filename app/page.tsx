import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { PortfolioGallery } from "@/components/portfolio-gallery";
import { getCurrentUser } from "@/lib/auth/server";
import { getLandingMasterProfile, getLandingPortfolioItems } from "@/lib/portfolio-service";

function getPrimaryCta(userRole: "master" | "client" | null) {
  if (userRole === "master") {
    return {
      href: "/master/dashboard" as Route,
      label: "Кабинет мастера"
    };
  }

  if (userRole === "client") {
    return {
      href: "/account" as Route,
      label: "Личный кабинет"
    };
  }

  return {
    href: "/register" as Route,
    label: "Зарегистрироваться"
  };
}

function getHeaderCta(userRole: "master" | "client" | null): Route {
  if (userRole === "master") {
    return "/master/dashboard";
  }

  if (userRole === "client") {
    return "/account";
  }

  return "/login";
}

export default async function HomePage() {
  noStore();
  const [userResult, profileResult, portfolioResult] = await Promise.allSettled([
    getCurrentUser(),
    getLandingMasterProfile(),
    getLandingPortfolioItems()
  ]);
  const user = userResult.status === "fulfilled" ? userResult.value : null;
  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const portfolioItems = portfolioResult.status === "fulfilled" ? portfolioResult.value : [];
  const primaryCta = getPrimaryCta(user?.role || null);
  const headerCta = getHeaderCta(user?.role || null);
  const masterName = profile?.display_name || "LashMaker";
  const heroHeadline =
    profile?.headline ||
    "Премиальное наращивание ресниц с мягким beauty-сервисом и аккуратным результатом";
  const yearsExperience = profile?.years_experience ?? 3;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <div className="brand">LashMaker</div>
          <div className="nav-links">
            <a className="ghost-button" href="#portfolio">
              Портфолио
            </a>
            <a className="ghost-button" href="#about">
              О мастере
            </a>
            <Link className="ghost-button" href={headerCta}>
              {user ? "Кабинет" : "Войти"}
            </Link>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="panel landing-hero__copy">
            <span className="eyebrow">Lash artist portfolio</span>
            <h1>Наращивание ресниц, которое подчёркивает взгляд и не спорит с вашим стилем.</h1>
            <p className="lead">
              {heroHeadline}
            </p>
            <div className="inline-actions section-space">
              <Link className="button" href={primaryCta.href}>
                {primaryCta.label}
              </Link>
              <a className="ghost-button" href="#portfolio">
                Смотреть работы
              </a>
            </div>
            <div className="stats-grid landing-stats">
              <div className="stat">
                <strong>{yearsExperience}+</strong>
                <span className="muted">лет деликатной практики</span>
              </div>
              <div className="stat">
                <strong>{portfolioItems.length || "0"}</strong>
                <span className="muted">работ в живом портфолио</span>
              </div>
              <div className="stat">
                <strong>1:1</strong>
                <span className="muted">спокойный персональный подход</span>
              </div>
            </div>
          </div>

          <aside className="panel landing-hero__aside">
            <div className="landing-badge-grid">
              <article className="feature">
                <h3>{masterName}</h3>
                <p>Мастер по наращиванию ресниц с аккуратной техникой, чистой посадкой и любовью к естественной эстетике.</p>
              </article>
              <article className="feature">
                <h3>Комфортный сервис</h3>
                <p>Помогу подобрать эффект, длину и изгиб так, чтобы результат оставался выразительным и удобным в носке.</p>
              </article>
            </div>
            <div className="landing-quote section-space">
              <p>
                “Портфолио, запись и кабинет собраны в одном месте: можно посмотреть работы, выбрать удобное окно и сохранить историю визитов.”
              </p>
            </div>
          </aside>
        </section>

        <section className="panel landing-section section-space" id="portfolio">
          <div className="landing-section__heading">
            <div>
              <span className="eyebrow">Портфолио</span>
              <h2>Работы мастера</h2>
            </div>
            <p className="muted">
              Сет лёгких натуральных эффектов, выразительных объемов и аккуратных посадок для повседневных и вечерних образов.
            </p>
          </div>
          <div className="section-space">
            <PortfolioGallery items={portfolioItems} />
          </div>
        </section>

        <section className="landing-about section-space" id="about">
          <section className="panel landing-section">
            <div className="landing-section__heading">
              <div>
                <span className="eyebrow">О мастере</span>
                <h2>{masterName}</h2>
              </div>
            </div>
            <p className="lead">
              {profile?.bio ||
                "Работаю в спокойном темпе, уделяю внимание форме глаза, носибельности и чистоте каждой работы, чтобы результат выглядел дорого и гармонично."}
            </p>
            <div className="feature-grid landing-feature-grid section-space">
              <article className="feature">
                <h3>Подбор под вас</h3>
                <p>Эффект, изгиб и длина подбираются под посадку глаз, привычный макияж и желаемую выразительность.</p>
              </article>
              <article className="feature">
                <h3>Комфортная носка</h3>
                <p>Работаю на результат, который красиво раскрывает взгляд и остаётся удобным в повседневной жизни.</p>
              </article>
              <article className="feature">
                <h3>Чистая техника</h3>
                <p>Аккуратная изоляция и спокойный beauty-процесс помогают получить чистый и премиальный итог.</p>
              </article>
            </div>
          </section>

          <aside className="panel landing-cta">
            <span className="eyebrow">Следующий шаг</span>
            <h2>Запись и история визитов теперь в личном кабинете</h2>
            <p className="muted">
              Авторизуйтесь, чтобы выбрать свободный слот, хранить свои записи и быстро возвращаться к последним визитам.
            </p>
            <div className="landing-cta__actions section-space">
              <Link className="button" href={primaryCta.href}>
                {primaryCta.label}
              </Link>
              {!user ? (
                <Link className="ghost-button" href="/login">
                  Войти
                </Link>
              ) : (
                <a className="ghost-button" href="#portfolio">
                  Смотреть портфолио
                </a>
              )}
            </div>
          </aside>
        </section>

        <footer className="site-footer">
          <Link className="footer-link" href="/privacy">
            Политика конфиденциальности
          </Link>
        </footer>
      </div>
    </main>
  );
}
