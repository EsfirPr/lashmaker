import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { HorizontalScrollGallery } from "@/components/horizontal-scroll-gallery";
import { PortfolioGallery } from "@/components/portfolio-gallery";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getLandingCertificates,
  getLandingMasterProfile,
  getLandingPortfolioItems,
  getLandingServices
} from "@/lib/portfolio-service";

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

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

function formatServicePrice(price: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(price);
}

function getServiceBookingHref(userRole: "master" | "client" | null, style: string): Route {
  const params = new URLSearchParams({
    style
  });

  if (userRole === "master") {
    return `/master/dashboard/bookings/new?${params.toString()}` as Route;
  }

  if (userRole === "client") {
    return `/account?${params.toString()}#new-booking` as Route;
  }

  return "/register" as Route;
}

export default async function HomePage() {
  noStore();
  const [userResult, profileResult, portfolioResult, certificateResult, servicesResult] = await Promise.allSettled([
    getCurrentUser(),
    getLandingMasterProfile(),
    getLandingPortfolioItems(),
    getLandingCertificates(),
    getLandingServices()
  ]);
  const user = getSettledValue(userResult, null);
  const profile = getSettledValue(profileResult, null);
  const portfolioItems = getSettledValue(portfolioResult, []);
  const certificates = getSettledValue(certificateResult, []);
  const services = getSettledValue(servicesResult, []);
  const primaryCta = getPrimaryCta(user?.role || null);
  const headerCta = getHeaderCta(user?.role || null);
  const masterName = profile?.display_name || "Sulamita";
  const heroHeadline =
    profile?.headline ||
    "Наращивание ресниц, которое подчёркивает взгляд и не спорит с вашим стилем";
  const yearsExperience = profile?.years_experience ?? 3;
  const lashExperienceYears = profile?.lash_experience_years ?? 2;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <div className="brand">LashMaker</div>
          <div className="nav-links">
            <a className="header-phone" href="tel:+79998886655">
              +7 (999) 888 66-55
            </a>
            <Link className="ghost-button" href={headerCta}>
              {user ? "Кабинет" : "Войти"}
            </Link>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="panel landing-hero__copy">
            <span className="eyebrow">О мастере</span>
            <h1>{masterName}</h1>
            <p className="lead">
              {heroHeadline}
            </p>
            <div className="landing-bottom">
              <div className="stats-grid landing-stats">
                <div className="stat">
                  <strong>{yearsExperience}+</strong>
                  <span className="muted">лет деликатной практики</span>
                </div>
                <div className="stat">
                  <strong>{lashExperienceYears}+</strong>
                  <span className="muted">время наращивания</span>
                </div>
              </div>
              <div className="landing-actions">
                <Link className="button" href={primaryCta.href}>
                  {primaryCta.label}
                </Link>
                <a className="ghost-button" href="#portfolio">
                  Смотреть работы
                </a>
              </div>
            </div>
          </div>

          <aside className="panel landing-hero__aside">
            <div className="landing-hero__image master-image">
              <img
                alt={masterName}
                className="landing-hero__img"
                src={profile?.avatar_url || "/images/master-placeholder.svg"}
              />
            </div>
          </aside>
        </section>

        <section className="panel landing-section section-space" id="portfolio">
          <div className="landing-section__heading">
            <div className="landing-section__title-wrap">
              <span className="eyebrow">Портфолио</span>
              <h2 className="landing-section__title-nowrap">Работы мастера</h2>
            </div>
          </div>
          <div className="section-space">
            <PortfolioGallery items={portfolioItems} />
          </div>
        </section>

        {services.length > 0 ? (
          <section className="panel landing-section pricing-section section-space" id="pricing">
            <div className="landing-section__heading">
              <div>
                <span className="eyebrow">Прайс</span>
                <h2>Услуги и цены</h2>
                <p className="pricing-section__subtitle muted">
                  Прозрачные цены без скрытых доплат и с понятным объёмом работы.
                </p>
              </div>
            </div>
            <div className="services-list section-space">
              {services.map((service) => (
                <article className="service-row" key={service.id}>
                  <div className="service-row__content">
                    <div className="service-row__top">
                      <strong>{service.name}</strong>
                      {service.duration ? <span className="muted">{service.duration}</span> : null}
                    </div>
                    {service.description ? <p className="muted">{service.description}</p> : null}
                  </div>
                  <div className="service-row__side">
                    <strong className="service-row__price">{formatServicePrice(service.price)}</strong>
                    <Link
                      className="ghost-button service-row__cta"
                      href={getServiceBookingHref(user?.role || null, service.name)}
                    >
                      Записаться
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

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
            <div className="certificates-gallery section-space">
              {certificates.length > 0 ? (
                <HorizontalScrollGallery className="certificates-list" showAffordance>
                  {certificates.map((certificate) => (
                    <article className="certificate-card" key={certificate.id}>
                      <img alt="Сертификат мастера" src={certificate.image_url} />
                    </article>
                  ))}
                </HorizontalScrollGallery>
              ) : (
                <p className="muted">Сертификаты скоро появятся.</p>
              )}
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
              ) : null}
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
