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
  Puzzle,
} from "@/components/admin-ui";
import { query } from "@/lib/db";
import { config } from "@/lib/config";
import { getSession, isStaff } from "@/lib/auth";
import { SettingRow, PluginToggle } from "./forms";

export const dynamic = "force-dynamic";

interface SettingRecord {
  key: string;
  value: string;
}

interface PluginRecord {
  jar: string;
  name: string;
  description: string;
  enabled: number;
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
      { key: "hotel.name", label: "Nombre del hotel" },
      { key: "hotel.beta.enabled", label: "Modo beta", kind: "bool" },
      {
        key: "console.mode",
        label: "Modo consola",
        hint: "Indicador del comportamiento de la consola del mensajero.",
      },
    ],
  },
  {
    title: "Bienvenida",
    icon: "welcome",
    rows: [
      {
        key: "welcome.alert.enabled",
        label: "Alerta de bienvenida",
        kind: "bool",
        hint: "Mostrar una alerta a los jugadores al iniciar sesión.",
      },
      { key: "welcome.alert.message", label: "Mensaje de bienvenida" },
    ],
  },
  {
    title: "Salas",
    icon: "rooms",
    rows: [
      { key: "hotel.max.rooms.per.user", label: "Salas máx. / usuario" },
      { key: "hotel.max.rooms.per.user.hc", label: "Salas máx. / usuario (HC)" },
      { key: "hotel.room.user.max", label: "Usuarios máx. por sala" },
      { key: "maximum.bots.per.room", label: "Bots máx. por sala" },
      { key: "maximum.pets.per.room", label: "Mascotas máx. por sala" },
      {
        key: "hotel.wardrobe.enabled",
        label: "Armario",
        kind: "bool",
      },
    ],
  },
  {
    title: "Cámara",
    icon: "camera",
    rows: [
      {
        key: "imager.location.output.camera",
        label: "Ruta de salida de la cámara",
        hint: "Ruta del servidor donde se guardan las fotos.",
      },
      { key: "camera.url", label: "URL de la cámara" },
    ],
  },
  {
    title: "Chat y límites",
    icon: "chat",
    rows: [
      {
        key: "rcon.commands.enabled",
        label: "Comandos RCON",
        kind: "bool",
        hint: "Permitir comandos de consola remota desde el CMS.",
      },
      {
        key: "chat.flood.protection.length",
        label: "Protección antiflood (caracteres)",
      },
      { key: "message.too.long.length", label: "Longitud máx. del mensaje de chat" },
      { key: "floortext.maxlength", label: "Longitud máx. del texto del suelo" },
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
      <ACard title="Configuración" icon={<Settings2 size={15} strokeWidth={2} />}>
        <p style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>
          No tienes permiso para ver esta página.
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

  // Plugin registry (cms_plugins). May be absent if the migration hasn't run.
  let plugins: PluginRecord[] = [];
  let pluginsError = false;
  try {
    plugins = await query<PluginRecord>(
      "SELECT jar, name, description, enabled FROM cms_plugins ORDER BY name",
    );
  } catch {
    pluginsError = true;
  }

  return (
    <div>
      <PageHead eyebrow="Hotel" title="Configuración">
        <Tag color="cyan">db: habbo</Tag>
        <Tag color="gray">{settings.length} claves cargadas</Tag>
      </PageHead>

      {settingsError ? (
        <ACard
          title="Ajustes del emulador"
          icon={<Settings2 size={15} strokeWidth={2} />}
        >
          <p
            className="text-sm"
            style={{ color: "var(--rt-danger, #ff9aa6)" }}
          >
            No se pudo leer <code>emulator_settings</code>. La base de datos del
            emulador puede no estar disponible.
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

      <div className="mt-4">
        <ACard
          title="Plugins"
          icon={<Puzzle size={15} strokeWidth={2} />}
          actions={
            !pluginsError && (
              <span className="text-xs adim">
                {plugins.filter((p) => p.enabled).length} de {plugins.length} activados
              </span>
            )
          }
        >
          {pluginsError ? (
            <p className="text-sm" style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>
              Registro de plugins no disponible. Ejecuta <code>database/05-cms-plugins.sql</code> para
              crear la tabla <code>cms_plugins</code>.
            </p>
          ) : plugins.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>
              Todavía no hay plugins registrados. El emulador registra los plugins instalados en su
              próximo arranque.
            </p>
          ) : (
            <>
              <p className="mb-1 text-xs" style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>
                Activa o desactiva los plugins instalados que carga el emulador. Los cambios se aplican
                en el próximo reinicio del emulador.
              </p>
              <div className="flex flex-col">
                {plugins.map((p) => (
                  <PluginToggle
                    key={p.jar}
                    jar={p.jar}
                    name={p.name}
                    description={p.description}
                    enabled={p.enabled === 1}
                  />
                ))}
              </div>
            </>
          )}
        </ACard>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ACard
          title="Configuración del hotel"
          icon={<Home size={15} strokeWidth={2} />}
        >
          <p
            className="mb-2 text-xs"
            style={{ color: "var(--rt-ink-soft, #8b93a7)" }}
          >
            Valores de solo lectura obtenidos del entorno del CMS.
          </p>
          <TableWrap>
            <table className="dtable">
              <tbody>
                <tr>
                  <th scope="row">Nombre del hotel</th>
                  <td>{config.hotel.name}</td>
                </tr>
                <tr>
                  <th scope="row">URL del cliente Nitro</th>
                  <td>
                    <code>{config.hotel.clientUrl}</code>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Base de datos</th>
                  <td>
                    <code>habbo</code>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Figura predeterminada</th>
                  <td>
                    <code>{config.hotel.defaultLook}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
        </ACard>

        <ACard
          title="Cómo se aplican los cambios"
          icon={<Settings2 size={15} strokeWidth={2} />}
        >
          <div
            className="flex flex-col gap-2 text-[13px]"
            style={{ color: "var(--rt-ink-soft, #8b93a7)" }}
          >
            <div className="flex items-center gap-2">
              <Tag color="cyan">CMS</Tag>
              <span>
                El CMS escribe en la base de datos compartida <code>habbo</code>; no
                tiene una conexión de socket directa con el emulador.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag color="violet">SSO</Tag>
              <span>
                Los jugadores pasan a Nitro en{" "}
                <code>{config.hotel.clientUrl}</code> con un ticket de
                autenticación de un solo uso.
              </span>
            </div>
            <p>
              Arcturus aplica la mayoría de los ajustes en su próximo reinicio o
              recarga. Guarda cada fila y luego reinicia el emulador.
            </p>
          </div>
        </ACard>
      </div>
    </div>
  );
}
