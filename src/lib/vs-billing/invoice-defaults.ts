import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import type { FacturaxCatalog } from "./facturax-contract";
import { getAnsvProductAmount, type AnsvSnapshot } from "@/lib/ansv";

export function getStudentInvoiceDefaults(
  products: FacturaxCatalog["products"],
  categories: string[],
  snapshot: AnsvSnapshot | null = null
) {
  const count = normalizeStoredCourseCategories(categories).length;
  const quantities: Record<string, string> = {};
  const issues: string[] = [];
  if (count !== 1 && count !== 2)
    return {
      quantities,
      issues: ["Revisa las categorías del contrato antes de seleccionar los productos."],
    };
  const expected: [string, number][] = [
    ["SICOV", count],
    ["RECAUDO", count],
    ["ANSV", 1],
  ];
  if (count === 2) expected.push(["ANSV2", 1]);
  for (const [code, quantity] of expected) {
    const matches = products.filter((product) => product.code.trim().toUpperCase() === code);
    if (matches.length !== 1) {
      issues.push(
        matches.length
          ? `Código ${code} duplicado en FacturaX.`
          : `Falta el producto con código ${code} en FacturaX.`
      );
    } else if (!matches[0].available) {
      issues.push(`El producto ${code} requiere configuración en FacturaX.`);
    } else {
      const amount = getAnsvProductAmount(matches[0], snapshot);
      if (amount && !matches[0].priceEditable && matches[0].price !== amount.valorPesos * 100) {
        issues.push(
          `El precio fijo de ${code} no coincide con el contrato. Configúralo como precio variable en FacturaX.`
        );
        continue;
      }
      quantities[matches[0].id] = String(quantity);
    }
  }
  return { quantities, issues };
}
