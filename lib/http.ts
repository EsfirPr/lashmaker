export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (!isJson) {
      const text = await response.text();
      throw new Error(
        `Unexpected response: ${contentType || "unknown"} ${text.slice(0, 120)}`
      );
    }

    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "Запрос завершился с ошибкой");
  }

  if (!isJson) {
    const text = await response.text();
    throw new Error(
      `Unexpected response: ${contentType || "unknown"} ${text.slice(0, 120)}`
    );
  }

  return (await response.json()) as T;
}
