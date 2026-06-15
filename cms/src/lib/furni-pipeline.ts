import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute, queryOne } from "@/lib/db";
import { reloadItems, reloadCatalog } from "@/lib/rcon";

const run = promisify(execFile);
const NITRO = process.env.NITRO_CONTAINER || "retrotv-nitro";

/** docker wrapper with a generous buffer (conversion logs) and timeout. */
function docker(args: string[], timeout = 150_000) {
  return run("docker", args, { timeout, maxBuffer: 32 * 1024 * 1024 });
}

export interface NewFurniInput {
  swf: Buffer;
  className: string;
  name: string;
  wall: boolean;
  xdim: number;
  ydim: number;
  stackHeight: number;
  category: string;
  revision: number;
  siton: boolean;
  layon: boolean;
  standon: boolean;
  description: string;
}

export interface NewFurniResult {
  id: number;
  reloaded: boolean;
}

/**
 * Register a brand-new furni from a .swf into the running hotel — the same
 * pipeline as `scripts/add-furni.mjs`, callable from a server action:
 *   convert SWF → .nitro, deploy, register in furnidata.xml + FurnitureData.json,
 *   insert items_base, then best-effort hot-reload the emulator.
 * Throws Error(message) on any failure; the caller surfaces it to the admin.
 */
export async function addFurniFromSwf(input: NewFurniInput): Promise<NewFurniResult> {
  const { swf, className, name } = input;
  const section = input.wall ? "wallitemtypes" : "roomitemtypes";
  const baseType = input.wall ? "i" : "s";

  // guard: unique classname
  const exists = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM items_base WHERE item_name = :c",
    { c: className },
  );
  if ((exists?.n ?? 0) > 0) {
    throw new Error(`Ya existe un mueble llamado "${className}".`);
  }

  // pick a free furni/sprite id
  const idRow = await queryOne<{ next: number }>(
    "SELECT GREATEST(COALESCE(MAX(id),0), COALESCE(MAX(sprite_id),0)) + 1 AS next FROM items_base",
  );
  const id = Number(idRow?.next ?? 0);
  if (!Number.isInteger(id) || id <= 0) throw new Error("No se pudo asignar un ID de mueble.");

  // 1) stage SWF + convert -> .nitro
  const tmp = join(tmpdir(), `retrotv-${className}-${id}.swf`);
  await writeFile(tmp, swf);
  const STAGE = "/app/nitro-converter/assets/swf/furniture";
  try {
    await docker(["exec", NITRO, "sh", "-c", `mkdir -p ${STAGE} && rm -f ${STAGE}/*.swf`]);
    await docker(["cp", tmp, `${NITRO}:${STAGE}/${className}.swf`]);
    await docker([
      "exec", NITRO, "bash", "-c",
      "cd /app/nitro-converter && yarn ts-node-dev --transpile-only src/Main.ts --convert-swf",
    ]);
  } catch (e) {
    throw new Error(`Fallo al convertir el SWF: ${(e as Error).message}`);
  } finally {
    await unlink(tmp).catch(() => {});
  }

  const nitroPath = `/app/nitro-converter/assets/bundled/furniture/${className}.nitro`;
  const { stdout: check } = await docker(["exec", NITRO, "sh", "-c", `test -f ${nitroPath} && echo yes || echo no`]);
  if (check.trim() !== "yes") {
    throw new Error("La conversión no produjo un .nitro. ¿Es un SWF de mueble válido de Habbo?");
  }

  // 2) deploy .nitro to the asset server
  await docker(["exec", NITRO, "sh", "-c",
    `mkdir -p /app/nitro-assets/bundled/furniture && cp ${nitroPath} /app/nitro-assets/bundled/furniture/${className}.nitro`]);

  // 3) register in FurnitureData.json (client metadata)
  const entry = {
    id, classname: className, revision: input.revision, category: input.category, defaultdir: 0,
    xdim: input.xdim, ydim: input.ydim, partcolors: { color: ["#0", "#0", "#0"] },
    name, description: input.description, adurl: "", offerid: -1, buyout: false,
    rentofferid: -1, rentbuyout: false, bc: false, excludeddynamic: false, customparams: "",
    specialtype: 1, canstandon: input.standon, cansiton: input.siton, canlayon: input.layon,
    furniline: "", environment: "", rare: false,
  };
  await docker(["exec", "-e", `ENTRY=${JSON.stringify(entry)}`, "-e", `SECTION=${section}`, NITRO, "node", "-e", `
    const fs=require('fs'); const p='/app/nitro-assets/gamedata/FurnitureData.json';
    const d=JSON.parse(fs.readFileSync(p,'utf8')); const e=JSON.parse(process.env.ENTRY), s=process.env.SECTION;
    d[s]=d[s]||{furnitype:[]}; d[s].furnitype=d[s].furnitype.filter(f=>f.classname!==e.classname); d[s].furnitype.push(e);
    fs.writeFileSync(p, JSON.stringify(d));
  `]);

  // 3b) register in furnidata.xml (source of truth, survives future re-converts)
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const xml =
    `<furnitype id="${id}" classname="${className}">` +
    `<revision>${input.revision}</revision><category>${input.category}</category><defaultdir>0</defaultdir>` +
    `<xdim>${input.xdim}</xdim><ydim>${input.ydim}</ydim>` +
    `<partcolors><color>#0</color><color>#0</color><color>#0</color></partcolors>` +
    `<name>${safe(name)}</name><description>${safe(input.description)}</description>` +
    `<adurl></adurl><offerid>-1</offerid><buyout>0</buyout><rentofferid>-1</rentofferid><rentbuyout>0</rentbuyout>` +
    `<bc>0</bc><excludeddynamic>0</excludeddynamic><customparams></customparams><specialtype>1</specialtype>` +
    `<canstandon>${input.standon ? 1 : 0}</canstandon><cansiton>${input.siton ? 1 : 0}</cansiton><canlayon>${input.layon ? 1 : 0}</canlayon></furnitype>`;
  await docker(["exec", "-e", `XML=${xml}`, "-e", `SECTION=${section}`, "-e", `CLASS=${className}`, NITRO, "node", "-e", `
    const fs=require('fs'); const p='/app/nitro-swf/gamedata/furnidata.xml';
    if (!fs.existsSync(p)) process.exit(0);
    let x=fs.readFileSync(p,'utf8'); if (x.includes('classname="'+process.env.CLASS+'"')) process.exit(0);
    const o='<'+process.env.SECTION+'>'; if (x.includes(o)) { fs.writeFileSync(p, x.replace(o, o+process.env.XML)); }
  `]).catch(() => {});

  // 4) insert items_base (emulator definition)
  await execute(
    `INSERT INTO items_base
       (id, sprite_id, public_name, item_name, type, width, length, stack_height,
        allow_stack, allow_sit, allow_lay, allow_walk, interaction_type, interaction_modes_count, customparams)
     VALUES
       (:id, :id, :name, :class, :type, :x, :y, :z, 1, :siton, :layon, :standon, 'default', 1, '')`,
    {
      id, name, class: className, type: baseType,
      x: input.xdim, y: input.ydim, z: input.stackHeight,
      siton: input.siton ? 1 : 0, layon: input.layon ? 1 : 0, standon: input.standon ? 1 : 0,
    },
  );

  // 5) best-effort hot reload (items + catalog)
  const items = await reloadItems();
  await reloadCatalog();

  return { id, reloaded: items.pushed };
}
