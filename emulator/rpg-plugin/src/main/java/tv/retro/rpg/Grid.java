package tv.retro.rpg;

/** Tile math for ranges and area-of-effect on the room grid. */
public final class Grid {
    private Grid() {}

    public static int chebyshev(int x1, int y1, int x2, int y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    public static int manhattan(int x1, int y1, int x2, int y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    private static int sign(int v) { return Integer.compare(v, 0); }

    /**
     * Is the tile (fx,fy) caught by an ability of `shape`/`size` cast from
     * (cx,cy) at the target tile (tx,ty)?
     *   single — only the exact target tile
     *   radius — within `size` tiles (chebyshev) of the target
     *   line   — along the ray from the caster toward the target, up to `range`
     *            tiles, within `size`/2 lateral spread (size = beam length here)
     */
    public static boolean affects(String shape, int cx, int cy, int tx, int ty,
                                  int range, int size, int fx, int fy) {
        if (shape == null) shape = "single";
        switch (shape) {
            case "radius":
                return chebyshev(tx, ty, fx, fy) <= Math.max(0, size);
            case "line":
            case "cone": {
                int sx = sign(tx - cx), sy = sign(ty - cy);
                if (sx == 0 && sy == 0) return fx == tx && fy == ty;
                int len = Math.max(range, Math.max(1, size));
                for (int k = 1; k <= len; k++) {
                    if (chebyshev(cx + sx * k, cy + sy * k, fx, fy) == 0) return true;
                }
                return false;
            }
            case "single":
            default:
                return fx == tx && fy == ty;
        }
    }
}
