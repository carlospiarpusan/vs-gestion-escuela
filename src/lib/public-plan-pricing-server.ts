import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import {
  FALLBACK_PUBLIC_PLAN_PRICES,
  mergePublicPlanPrices,
  type PublicPlanPrices,
} from "@/lib/public-plan-pricing";

/** Precios públicos desde planes_config; usa valores de respaldo si la base no responde. */
export async function loadPublicPlanPrices(): Promise<PublicPlanPrices> {
  try {
    return await getServerReadCached<PublicPlanPrices>({
      key: "public:planes-precios",
      ttlMs: 5 * 60 * 1000,
      // Mismo tag que /api/planes invalida al editar un plan.
      tags: ["planes-config"],
      loader: async () => {
        const result = await getServerDbPool().query<{
          id: string;
          precio_mensual: string | null;
          precio_anual: string | null;
        }>(
          `select id, precio_mensual, precio_anual
             from public.planes_config
            where id in ('basico', 'profesional', 'enterprise') and activo`
        );
        return mergePublicPlanPrices(result.rows);
      },
    });
  } catch {
    return FALLBACK_PUBLIC_PLAN_PRICES;
  }
}
