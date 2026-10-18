// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateWompiEventChecksum, type WompiEventBody } from "./wompi";
import crypto from "crypto";

describe("validateWompiEventChecksum", () => {
  const secret = "prod_events_secret_12345";

  it("validates valid event checksum correctly with constant-time equality", () => {
    const timestamp = 1729200000;
    const propertyValues = "trans_abcAPPROVED100000";
    const expected = crypto
      .createHash("sha256")
      .update(`${propertyValues}${timestamp}${secret}`)
      .digest("hex");

    const event: WompiEventBody = {
      event: "transaction.updated",
      data: {
        transaction: {
          id: "trans_abc",
          status: "APPROVED",
          amount_in_cents: 100000,
        },
      },
      timestamp,
      signature: {
        properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
        checksum: expected,
      },
    };

    expect(validateWompiEventChecksum(event, secret)).toBe(true);
  });

  it("rejects forged or modified checksums", () => {
    const event: WompiEventBody = {
      event: "transaction.updated",
      data: {
        transaction: {
          id: "trans_abc",
          status: "APPROVED",
        },
      },
      timestamp: 1729200000,
      signature: {
        properties: ["transaction.id", "transaction.status"],
        checksum: "0000000000000000000000000000000000000000000000000000000000000000",
      },
    };

    expect(validateWompiEventChecksum(event, secret)).toBe(false);
  });

  it("rejects when signature properties are empty or invalid", () => {
    const event: WompiEventBody = {
      event: "transaction.updated",
      data: {},
      timestamp: 1729200000,
      signature: {
        properties: [],
        checksum: "abc",
      },
    };

    expect(validateWompiEventChecksum(event, secret)).toBe(false);
  });
});
