import test from "node:test";
import assert from "node:assert/strict";

import { shouldRetryWorkLogWithoutVoiceReportColumns } from "../lib/remote-fallbacks.ts";

test("shouldRetryWorkLogWithoutVoiceReportColumns detects 008 missing column errors", () => {
  assert.equal(shouldRetryWorkLogWithoutVoiceReportColumns("Could not find the 'work_start_at' column of 'work_logs' in the schema cache"), true);
  assert.equal(shouldRetryWorkLogWithoutVoiceReportColumns("column work_end_at of relation work_logs does not exist"), true);
  assert.equal(shouldRetryWorkLogWithoutVoiceReportColumns("Could not find the 'trade' column in schema cache"), true);
});

test("shouldRetryWorkLogWithoutVoiceReportColumns ignores unrelated errors", () => {
  assert.equal(shouldRetryWorkLogWithoutVoiceReportColumns("duplicate key value violates unique constraint"), false);
});
