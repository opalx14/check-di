export {};

const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRoleKey) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        configured: false,
        missing: [
          !url ? "CHECK_DI_SUPABASE_URL" : null,
          !serviceRoleKey ? "CHECK_DI_SUPABASE_SERVICE_ROLE_KEY" : null,
        ].filter(Boolean),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
};

async function checkLane(name: string, view: string) {
  const response = await fetch(`${url}/rest/v1/${view}?select=*&limit=1`, {
    headers,
    cache: "no-store",
  });
  return {
    name,
    view,
    ok: response.ok,
    status: response.status,
    detail: response.ok ? undefined : (await response.text()).slice(0, 300),
  };
}

const checks = await Promise.all([
  checkLane("business_track", "check_di_business_track_v"),
  checkLane("blockchain_track", "check_di_blockchain_track_v"),
]);
const ok = checks.every((item) => item.ok);

console.log(
  JSON.stringify(
    {
      ok,
      configured: true,
      architecture: "one-core-two-data-lanes",
      checks,
    },
    null,
    2,
  ),
);

if (!ok) process.exitCode = 1;
