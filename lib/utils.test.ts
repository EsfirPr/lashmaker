import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  createPublicBookingUrl,
  getBookingCancelDeadline,
  getBookingStartLeadDeadline,
  isBookingCancelable,
  isSlotAvailableForBooking
} from "./utils.ts";

const slot = {
  slot_date: "2026-06-10",
  start_time: "15:00:00"
};

describe("utils", () => {
  it("Should_ReturnTrue_When_SlotIsBeforeLeadDeadline", () => {
    const leadDeadline = getBookingStartLeadDeadline(slot);
    const now = new Date(leadDeadline.getTime() - 1);

    assert.equal(isSlotAvailableForBooking(slot, now), true);
  });

  it("Should_ReturnFalse_When_SlotIsAfterLeadDeadline", () => {
    const leadDeadline = getBookingStartLeadDeadline(slot);
    const now = new Date(leadDeadline.getTime() + 1);

    assert.equal(isSlotAvailableForBooking(slot, now), false);
  });

  it("Should_ReturnTrue_When_CancellationBeforeDeadline", () => {
    const cancelDeadline = getBookingCancelDeadline(slot);
    const now = new Date(cancelDeadline.getTime() - 1);

    assert.equal(isBookingCancelable(slot, now), true);
  });

  it("Should_ReturnFalse_When_CancellationAtDeadline", () => {
    const cancelDeadline = getBookingCancelDeadline(slot);
    const now = new Date(cancelDeadline.getTime());

    assert.equal(isBookingCancelable(slot, now), false);
  });

  it("Should_BuildPublicBookingUrl_When_BaseUrlIsMissing", () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    try {
      assert.equal(
        createPublicBookingUrl("token-123"),
        "http://localhost:3000/booking/token-123"
      );
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = original;
      }
    }
  });

  it("Should_AvoidDoubleSlash_When_BaseUrlEndsWithTrailingSlash", () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/";

    try {
      assert.equal(
        createPublicBookingUrl("token-123"),
        "https://example.com/booking/token-123"
      );
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = original;
      }
    }
  });
});
