package tv.retro.rpg;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * A live, server-authoritative combat session for one room. Free-for-all: turn
 * order by initiative (SPD + d20), single-target attacks (ATK + d6 - DEF), and the
 * fight ends when one fighter is left standing. All mutating methods are
 * synchronized; the plugin holds the lock per command. Methods return the log
 * lines to broadcast so combat logic stays separate from messaging.
 */
public class Combat {
    public enum State { PENDING, ACTIVE, ENDED }

    public final int roomId;
    public State state = State.PENDING;
    public final List<Fighter> fighters = new ArrayList<>();
    public int round = 0;
    public int turnIndex = 0;
    public long turnToken = 0; // bumped each turn; lets stale turn-timers no-op

    public Combat(int roomId) {
        this.roomId = roomId;
    }

    private static int d(int sides) {
        return ThreadLocalRandom.current().nextInt(sides) + 1;
    }

    public synchronized Fighter byUser(int userId) {
        for (Fighter f : fighters) if (f.userId == userId) return f;
        return null;
    }

    public synchronized Fighter aliveByName(String name) {
        for (Fighter f : fighters) if (f.alive() && f.name.equalsIgnoreCase(name)) return f;
        return null;
    }

    public synchronized int aliveCount() {
        int n = 0;
        for (Fighter f : fighters) if (f.alive()) n++;
        return n;
    }

    public synchronized Fighter current() {
        if (state != State.ACTIVE || fighters.isEmpty()) return null;
        return fighters.get(turnIndex);
    }

    /** Add a fighter before the fight starts. Returns a message, or null if rejected. */
    public synchronized String join(Fighter f) {
        if (state != State.PENDING) return null;
        if (byUser(f.userId) != null) return null;
        fighters.add(f);
        // HP lines are kept in a "NAME [bar] HP/MAX" shape so the client HUD can parse them.
        return f.name + " " + f.hpBar() + " — entra al combate.";
    }

    /** Roll initiative and begin. Returns the announcement lines. */
    public synchronized List<String> start() {
        List<String> log = new ArrayList<>();
        for (Fighter f : fighters) f.initiative = f.spd + d(20);
        fighters.sort((a, b) -> b.initiative - a.initiative);
        state = State.ACTIVE;
        round = 1;
        turnIndex = 0;
        turnToken++;
        StringBuilder order = new StringBuilder("⚔ ¡Combate iniciado! Orden de turno: ");
        for (int i = 0; i < fighters.size(); i++) {
            if (i > 0) order.append(" → ");
            order.append(fighters.get(i).name).append('(').append(fighters.get(i).initiative).append(')');
        }
        log.add(order.toString());
        log.add(turnBanner());
        return log;
    }

    /** Resolve an attack from the current fighter on `target`; advances the turn. */
    public synchronized List<String> attack(Fighter attacker, Fighter target) {
        List<String> log = new ArrayList<>();
        int roll = d(6);
        int dmg = Math.max(1, attacker.atk + roll - target.def);
        target.hp -= dmg;
        log.add("⚔ " + attacker.name + " ataca a " + target.name + " — " + dmg
                + " de daño (ATK " + attacker.atk + " + d6 " + roll + " - DEF " + target.def + ").");
        log.add(target.name + " " + target.hpBar());
        if (!target.alive()) {
            target.hp = 0;
            log.add("💀 " + target.name + " ha caído.");
        }
        attacker.acted = true;
        log.addAll(advanceTurn());
        return log;
    }

    /**
     * Resolve an ability: spend resource, set cooldown, damage each affected
     * fighter (caster excluded), then advance the turn. `affected` is computed by
     * the plugin from real tile positions.
     */
    public synchronized List<String> castResolved(Fighter caster, Ability ab, List<Fighter> affected) {
        List<String> log = new ArrayList<>();
        caster.resource = Math.max(0, caster.resource - ab.cost);
        caster.cooldowns.put(ab.key(), ab.cooldown);
        log.add("✨ " + caster.name + " usa " + ab.name + "!");
        int hits = 0;
        for (Fighter t : affected) {
            if (t == caster || !t.alive()) continue;
            int roll = d(6);
            int dmg = Math.max(1, caster.atk + ab.power + roll - t.def);
            t.hp -= dmg;
            hits++;
            log.add("⚔ " + t.name + " recibe " + dmg + " de daño.");
            log.add(t.name + " " + t.hpBar());
            if (!t.alive()) { t.hp = 0; log.add("💀 " + t.name + " ha caído."); }
        }
        if (hits == 0) log.add("· " + ab.name + " no alcanzó a nadie.");
        caster.acted = true;
        log.addAll(advanceTurn());
        return log;
    }

    /** Current fighter passes without acting. */
    public synchronized List<String> pass(Fighter who) {
        List<String> log = new ArrayList<>();
        log.add("· " + who.name + " pasa su turno.");
        log.addAll(advanceTurn());
        return log;
    }

    private synchronized List<String> advanceTurn() {
        List<String> log = new ArrayList<>();
        if (aliveCount() <= 1) {
            state = State.ENDED;
            Fighter w = null;
            for (Fighter f : fighters) if (f.alive()) w = f;
            log.add("🏆 Fin del combate. " + (w != null ? "Gana " + w.name + "." : "Sin vencedores."));
            return log;
        }
        for (int i = 0; i < fighters.size(); i++) {
            turnIndex++;
            if (turnIndex >= fighters.size()) { turnIndex = 0; round++; }
            if (fighters.get(turnIndex).alive()) break;
        }
        // Start-of-turn upkeep for the new active fighter: tick cooldowns + regen.
        Fighter cur = fighters.get(turnIndex);
        cur.cooldowns.replaceAll((k, v) -> Math.max(0, v - 1));
        cur.resource = Math.min(cur.maxResource, cur.resource + Math.max(5, cur.maxResource / 10));
        turnToken++;
        log.add(turnBanner());
        return log;
    }

    public synchronized String turnBanner() {
        Fighter c = current();
        return "▶ Ronda " + round + " — turno de " + (c != null ? c.name : "—") + ".";
    }

    public synchronized String statusText() {
        StringBuilder b = new StringBuilder("⚔ Estado del combate (ronda " + round + "):");
        for (int i = 0; i < fighters.size(); i++) {
            Fighter f = fighters.get(i);
            b.append("\n").append(i == turnIndex && state == State.ACTIVE ? "▶ " : "  ")
             .append(f.name).append(' ').append(f.hpBar()).append(f.alive() ? "" : " 💀");
        }
        return b.toString();
    }
}
