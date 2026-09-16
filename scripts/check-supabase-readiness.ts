export {};

const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket =
  process.env.CHECK_DI_SUPABASE_DOCUMENT_BUCKET?.trim() || "check-di-documents";

const missing = [
  !url ? "CHECK_DI_SUPABASE_URL" : null,
  !serviceRoleKey ? "CHECK_DI_SUPABASE_SERVICE_ROLE_KEY" : null,
].filter(Boolean);

if (missing.length > 0) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        configured: false,
        missing,
        message:
          "Supabase remote chưa được cấu hình. Apply migration rồi đặt credential server-only trong .env.local.",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const headers = {
  apikey: serviceRoleKey!,
  authorization: `Bearer ${serviceRoleKey!}`,
};

async function check(name: string, target: string) {
  try {
    const response = await fetch(target, {
      headers,
      cache: "no-store",
    });
    return {
      name,
      ok: response.ok,
      status: response.status,
      detail: response.ok ? undefined : (await response.text()).slice(0, 300),
    };
  } catch (error) {
    return {
      name,
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

const checks = await Promise.all([
  check("database", `${url}/rest/v1/check_di_batches?select=id&limit=1`),
  check(
    "private_document_bucket",
    `${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`,
  ),
]);

const ok = checks.every((item) => item.ok);
console.log(
  JSON.stringify(
    {
      ok,
      configured: true,
      driver: process.env.CHECK_DI_DB_DRIVER || "file",
      documentStorageDriver:
        process.env.CHECK_DI_DOCUMENT_STORAGE_DRIVER ||
        (process.env.CHECK_DI_DB_DRIVER === "supabase" ? "supabase" : "file"),
      bucket,
      checks,
    },
    null,
    2,
  ),
);

if (!ok) process.exitCode = 1;
