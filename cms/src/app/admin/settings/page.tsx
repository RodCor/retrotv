import {
  PageHead,
  ACard,
  Tag,
  TableWrap,
  Settings2,
  Sparkles,
  Home,
  Camera,
  ShieldAlert,
} from "@/components/admin-ui";
import { query } from "@/lib/db";
import { config } from "@/lib/config";
import { getSession, isStaff } from "@/lib/auth";
import { SettingRow } from "./forms";

export const dynamic = "force-dynamic";

interface SettingRecord {
  key: string;
  value: string;
}

type RowKind = "text" | "bool";
interface RowDef {
  key: string;
  label: string;
  kind?: RowKind;
  hint?: string;
}

// Curated QoL keys, grouped by theme. Every key here is also gated in actions.ts.
const GROUPS: { title: string; icon: "general" | "welcome" | "rooms" | "camera" | "chat"; rows: RowDef[] }[] = [
  {
    title: "General",
    icon: "general",
    rows: [
      { key: "hotel.name", label: "Hotel name" },
      { key: "hotel.beta.enabled", label: "Beta mode", kind: "bool" },
      {
        key: "console.mode",
        label: "Console mode",
        hint: "Messenger console behaviour flag.",
      },
    ],
  },
  {
    title: "Welcome",
    icon: "welcome",
    rows: [
      {
        key: "welcome.alert.enabled",
        label: "Welcome alert",
        kind: "bool",
        hint: "Show an alert to players on login.",
      },
      { key: "welcome.alert.message", label: "Welcome message" },
    ],
  },
  {
    title: "Rooms",
    icon: "rooms",
    rows: [
      { key: "hotel.max.rooms.per.user", label: "Max rooms / user" },
      { key: "hotel.max.rooms.per.user.hc", label: "Max rooms / user (HC)" },
      { key: "hotel.room.user.max", label: "Max users per room" },
      { key: "maximum.bots.per.room", label: "Max bots per room" },
      { key: "maximum.pets.per.room", label: "Max pets per room" },
      {
        key: "hotel.wardrobe.enabled",
        label: "Wardrobe",
        kind: "bool",
      },
    ],
  },
  {
    title: "Camera",
    icon: "camera",
    rows: [
      {
        key: "imager.location.output.camera",
        label: "Camera output path",
        hint: "Server path where photos are written.",
      },
      { key: "camera.url", label: "Camera URL" },
    ],
  },
  {
    title: "Chat & limits",
    icon: "chat",
    rows: [
      {
        key: "rcon.commands.enabled",
        label: "RCON commands",
        kind: "bool",
        hint: "Allow remote console commands from the CMS.",
      },
      {
        key: "chat.flood.protection.length",
        label: "Flood protection (chars)",
      },
      { key: "message.too.long.length", label: "Max chat message length" },
      { key: "floortext.maxlength", label: "Max floor text length" },
    ],
  },
];

const CURATED_KEYS = GROUPS.flatMap((g) => g.rows.map((r) => r.key));

const GROUP_ICON = {
  general: <Settings2 size={15} strokeWidth={2} />,
  welcome: <Sparkles size={15} strokeWidth={2} />,
  rooms: <Home size={15} strokeWidth={2} />,
  camera: <Camera size={15} strokeWidth={2} />,
  chat: <ShieldAlert size={15} strokeWidth={2} />,
} as const;

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return (
      <ACard title="Settings" icon={<Settings2 size={15} strokeWidth={2} />}>
        <p style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>
          You do not have permission to view this page.
        </p>
      </ACard>
    );
  }

  // emulator_settings may be unavailable (DB down, table missing). Be defensive.
  let settings: SettingRecord[] = [];
  let settingsError = false;
  try {
    const placeholders = CURATED_KEYS.map((_, i) => `:k${i}`).join(", ");
    const params: Record<string, string> = {};
    CURATED_KEYS.forEach((k, i) => {
      params[`k${i}`] = k;
    });
    settings = await query<SettingRecord>(
      `SELECT \`key\`, \`value\` FROM emulator_settings WHERE \`key\` IN (${placeholders})`,
      params,
    );
  } catch {
    settingsError = true;
    settings = [];
  }

  const byKey = new Map(settings.map((s) => [s.key, s.value]));

  return (
    <div>
      <PageHead eyebrow="Hotel" title="Settings">
        <Tag color="cyan">db: habbo</Tag>
        <Tag color="gray">{settings.length} keys loaded</Tag>
      </PageHead>

      {settingsError ? (
        <ACard
          title="Emulator settings"
          icon={<Settings2 size={15} strokeWidth={2} />}
        >
          <p
            className="text-sm"
            style={{ color: "var(--rt-danger, #ff9aa6)" }}
          >
            Could not read <code>emulator_settings</code>. The emulator database
            may be unavailable.
          </p>
        </ACard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {GROUPS.map((group) => {
            const rows = group.rows.filter((r) => byKey.has(r.key));
            if (rows.length === 0) return null;
            return (
              <ACard
                key={group.title}
                title={group.title}
                icon={GROUP_ICON[group.icon]}
              >
                <div className="flex flex-col">
                  {rows.map((r) => (
                    <SettingRow
                      key={r.key}
                      settingKey={r.key}
                      label={r.label}
                      kind={r.kind ?? "text"}
                      hint={r.hint}
                      value={byKey.get(r.key) ?? ""}
                    />
                  ))}
                </div>
              </ACard>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ACard
          title="Hotel configuration"
          icon={<Home size={15} strokeWidth={2} />}
        >
          <p
            className="mb-2 text-xs"
            style={{ color: "var(--rt-ink-soft, #8b93a7)" }}
          >
            Read-only values sourced from the CMS environment.
          </p>
          <TableWrap>
            <table className="dtable">
              <tbody>
                <tr>
                  <th scope="row">Hotel name</th>
                  <td>{config.hotel.name}</td>
                </tr>
                <tr>
                  <th scope="row">Nitro client URL</th>
                  <td>
                    <code>{config.hotel.clientUrl}</code>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Database</th>
                  <td>
                    <code>habbo</code>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Default look</th>
                  <td>
                    <code>{config.hotel.defaultLook}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
        </ACard>

        <ACard
          title="How changes apply"
          icon={<Settings2 size={15} strokeWidth={2} />}
        >
          <div
            className="flex flex-col gap-2 text-[13px]"
            style={{ color: "var(--rt-ink-soft, #8b93a7)" }}
          >
            <div className="flex items-center gap-2">
              <Tag color="cyan">CMS</Tag>
              <span>
                The CMS writes to the shared <code>habbo</code> database; it has
                no direct socket link to the emulator.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag color="violet">SSO</Tag>
              <span>
                Players hand off to Nitro at{" "}
                <code>{config.hotel.clientUrl}</code> with a single-use auth
                ticket.
              </span>
            </div>
            <p>
              Most settings are picked up by Arcturus on its next restart or
              reload. Save each row, then restart the emulator.
            </p>
          </div>
        </ACard>
      </div>
    </div>
  );
}
