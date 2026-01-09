export function buildMessagePayload(type: string, data: any) {
  switch (type) {
    case "text":
      return { messageType: "text", messageContent: data.text };

    case "image":
    case "document":
      return {
        messageType: type,
        mediaUrl: data.url,
        mediaType: type,
        caption: data.caption || "",
      };

    case "template":
      return {
        messageType: "template",
        templateName: data.templateName,
        templateLanguage: "en_US",
        templateParameters: data.parameters || [],
      };

    default:
      throw new Error("Unsupported message type");
  }
}
