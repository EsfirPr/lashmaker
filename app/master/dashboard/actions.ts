"use server";

import type { MasterFormState } from "@/app/master/dashboard/state";
import { getCurrentUserByRole } from "@/lib/auth/server";
import {
  createMasterService,
  deleteMasterCertificate,
  deletePortfolioItem,
  deleteMasterService,
  updateMasterProfile,
  updateMasterService,
  uploadMasterAvatar,
  uploadMasterCertificates,
  uploadPortfolioItem
} from "@/lib/portfolio-service";
import { logServerActionError } from "@/lib/server-action-log";
import { redirect } from "next/navigation";

export async function saveMasterProfileAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
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
    logServerActionError("saveMasterProfileAction", error, {
      userId: master.id
    });
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
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
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
    logServerActionError("uploadMasterAvatarAction", error, {
      userId: master.id
    });
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
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
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
    logServerActionError("uploadPortfolioItemAction", error, {
      userId: master.id
    });
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
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
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
    logServerActionError("uploadMasterCertificatesAction", error, {
      userId: master.id
    });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось загрузить сертификаты"
    };
  }
}

export async function deletePortfolioItemAction(formData: FormData) {
  const master = await getCurrentUserByRole("master");

  if (!master) {
    console.warn("[server-action:deletePortfolioItemAction] Missing master session");
    redirect("/login");
  }

  try {
    await deletePortfolioItem(String(formData.get("itemId") || ""), master.id);
  } catch (error) {
    logServerActionError("deletePortfolioItemAction", error, {
      userId: master.id
    });
  }
}

export async function deleteMasterCertificateAction(formData: FormData) {
  const master = await getCurrentUserByRole("master");

  if (!master) {
    console.warn("[server-action:deleteMasterCertificateAction] Missing master session");
    redirect("/login");
  }

  try {
    await deleteMasterCertificate(String(formData.get("certificateId") || ""), master.id);
  } catch (error) {
    logServerActionError("deleteMasterCertificateAction", error, {
      userId: master.id
    });
  }
}

export async function createMasterServiceAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
    const serviceId = await createMasterService({
      ownerId: master.id,
      name: String(formData.get("name") || ""),
      price: Number(formData.get("price") || 0),
      duration: String(formData.get("duration") || ""),
      description: String(formData.get("description") || "")
    });

    return {
      status: "success",
      message: "Услуга добавлена",
      serviceId
    };
  } catch (error) {
    logServerActionError("createMasterServiceAction", error, {
      userId: master.id
    });
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
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
    await updateMasterService({
      ownerId: master.id,
      serviceId: String(formData.get("serviceId") || ""),
      name: String(formData.get("name") || ""),
      price: Number(formData.get("price") || 0),
      duration: String(formData.get("duration") || ""),
      description: String(formData.get("description") || "")
    });

    return {
      status: "success",
      message: "Услуга обновлена"
    };
  } catch (error) {
    logServerActionError("updateMasterServiceAction", error, {
      userId: master.id
    });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось обновить услугу"
    };
  }
}

export async function deleteMasterServiceAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  const master = await getCurrentUserByRole("master");

  if (!master) {
    return {
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
    await deleteMasterService(String(formData.get("serviceId") || ""), master.id);

    return {
      status: "success",
      message: "Услуга удалена"
    };
  } catch (error) {
    logServerActionError("deleteMasterServiceAction", error, {
      userId: master.id
    });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось удалить услугу"
    };
  }
}
