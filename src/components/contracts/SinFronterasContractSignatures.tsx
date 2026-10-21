export default function SinFronterasContractSignatures({
  studentName,
  schoolName,
  address,
  phone,
  guardian,
}: {
  studentName: string;
  schoolName: string;
  address: string | null;
  phone: string | null;
  guardian: boolean;
}) {
  return (
    <section className="mt-6 break-inside-avoid text-[10px] leading-[14px]">
      <div className="grid grid-cols-2 gap-8 text-center">
        <div>
          <div className="mx-auto mt-8 mb-1 w-4/5 border-b border-black" />
          <p>Firma Estudiante</p>
          <p className="font-bold">{studentName}</p>
        </div>
        <div>
          <div className="mx-auto mt-8 mb-1 w-4/5 border-b border-black" />
          <p>Firma CEA {schoolName.toUpperCase()}</p>
        </div>
      </div>
      {guardian && (
        <div className="mt-5">
          <p>Firma Acudiente ______________________________</p>
          <p>(para menores de edad) C.C. No. __________________</p>
        </div>
      )}
      <p className="mt-3">Adjuntar fotocopia cédula de ciudadanía</p>
      <p>Dirección: {address || "________________________"}</p>
      <p>No. Celular: {phone || "________________________"}</p>
    </section>
  );
}
