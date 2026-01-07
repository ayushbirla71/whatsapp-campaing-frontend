type SidebarProps = {
  conversations: any[];
  onSelect: (c: any) => void;
};

export default function Sidebar({ conversations, onSelect }: SidebarProps) {
  if (!conversations?.length) {
    return <div style={{ padding: 16 }}>No conversations</div>;
  }

  return (
    <div style={styles.sidebar}>
      {conversations.map((c) => (
        <div
          key={c.conversationId}
          style={styles.chatItem}
          onClick={() => onSelect(c)}
        >
          <div style={styles.name}>{c.name}</div>
          <div style={styles.preview}>
            {c.lastMessage ?? "No messages yet"}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  sidebar: {
    width: 280,
    background: "#fff",
    borderRight: "1px solid #ddd",
    overflowY: "auto" as const,
  },
  chatItem: {
    padding: 12,
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
  },
  name: {
    fontWeight: 600,
  },
  preview: {
    fontSize: 12,
    color: "#666",
  },
};
