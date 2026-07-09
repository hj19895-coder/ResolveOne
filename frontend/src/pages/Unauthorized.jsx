import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#FAFAFA",
      fontFamily: '"Poppins", system-ui, sans-serif',
    }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 20px" }}>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg,#EDE9FE,#E0E7FF)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 8px 24px rgba(109,61,245,0.15)",
        }}>
          <svg width="32" height="32" fill="none" stroke="#7C3AED" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#111827" }}>
          Access Denied
        </h1>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
          Your role <strong style={{ color: "#374151" }}>{user?.role ?? "unknown"}</strong> does
          not have permission to view this page.
        </p>
        <p style={{ margin: "0 0 28px", fontSize: 12, color: "#9CA3AF" }}>
          Contact your Super Admin to request access.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "9px 20px", borderRadius: 10,
              border: "1px solid #E5E7EB", background: "#fff",
              fontSize: 13, fontWeight: 600, color: "#374151",
              cursor: "pointer",
            }}
          >
            ← Go Back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#7C3AED,#4F46E5)",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(109,61,245,0.3)",
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}