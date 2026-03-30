import { DOMParser as XmlDomParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import { isTramitadorExpenseText } from "@/lib/expense-category";
import type { CategoriaGasto, MetodoPagoGasto } from "@/types/database";

type PathStep = string | string[];
type PathDefinition = PathStep[];

export interface ElectronicInvoicePreview {
  fileName: string;
  sourceFormat: "xml" | "zip";
  xmlEntryName: string;
  pdfEntryName: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  supplierName: string;
  supplierTaxId: string | null;
  customerName: string | null;
  payableAmount: number;
  subtotalAmount: number | null;
  taxAmount: number | null;
  currency: string;
  paymentMethodSuggestion: MetodoPagoGasto;
  categorySuggestion: CategoriaGasto;
  conceptSuggestion: string;
  lineItems: string[];
}

const MAX_ELECTRONIC_XML_BYTES = 5 * 1024 * 1024;
const MAX_ELECTRONIC_ZIP_BYTES = 12 * 1024 * 1024;
const INVOICE_XML_SIGNATURE =
  /<(?:[a-z0-9_]+:)?(Invoice|CreditNote|AttachedDocument|ApplicationResponse)\b/i;

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeLocalNames(step: PathStep) {
  const items = Array.isArray(step) ? step : [step];
  return items.map((item) => item.toLowerCase());
}

function getElementChildren(parent: Element) {
  return Array.from(parent.childNodes || []).filter((node): node is Element => node.nodeType === 1);
}

function findDirectChild(parent: Element, step: PathStep) {
  const names = normalizeLocalNames(step);
  return (
    getElementChildren(parent).find((child) => names.includes(child.localName.toLowerCase())) ||
    null
  );
}

function findTextByPaths(root: Element, paths: PathDefinition[]) {
  for (const path of paths) {
    let current: Element | null = root;
    for (const step of path) {
      current = current ? findDirectChild(current, step) : null;
      if (!current) break;
    }

    const value = normalizeText(current?.textContent);
    if (value) return value;
  }

  return null;
}

function findAttributeByPaths(root: Element, paths: PathDefinition[], attributeName: string) {
  for (const path of paths) {
    let current: Element | null = root;
    for (const step of path) {
      current = current ? findDirectChild(current, step) : null;
      if (!current) break;
    }

    const value = normalizeText(current?.getAttribute(attributeName));
    if (value) return value;
  }

  return null;
}

function findDescendantText(root: Element, localNames: string[]) {
  for (const localName of localNames) {
    const nodes = root.getElementsByTagNameNS("*", localName);
    for (const node of Array.from(nodes)) {
      const value = normalizeText(node.textContent);
      if (value) return value;
    }
  }

  return null;
}

type DescendantTextIndex = Map<string, string>;

function buildDescendantTextIndex(root: Element) {
  const index: DescendantTextIndex = new Map();

  const visit = (node: Element) => {
    const localName = normalizeText(node.localName).toLowerCase();
    if (localName && !index.has(localName)) {
      const value = normalizeText(node.textContent);
      if (value) {
        index.set(localName, value);
      }
    }

    for (const child of getElementChildren(node)) {
      visit(child);
    }
  };

  visit(root);
  return index;
}

function findDescendantTextFromIndex(index: DescendantTextIndex, localNames: string[]) {
  for (const localName of localNames) {
    const value = index.get(localName.toLowerCase());
    if (value) return value;
  }

  return null;
}

function getTextByteLength(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }

  return Buffer.byteLength(value, "utf8");
}

function assertBinaryWithinLimit(
  fileName: string,
  byteLength: number,
  maxBytes: number,
  label: string
) {
  if (byteLength > maxBytes) {
    throw new Error(
      `${label} ${fileName} supera el tamaño máximo permitido para importación automática.`
    );
  }
}

function assertXmlLooksLikeInvoice(xmlContent: string) {
  if (!INVOICE_XML_SIGNATURE.test(xmlContent)) {
    throw new Error("El XML no corresponde a una factura electronica compatible.");
  }
}

