package tv.retro.rpg;

/** One combatant in a {@link Combat} session. */
public class Fighter {
    public final int userId;
    public final String name;
    public int hp;
    public final int maxHp;
    public final int atk;
    public final int def;
    public final int spd;
    public int initiative;
    public boolean acted;

    public Fighter(int userId, String name, int hp, int atk, int def, int spd) {
        this.userId = userId;
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.atk = atk;
        this.def = def;
        this.spd = spd;
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
