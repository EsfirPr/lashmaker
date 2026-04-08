"use server";

import { requireUserRole } from "@/lib/auth/server";
import { deletePortfolioItem, updateMasterProfile, uploadPortfolioItem } from "@/lib/portfolio-service";

export type MasterFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialMasterFormState: MasterFormState = {
  status: "idle",
  message: ""
};

export async function saveMasterProfileAction(
  _previousState: MasterFormState,
  formData: FormData
): Promise<MasterFormState> {
  try {
    const master = await requireUserRole("master", "/login");
    const yearsValue = String(formData.get("yearsExperience") || "").trim();

    await updateMasterProfile({
      ownerId: master.id,
      displayName: String(formData.get("displayName") || ""),
      headline: String(formData.get("headline") || ""),
      bio: String(formData.get("bio") || ""),
      yearsExperience: yearsValue ? Number(yearsValue) : null
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

export async function deletePortfolioItemAction(formData: FormData) {
  const master = await requireUserRole("master", "/login");
  await deletePortfolioItem(String(formData.get("itemId") || ""), master.id);
}
