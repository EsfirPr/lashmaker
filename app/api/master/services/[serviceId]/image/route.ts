import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import {
  deleteMasterServiceImage,
  uploadMasterServiceImage,
  type MasterServiceImageVariant
} from "@/lib/portfolio-service";

type RouteContext = {
  params: Promise<{
    serviceId: string;
  }>;
};

function getImageVariant(request: Request): MasterServiceImageVariant {
  const variant = new URL(request.url).searchParams.get("variant");
  return variant === "secondary" ? "secondary" : "primary";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const master = await getCurrentUser();
    const variant = getImageVariant(request);

    if (!master || master.role !== "master") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { serviceId } = await context.params;
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Выберите фото услуги" }, { status: 400 });
    }

    const uploadedImage = await uploadMasterServiceImage({
      ownerId: master.id,
      serviceId,
      file: image,
      variant
    });

    return NextResponse.json(uploadedImage);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось загрузить фото"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const master = await getCurrentUser();
    const variant = getImageVariant(request);

    if (!master || master.role !== "master") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { serviceId } = await context.params;
    await deleteMasterServiceImage(serviceId, master.id, variant);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось удалить фото"
      },
      { status: 400 }
    );
  }
}
