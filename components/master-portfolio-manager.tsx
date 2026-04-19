"use client";

import type { ChangeEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { HorizontalScrollGallery } from "@/components/horizontal-scroll-gallery";
import { SubmitButton } from "@/components/submit-button";
import {
  deleteMasterCertificateAction,
  deletePortfolioItemAction,
  saveMasterProfileAction,
  uploadMasterAvatarAction,
  uploadMasterCertificatesAction,
  uploadPortfolioItemAction
} from "@/app/master/dashboard/actions";
import type { MasterCertificate, MasterProfile, PortfolioItem } from "@/lib/types";

type MasterPortfolioManagerProps = {
  certificates: MasterCertificate[];
  items: PortfolioItem[];
  profile: MasterProfile;
};

const initialMasterFormState = {
  status: "idle" as const,
  message: ""
};

export function MasterPortfolioManager({
  certificates,
  items,
  profile
}: MasterPortfolioManagerProps) {
  const [profileState, profileAction] = useActionState(saveMasterProfileAction, initialMasterFormState);
  const [avatarState, avatarAction] = useActionState(uploadMasterAvatarAction, initialMasterFormState);
  const [uploadState, uploadAction] = useActionState(uploadPortfolioItemAction, initialMasterFormState);
  const [certificateState, certificateAction] = useActionState(
    uploadMasterCertificatesAction,
    initialMasterFormState
  );
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const avatarFormRef = useRef<HTMLFormElement>(null);
  const certificateFormRef = useRef<HTMLFormElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const certificateObjectUrlsRef = useRef<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [certificatePreviews, setCertificatePreviews] = useState<string[]>([]);

  function clearAvatarPreviewObjectUrl() {
    if (!avatarObjectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(avatarObjectUrlRef.current);
    avatarObjectUrlRef.current = null;
  }

  function clearCertificatePreviewObjectUrls() {
    if (certificateObjectUrlsRef.current.length === 0) {
      return;
    }

    certificateObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    certificateObjectUrlsRef.current = [];
  }

  useEffect(() => {
    if (uploadState.status === "success") {
      uploadFormRef.current?.reset();
    }
  }, [uploadState.status]);

  useEffect(() => {
    if (avatarState.status === "success") {
      avatarFormRef.current?.reset();
      clearAvatarPreviewObjectUrl();
    }
  }, [avatarState.status]);

  useEffect(() => {
    if (certificateState.status === "success") {
      certificateFormRef.current?.reset();
      clearCertificatePreviewObjectUrls();
      setCertificatePreviews([]);
    }
  }, [certificateState.status]);

  useEffect(() => {
    if (!avatarObjectUrlRef.current) {
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile.avatar_url]);

  useEffect(() => {
    return () => {
      clearAvatarPreviewObjectUrl();
      clearCertificatePreviewObjectUrls();
    };
  }, []);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    clearAvatarPreviewObjectUrl();
    const file = event.target.files?.[0];

    if (!file) {
      setAvatarPreview(profile.avatar_url || null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
  }

  function handleCertificateChange(event: ChangeEvent<HTMLInputElement>) {
    clearCertificatePreviewObjectUrls();
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      setCertificatePreviews([]);
      return;
    }

    const previewUrls = files.map((file) => URL.createObjectURL(file));
    certificateObjectUrlsRef.current = previewUrls;
    setCertificatePreviews(previewUrls);
  }

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
          <div className="two-columns">
            <div className="field">
              <label htmlFor="headline">Цитата / короткое описание</label>
              <input
                defaultValue={profile.headline || ""}
                id="headline"
                maxLength={180}
                name="headline"
              />
            </div>
            <div className="field">
              <label htmlFor="lashExperienceYears">Время наращивания</label>
              <input
                defaultValue={profile.lash_experience_years ?? ""}
                id="lashExperienceYears"
                min="0"
                name="lashExperienceYears"
                type="number"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="bio">Описание для блока «О мастере»</label>
            <textarea defaultValue={profile.bio || ""} id="bio" maxLength={1200} name="bio" />
          </div>
          {profileState.status !== "idle" ? (
            <div className={profileState.status === "error" ? "message-error" : "message-success"}>
              {profileState.message}
            </div>
          ) : null}
          <SubmitButton>Сохранить информацию</SubmitButton>
        </form>

        <div className="master-media-grid section-space">
          <div className="master-avatar-card">
            <p className="field__label">Главное фото мастера</p>
            <div className="master-avatar-card__preview">
              <img
                alt={profile.display_name || "Главное фото мастера"}
                className="master-avatar-card__image"
                src={avatarPreview || "/images/master-placeholder.svg"}
              />
            </div>
          </div>

          <form action={avatarAction} className="form-grid master-inline-form" ref={avatarFormRef}>
            <div className="field">
              <label htmlFor="avatar">Обновить аватар</label>
              <input
                accept="image/jpeg,image/png,image/webp"
                id="avatar"
                name="avatar"
                onChange={handleAvatarChange}
                required
                type="file"
              />
            </div>
            {avatarState.status !== "idle" ? (
              <div className={avatarState.status === "error" ? "message-error" : "message-success"}>
                {avatarState.message}
              </div>
            ) : null}
            <SubmitButton>Сохранить фото</SubmitButton>
          </form>
        </div>
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

        {items.length === 0 ? (
          <p className="empty-state section-space">Портфолио пока пустое. Загрузите первую работу.</p>
        ) : (
          <HorizontalScrollGallery className="master-portfolio-list section-space">
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
          </HorizontalScrollGallery>
        )}

        <div className="master-certificates-stack section-space">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Сертификаты</span>
              <h2>Галерея сертификатов</h2>
            </div>
          </div>

          <form action={certificateAction} className="form-grid section-space" ref={certificateFormRef}>
            <div className="field">
              <label htmlFor="certificates">Добавить сертификаты</label>
              <input
                accept="image/jpeg,image/png,image/webp"
                id="certificates"
                multiple
                name="certificates"
                onChange={handleCertificateChange}
                required
                type="file"
              />
            </div>

            {certificatePreviews.length > 0 ? (
              <div className="master-upload-preview-grid">
                {certificatePreviews.map((previewUrl, index) => (
                  <div className="master-upload-preview-grid__item" key={previewUrl}>
                    <img alt={`Предпросмотр сертификата ${index + 1}`} src={previewUrl} />
                  </div>
                ))}
              </div>
            ) : null}

            {certificateState.status !== "idle" ? (
              <div className={certificateState.status === "error" ? "message-error" : "message-success"}>
                {certificateState.message}
              </div>
            ) : null}

            <SubmitButton>Загрузить сертификаты</SubmitButton>
          </form>

          {certificates.length === 0 ? (
            <p className="empty-state">Сертификаты пока не загружены.</p>
          ) : (
            <HorizontalScrollGallery className="master-certificates-list section-space">
              {certificates.map((certificate) => (
                <article className="master-certificate-card" key={certificate.id}>
                  <div className="master-certificate-card__image-wrap">
                    <img
                      alt="Сертификат мастера"
                      className="master-certificate-card__image"
                      src={certificate.image_url}
                    />
                  </div>
                  <div className="master-certificate-card__body">
                    <form action={deleteMasterCertificateAction}>
                      <input name="certificateId" type="hidden" value={certificate.id} />
                      <SubmitButton className="danger-button">Удалить</SubmitButton>
                    </form>
                  </div>
                </article>
              ))}
            </HorizontalScrollGallery>
          )}
        </div>
      </section>
    </section>
  );
}
