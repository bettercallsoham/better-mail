import { feedbackApi } from "./feedback.api";

export async function uploadToCloudinary(file: File): Promise<string> {
  const { data: sig } = await feedbackApi.getUploadSignature();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", sig.signature);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("api_key", sig.apiKey);
  formData.append("folder", sig.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) throw new Error("Upload failed");

  const json = await res.json();
  return json.secure_url as string;
}
