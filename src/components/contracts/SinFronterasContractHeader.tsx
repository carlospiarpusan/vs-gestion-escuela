import Image from "next/image";
import type { TipoPlantillaContratoEscuela } from "@/types/database";
import { CONTRACT_FORMATION_LABELS, SIN_FRONTERAS_FORM } from "@/lib/contract-template";

export default function SinFronterasContractHeader({
  type,
  contractNumber,
  page,
}: {
  type: TipoPlantillaContratoEscuela;
  contractNumber: string;
  page: number;
}) {
  return (
    <header className="text-black">
      <table className="w-full table-fixed border-collapse border border-black text-[9px]">
        <tbody>
          <tr>
            <td className="w-[24%] border border-black p-2 align-middle">
              <Image
                src="/contracts/sin-fronteras/image1.png"
                alt="Escuela de Conducción Sin Fronteras"
                width={857}
                height={265}
                unoptimized
                className="h-auto w-full"
              />
            </td>
            <td className="border border-black p-2 text-center align-middle font-bold uppercase">
              Contrato de formación en conducción {CONTRACT_FORMATION_LABELS[type]}
            </td>
            <td className="w-[25%] border border-black p-2 align-middle leading-4">
              <p className="font-bold">{SIN_FRONTERAS_FORM.code}</p>
              <p>Fecha de Emisión: {SIN_FRONTERAS_FORM.issuedOn}</p>
              <p>Versión {SIN_FRONTERAS_FORM.version}</p>
              <p>Página {page} de 2</p>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-right text-[11px] font-bold">Contrato N° {contractNumber}</p>
    </header>
  );
}
