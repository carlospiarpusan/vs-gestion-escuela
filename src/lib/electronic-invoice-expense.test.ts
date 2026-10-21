// @vitest-environment node
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import {
  assertInvoiceCanBecomeExpense,
  buildElectronicInvoiceIdentity,
  parseElectronicInvoiceXml,
  parseElectronicInvoiceBinary,
} from "./electronic-invoice";
const xml = `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>FE-1</ID><UUID>cufe-123</UUID><IssueDate>2026-10-20</IssueDate><PaymentMeans><PaymentDueDate>2026-11-20</PaymentDueDate></PaymentMeans><DocumentCurrencyCode>COP</DocumentCurrencyCode><AccountingSupplierParty><Party><PartyTaxScheme><CompanyID>900123456</CompanyID></PartyTaxScheme></Party></AccountingSupplierParty><AccountingCustomerParty><Party><PartyTaxScheme><CompanyID>901171550</CompanyID></PartyTaxScheme></Party></AccountingCustomerParty><LegalMonetaryTotal><PayableAmount>100</PayableAmount></LegalMonetaryTotal></Invoice>`;
it("identifica tipo, receptor, CUFE y vencimiento y admite COP de la empresa correcta", () => {
  const invoice = parseElectronicInvoiceXml(xml);
  expect(invoice).toMatchObject({
    documentType: "invoice",
    documentId: "cufe-123",
    customerTaxId: "901171550",
    dueDate: "2026-11-20",
  });
  expect(() => assertInvoiceCanBecomeExpense(invoice, "901.171.550-1")).not.toThrow();
  expect(buildElectronicInvoiceIdentity(invoice)).toBe(
    buildElectronicInvoiceIdentity({ ...invoice, supplierName: "Cambio de razón social" })
  );
});
it.each(["2026-02-31", "2026-13-20"])(
  "rechaza fecha inválida %s sin crear valores ficticios",
  (value) => {
    expect(() => parseElectronicInvoiceXml(xml.replace("2026-10-20", value))).toThrow(
      /fecha de expedicion valida/
    );
  }
);
it("no confunde el NIT del adquirente con un proveedor sin identificar", () => {
  const invoice = parseElectronicInvoiceXml(
    xml.replace(/<AccountingSupplierParty>.*?<\/AccountingSupplierParty>/, "")
  );
  expect(invoice.supplierTaxId).toBeNull();
});
it("la base evita otra copia de la factura y permite el mismo número para otra empresa", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table gastos(id uuid default gen_random_uuid(),escuela_id uuid,numero_factura text)"
    );
    await db.exec(
      readFileSync(
        new URL(
          "../../supabase/migrations/20261020140453_email_invoice_identity.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    const identity = buildElectronicInvoiceIdentity(parseElectronicInvoiceXml(xml));
    const insert = (school: string) =>
      db.query(
        "insert into gastos(escuela_id,numero_factura,factura_identidad) values($1,'FE-1',$2)",
        [school, identity]
      );
    await insert("00000000-0000-4000-8000-000000000001");
    await expect(insert("00000000-0000-4000-8000-000000000001")).rejects.toThrow(/duplicate key/);
    await insert("00000000-0000-4000-8000-000000000002");
    expect((await db.query("select count(*)::int n from gastos")).rows).toEqual([{ n: 2 }]);
  } finally {
    await db.close();
  }
}, 15000);

it.each(["inv", "ubl-invoice", "factura.electronica"])(
  "lee la factura con prefijo %s dentro del adjunto del proveedor",
  (prefix) => {
    const embedded = xml
      .replace("<Invoice xmlns=", `<${prefix}:Invoice xmlns:${prefix}=`)
      .replace("</Invoice>", `</${prefix}:Invoice>`);
    const wrapped = `<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"><Attachment><ExternalReference><Description><![CDATA[${embedded}]]></Description></ExternalReference></Attachment></AttachedDocument>`;
    expect(parseElectronicInvoiceXml(embedded)).toMatchObject({
      invoiceNumber: "FE-1",
      documentType: "invoice",
    });
    const invoice = parseElectronicInvoiceXml(wrapped);
    expect(invoice).toMatchObject({
      invoiceNumber: "FE-1",
      documentType: "invoice",
      supplierTaxId: "900123456",
      customerTaxId: "901171550",
      payableAmount: 100,
    });
    expect(() => assertInvoiceCanBecomeExpense(invoice, "901171550-1")).not.toThrow();
  }
);

it("encuentra la factura en un ZIP que también trae otro XML", async () => {
  const zip = new JSZip();
  zip.file("factura.xml", "<ApplicationResponse><ID>ACK-1</ID></ApplicationResponse>");
  zip.file("documento.xml", xml);
  const content = await zip.generateAsync({ type: "uint8array" });
  expect(await parseElectronicInvoiceBinary({ fileName: "adjuntos.zip", content })).toMatchObject({
    invoiceNumber: "FE-1",
    xmlEntryName: "documento.xml",
    payableAmount: 100,
  });
});

it("detiene un XML comprimido que excede el límite de lectura", async () => {
  const zip = new JSZip();
  zip.file("factura.xml", `<Invoice>${"x".repeat(5 * 1024 * 1024)}</Invoice>`);
  const content = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  expect(content.byteLength).toBeLessThan(1024 * 1024);
  await expect(
    parseElectronicInvoiceBinary({ fileName: "demasiado-grande.zip", content })
  ).rejects.toThrow(/tamaño máximo/);
});
it("conserva el error de una factura inválida y no lo oculta usando otro XML", async () => {
  const zip = new JSZip();
  zip.file("factura.xml", xml.replace("2026-10-20", "2026-02-31"));
  zip.file("otra.xml", xml);
  const content = await zip.generateAsync({ type: "uint8array" });
  await expect(parseElectronicInvoiceBinary({ fileName: "invalida.zip", content })).rejects.toThrow(
    /fecha de expedicion valida/
  );
});
