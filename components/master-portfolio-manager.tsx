"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  deletePortfolioItemAction,
  saveMasterProfileAction,
  uploadPortfolioItemAction
} from "@/app/master/dashboard/actions";
import type { MasterProfile, PortfolioItem } from "@/lib/types";

type MasterPortfolioManagerProps = {
  items: PortfolioItem[];
  profile: MasterProfile;
};

const initialMasterFormState = {
  status: "idle" as const,
  message: ""
};

export function MasterPortfolioManager({ items, profile }: MasterPortfolioManagerProps) {
  const [profileState, profileAction] = useActionState(saveMasterProfileAction, initialMasterFormState);
  const [uploadState, uploadAction] = useActionState(uploadPortfolioItemAction, initialMasterFormState);
  const uploadFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (uploadState.status === "success") {
      uploadFormRef.current?.reset();
    }
  }, [uploadState.status]);

  return (
    <section className="master-portfolio-stack" id="portfolio-manager">
      <section className="panel stack-card master-section">
        <div className="account-section__heading">
          <div>
            <span className="eyebrow">О мастере</span>
            <h2>Текст для лендинга</h2>
          </div>
        </div>
        <form action={profileAction} className="form-grid section-space">
          <div className="two-columns">
            <div className="field">
              <label htmlFor="displayName">Имя мастера</label>
              <input defaultValue={profile.display_name || ""} id="displayName" name="displayName" />
            </div>
            <div className="field">
              <label htmlFor="yearsExperience">Опыт, лет</label>
              <input
                defaultValue={profile.years_experience ?? ""}
                id="yearsExperience"
                min="0"
                name="yearsExperience"
                type="number"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="headline">Короткий заголовок</label>
            <input
              defaultValue={profile.headline || ""}
              id="headline"
              maxLength={180}
              name="headline"
            />
          </div>
          <div className="field">
            <label htmlFor="bio">Описание</label>
            <textarea defaultValue={profile.bio || ""} id="bio" maxLength={1200} name="bio" />
          </div>
          {profileState.status !== "idle" ? (
            <div className={profileState.status === "error" ? "message-error" : "message-success"}>
              {profileState.message}
            </div>
          ) : null}
          <SubmitButton>Сохранить информацию</SubmitButton>
        </form>
      </section>

      <section className="panel stack-card master-section">
        <div className="account-section__heading">
          <div>
            <span className="eyebrow">Портфолио</span>
            <h2>Управление работами</h2>
          </div>
        </div>
        <form action={uploadAction} className="form-grid section-space" ref={uploadFormRef}>
          <div className="field">
            <label htmlFor="image">Фото работы</label>
            <input accept="image/jpeg,image/png,image/webp" id="image" name="image" required type="file" />
          </div>
          <div className="field">
            <label htmlFor="caption">Подпись</label>
            <input id="caption" maxLength={180} name="caption" placeholder="Например, 2D с мягким лисьим эффектом" />
          </div>
          {uploadState.status !== "idle" ? (
            <div className={uploadState.status === "error" ? "message-error" : "message-success"}>
              {uploadState.message}
            </div>
          ) : null}
          <SubmitButton>Загрузить работу</SubmitButton>
        </form>

        <div className="master-portfolio-list section-space">
          {items.length === 0 ? (
            <p className="empty-state">Портфолио пока пустое. Загрузите первую работу.</p>
          ) : null}
          {items.map((item) => (
            <article className="master-portfolio-item" key={item.id}>
              <div className="master-portfolio-item__image-wrap">
                <img
                  alt={item.caption || "Работа мастера"}
                  className="master-portfolio-item__image"
                  src={item.image_url}
                />
              </div>
              <div className="master-portfolio-item__body">
                <p>{item.caption || "Без подписи"}</p>
                <form action={deletePortfolioItemAction}>
                  <input name="itemId" type="hidden" value={item.id} />
                  <SubmitButton className="danger-button">Удалить</SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
