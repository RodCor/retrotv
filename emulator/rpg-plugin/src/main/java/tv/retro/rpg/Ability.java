package tv.retro.rpg;

import com.eu.habbo.Emulator;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

/** A castable ability, loaded from rpg_abilities. */
public class Ability {
    public final String name;
    public final int cost;
    public final int range;
    public final String shape;   // single | line | cone | radius
    public final int areaSize;
    public final int power;      // bonus damage added to ATK (parsed from damage_expr)
    public final int cooldown;

    public Ability(String name, int cost, int range, String shape, int areaSize, int power, int cooldown) {
        this.name = name;
        this.cost = cost;
        this.range = range;
        this.shape = shape;
        this.areaSize = areaSize;
        this.power = power;
        this.cooldown = cooldown;
    }

    public String key() { return name.toLowerCase(); }

    private static int parsePower(String expr) {
        if (expr == null) return 0;
        try { return Integer.parseInt(expr.trim().replaceAll("[^0-9-].*$", "")); }
        catch (Exception e) { return 0; }
    }

    /** Load all abilities for a ruleset, keyed by lowercase name. */
    public static Map<String, Ability> load(int rulesetId) {
        Map<String, Ability> out = new HashMap<>();
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement(
                 "SELECT name, cost, range_tiles, area_shape, area_size, damage_expr, cooldown "
                 + "FROM rpg_abilities WHERE ruleset_id = ?")) {
            st.setInt(1, rulesetId);
            try (ResultSet rs = st.executeQuery()) {
                while (rs.next()) {
                    Ability a = new Ability(
                        rs.getString("name"), rs.getInt("cost"), rs.getInt("range_tiles"),
                        rs.getString("area_shape"), rs.getInt("area_size"),
                        parsePower(rs.getString("damage_expr")), rs.getInt("cooldown"));
                    out.put(a.key(), a);
                }
            }
        } catch (Exception e) {
            System.out.println("[RetroRPG] ability load error: " + e.getMessage());
        }
        return out;
    }
}
