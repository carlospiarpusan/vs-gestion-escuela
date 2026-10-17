import { ImageResponse } from "next/og";

export const alt = "ConduSoft - Software para autoescuelas en Colombia";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px",
        background: "linear-gradient(135deg, #f6f9fc 0%, #dcecff 46%, #eef4ff 100%)",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path
            d="M45.8 17.8C39.6 11.7 28.1 11.2 20.3 17.5C12 24.2 9.7 36.1 15.2 45.1C18.5 50.5 24.2 54.2 30.7 55"
            stroke="#111111"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.8 55.2C24.5 41.3 35.4 32.4 51.8 30.4C43 36.9 36.1 45.6 31.8 57.5C27.2 57.2 22.5 56.3 17.8 55.2Z"
            fill="#111111"
          />
          <path
            d="M28.2 50.9C32.3 43.8 38.1 38.8 45.6 35.7"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{ color: "#0f172a" }}>Condu</span>
          <span style={{ color: "#2563eb" }}>Soft</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.03, maxWidth: 940 }}>
          ConduSoft, software para autoescuelas en Colombia
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.35, maxWidth: 980, color: "#334155" }}>
          Alumnos, matrículas, clases, ingresos, cartera, gastos, flota y operación diaria en una
          sola plataforma.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          fontSize: 22,
          color: "#1d4ed8",
        }}
      >
        <span>Alumnos</span>
        <span>Ingresos</span>
        <span>Cartera</span>
        <span>Gastos</span>
        <span>Vehículos</span>
      </div>
    </div>,
    size
  );
}
