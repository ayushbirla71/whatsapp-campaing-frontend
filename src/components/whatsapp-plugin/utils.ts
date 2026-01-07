

export function renderTemplate(components: any[], params: any[]) {
  const body = components?.find((c) => c.type === "BODY")?.text;
  if (!body) return "";

  let text = body;
  params?.forEach((p: any, i: number) => {
    text = text.replace(`{{${i + 1}}}`, p.value);
  });

  return text;
}
