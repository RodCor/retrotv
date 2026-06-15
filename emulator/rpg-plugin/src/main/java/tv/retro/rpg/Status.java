package tv.retro.rpg;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A timed status effect on a fighter. Two kinds drive the engine this slice:
 *   dot   — damage at the start of the fighter's turn
 *   stun  — the fighter skips their turn (Aturdimiento / Paralizado / …)
 * Other kinds are recorded + shown but not auto-resolved (the effect text covers
 * the exact rule). Durations are in the fighter's own turns.
 */
public class Status {
    public final String name;
    public final String kind;   // dot | stun | debuff | buff
    public int magnitude;
    public int turns;

    public Status(String name, String kind, int magnitude, int turns) {
        this.name = name;
        this.kind = kind;
        this.magnitude = magnitude;
        this.turns = turns;
    }

    /** Known BHRPG status names -> engine kind. */
    public static final Map<String, String> KINDS = Map.ofEntries(
        Map.entry("hemorragia", "dot"), Map.entry("quemadura", "dot"),
        Map.entry("veneno", "dot"), Map.entry("envenenamiento", "dot"),
        Map.entry("aturdimiento", "stun"), Map.entry("aturdido", "stun"),
        Map.entry("paralizado", "stun"), Map.entry("parálisis", "stun"),
        Map.entry("inmovilización", "stun"), Map.entry("inmovilizacion", "stun"),
        Map.entry("congelado", "stun"), Map.entry("congelación", "stun"));

    public static String kindOf(String name) {
        return KINDS.getOrDefault(name.toLowerCase(), "debuff");
    }

    /** "...durante 3 acciones..." near `keyword` -> 3 (default 2). */
    private static int parseDuration(String text, String keyword) {
        int i = text.indexOf(keyword);
        String window = i >= 0 ? text.substring(i, Math.min(text.length(), i + 90)) : text;
        Matcher m = Pattern.compile("durante\\s+(\\d+)").matcher(window);
        return m.find() ? Math.max(1, Math.min(10, Integer.parseInt(m.group(1)))) : 2;
    }

    /** Detect statuses mentioned in an ability's effect text (DoT magnitude = 10% of the hit). */
    public static List<Status> detect(String effectText, int hitDmg) {
        List<Status> out = new ArrayList<>();
        if (effectText == null) return out;
        String t = effectText.toLowerCase();
        for (Map.Entry<String, String> e : KINDS.entrySet()) {
            if (!t.contains(e.getKey())) continue;
            int mag = e.getValue().equals("dot") ? Math.max(1, hitDmg / 10) : 0;
            String label = e.getKey().substring(0, 1).toUpperCase() + e.getKey().substring(1);
            // avoid duplicate kinds for synonyms (e.g. aturdimiento/aturdido)
            if (out.stream().anyMatch(s -> s.kind.equals(e.getValue()) && s.kind.equals("stun"))) continue;
            out.add(new Status(label, e.getValue(), mag, parseDuration(t, e.getKey())));
        }
        return out;
    }
}
