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
    public final int id;        // battle number, unique within the room (rooms can host several)
    public State state = State.PENDING;
    public final List<Fighter> fighters = new ArrayList<>();
    public int round = 0;
    public int turnIndex = 0;
    public long turnToken = 0; // bumped each turn; lets stale turn-timers no-op

    public Combat(int roomId, int id) {
        this.roomId = roomId;
        this.id = id;
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
        caster.resource = Math.max(0, caster.resource - ab.costFor(caster.rango));
        caster.cooldowns.put(ab.key(), ab.cooldown);
        log.add("✨ " + caster.name + " usa " + ab.name + (ab.rango.isEmpty() ? "" : " [" + ab.rango + "]") + "!");
        int hits = 0;
        for (Fighter t : affected) {
            if (t == caster || !t.alive()) continue;
            int dmg = ab.hasFormula()
                ? Math.max(1, (int) Math.round(FormulaEval.eval(ab.formula, caster.stats())) - t.def)
                : Math.max(1, caster.atk + ab.power + d(6) - t.def);
            t.hp -= dmg;
            hits++;
            log.add("⚔ " + t.name + " recibe " + dmg + " de daño.");
            log.add(t.name + " " + t.hpBar());
            if (!t.alive()) {
                t.hp = 0;
                log.add("💀 " + t.name + " ha caído.");
            } else {
                for (Status s : Status.detect(ab.effectText, dmg)) {
                    t.statuses.add(s);
                    log.add("☠ " + t.name + ": " + s.name + " (" + s.turns + " turnos).");
                }
            }
        }
        if (hits == 0 && ab.hasFormula()) log.add("· " + ab.name + " no alcanzó a nadie.");
        // Always surface the full effect (the "assisted" part players apply manually).
        if (!ab.effectText.isEmpty()) {
            String eff = ab.effectText.length() > 240 ? ab.effectText.substring(0, 237) + "…" : ab.effectText;
            log.add("📜 " + eff);
        }
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
        int guard = fighters.size() * 4 + 4;
        while (guard-- > 0) {
            if (aliveCount() <= 1) {
                state = State.ENDED;
                Fighter w = null;
                for (Fighter f : fighters) if (f.alive()) w = f;
                log.add("🏆 Fin del combate. " + (w != null ? "Gana " + w.name + "." : "Sin vencedores."));
                return log;
            }
            turnIndex++;
            if (turnIndex >= fighters.size()) { turnIndex = 0; round++; }
            Fighter cur = fighters.get(turnIndex);
            if (!cur.alive()) continue;
            // Start-of-turn upkeep: cooldowns, resource regen, status ticks.
            cur.cooldowns.replaceAll((k, v) -> Math.max(0, v - 1));
            cur.resource = Math.min(cur.maxResource, cur.resource + Math.max(5, cur.maxResource / 10));
            boolean stunned = cur.isStunned();
            log.addAll(tickStatuses(cur));
            if (!cur.alive()) { log.add("💀 " + cur.name + " ha caído."); continue; }
            if (stunned) { log.add("💫 " + cur.name + " está aturdido y pierde el turno."); continue; }
            turnToken++;
            log.add(turnBanner());
            return log;
        }
        state = State.ENDED;
        log.add("🏆 Fin del combate.");
        return log;
    }

    /** Apply start-of-turn DoT damage + decrement durations; expired statuses drop off. */
    private synchronized List<String> tickStatuses(Fighter f) {
        List<String> log = new ArrayList<>();
        java.util.Iterator<Status> it = f.statuses.iterator();
        while (it.hasNext()) {
            Status s = it.next();
            if ("dot".equals(s.kind) && s.turns > 0) {
                int dmg = s.magnitude > 0 ? s.magnitude : Math.max(1, f.maxHp / 20);
                f.hp -= dmg;
                log.add("🩸 " + f.name + " sufre " + dmg + " por " + s.name + ".");
                log.add(f.name + " " + f.hpBar());
                if (!f.alive()) { f.hp = 0; break; }
            }
            s.turns--;
            if (s.turns <= 0) { it.remove(); log.add("· " + s.name + " termina en " + f.name + "."); }
        }
        return log;
    }

    /** Apply a named status to a target (used by the GM :rpg apply command). */
    public synchronized String applyStatus(Fighter target, String name, int turns) {
        String kind = Status.kindOf(name);
        int mag = "dot".equals(kind) ? Math.max(1, target.maxHp / 20) : 0;
        String label = name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
        target.statuses.add(new Status(label, kind, mag, Math.max(1, Math.min(10, turns))));
        return "☠ " + target.name + " recibe " + label + " (" + Math.max(1, turns) + " turnos).";
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
            if (!f.statuses.isEmpty()) {
                StringBuilder st = new StringBuilder();
                for (Status s : f.statuses) st.append(st.length() > 0 ? ", " : "").append(s.name).append("(").append(s.turns).append(")");
                b.append(" {").append(st).append("}");
            }
        }
        return b.toString();
    }
}
