package tv.retro.rpg;

import com.eu.habbo.Emulator;
import com.eu.habbo.habbohotel.rooms.Room;
import com.eu.habbo.habbohotel.users.Habbo;
import com.eu.habbo.plugin.EventHandler;
import com.eu.habbo.plugin.EventListener;
import com.eu.habbo.plugin.HabboPlugin;
import com.eu.habbo.plugin.events.users.UserTalkEvent;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * RetroTV RPG framework — combat slice (server-authoritative, command-driven).
 *
 * Per-room, off by default. The room OWNER enables RPG mode (:rpg on); then anyone
 * can run a turn-based fight entirely via chat commands. All combat state is
 * in-memory and authoritative on the server. See docs/RPG-FRAMEWORK.md. (A Nitro
 * client HUD will replace the chat output in a later step.)
 *
 * Commands: :rpg on|off · :rpg join · :rpg start · :rpg attack &lt;nombre&gt; ·
 *           :rpg pass · :rpg status · :rpg end · :rpg help
 */
public class RetroRpgPlugin extends HabboPlugin implements EventListener {

    private static final int TURN_SECONDS = 90;
    private final Map<Integer, Combat> combats = new ConcurrentHashMap<>();

    @Override public void onEnable() {
        Emulator.getPluginManager().registerEvents(this, this);
        System.out.println("[RetroRPG] enabled — :rpg on|off, join, start, attack, pass, status, end");
    }
    @Override public void onDisable() { combats.clear(); }
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
            case "join": case "entrar":  join(habbo, room); break;
            case "start": case "iniciar": start(habbo, room); break;
            case "attack": case "atacar": attack(habbo, room, parts); break;
            case "pass": case "next": case "pasar": pass(habbo, room); break;
            case "status": case "estado": status(habbo, room); break;
            case "end": case "fin": end(habbo, room); break;
            default: habbo.whisper("Comando RPG desconocido. Usa :rpg help.");
        }
    }

    /* ------------------------------- toggle ------------------------------- */

    private void toggle(Habbo habbo, Room room, boolean enable) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño de la sala puede cambiar el Modo RPG."); return; }
        setEnabled(room.getId(), enable);
        if (!enable) combats.remove(room.getId());
        habbo.whisper("Modo RPG " + (enable ? "ACTIVADO" : "DESACTIVADO") + " en esta sala.");
        System.out.println("[RetroRPG] room " + room.getId() + " rpg_enabled=" + enable);
    }

    /* ------------------------------- combat ------------------------------- */

    private void join(Habbo habbo, Room room) {
        Combat combat = combats.compute(room.getId(), (id, c) ->
                (c == null || c.state == Combat.State.ENDED) ? new Combat(id) : c);
        synchronized (combat) {
            if (combat.state != Combat.State.PENDING) { habbo.whisper("El combate ya está en marcha."); return; }
            if (combat.byUser(habbo.getHabboInfo().getId()) != null) { habbo.whisper("Ya estás en el combate."); return; }
            String r = combat.join(loadFighter(habbo));
            if (r != null) broadcast(room, r);
        }
    }

    private void start(Habbo habbo, Room room) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño puede iniciar el combate."); return; }
        Combat combat = combats.get(room.getId());
        if (combat == null || combat.state != Combat.State.PENDING) { habbo.whisper("No hay un combate pendiente. Usa :rpg join."); return; }
        synchronized (combat) {
            if (combat.fighters.size() < 2) { habbo.whisper("Hacen falta al menos 2 combatientes."); return; }
            broadcastAll(room, combat.start());
            scheduleTurnTimer(room, combat);
        }
    }

    private void attack(Habbo habbo, Room room, String[] parts) {
        Combat combat = combats.get(room.getId());
        if (combat == null || combat.state != Combat.State.ACTIVE) { habbo.whisper("No hay combate activo."); return; }
        if (parts.length < 3) { habbo.whisper("Uso: :rpg attack <nombre>"); return; }
        synchronized (combat) {
            Fighter me = combat.byUser(habbo.getHabboInfo().getId());
            if (me == null || !me.alive()) { habbo.whisper("No estás en combate (o estás fuera de combate)."); return; }
            if (combat.current() != me) { habbo.whisper("No es tu turno."); return; }
            Fighter target = combat.aliveByName(parts[2]);
            if (target == null) { habbo.whisper("Objetivo no válido."); return; }
            if (target == me) { habbo.whisper("No puedes atacarte a ti mismo."); return; }
            broadcastAll(room, combat.attack(me, target));
            if (combat.state == Combat.State.ACTIVE) scheduleTurnTimer(room, combat);
            else combats.remove(room.getId());
        }
    }

    private void pass(Habbo habbo, Room room) {
        Combat combat = combats.get(room.getId());
        if (combat == null || combat.state != Combat.State.ACTIVE) { habbo.whisper("No hay combate activo."); return; }
        synchronized (combat) {
            Fighter me = combat.byUser(habbo.getHabboInfo().getId());
            if (me == null || combat.current() != me) { habbo.whisper("No es tu turno."); return; }
            broadcastAll(room, combat.pass(me));
            if (combat.state == Combat.State.ACTIVE) scheduleTurnTimer(room, combat);
            else combats.remove(room.getId());
        }
    }

    private void status(Habbo habbo, Room room) {
        Combat combat = combats.get(room.getId());
        if (combat == null) { habbo.whisper("No hay combate. Usa :rpg join para crear uno."); return; }
        for (String line : combat.statusText().split("\n")) habbo.whisper(line);
    }

    private void end(Habbo habbo, Room room) {
        if (!isOwner(habbo, room)) { habbo.whisper("Solo el dueño puede terminar el combate."); return; }
        if (combats.remove(room.getId()) != null) broadcast(room, "⚔ El combate ha terminado.");
        else habbo.whisper("No hay combate que terminar.");
    }

    private void help(Habbo habbo) {
        String[] lines = {
            "— RetroTV RPG —",
            ":rpg on / off  (dueño) activa el Modo RPG en la sala",
            ":rpg join      entra al combate",
            ":rpg start     (dueño) inicia el combate",
            ":rpg attack <nombre>   ataca en tu turno",
            ":rpg pass      pasa tu turno",
            ":rpg status    muestra el estado",
            ":rpg end       (dueño) termina el combate",
        };
        for (String l : lines) habbo.whisper(l);
    }

    /* ----------------------------- turn timer ----------------------------- */

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
                broadcastAll(room, log);
                if (combat.state == Combat.State.ACTIVE) scheduleTurnTimer(room, combat);
                else combats.remove(room.getId());
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
    private Fighter loadFighter(Habbo habbo) {
        int uid = habbo.getHabboInfo().getId();
        String name = habbo.getHabboInfo().getUsername();
        int hp = 100, atk = 10, def = 10, spd = 10;
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement(
                 "SELECT max_hp, atk, def, spd FROM rpg_characters WHERE user_id = ? ORDER BY id LIMIT 1")) {
            st.setInt(1, uid);
            try (ResultSet rs = st.executeQuery()) {
                if (rs.next()) { hp = rs.getInt(1); atk = rs.getInt(2); def = rs.getInt(3); spd = rs.getInt(4); }
            }
        } catch (Exception ignored) { }
        return new Fighter(uid, name, hp, atk, def, spd);
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
