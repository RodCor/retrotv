package tv.retro.rpg;

import java.util.HashMap;
import java.util.Map;

/** One combatant in a {@link Combat} session. */
public class Fighter {
    public final int userId;
    public final String name;
    public int hp;
    public final int maxHp;
    public int resource;
    public final int maxResource;
    public final int atk;
    public final int def;
    public final int spd;
    public int initiative;
    public boolean acted;
    /** Tile the fighter stood on when their current turn started (movement is measured from here). */
    public int turnStartX = -1;
    public int turnStartY = -1;
    /** Remaining cooldown (in this fighter's turns) per ability, keyed by lowercase name. */
    public final Map<String, Integer> cooldowns = new HashMap<>();

    /** Tiles this fighter may move from its turn-start tile (chebyshev), from SPD. */
    public int moveBudget() {
        return Math.max(2, 2 + this.spd / 4);
    }

    public Fighter(int userId, String name, int hp, int resource, int atk, int def, int spd) {
        this.userId = userId;
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.resource = resource;
        this.maxResource = resource;
        this.atk = atk;
        this.def = def;
        this.spd = spd;
    }

    public int cooldownOf(String abilityKey) {
        Integer v = cooldowns.get(abilityKey);
        return v == null ? 0 : v;
    }

    public boolean alive() {
        return this.hp > 0;
    }

    /** A compact HP bar, e.g. [█████░░░░░] 50/100. */
    public String hpBar() {
        int filled = this.maxHp <= 0 ? 0 : Math.max(0, Math.min(10, (this.hp * 10) / this.maxHp));
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < 10; i++) b.append(i < filled ? '█' : '░');
        return b.append("] ").append(Math.max(0, this.hp)).append('/').append(this.maxHp).toString();
    }
}
