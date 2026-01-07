import React from "react";

export default function ChatHeader({ conversation }: any) {
  return (
    <div style={styles.header}>
      <div>
        <div style={styles.name}>{conversation.name}</div>
        <div style={styles.sub}>
          {conversation.isActive ? "Active now" : conversation.msisdn}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    height: 60,
    padding: "0 16px",
    background: "#f0f2f5",
    borderBottom: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
  },
  name: {
    fontWeight: 600,
  },
  sub: {
    fontSize: 12,
    color: "#667781",
  },
} as const;
