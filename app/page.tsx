import { unstable_noStore as noStore } from "next/cache";
import Image from "next/image";
import { DeferredMapEmbed } from "@/components/deferred-map-embed";
import { HorizontalScrollGallery } from "@/components/horizontal-scroll-gallery";
import { PortfolioGallery } from "@/components/portfolio-gallery";
import { ResilientImage } from "@/components/resilient-image";
import { ServiceRowCard } from "@/components/service-row-card";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getLandingCertificates,
  getLandingMasterProfile,
  getLandingPortfolioItems,
  getLandingServices
} from "@/lib/portfolio-service";

const masterAddress = "улица Карла Маркса, 6, Новороссийск, Краснодарский край, 353900";
const encodedMasterAddress = encodeURIComponent(masterAddress);
const yandexMapWidgetSrc = `https://yandex.ru/map-widget/v1/?mode=search&text=${encodedMasterAddress}&z=17`;
const yandexMapPageHref = `https://yandex.ru/maps/?text=${encodedMasterAddress}`;

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function getPrimaryCta(userRole: "master" | "client" | null) {
  if (userRole === "master") {
    return {
      href: "/master/dashboard",
      label: "Кабинет мастера"
    };
  }

  if (userRole === "client") {
    return {
      href: "/account",
      label: "Личный кабинет"
    };
  }

  return {
    href: "/register",
    label: "Зарегистрироваться"
  };
}

function getHeaderCta(userRole: "master" | "client" | null) {
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

function getServiceBookingHref(userRole: "master" | "client" | null, style: string) {
  const params = new URLSearchParams({
    style
  });

  if (userRole === "master") {
    return `/master/dashboard/bookings/new?${params.toString()}`;
  }

  if (userRole === "client") {
    return `/account?${params.toString()}#new-booking`;
  }

  return "/register";
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
  const masterName = profile?.display_name || "Суламита";
  const heroHeadline =
    profile?.headline ||
    "Наращивание ресниц, которое подчеркивает взгляд и не спорит с вашим стилем";

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <div className="brand">LashMaker</div>
          <div className="nav-links">
            <a className="header-phone" href="tel:+79998886655">
              +7 (999) 888 66-55
            </a>
            <a className="ghost-button" href={headerCta}>
              {user ? "Кабинет" : "Войти"}
            </a>
          </div>
        </nav>

        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="panel landing-hero__shell">
            <div className="landing-hero__media">
              <div className="landing-hero__frame">
                <Image
                  alt="Портрет девушки в декоративной стилистике"
                  className="landing-hero__illustration"
                  fill
                  fetchPriority="high"
                  priority
                  quality={65}
                  sizes="(max-width: 960px) 100vw, 54vw"
                  src="/images/lady.webp"
                />
              </div>
            </div>

            <div className="landing-hero__content">
              <div className="landing-hero__intro">
                <span className="eyebrow landing-hero__eyebrow">О мастере</span>
                <div className="landing-hero__headline">
                  <h1 className="landing-hero__title" id="landing-hero-title">
                    {masterName}
                  </h1>
                  <p className="landing-hero__subtitle">slavic stare</p>
                </div>
              </div>

              <div aria-hidden="true" className="landing-hero__divider">
                <img
                  alt=""
                  className="landing-hero__divider-image"
                  height={28}
                  loading="eager"
                  src="/images/line.svg"
                  width={220}
                />
              </div>

              <p className="landing-hero__lead">
                {heroHeadline}
              </p>

              <div className="landing-hero__stats">
                <article className="landing-hero__stat-card">
                  <div className="landing-hero__stat-bird">
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="landing-hero__stat-bird-image"
                      height={144}
                      loading="lazy"
                      sizes="64px"
                      src="/images/cockerel.webp"
                      width={98}
                    />
                  </div>
                  <div className="landing-hero__stat-copy">
                    <strong>1+</strong>
                    <span>лет практики</span>
                  </div>
                </article>

                <article className="landing-hero__stat-card">
                  <div className="landing-hero__stat-bird">
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="landing-hero__stat-bird-image"
                      height={144}
                      loading="lazy"
                      sizes="64px"
                      src="/images/cockerel.webp"
                      width={98}
                    />
                  </div>
                  <div className="landing-hero__stat-copy">
                    <strong>2+</strong>
                    <span>время наращивания</span>
                  </div>
                </article>
              </div>

              <div className="landing-actions landing-hero__actions">
                <a className="button" href={primaryCta.href}>
                  Личный кабинет
                </a>
                <a className="ghost-button" href="#portfolio">
                  Смотреть работы
                </a>
              </div>
            </div>
          </div>
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
                <h2>Какая ты матрешка?</h2>
              </div>
            </div>
            <HorizontalScrollGallery className="services-list section-space" showAffordance>
              {services.map((service) => (
                <ServiceRowCard
                  bookingHref={getServiceBookingHref(user?.role || null, service.name)}
                  formattedPrice={formatServicePrice(service.price)}
                  key={service.id}
                  service={service}
                />
              ))}
            </HorizontalScrollGallery>
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
                      <ResilientImage
                        alt="Сертификат мастера"
                        fallbackSrc="/images/cert-placeholder.svg"
                        src={certificate.image_url}
                      />
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
            <h2>Запись и история визитов в личном кабинете</h2>
            <p className="muted">
              Авторизуйтесь, чтобы выбрать свободный слот, хранить свои записи и быстро возвращаться к последним визитам.
            </p>
            <div className="landing-cta__actions section-space">
              <a className="button" href={primaryCta.href}>
                {primaryCta.label}
              </a>
              {!user ? (
                <a className="ghost-button" href="/login">
                  Войти
                </a>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="panel landing-section section-space contact-map-section" id="location">
          <div className="landing-section__heading">
            <div>
              <span className="eyebrow">Адрес</span>
              <h2>Как нас найти</h2>
            </div>
          </div>

          <div className="contact-map-layout section-space">
            <div className="contact-map-copy">
              <p className="lead">
                Мы находимся в центре Новороссийска. Ниже карта с точкой по адресу, чтобы было проще
                сориентироваться перед визитом.
              </p>
              <div className="contact-map-address">
                <strong>{masterAddress}</strong>
              </div>
              <div className="landing-cta__actions section-space">
                <a
                  className="button"
                  href={yandexMapPageHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Открыть в Яндекс Картах
                </a>
              </div>
            </div>

            <DeferredMapEmbed address={masterAddress} src={yandexMapWidgetSrc} />
          </div>
        </section>

        <footer className="site-footer">
          <a className="footer-link" href="/privacy">
            Политика конфиденциальности
          </a>
        </footer>
      </div>
    </main>
  );
}
