import { ImageResponse } from "next/og";

export const alt = "Condusoft - Software para autoescuelas en Colombia";
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
        <div
          style={{
            display: "flex",
            height: 64,
            width: 64,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            background: "#0f6fff",
            color: "white",
            fontSize: 32,
          }}
        >
          C
        </div>
        Condusoft
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.03, maxWidth: 940 }}>
          Condusoft, software para autoescuelas en Colombia
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
