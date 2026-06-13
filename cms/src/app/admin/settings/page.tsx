import { Panel, Badge } from "@/components/ui";
import { query } from "@/lib/db";
import { config } from "@/lib/config";
import { getSession, isStaff } from "@/lib/auth";
import { SettingRow } from "./forms";

export const dynamic = "force-dynamic";

interface SettingRecord {
  key: string;
  value: string;
}

const CURATED_KEYS = [
  "hotel.name",
  "hotel.max.rooms.per.user",
  "hotel.beta.enabled",
  "console.mode",
  "welcome.alert.enabled",
];

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return (
      <Panel>
        <h2 className="rt-display mb-2 text-lg">Settings</h2>
        <p>You do not have permission to view this page.</p>
      </Panel>
    );
  }

  // emulator_settings may be unavailable (DB down, table missing). Be defensive.
  let settings: SettingRecord[] = [];
  let settingsError = false;
  try {
    settings = await query<SettingRecord>(
      "SELECT `key`, `value` FROM emulator_settings WHERE `key` IN (:k1, :k2, :k3, :k4, :k5) ORDER BY `key`",
      {
        k1: CURATED_KEYS[0],
        k2: CURATED_KEYS[1],
        k3: CURATED_KEYS[2],
        k4: CURATED_KEYS[3],
        k5: CURATED_KEYS[4],
      },
    );
  } catch {
    settingsError = true;
    settings = [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="rt-display text-2xl">⚙️ Hotel settings</h2>
        <p style={{ color: "var(--rt-ink-soft)" }}>
          Edit a curated set of emulator settings. Most changes require an
          emulator restart to take effect.
        </p>
      </div>

      <Panel>
        <h3 className="rt-display mb-3 text-lg">Emulator settings</h3>
        {settingsError ? (
          <p style={{ color: "var(--rt-danger)" }}>
            Could not read <code>emulator_settings</code>. The emulator database
            may be unavailable.
          </p>
        ) : settings.length === 0 ? (
          <p style={{ color: "var(--rt-ink-soft)" }}>
            None of the curated settings were found in the database.
          </p>
        ) : (
          <div className="flex flex-col">
            {settings.map((s) => (
              <SettingRow key={s.key} settingKey={s.key} value={s.value} />
            ))}
          </div>
        )}
      </Panel>

      <Panel muted>
        <h3 className="rt-display mb-3 text-lg">Hotel configuration</h3>
        <p className="mb-3 text-sm" style={{ color: "var(--rt-ink-soft)" }}>
          Read-only values sourced from the CMS environment.
        </p>
        <table className="rt-table w-full">
          <tbody>
            <tr>
              <td className="font-bold">Hotel name</td>
              <td>{config.hotel.name}</td>
            </tr>
            <tr>
              <td className="font-bold">Nitro client URL</td>
              <td>
                <code>{config.hotel.clientUrl}</code>
              </td>
            </tr>
            <tr>
              <td className="font-bold">Default look</td>
              <td>
                <code>{config.hotel.defaultLook}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel muted>
        <h3 className="rt-display mb-3 text-lg">Connection status</h3>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge color="var(--rt-accent)">CMS</Badge>
            <span>
              The CMS talks to the emulator indirectly through the shared{" "}
              <code>arcturus</code> MySQL database.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="var(--rt-blue)">SSO</Badge>
            <span>
              Players are handed off to the Nitro client at{" "}
              <code>{config.hotel.clientUrl}</code> with a single-use auth
              ticket.
            </span>
          </div>
          <p style={{ color: "var(--rt-ink-soft)" }}>
            There is no direct socket link between the CMS and the emulator;
            settings written here are picked up by Arcturus on its next restart
            or reload.
          </p>
        </div>
      </Panel>
    </div>
  );
}
