interface MultipartPart {
  contentId: string | null;
  body: string;
}

export const parseMultipartResponse = (
  rawBody: string,
  contentTypeHeader: string,
): MultipartPart[] => {
  const boundary = contentTypeHeader
    .match(/boundary=([^\s;]+)/)?.[1]
    ?.replace(/^"|"$/g, "");
  if (!boundary) return [];

  return rawBody
    .split(`--${boundary}`)
    .slice(1) // drop preamble
    .filter((part) => part.trim() !== "--" && part.trim() !== "")
    .map((part) => {
      const separatorIndex = part.indexOf("\r\n\r\n");
      const outerHeaders = part.slice(0, separatorIndex);
      const innerResponse = part.slice(separatorIndex + 4).trim();
      const contentId =
        outerHeaders.match(/Content-ID:\s*([^\r\n]+)/i)?.[1]?.trim() ?? null;

      return { contentId, body: innerResponse };
    });
};

export const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );