import React from "react";

function MessageBubble({ message }: any) {
  const isOutbound = message.direction === "outbound";

  return (
    <div
      style={{
        ...styles.bubble,
        alignSelf: isOutbound ? "flex-end" : "flex-start",
        background: isOutbound ? "#DCF8C6" : "#fff",
      }}
    >
      {/* TEXT */}
      {message.type === "text" && <div>{message.message}</div>}

      {/* IMAGE */}
      {message.type === "image" && (
        <img src={message.media_url} style={{ maxWidth: 220 }} />
      )}

      {/* TEMPLATE */}
      {message.type === "template" && message.template && (
        <div style={styles.template}>
          {renderTemplate(message.template)}
        </div>
      )}

      {/* BUTTON REPLY */}
      {message.type === "button" && (
        <div>👉 {message.interactive?.data?.button_title}</div>
      )}

      {/* FOOTER */}
      <div style={styles.footer}>
        <span>{formatTime(message.created_at)}</span>
        {isOutbound && <MessageStatus status={message.status} />}
      </div>
    </div>
  );
}

function renderTemplate(template: any) {
  const body = template.components.find((c: any) => c.type === "BODY");
  if (!body) return null;

  let text = body.text;

  template.parameters?.forEach((p: any, i: number) => {
    text = text.replace(`{{${i + 1}}}`, p.value);
  });

  return (
    <div style={{ whiteSpace: "pre-line" }}>
      {text}

      {template.components
        .filter((c: any) => c.type === "BUTTONS")
        .flatMap((c: any) => c.buttons)
        .map((b: any) => (
          <div key={b.text} style={styles.templateButton}>
            {b.text}
          </div>
        ))}
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  const baseStyle: React.CSSProperties = {
    fontSize: 11,
    marginLeft: 6,
  };

  switch (status) {
    case "pending":
      return <span style={baseStyle}>⏳</span>;
    case "sent":
      return <span style={baseStyle}>✓</span>;
    case "delivered":
      return <span style={baseStyle}>✓✓</span>;
    case "read":
      return <span style={{ ...baseStyle, color: "#34B7F1" }}>✓✓</span>;
    case "failed":
      return <span style={{ ...baseStyle, color: "red" }}>❌</span>;
    default:
      return null;
  }
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles: Record<string, React.CSSProperties> = {
  bubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  template: {
    whiteSpace: "pre-line",
  },
  templateButton: {
    marginTop: 6,
    padding: "6px 10px",
    borderRadius: 6,
    background: "#e9edef",
    textAlign: "center",
    fontWeight: 500,
  },
};

export default MessageBubble;