function parseXmlDocument(xmlContent: string) {
  const parser = typeof DOMParser !== "undefined" ? new DOMParser() : new XmlDomParser();
  const document = parser.parseFromString(xmlContent, "application/xml");
  const parseError = document.getElementsByTagName("parsererror")[0];

  if (parseError || !document.documentElement) {
    throw new Error("El archivo XML no se pudo leer como factura electronica valida.");
  }

  return document;
}

function extractEmbeddedInvoiceXml(root: Element) {
  const descriptions = Array.from(root.getElementsByTagNameNS("*", "Description"));

  for (const description of descriptions) {
    const raw = normalizeText(description.textContent);
    if (!raw) continue;
    if (!/<(Invoice|CreditNote)\b/i.test(raw)) continue;

    try {
      const embeddedDocument = parseXmlDocument(raw);
      const embeddedRoot = embeddedDocument.documentElement;
      if (/(invoice|creditnote)/i.test(embeddedRoot.localName)) {
        return embeddedRoot;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseAmount(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/[^0-9,.-]/g, "").trim();
  if (!normalized) return null;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  let sanitized = normalized;

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    sanitized = normalized.split(thousandSeparator).join("");
    if (decimalSeparator === ",") {
      sanitized = sanitized.replace(",", ".");
    }
  } else if (hasComma) {
    sanitized = normalized.replace(",", ".");
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));
}

function extractLineItems(root: Element) {
  const invoiceLines = [
    ...Array.from(root.getElementsByTagNameNS("*", "InvoiceLine")),
    ...Array.from(root.getElementsByTagNameNS("*", "CreditNoteLine")),
  ];

  const items = invoiceLines
    .map(
      (line) =>
        findTextByPaths(line, [
          [["Item"], ["Description"]],
          [["Item"], ["Name"]],
          [["Price"], ["AllowanceChargeReason"]],
        ]) || findDescendantText(line, ["Description", "Name"])
    )
    .filter((value): value is string => Boolean(value));

  return uniqueItems(items);
}

function suggestExpenseCategory(text: string): CategoriaGasto {
  const haystack = normalizeText(text).toLowerCase();

  if (isTramitadorExpenseText(haystack)) return "tramitador";
  if (/(gasolina|combustible|acpm|diesel|diesel|tanqueo|estacion de servicio)/.test(haystack))
    return "combustible";
  if (/(soat|poliza|seguro|aseguradora)/.test(haystack)) return "seguros";
  if (/(arriendo|alquiler|canon|arrendamiento)/.test(haystack)) return "alquiler";
  if (
    /(internet|energia|agua|acueducto|alcantarillado|vigilancia|celular|telefono|servicio publico|servicios)/.test(
      haystack
    )
  )
    return "servicios";
  if (
    /(llanta|bateria|filtro|aceite|mantenimiento|tecnomecanica|alineacion|balanceo|taller|repuesto|vehiculo|automotriz)/.test(
      haystack
    )
  ) {
    return /(mano de obra|reparacion|latoneria|pintura|embrague|caja|motor)/.test(haystack)
      ? "reparaciones"
      : "mantenimiento_vehiculo";
  }
  if (
    /(reparacion|mano de obra|latoneria|pintura|soldadura|embrague|freno|caja|motor)/.test(haystack)
  )
    return "reparaciones";
  if (
    /(publicidad|radio|facebook|instagram|meta ads|volante|banner|impresion publicitaria|marketing)/.test(
      haystack
    )
  )
    return "marketing";
  if (
    /(impuesto|retefuente|retencion|ica|industria y comercio|matricula mercantil|camara de comercio|dian)/.test(
      haystack
    )
  )
    return "impuestos";
  if (/(cartilla|manual|material didactico|modulo pedagogico|guia de estudio)/.test(haystack))
    return "material_didactico";
  if (
    /(papel|lapicero|marcador|aseo|limpieza|cafeteria|botellon|suministro|oficina|folder|tinta|toner|pegante)/.test(
      haystack
    )
  )
    return "suministros";
  if (/(nomina|salario|honorario|honorarios|pago instructor|servicio profesional)/.test(haystack))
    return "nominas";
  return "otros";
}

function suggestPaymentMethod(text: string): MetodoPagoGasto {
  const haystack = normalizeText(text).toLowerCase();
  if (/(domiciliacion|debito automatico|pse recurrente)/.test(haystack)) return "domiciliacion";
  if (/(tarjeta|credito|debito|dataphone|datafono)/.test(haystack)) return "tarjeta";
  if (/(efectivo|cash)/.test(haystack)) return "efectivo";
  return "transferencia";
}

function buildConcept(invoiceNumber: string, lineItems: string[]) {
  const items = lineItems.slice(0, 2);
  const suffix = lineItems.length > 2 ? ` + ${lineItems.length - 2} item(s)` : "";
  const summary =
    items.length > 0 ? `${items.join(" / ")}${suffix}` : "Importacion de factura electronica";
  return `Factura ${invoiceNumber} - ${summary}`.slice(0, 180);
}

export function buildElectronicInvoiceNote(preview: ElectronicInvoicePreview) {
  const lines = [
    `Factura electronica importada desde ${preview.sourceFormat === "zip" ? "ZIP" : "XML"}.`,
    `Archivo: ${preview.fileName}`,
    `XML origen: ${preview.xmlEntryName}`,
    preview.pdfEntryName ? `PDF detectado: ${preview.pdfEntryName}` : "",
    `Proveedor: ${preview.supplierName}`,
    preview.supplierTaxId ? `NIT proveedor: ${preview.supplierTaxId}` : "",
    `Moneda: ${preview.currency}`,
    preview.subtotalAmount !== null ? `Subtotal: ${preview.subtotalAmount}` : "",
    preview.taxAmount !== null ? `Impuestos: ${preview.taxAmount}` : "",
    `Total factura: ${preview.payableAmount}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function scoreXmlEntry(name: string) {
  const normalized = normalizeText(name).toLowerCase();
  let score = 0;
  if (/(invoice|factura|fe|fv)/.test(normalized)) score += 10;
  if (/(applicationresponse|respuesta|signature|firma|attacheddocument)/.test(normalized))
    score -= 8;
  score += Math.min(normalized.length / 100, 2);
  return score;
}

function pickZipEntry(zip: JSZip, extension: string, scorer?: (name: string) => number) {
  let bestEntry: JSZip.JSZipObject | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.toLowerCase().endsWith(extension)) continue;
    if (!scorer) return entry;

    const score = scorer(entry.name);
    if (!bestEntry || score > bestScore) {
      bestEntry = entry;
      bestScore = score;
    }
  }

  return bestEntry;
}

function parseElectronicInvoiceXmlContent(
  xmlContent: string,
  metadata: {
    fileName?: string;
    sourceFormat?: "xml" | "zip";
    xmlEntryName?: string;
    pdfEntryName?: string | null;
  } = {}
): ElectronicInvoicePreview {
  assertBinaryWithinLimit(
    metadata.fileName || metadata.xmlEntryName || "factura.xml",
    getTextByteLength(xmlContent),
    MAX_ELECTRONIC_XML_BYTES,
    "El XML"
  );
  assertXmlLooksLikeInvoice(xmlContent);

  const document = parseXmlDocument(xmlContent);
  const root = document.documentElement;
  const effectiveRoot = /^(AttachedDocument|ApplicationResponse)$/i.test(root.localName)
    ? extractEmbeddedInvoiceXml(root) || root
    : root;
  const effectiveRootName = normalizeText(effectiveRoot.localName).toLowerCase();
  const descendantTextIndex = buildDescendantTextIndex(effectiveRoot);

  if (!["invoice", "creditnote"].includes(effectiveRootName)) {
    throw new Error("El XML no corresponde a una factura electronica compatible.");
  }

  const invoiceNumber =
    findTextByPaths(effectiveRoot, [[["ID"]]]) ||
    findDescendantTextFromIndex(descendantTextIndex, ["ID"]);
  const issueDate =
    findTextByPaths(effectiveRoot, [[["IssueDate"]]]) ||
    findDescendantTextFromIndex(descendantTextIndex, ["IssueDate"]);
  const dueDate =
    findTextByPaths(effectiveRoot, [[["DueDate"]]]) ||
    findDescendantTextFromIndex(descendantTextIndex, ["DueDate"]);
  const supplierName =
    findTextByPaths(effectiveRoot, [
      [["AccountingSupplierParty"], ["Party"], ["PartyLegalEntity"], ["RegistrationName"]],
      [["AccountingSupplierParty"], ["Party"], ["PartyName"], ["Name"]],
      [["AccountingSupplierParty"], ["Party"], ["PartyTaxScheme"], ["RegistrationName"]],
    ]) ||
    findDescendantTextFromIndex(descendantTextIndex, ["RegistrationName", "Name"]) ||
    "Proveedor sin nombre";
  const supplierTaxId =
    findTextByPaths(effectiveRoot, [
      [["AccountingSupplierParty"], ["Party"], ["PartyTaxScheme"], ["CompanyID"]],
      [["AccountingSupplierParty"], ["Party"], ["PartyLegalEntity"], ["CompanyID"]],
      [["AccountingSupplierParty"], ["Party"], ["PartyIdentification"], ["ID"]],
    ]) || findDescendantTextFromIndex(descendantTextIndex, ["CompanyID"]);
  const customerName =
    findTextByPaths(effectiveRoot, [
      [["AccountingCustomerParty"], ["Party"], ["PartyLegalEntity"], ["RegistrationName"]],
      [["AccountingCustomerParty"], ["Party"], ["PartyName"], ["Name"]],
    ]) || findDescendantTextFromIndex(descendantTextIndex, ["AccountingCustomerParty"]);
  const payableAmount =
    parseAmount(
      findTextByPaths(effectiveRoot, [
        [["LegalMonetaryTotal"], ["PayableAmount"]],
        [["RequestedMonetaryTotal"], ["PayableAmount"]],
        [["LegalMonetaryTotal"], ["TaxInclusiveAmount"]],
        [["MonetaryTotal"], ["PayableAmount"]],
      ])
    ) ??
    parseAmount(
      findDescendantTextFromIndex(descendantTextIndex, ["PayableAmount", "TaxInclusiveAmount"])
    ) ??
    null;
  const subtotalAmount =
    parseAmount(
      findTextByPaths(effectiveRoot, [
        [["LegalMonetaryTotal"], ["TaxExclusiveAmount"]],
        [["LegalMonetaryTotal"], ["LineExtensionAmount"]],
        [["MonetaryTotal"], ["LineExtensionAmount"]],
      ])
    ) ?? null;
  const taxAmount =
    parseAmount(findTextByPaths(effectiveRoot, [[["TaxTotal"], ["TaxAmount"]]])) ??
    parseAmount(findDescendantTextFromIndex(descendantTextIndex, ["TaxAmount"])) ??
    null;
  const currency =
    findTextByPaths(effectiveRoot, [[["DocumentCurrencyCode"]]]) ||
    findAttributeByPaths(
      effectiveRoot,
      [
        [["LegalMonetaryTotal"], ["PayableAmount"]],
        [["RequestedMonetaryTotal"], ["PayableAmount"]],
        [["LegalMonetaryTotal"], ["TaxInclusiveAmount"]],
      ],
      "currencyID"
    ) ||
    "COP";
  const paymentMethodText = [
    findTextByPaths(effectiveRoot, [[["PaymentMeans"], ["PaymentMeansCode"]]]),
    findTextByPaths(effectiveRoot, [[["PaymentMeans"], ["InstructionID"]]]),
    findTextByPaths(effectiveRoot, [[["PaymentMeans"], ["PaymentID"]]]),
  ]
    .filter(Boolean)
    .join(" ");
  const lineItems = extractLineItems(effectiveRoot);
  const conceptSource = `${supplierName} ${lineItems.join(" ")}`;

  if (!invoiceNumber) {
    throw new Error("No se encontro el numero de factura en el XML.");
  }

  if (!issueDate) {
    throw new Error("No se encontro la fecha de expedicion en el XML.");
  }

  if (!payableAmount || payableAmount <= 0) {
    throw new Error("No se encontro un valor total valido en la factura electronica.");
  }

  return {
    fileName: metadata.fileName || metadata.xmlEntryName || "factura.xml",
    sourceFormat: metadata.sourceFormat || "xml",
    xmlEntryName: metadata.xmlEntryName || metadata.fileName || "factura.xml",
    pdfEntryName: metadata.pdfEntryName ?? null,
    invoiceNumber,
    issueDate,
    dueDate,
    supplierName,
    supplierTaxId,
    customerName,
    payableAmount,
    subtotalAmount,
    taxAmount,
    currency,
    paymentMethodSuggestion: suggestPaymentMethod(paymentMethodText),
    categorySuggestion: suggestExpenseCategory(conceptSource),
    conceptSuggestion: buildConcept(invoiceNumber, lineItems),
    lineItems,
  };
}

export function parseElectronicInvoiceXml(
  xmlContent: string,
  fileName = "factura.xml"
): ElectronicInvoicePreview {
  return parseElectronicInvoiceXmlContent(xmlContent, {
    fileName,
    sourceFormat: "xml",
    xmlEntryName: fileName,
    pdfEntryName: null,
  });
}

function decodeTextContent(content: ArrayBuffer | Uint8Array) {
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
  return new TextDecoder("utf-8").decode(bytes);
}

export async function parseElectronicInvoiceBinary(input: {
  fileName: string;
  content: ArrayBuffer | Uint8Array;
}): Promise<ElectronicInvoicePreview> {
  const lowerName = input.fileName.toLowerCase();
  const contentBytes =
    input.content instanceof Uint8Array ? input.content : new Uint8Array(input.content);

  if (lowerName.endsWith(".zip")) {
    assertBinaryWithinLimit(
      input.fileName,
      contentBytes.byteLength,
      MAX_ELECTRONIC_ZIP_BYTES,
      "El ZIP"
    );
    const zip = await JSZip.loadAsync(contentBytes);
    const xmlEntry = pickZipEntry(zip, ".xml", scoreXmlEntry);

    if (!xmlEntry) {
      throw new Error("El ZIP no contiene un XML de factura electronica.");
    }

    const pdfEntry = pickZipEntry(zip, ".pdf");
    const xmlContent = await xmlEntry.async("text");

    return parseElectronicInvoiceXmlContent(xmlContent, {
      fileName: input.fileName,
      sourceFormat: "zip",
      xmlEntryName: xmlEntry.name,
      pdfEntryName: pdfEntry?.name || null,
    });
  }

  if (lowerName.endsWith(".xml")) {
    assertBinaryWithinLimit(
      input.fileName,
      contentBytes.byteLength,
      MAX_ELECTRONIC_XML_BYTES,
      "El XML"
    );
    return parseElectronicInvoiceXml(decodeTextContent(contentBytes), input.fileName);
  }

  throw new Error(
    "La importacion de factura electronica requiere un archivo XML o un ZIP con XML y PDF."
  );
}

export async function parseElectronicInvoiceFile(file: File): Promise<ElectronicInvoicePreview> {
  return parseElectronicInvoiceBinary({
    fileName: file.name,
    content: await file.arrayBuffer(),
  });
}
