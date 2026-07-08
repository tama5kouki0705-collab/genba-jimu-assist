import test from "node:test";
import assert from "node:assert/strict";

import { autoWorkTimes } from "../lib/calendar-domain.ts";

test("autoWorkTimes uses default work times when schedule times are empty", () => {
  assert.deepEqual(autoWorkTimes("", ""), {
    workStartTime: "7:55",
    workEndTime: "17:30"
  });
});

test("autoWorkTimes starts five minutes before the scheduled start", () => {
  assert.equal(autoWorkTimes("8:00", "").workStartTime, "7:55");
  assert.equal(autoWorkTimes("07:30", "").workStartTime, "7:25");
});

test("autoWorkTimes ends thirty minutes after the scheduled end", () => {
  assert.equal(autoWorkTimes("", "17:00").workEndTime, "17:30");
  assert.equal(autoWorkTimes("", "16:45").workEndTime, "17:15");
});
