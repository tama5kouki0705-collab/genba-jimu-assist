export function shouldRetryWorkLogWithoutVoiceReportColumns(message: string) {
  return /trade|work_start_at|work_end_at|schema cache|column/i.test(message);
}
