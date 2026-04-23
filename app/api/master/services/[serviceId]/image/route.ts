import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteMasterServiceImage, uploadMasterServiceImage } from "@/lib/portfolio-service";

type RouteContext = {
  params: Promise<{
    serviceId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const master = await getCurrentUser();

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
      file: image
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

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const master = await getCurrentUser();

    if (!master || master.role !== "master") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { serviceId } = await context.params;
    await deleteMasterServiceImage(serviceId, master.id);

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
