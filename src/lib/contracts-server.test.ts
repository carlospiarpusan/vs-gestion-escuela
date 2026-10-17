import { describe, expect, it } from "vitest";
import {
  extractOccupiedContractSequence,
  findSmallestAvailableContractSequence,
  listOccupiedContractSequences,
} from "./contracts-server";

describe("contract sequence reconciliation", () => {
  it("fills the first real gap instead of trusting the stored counter", () => {
    const baseRows = Array.from({ length: 684 }, (_, index) => ({
      numero_contrato: `COM-${String(index + 1).padStart(4, "0")}`,
      prefijo_contrato: "COM",
      consecutivo_contrato: index + 1,
    }));

    const occupied = listOccupiedContractSequences(
      [
        ...baseRows,
        {
          numero_contrato: "COM-0685",
          prefijo_contrato: "COM",
          consecutivo_contrato: 685,
        },
        {
          numero_contrato: "COM-0686",
          prefijo_contrato: null,
          consecutivo_contrato: null,
        },
        {
          numero_contrato: "COM-0687",
          prefijo_contrato: "COM",
          consecutivo_contrato: "687",
        },
        {
          numero_contrato: "COM-0689",
          prefijo_contrato: "COM",
          consecutivo_contrato: 689,
        },
      ],
      "COM"
    );

    expect(occupied.at(-1)).toBe(689);
    expect(findSmallestAvailableContractSequence(occupied)).toBe(688);
  });

  it("keeps cancelled historical contracts occupied when the row still exists", () => {
    const baseRows = Array.from({ length: 11 }, (_, index) => ({
      numero_contrato: `CAR-${String(index + 1).padStart(4, "0")}`,
      prefijo_contrato: "CAR",
      consecutivo_contrato: index + 1,
    }));

    const occupied = listOccupiedContractSequences(
      [
        ...baseRows,
        {
          numero_contrato: "CAR-0012",
          prefijo_contrato: "CAR",
          consecutivo_contrato: 12,
        },
        {
          numero_contrato: "CAR-0013",
          prefijo_contrato: "CAR",
          consecutivo_contrato: 13,
        },
      ],
      "CAR"
    );

    expect(findSmallestAvailableContractSequence(occupied)).toBe(14);
  });

  it("does not rewind below the first known sequence for a school", () => {
    const occupied = listOccupiedContractSequences(
      [
        {
          numero_contrato: "COM-0002",
          prefijo_contrato: "COM",
          consecutivo_contrato: 2,
        },
        {
          numero_contrato: "COM-0128",
          prefijo_contrato: "COM",
          consecutivo_contrato: 128,
        },
        {
          numero_contrato: "COM-0129",
          prefijo_contrato: "COM",
          consecutivo_contrato: 129,
        },
        {
          numero_contrato: "COM-0131",
          prefijo_contrato: "COM",
          consecutivo_contrato: 131,
        },
      ],
      "COM"
    );

    expect(findSmallestAvailableContractSequence(occupied)).toBe(130);
  });

  it("respects a configured start sequence instead of returning to old gaps", () => {
    const occupied = listOccupiedContractSequences(
      [
        ...Array.from({ length: 275 }, (_, index) => ({
          numero_contrato: `COM-${String(index + 303).padStart(4, "0")}`,
          prefijo_contrato: "COM",
          consecutivo_contrato: index + 303,
        })),
        ...Array.from({ length: 115 }, (_, index) => ({
          numero_contrato: `COM-${String(index + 579).padStart(4, "0")}`,
          prefijo_contrato: "COM",
          consecutivo_contrato: index + 579,
        })),
      ],
      "COM"
    );

    expect(findSmallestAvailableContractSequence(occupied)).toBe(578);
    expect(findSmallestAvailableContractSequence(occupied, 694)).toBe(694);
  });

  it("can recover occupied sequences from legacy parseable contract numbers", () => {
    expect(
      extractOccupiedContractSequence(
        {
          numero_contrato: "MOT-0042",
          prefijo_contrato: null,
          consecutivo_contrato: null,
        },
        "MOT"
      )
    ).toBe(42);
  });

  it("ignores contracts from other prefixes", () => {
    expect(
      extractOccupiedContractSequence(
        {
          numero_contrato: "MOT-0042",
          prefijo_contrato: "MOT",
          consecutivo_contrato: 42,
        },
        "COM"
      )
    ).toBeNull();
  });
});
