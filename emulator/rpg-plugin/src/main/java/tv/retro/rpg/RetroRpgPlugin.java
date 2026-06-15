package tv.retro.rpg;

import com.eu.habbo.Emulator;
import com.eu.habbo.habbohotel.rooms.Room;
import com.eu.habbo.habbohotel.rooms.RoomTile;
import com.eu.habbo.habbohotel.rooms.RoomUnit;
import com.eu.habbo.habbohotel.users.Habbo;
import com.eu.habbo.plugin.EventHandler;
import com.eu.habbo.plugin.EventListener;
import com.eu.habbo.plugin.HabboPlugin;
import com.eu.habbo.plugin.events.roomunit.RoomUnitSetGoalEvent;
import com.eu.habbo.plugin.events.users.UserTalkEvent;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * RetroTV RPG framework — combat slice (server-authoritative, command-driven).
 *
 * Per-room, off by default. The room OWNER enables RPG mode (:rpg on, persisted in
 * rooms.rpg_enabled); then anyone can run turn-based fights entirely via chat
 * commands. A single room can host SEVERAL simultaneous battles — each player
 * belongs to at most one, so combat commands resolve to the player's own battle.
 * Combat state is in-memory and authoritative on the server; only the enable flag
 * and ruleset choice persist in the database. See docs/RPG-FRAMEWORK.md.
 *
 * Commands: :rpg on|off · :rpg ruleset · :rpg new · :rpg join [#] · :rpg start [#] ·
 *           :rpg list · :rpg attack &lt;nombre&gt; · :rpg cast &lt;hab&gt; &lt;obj&gt; ·
 *           :rpg pass · :rpg status [#] · :rpg end [#|all] · :rpg help
 */
public class RetroRpgPlugin extends HabboPlugin implements EventListener {

    private static final int TURN_SECONDS = 90;
    /** roomId → the live battles in that room (an "arena"). */
    private final Map<Integer, List<Combat>> arenas = new ConcurrentHashMap<>();
    private final Map<Integer, Map<String, Ability>> abilityCache = new ConcurrentHashMap<>();

    @Override public void onEnable() {
        Emulator.getPluginManager().registerEvents(this, this);
        System.out.println("[RetroRPG] enabled — data-driven combat, multi-battle rooms (per-room ruleset). :rpg help");
    }

    /** The ruleset a room runs (rooms.rpg_ruleset_id, default 1). */
    private int rulesetOf(int roomId) {
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement("SELECT rpg_ruleset_id FROM rooms WHERE id = ?")) {
            st.setInt(1, roomId);
            try (ResultSet rs = st.executeQuery()) { return rs.next() ? Math.max(1, rs.getInt(1)) : 1; }
        } catch (Exception e) { return 1; }
    }

    /** Cached abilities for a room's ruleset. */
    private Map<String, Ability> abilities(int roomId) {
        return abilityCache.computeIfAbsent(rulesetOf(roomId), Ability::load);
    }
    @Override public void onDisable() { arenas.clear(); }
    @Override public boolean hasPermission(Habbo habbo, String key) { return false; }

    @EventHandler
    public void onTalk(UserTalkEvent event) {
        final String raw = event.chatMessage.getMessage();
        if (raw == null) return;
        final String msg = raw.trim();
        if (!msg.toLowerCase().startsWith(":rpg")) return;
        event.setCancelled(true);

        final Habbo habbo = event.habbo;
        final Room room = habbo.getHabboInfo().getCurrentRoom();
        if (room == null) return;

        final String[] parts = msg.split("\\s+");
        final String sub = parts.length >= 2 ? parts[1].toLowerCase() : "";

        switch (sub) {
            case "on":  toggle(habbo, room, true);  return;
            case "off": toggle(habbo, room, false); return;
            case "ruleset": case "reglas": ruleset(habbo, room, parts); return;
            case "":    habbo.whisper("Modo RPG: " + (isEnabled(room.getId()) ? "ACTIVADO" : "desactivado")
                            + ". :rpg help para los comandos."); return;
            case "help": help(habbo); return;
            default: break;
        }

        if (!isEnabled(room.getId())) {
            habbo.whisper("El Modo RPG no está activo aquí. El dueño puede activarlo con :rpg on.");
            return;
        }
        switch (sub) {
            case "new": case "nuevo": newBattle(habbo, room); break;
            case "join": case "entrar":  join(habbo, room, parts); break;
            case "start": case "iniciar": start(habbo, room, parts); break;
            case "list": case "battles": case "combates": listBattles(habbo, room); break;
            case "attack": case "atacar": attack(habbo, room, parts); break;
            case "cast": case "lanzar": cast(habbo, room, parts); break;
            case "abilities": case "habilidades": case "habs": listAbilities(habbo, room, parts); break;
            case "apply": case "aplicar": applyStatusCmd(habbo, room, parts); break;
            case "pass": case "next": case "pasar": pass(habbo, room); break;
            case "status": case "estado": status(habbo, room, parts); break;
            case "end": case "fin": end(habbo, room, parts); break;
            default: habbo.whisper("Comando RPG desconocido. Usa :rpg help.");
        }
    }

    /**
     * Tactical movement: during active combat only the current fighter of their OWN
     * battle may walk, and only within their SPD-based tile budget from where their
     * turn started. Players not in an active battle (or not the current fighter) are
     * unrestricted. Cancelling the goal event aborts the walk.
     */
    @EventHandler
    public void onMove(RoomUnitSetGoalEvent event) {
        final Room room = event.room;
        if (room == null) return;
        final Habbo h = room.getHabbo(event.roomUnit);
        if (h == null) return; // bot / pet → free
        final Combat combat = battleOfUser(room.getId(), h.getHabboInfo().getId());
        if (combat == null || combat.state != Combat.State.ACTIVE) return; // spectator / pending → free
        final Fighter f = combat.byUser(h.getHabboInfo().getId());
        if (f == null) return;
        if (combat.current() != f) { event.setCancelled(true); return; } // not your turn
        final RoomTile goal = event.goal;
        if (goal == null || f.turnStartX < 0) return;
        if (Grid.chebyshev(f.turnStartX, f.turnStartY, goal.x, goal.y) > f.moveBudget()) {
            event.setCancelled(true);
            h.whisper("Fuera de tu alcance de movimiento (máx " + f.moveBudget() + " casillas).");
        }
    }

    /* ------------------------------- toggle ------------------------------- */

    private void toggle(Habbo habbo, Room room, boolean enable) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño de la sala puede cambiar el Modo RPG."); return; }
        setEnabled(room.getId(), enable);
        if (!enable) arenas.remove(room.getId());
        habbo.whisper("Modo RPG " + (enable ? "ACTIVADO" : "DESACTIVADO") + " en esta sala.");
        System.out.println("[RetroRPG] room " + room.getId() + " rpg_enabled=" + enable);
    }

    /* ----------------------------- arena helpers -------------------------- */

    private List<Combat> arena(int roomId) {
        return arenas.computeIfAbsent(roomId, k -> Collections.synchronizedList(new ArrayList<>()));
    }

    /** The pending/active battle a user currently belongs to in this room, or null. */
    private Combat battleOfUser(int roomId, int uid) {
        List<Combat> a = arena(roomId);
        synchronized (a) {
            for (Combat c : a) if (c.state != Combat.State.ENDED && c.byUser(uid) != null) return c;
        }
        return null;
    }

    /** A non-ended battle by its number, or null. */
    private Combat battleById(int roomId, int id) {
        List<Combat> a = arena(roomId);
        synchronized (a) {
            for (Combat c : a) if (c.id == id && c.state != Combat.State.ENDED) return c;
        }
        return null;
    }

    private List<Combat> pendingBattles(int roomId) {
        List<Combat> out = new ArrayList<>();
        List<Combat> a = arena(roomId);
        synchronized (a) { for (Combat c : a) if (c.state == Combat.State.PENDING) out.add(c); }
        return out;
    }

    private List<Combat> liveBattles(int roomId) {
        List<Combat> out = new ArrayList<>();
        List<Combat> a = arena(roomId);
        synchronized (a) { for (Combat c : a) if (c.state != Combat.State.ENDED) out.add(c); }
        return out;
    }

    private Combat createBattle(int roomId) {
        List<Combat> a = arena(roomId);
        synchronized (a) {
            int id = 1;
            for (Combat c : a) if (c.id >= id) id = c.id + 1;
            Combat c = new Combat(roomId, id);
            a.add(c);
            return c;
        }
    }

    private void removeBattle(int roomId, Combat c) { arena(roomId).remove(c); }

    /** True when the room currently hosts more than one live battle (so logs get a [#id] tag). */
    private boolean multi(int roomId) { return liveBattles(roomId).size() > 1; }

    /** Prefix each log line with the battle tag when the room runs several battles. */
    private List<String> tag(Combat c, List<String> lines) {
        if (!multi(c.roomId)) return lines;
        List<String> out = new ArrayList<>(lines.size());
        for (String l : lines) out.add("[#" + c.id + "] " + l);
        return out;
    }

    private static Integer parseInt(String s) {
        try { return Integer.parseInt(s.trim()); } catch (Exception e) { return null; }
    }

    private static String stateLabel(Combat c) {
        switch (c.state) {
            case PENDING: return "esperando";
            case ACTIVE:  return "en curso (ronda " + c.round + ")";
            default:      return "terminado";
        }
    }

    /* ------------------------------- combat ------------------------------- */

    /** Create a fresh battle and join the caller to it. */
    private void newBattle(Habbo habbo, Room room) {
        int uid = habbo.getHabboInfo().getId();
        if (battleOfUser(room.getId(), uid) != null) {
            habbo.whisper("Ya estás en un combate. Sólo puedes participar en uno a la vez."); return;
        }
        Combat combat = createBattle(room.getId());
        synchronized (combat) { combat.join(loadFighter(habbo, rulesetOf(room.getId()))); }
        broadcast(room, "🆕 " + habbo.getHabboInfo().getUsername() + " abre el combate #" + combat.id
                + ". Únete con :rpg join " + combat.id + "; el dueño lo inicia con :rpg start " + combat.id + ".");
    }

    /** Join a battle: an explicit number, the only open one, or a fresh one. */
    private void join(Habbo habbo, Room room, String[] parts) {
        int uid = habbo.getHabboInfo().getId();
        Combat mine = battleOfUser(room.getId(), uid);
        if (mine != null) { habbo.whisper("Ya estás en el combate #" + mine.id + "."); return; }

        Combat combat;
        if (parts.length >= 3) {
            Integer id = parseInt(parts[2]);
            if (id == null) { habbo.whisper("Número de combate no válido. Uso: :rpg join <número>"); return; }
            combat = battleById(room.getId(), id);
            if (combat == null) { habbo.whisper("No existe el combate #" + id + " (o ya terminó)."); return; }
            if (combat.state != Combat.State.PENDING) { habbo.whisper("El combate #" + id + " ya está en marcha."); return; }
        } else {
            List<Combat> pend = pendingBattles(room.getId());
            if (pend.isEmpty()) {
                combat = createBattle(room.getId());
            } else if (pend.size() == 1) {
                combat = pend.get(0);
            } else {
                habbo.whisper("Hay varios combates abiertos — únete con :rpg join <número>:");
                for (Combat c : pend) habbo.whisper("  #" + c.id + " — " + c.fighters.size() + " jugador(es).");
                return;
            }
        }
        synchronized (combat) {
            String r = combat.join(loadFighter(habbo, rulesetOf(room.getId())));
            if (r != null) broadcast(room, (multi(room.getId()) ? "[#" + combat.id + "] " : "") + r);
        }
    }

    /** Owner starts a pending battle (its number, the caller's, or the only open one). */
    private void start(Habbo habbo, Room room, String[] parts) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño puede iniciar el combate."); return; }
        Combat combat = resolveBattle(habbo, room, parts, 2);
        if (combat == null) return; // a message was already sent
        synchronized (combat) {
            if (combat.state != Combat.State.PENDING) { habbo.whisper("El combate #" + combat.id + " ya empezó."); return; }
            if (combat.fighters.size() < 2) { habbo.whisper("El combate #" + combat.id + " necesita al menos 2 combatientes."); return; }
            broadcastAll(room, tag(combat, combat.start()));
            onTurnAdvanced(room, combat);
        }
    }

    private void attack(Habbo habbo, Room room, String[] parts) {
        Combat combat = battleOfUser(room.getId(), habbo.getHabboInfo().getId());
        if (combat == null || combat.state != Combat.State.ACTIVE) { habbo.whisper("No estás en un combate activo."); return; }
        if (parts.length < 3) { habbo.whisper("Uso: :rpg attack <nombre>"); return; }
        synchronized (combat) {
            Fighter me = combat.byUser(habbo.getHabboInfo().getId());
            if (me == null || !me.alive()) { habbo.whisper("No estás en combate (o estás fuera de combate)."); return; }
            if (combat.current() != me) { habbo.whisper("No es tu turno."); return; }
            Fighter target = combat.aliveByName(parts[2]);
            if (target == null) { habbo.whisper("Objetivo no válido."); return; }
            if (target == me) { habbo.whisper("No puedes atacarte a ti mismo."); return; }
            broadcastAll(room, tag(combat, combat.attack(me, target)));
            if (combat.state == Combat.State.ACTIVE) onTurnAdvanced(room, combat);
            else removeBattle(room.getId(), combat);
        }
    }

    private void cast(Habbo habbo, Room room, String[] parts) {
        Combat combat = battleOfUser(room.getId(), habbo.getHabboInfo().getId());
        if (combat == null || combat.state != Combat.State.ACTIVE) { habbo.whisper("No estás en un combate activo."); return; }
        if (parts.length < 4) { habbo.whisper("Uso: :rpg cast <habilidad> <objetivo>"); return; }
        Ability ab = abilities(room.getId()).get(parts[2].toLowerCase());
        if (ab == null) { habbo.whisper("Habilidad desconocida. Usa :rpg abilities."); return; }
        synchronized (combat) {
            Fighter me = combat.byUser(habbo.getHabboInfo().getId());
            if (me == null || !me.alive()) { habbo.whisper("No estás en combate."); return; }
            if (combat.current() != me) { habbo.whisper("No es tu turno."); return; }
            if (me.cooldownOf(ab.key()) > 0) { habbo.whisper(ab.name + " en recarga (" + me.cooldownOf(ab.key()) + ")."); return; }
            if (me.resource < ab.cost) { habbo.whisper("Recurso insuficiente (" + me.resource + "/" + ab.cost + ")."); return; }
            Fighter target = combat.aliveByName(parts[3]);
            if (target == null) { habbo.whisper("Objetivo no válido."); return; }
            int[] cp = posOf(room, me.userId), tp = posOf(room, target.userId);
            if (cp == null || tp == null) { habbo.whisper("No se pudo determinar la posición de los combatientes."); return; }
            if (Grid.chebyshev(cp[0], cp[1], tp[0], tp[1]) > ab.range) {
                habbo.whisper(ab.name + " fuera de alcance (rango " + ab.range + ")."); return;
            }
            List<Fighter> affected = new ArrayList<>();
            for (Fighter f : combat.fighters) {
                if (!f.alive() || f == me) continue;
                int[] fp = posOf(room, f.userId);
                if (fp != null && Grid.affects(ab.shape, cp[0], cp[1], tp[0], tp[1], ab.range, ab.areaSize, fp[0], fp[1]))
                    affected.add(f);
            }
            broadcastAll(room, tag(combat, combat.castResolved(me, ab, affected)));
            if (combat.state == Combat.State.ACTIVE) onTurnAdvanced(room, combat);
            else removeBattle(room.getId(), combat);
        }
    }

    private void listAbilities(Habbo habbo, Room room, String[] parts) {
        Map<String, Ability> abs = abilities(room.getId());
        String filter = parts.length >= 3 ? parts[2].toLowerCase() : "";
        if (filter.isEmpty() && abs.size() > 12) {
            java.util.Set<String> ramas = new java.util.TreeSet<>();
            for (Ability a : abs.values()) if (!a.rama.isEmpty()) ramas.add(a.rama);
            habbo.whisper("Disciplinas (" + abs.size() + " habilidades): " + String.join(", ", ramas));
            habbo.whisper("Usa :rpg abilities <disciplina> para listarlas.");
            return;
        }
        habbo.whisper("— Habilidades —");
        int n = 0;
        for (Ability a : abs.values()) {
            if (!filter.isEmpty() && !a.rama.toLowerCase().contains(filter) && !a.name.toLowerCase().contains(filter)) continue;
            if (n++ >= 40) { habbo.whisper("… filtra por disciplina para ver el resto."); break; }
            habbo.whisper(a.name + (a.rango.isEmpty() ? "" : " [" + a.rango + "]") + " · coste " + a.cost
                    + " · alcance " + a.range + (a.areaSize > 0 ? " área " + a.areaSize : ""));
        }
        if (n == 0) habbo.whisper("Sin resultados para \"" + filter + "\".");
    }

    /** Owner sets the room's ruleset (:rpg ruleset <id|nombre>). */
    private void ruleset(Habbo habbo, Room room, String[] parts) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño puede cambiar el ruleset."); return; }
        if (parts.length < 3) {
            int cur = rulesetOf(room.getId());
            habbo.whisper("Ruleset actual: " + cur + ". Usa :rpg ruleset <id o nombre>.");
            return;
        }
        Integer id = resolveRuleset(parts[2]);
        if (id == null) { habbo.whisper("Ruleset no encontrado: " + parts[2]); return; }
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement("UPDATE rooms SET rpg_ruleset_id = ? WHERE id = ?")) {
            st.setInt(1, id); st.setInt(2, room.getId()); st.executeUpdate();
        } catch (Exception e) { habbo.whisper("Error: " + e.getMessage()); return; }
        abilityCache.remove(id); // force reload next use
        arenas.remove(room.getId());
        habbo.whisper("Ruleset de la sala cambiado a " + id + ". " + abilities(room.getId()).size() + " habilidades.");
    }

    private Integer resolveRuleset(String token) {
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement(
                 "SELECT id FROM rpg_rulesets WHERE id = ? OR LOWER(name) = LOWER(?) LIMIT 1")) {
            st.setString(1, token.replaceAll("[^0-9]", "").isEmpty() ? "0" : token.replaceAll("[^0-9]", ""));
            st.setString(2, token);
            try (ResultSet rs = st.executeQuery()) { return rs.next() ? rs.getInt(1) : null; }
        } catch (Exception e) { return null; }
    }

    private int[] posOf(Room room, int userId) {
        Habbo h = room.getHabbo(userId);
        if (h == null || h.getRoomUnit() == null) return null;
        RoomTile t = h.getRoomUnit().getCurrentLocation();
        return t == null ? null : new int[]{t.x, t.y};
    }

    private void applyStatusCmd(Habbo habbo, Room room, String[] parts) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño (GM) puede aplicar estados manualmente."); return; }
        if (parts.length < 4) { habbo.whisper("Uso: :rpg apply <objetivo> <estado> [turnos]"); return; }
        int turns = 2;
        if (parts.length >= 5) { try { turns = Integer.parseInt(parts[4]); } catch (Exception ignored) { } }
        // Find the active battle that contains the named target.
        Combat combat = null;
        for (Combat c : liveBattles(room.getId())) {
            if (c.state == Combat.State.ACTIVE && c.aliveByName(parts[2]) != null) { combat = c; break; }
        }
        if (combat == null) { habbo.whisper("No hay ningún combatiente activo con ese nombre."); return; }
        synchronized (combat) {
            Fighter target = combat.aliveByName(parts[2]);
            if (target == null) { habbo.whisper("Objetivo no válido."); return; }
            broadcast(room, (multi(room.getId()) ? "[#" + combat.id + "] " : "") + combat.applyStatus(target, parts[3], turns));
        }
    }

    private void pass(Habbo habbo, Room room) {
        Combat combat = battleOfUser(room.getId(), habbo.getHabboInfo().getId());
        if (combat == null || combat.state != Combat.State.ACTIVE) { habbo.whisper("No estás en un combate activo."); return; }
        synchronized (combat) {
            Fighter me = combat.byUser(habbo.getHabboInfo().getId());
            if (me == null || combat.current() != me) { habbo.whisper("No es tu turno."); return; }
            broadcastAll(room, tag(combat, combat.pass(me)));
            if (combat.state == Combat.State.ACTIVE) onTurnAdvanced(room, combat);
            else removeBattle(room.getId(), combat);
        }
    }

    private void status(Habbo habbo, Room room, String[] parts) {
        Combat combat;
        if (parts.length >= 3) {
            Integer id = parseInt(parts[2]);
            combat = id == null ? null : battleById(room.getId(), id);
            if (combat == null) { habbo.whisper("No existe ese combate. Usa :rpg list."); return; }
        } else {
            combat = battleOfUser(room.getId(), habbo.getHabboInfo().getId());
            if (combat == null) { listBattles(habbo, room); return; }
        }
        habbo.whisper(multi(room.getId()) ? "— Combate #" + combat.id + " —" : "");
        for (String line : combat.statusText().split("\n")) habbo.whisper(line);
    }

    private void listBattles(Habbo habbo, Room room) {
        List<Combat> live = liveBattles(room.getId());
        if (live.isEmpty()) { habbo.whisper("No hay combates. Crea uno con :rpg new (o :rpg join)."); return; }
        habbo.whisper("— Combates en la sala (" + live.size() + ") —");
        for (Combat c : live) {
            habbo.whisper("  #" + c.id + " · " + stateLabel(c) + " · " + c.fighters.size() + " jugador(es)"
                    + (c.state == Combat.State.ACTIVE && c.current() != null ? " · turno: " + c.current().name : ""));
        }
    }

    private void end(Habbo habbo, Room room, String[] parts) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño puede terminar el combate."); return; }
        if (parts.length >= 3 && (parts[2].equalsIgnoreCase("all") || parts[2].equalsIgnoreCase("todos"))) {
            List<Combat> a = arena(room.getId());
            int n; synchronized (a) { n = a.size(); a.clear(); }
            broadcast(room, "⚔ Todos los combates han terminado (" + n + ").");
            return;
        }
        Combat combat = resolveBattle(habbo, room, parts, 2);
        if (combat == null) return;
        removeBattle(room.getId(), combat);
        broadcast(room, "⚔ El combate #" + combat.id + " ha terminado.");
    }

    /**
     * Resolve which battle a command refers to: an explicit number at parts[argIdx],
     * else the caller's own battle, else the only live battle. Whispers guidance and
     * returns null when ambiguous or absent.
     */
    private Combat resolveBattle(Habbo habbo, Room room, String[] parts, int argIdx) {
        if (parts.length > argIdx) {
            Integer id = parseInt(parts[argIdx]);
            if (id == null) { habbo.whisper("Número de combate no válido."); return null; }
            Combat c = battleById(room.getId(), id);
            if (c == null) habbo.whisper("No existe el combate #" + id + ".");
            return c;
        }
        Combat mine = battleOfUser(room.getId(), habbo.getHabboInfo().getId());
        if (mine != null) return mine;
        List<Combat> live = liveBattles(room.getId());
        if (live.size() == 1) return live.get(0);
        if (live.isEmpty()) { habbo.whisper("No hay combates en esta sala."); return null; }
        habbo.whisper("Indica el número de combate. Combates abiertos:");
        for (Combat c : live) habbo.whisper("  #" + c.id + " — " + stateLabel(c) + ", " + c.fighters.size() + " jugador(es).");
        return null;
    }

    private void help(Habbo habbo) {
        String[] lines = {
            "— RetroTV RPG —",
            ":rpg on / off  (dueño) activa el Modo RPG en la sala",
            ":rpg ruleset <id|nombre>  (dueño) elige el sistema (p.ej. BHRPG)",
            ":rpg new       abre un combate nuevo (puede haber varios a la vez)",
            ":rpg join [#]  entra a un combate (al número indicado, o al único abierto)",
            ":rpg start [#] (dueño) inicia un combate pendiente",
            ":rpg list      lista los combates de la sala",
            ":rpg attack <nombre>   ataca en tu turno",
            ":rpg abilities  lista tus habilidades",
            ":rpg cast <hab> <objetivo>   lanza una habilidad (rango/área)",
            ":rpg apply <obj> <estado> [turnos]  (GM) aplica un estado (hemorragia, aturdimiento…)",
            ":rpg pass      pasa tu turno",
            ":rpg status [#]  muestra el estado de tu combate (o del número indicado)",
            ":rpg end [#|all] (dueño) termina un combate (o todos)",
        };
        for (String l : lines) habbo.whisper(l);
    }

    /* --------------------------- turn lifecycle --------------------------- */

    /** Called whenever the active fighter changes: capture their start tile + arm the timer. */
    private void onTurnAdvanced(Room room, Combat combat) {
        markTurnStart(room, combat);
        scheduleTurnTimer(room, combat);
    }

    private void markTurnStart(Room room, Combat combat) {
        Fighter cur = combat.current();
        if (cur == null) return;
        int[] p = posOf(room, cur.userId);
        if (p != null) { cur.turnStartX = p[0]; cur.turnStartY = p[1]; }
        Habbo h = room.getHabbo(cur.userId);
        if (h != null) h.whisper((multi(room.getId()) ? "[#" + combat.id + "] " : "")
                + "🦶 Tu turno: te puedes mover hasta " + cur.moveBudget() + " casillas.");
    }

    private void scheduleTurnTimer(Room room, Combat combat) {
        final long token = combat.turnToken;
        Emulator.getThreading().run(() -> {
            synchronized (combat) {
                if (combat.state != Combat.State.ACTIVE || combat.turnToken != token) return; // stale
                Fighter c = combat.current();
                if (c == null) return;
                List<String> log = new ArrayList<>();
                log.add("⏱ Se acabó el tiempo de " + c.name + ".");
                log.addAll(combat.pass(c));
                broadcastAll(room, tag(combat, log));
                if (combat.state == Combat.State.ACTIVE) onTurnAdvanced(room, combat);
                else removeBattle(room.getId(), combat);
            }
        }, TURN_SECONDS * 1000L);
    }

    /* ------------------------------ helpers ------------------------------- */

    private void broadcast(Room room, String line) {
        for (Habbo h : room.getHabbos()) h.whisper(line);
    }
    private void broadcastAll(Room room, List<String> lines) {
        for (String l : lines) broadcast(room, l);
    }

    private boolean isOwner(Habbo habbo, Room room) {
        return room.getOwnerId() == habbo.getHabboInfo().getId() || habbo.hasPermission("acc_anyroomcontroller");
    }

    /** Build a fighter from the user's character sheet, or sensible defaults. */
    private Fighter loadFighter(Habbo habbo, int rulesetId) {
        int uid = habbo.getHabboInfo().getId();
        String name = habbo.getHabboInfo().getUsername();
        int hp = 100, res = 100, atk = 10, def = 10, spd = 10, nivel = 1, arma = 0;
        String rango = "D";
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement(
                 "SELECT max_hp, max_resource, atk, def, spd, level, arma, rango FROM rpg_characters "
                 + "WHERE user_id = ? AND ruleset_id = ? ORDER BY id LIMIT 1")) {
            st.setInt(1, uid); st.setInt(2, rulesetId);
            try (ResultSet rs = st.executeQuery()) {
                if (rs.next()) {
                    hp = rs.getInt(1); res = rs.getInt(2);
                    atk = rs.getInt(3); def = rs.getInt(4); spd = rs.getInt(5);
                    nivel = rs.getInt(6); arma = rs.getInt(7);
                    rango = rs.getString(8);
                }
            }
        } catch (Exception ignored) { }
        return new Fighter(uid, name, hp, res, atk, def, spd, nivel, arma, rango);
    }

    private boolean isEnabled(int roomId) {
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement("SELECT rpg_enabled FROM rooms WHERE id = ?")) {
            st.setInt(1, roomId);
            try (ResultSet rs = st.executeQuery()) { return rs.next() && rs.getInt(1) == 1; }
        } catch (Exception e) { return false; }
    }

    private void setEnabled(int roomId, boolean enabled) {
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement("UPDATE rooms SET rpg_enabled = ? WHERE id = ?")) {
            st.setInt(1, enabled ? 1 : 0);
            st.setInt(2, roomId);
            st.executeUpdate();
        } catch (Exception e) { System.out.println("[RetroRPG] setEnabled error: " + e.getMessage()); }
    }
}
