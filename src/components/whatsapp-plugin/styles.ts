import { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex",
    height: "100vh",
    width: "100%",
    fontFamily: "Arial, sans-serif",
  },

  sidebar: {
    width: 320,
    borderRight: "1px solid #ddd",
    overflowY: "auto", // ✅ now valid
  },

  chatItem: {
    padding: 12,
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },

  chatWindow: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  header: {
    padding: 12,
    borderBottom: "1px solid #ddd",
    fontWeight: 600,
  },

  messages: {
    flex: 1,
    padding: 12,
    overflowY: "auto", // ✅ FIXED
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  bubble: {
    maxWidth: "70%",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },

  composer: {
    padding: 12,
    borderTop: "1px solid #ddd",
  },
};

export default styles;
