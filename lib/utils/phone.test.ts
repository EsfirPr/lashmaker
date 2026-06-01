import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { normalizePhone } from "./phone.ts";

describe("normalizePhone", () => {
  it("Should_NormalizePhone_When_InputStartsWith8And11Digits", () => {
    const normalized = normalizePhone("8 (999) 123-45-67");

    assert.equal(normalized, "+79991234567");
  });

  it("Should_NormalizePhone_When_InputStartsWith9And10Digits", () => {
    const normalized = normalizePhone("9991234567");

    assert.equal(normalized, "+79991234567");
  });

  it("Should_ThrowError_When_InputHasUnsupportedCountryCode", () => {
    assert.throws(
      () => normalizePhone("+1 (202) 555-0101"),
      /Введите корректный номер телефона/
    );
  });

  it("Should_ThrowError_When_InputContainsNoDigits", () => {
    assert.throws(
      () => normalizePhone("abc"),
      /Введите корректный номер телефона/
    );
  });
});
