export function buildWhatsAppPayload(type: string, data: any) {
  switch (type) {
    case "text":
      return {
        messageType: "text",
        messageContent: data.text,
      };

    case "image":
      return {
        messageType: "image",
        mediaUrl: data.mediaUrl,
        mediaType: "image",
        caption: data.caption || "",
      };

    case "document":
      return {
        messageType: "document",
        mediaUrl: data.mediaUrl,
        mediaType: "document",
        caption: data.caption || "",
      };

    case "template":
      return {
        messageType: "template",
        templateName: data.templateName,
        templateLanguage: data.language || "en_US",
        templateParameters: data.parameters || [],
      };

    default:
      throw new Error("Unsupported message type");
  }
}
