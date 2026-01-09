import React from "react";

export default function ChatHeader({
  conversation,
  isMobile,
  onBack,
}: any) {
  return (
    <div style={styles.header}>
      {isMobile && (
        <button onClick={onBack} style={styles.backBtn}>
          ←
        </button>
      )}

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
    padding: "0 12px",
    background: "#f0f2f5",
    borderBottom: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    fontSize: 22,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "4px 8px",
  },
  name: {
    fontWeight: 600,
  },
  sub: {
    fontSize: 12,
    color: "#667781",
  },
} as const;
