import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { selectPublicPlanPrices, type PublicPlanPrices } from "@/lib/public-plan-pricing";

export async function loadPublicPlanPrices(): Promise<PublicPlanPrices> {
  try {
    return await getServerReadCached<PublicPlanPrices>({
      key: "public:planes-precios-activos",
      ttlMs: 5 * 60 * 1000,
      // Mismo tag que /api/planes invalida al editar un plan.
      tags: ["planes-config"],
      loader: async () => {
        const result = await getServerDbPool().query<{
          id: string;
          activo: boolean;
          precio_mensual: string | null;
          precio_anual: string | null;
        }>(
          `select id, activo, precio_mensual, precio_anual
             from public.planes_config
            where id in ('basico', 'profesional', 'enterprise') and activo`
        );
        return selectPublicPlanPrices(result.rows);
      },
    });
  } catch {
    return {};
  }
}
