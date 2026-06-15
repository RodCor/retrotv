package tv.retro.rpg;

import com.eu.habbo.Emulator;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A castable ability, loaded from rpg_abilities (legacy or rich/imported rulesets). */
public class Ability {
    public final String name;
    public final int cost;            // base/lowest cost
    public final int range;
    public final String shape;        // Grid shape: single | line | cone | radius
    public final int areaSize;
    public final int power;           // legacy flat bonus (ruleset 1)
    public final int cooldown;
    public final String formula;      // rich rulesets: damage formula (may be empty)
    public final String effectText;   // full prose, always shown
    public final String rango;        // D..S (rich rulesets)
    public final String rama;         // discipline
    private final Map<String, Integer> costLadder; // rango -> cost

    public Ability(String name, int cost, int range, String shape, int areaSize, int power, int cooldown,
                   String formula, String effectText, String rango, String rama, Map<String, Integer> ladder) {
        this.name = name;
        this.cost = cost;
        this.range = range;
        this.shape = shape;
        this.areaSize = areaSize;
        this.power = power;
        this.cooldown = cooldown;
        this.formula = formula == null ? "" : formula;
        this.effectText = effectText == null ? "" : effectText;
        this.rango = rango == null ? "" : rango;
        this.rama = rama == null ? "" : rama;
        this.costLadder = ladder;
    }

    public String key() { return name.toLowerCase(); }
    public boolean hasFormula() { return !formula.isEmpty(); }

    /** Cost for a caster of the given rank, falling back to the base cost. */
    public int costFor(String casterRango) {
        if (costLadder != null) {
            Integer v = costLadder.get(casterRango);
            if (v != null) return v;
        }
        return cost;
    }

    private static int parsePower(String expr) {
        if (expr == null) return 0;
        try { return Integer.parseInt(expr.trim().replaceAll("[^0-9-].*$", "")); }
        catch (Exception e) { return 0; }
    }

    private static final Pattern COST_PAIR = Pattern.compile("\"([DCBAS])\"\\s*:\\s*(\\d+)");
    private static Map<String, Integer> parseLadder(String json) {
        if (json == null) return null;
        Map<String, Integer> m = new LinkedHashMap<>();
        Matcher mt = COST_PAIR.matcher(json);
        while (mt.find()) m.put(mt.group(1), Integer.parseInt(mt.group(2)));
        return m.isEmpty() ? null : m;
    }

    private static final Map<String, String> SHAPE = Map.of(
        "direct", "single", "chase", "single", "self", "single",
        "line", "line", "cone", "cone", "area", "radius");

    /** Load all abilities for a ruleset, keyed by lowercase name. */
    public static Map<String, Ability> load(int rulesetId) {
        Map<String, Ability> out = new HashMap<>();
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement(
                 "SELECT name, cost, range_tiles, area_shape, area_size, damage_expr, cooldown, "
                 + "formula, effect_text, cost_json, rango, rama, range_shape, range_n "
                 + "FROM rpg_abilities WHERE ruleset_id = ?")) {
            st.setInt(1, rulesetId);
            try (ResultSet rs = st.executeQuery()) {
                while (rs.next()) {
                    String rShape = rs.getString("range_shape");
                    int rn = rs.getInt("range_n");
                    String shape = (rShape != null && !rShape.isEmpty())
                        ? SHAPE.getOrDefault(rShape, "single") : rs.getString("area_shape");
                    int range = rn > 0 ? rn : rs.getInt("range_tiles");
                    out.put(rs.getString("name").toLowerCase(), new Ability(
                        rs.getString("name"), rs.getInt("cost"), range, shape, rs.getInt("area_size"),
                        parsePower(rs.getString("damage_expr")), rs.getInt("cooldown"),
                        rs.getString("formula"), rs.getString("effect_text"),
                        rs.getString("rango"), rs.getString("rama"),
                        parseLadder(rs.getString("cost_json"))));
                }
            }
        } catch (Exception e) {
            System.out.println("[RetroRPG] ability load error: " + e.getMessage());
        }
        return out;
    }
}
