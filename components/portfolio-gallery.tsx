import type { PortfolioItem } from "@/lib/types";
import { HorizontalScrollGallery } from "@/components/horizontal-scroll-gallery";

type PortfolioGalleryProps = {
  items: PortfolioItem[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function PortfolioGallery({
  items,
  emptyTitle = "Портфолио скоро появится",
  emptyDescription = "Здесь будут собраны свежие работы мастера, чтобы можно было выбрать стиль и настроение для записи."
}: PortfolioGalleryProps) {
  if (items.length === 0) {
    return (
      <div className="account-empty portfolio-empty">
        <div className="account-empty__icon">P</div>
        <h3>{emptyTitle}</h3>
        <p className="empty-state">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <HorizontalScrollGallery className="portfolio-grid" showAffordance>
      {items.map((item) => (
        <article className="portfolio-card" key={item.id}>
          <div className="portfolio-card__image-wrap">
            <img alt={item.caption || "Работа мастера"} className="portfolio-card__image" src={item.image_url} />
          </div>
          <div className="portfolio-card__body">
            <p className="portfolio-card__caption">{item.caption || "Работа без подписи"}</p>
          </div>
        </article>
      ))}
    </HorizontalScrollGallery>
  );
}
