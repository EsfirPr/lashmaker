"use server";

import type { MasterFormState } from "@/app/master/dashboard/state";
import { requireUserRole } from "@/lib/auth/server";
import {
  createMasterService,
  deleteMasterCertificate,
  deletePortfolioItem,
  deleteMasterService,
  deleteMasterServiceImage,
  updateMasterProfile,
  updateMasterService,
  uploadMasterAvatar,
  uploadMasterCertificates,
  uploadPortfolioItem
} from "@/lib/portfolio-service";

export async function saveMasterProfileAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    const yearsValue = String(formData.get("yearsExperience") || "").trim();
    const lashYearsValue = String(formData.get("lashExperienceYears") || "").trim();

    await updateMasterProfile({
      ownerId: master.id,
      displayName: String(formData.get("displayName") || ""),
      headline: String(formData.get("headline") || ""),
      bio: String(formData.get("bio") || ""),
      yearsExperience: yearsValue ? Number(yearsValue) : null,
      lashExperienceYears: lashYearsValue ? Number(lashYearsValue) : null
    });

    return {
      status: "success",
      message: "Информация о мастере обновлена"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось сохранить профиль"
    };
  }
}

export async function uploadMasterAvatarAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File) || avatar.size === 0) {
      return {
        status: "error",
        message: "Выберите фото мастера"
      };
    }

    await uploadMasterAvatar({
      ownerId: master.id,
      file: avatar
    });

    return {
      status: "success",
      message: "Главное фото обновлено"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось обновить фото"
    };
  }
}

export async function uploadPortfolioItemAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return {
        status: "error",
        message: "Выберите изображение для загрузки"
      };
    }

    await uploadPortfolioItem({
      ownerId: master.id,
      file: image,
      caption: String(formData.get("caption") || "")
    });

    return {
      status: "success",
      message: "Работа добавлена в портфолио"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось загрузить работу"
    };
  }
}

export async function uploadMasterCertificatesAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    const certificateFiles = formData
      .getAll("certificates")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    await uploadMasterCertificates({
      ownerId: master.id,
      files: certificateFiles
    });

    return {
      status: "success",
      message: certificateFiles.length === 1 ? "Сертификат загружен" : "Сертификаты загружены"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось загрузить сертификаты"
    };
  }
}

export async function deletePortfolioItemAction(formData: FormData) {
  const master = await requireUserRole("master", "/login");
  await deletePortfolioItem(String(formData.get("itemId") || ""), master.id);
}

export async function deleteMasterCertificateAction(formData: FormData) {
  const master = await requireUserRole("master", "/login");
  await deleteMasterCertificate(String(formData.get("certificateId") || ""), master.id);
}

export async function createMasterServiceAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");

    await createMasterService({
      ownerId: master.id,
      name: String(formData.get("name") || ""),
      price: Number(formData.get("price") || 0),
      duration: String(formData.get("duration") || ""),
      description: String(formData.get("description") || ""),
      image: getOptionalImageFile(formData, "image")
    });

    return {
      status: "success",
      message: "Услуга добавлена"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось добавить услугу"
    };
  }
}

export async function updateMasterServiceAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");

    await updateMasterService({
      ownerId: master.id,
      serviceId: String(formData.get("serviceId") || ""),
      name: String(formData.get("name") || ""),
      price: Number(formData.get("price") || 0),
      duration: String(formData.get("duration") || ""),
      description: String(formData.get("description") || ""),
      image: getOptionalImageFile(formData, "image")
    });

    return {
      status: "success",
      message: "Услуга обновлена"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось обновить услугу"
    };
  }
}

export async function deleteMasterServiceImageAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    await deleteMasterServiceImage(String(formData.get("serviceId") || ""), master.id);

    return {
      status: "success",
      message: "Фото услуги удалено"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось удалить фото"
    };
  }
}

function getOptionalImageFile(formData: FormData, fieldName: string) {
  const image = formData.get(fieldName);
  return image instanceof File && image.size > 0 ? image : null;
}

export async function deleteMasterServiceAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    await deleteMasterService(String(formData.get("serviceId") || ""), master.id);

    return {
      status: "success",
      message: "Услуга удалена"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось удалить услугу"
    };
  }
}
