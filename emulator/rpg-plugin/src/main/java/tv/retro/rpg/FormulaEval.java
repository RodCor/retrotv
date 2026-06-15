package tv.retro.rpg;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Evaluates a ruleset damage formula (BHRPG style) against a fighter's stats.
 * Grammar is additive: terms separated by '+'. Each term is one of:
 *   STAT            -> stat value          (NIVEL, FUE, DEF, VEL, VIT, REI, ARMA)
 *   STATxN          -> stat * N            (BHRPG uses 'x' for multiply)
 *   STAT/N          -> stat / N
 *   N% [x0.M] STAT  -> M * stat            (the bracket holds the exact multiplier)
 *   N% STAT         -> (N/100) * stat
 *   NUMBER          -> flat value
 * Anything it can't parse contributes 0 — the full effect text is always shown
 * to players, so nothing is silently lost.
 */
public final class FormulaEval {
    private FormulaEval() {}

    private static final Pattern STAT_TERM =
        Pattern.compile("^([A-ZÁ]+)(?:\\s*[xX]\\s*([\\d.]+))?(?:\\s*/\\s*([\\d.]+))?$");
    private static final Pattern PCT_TERM =
        Pattern.compile("^([\\d.]+)%\\s*(?:\\[\\s*[xX]\\s*([\\d.]+)\\s*])?\\s*([A-ZÁ]+)?$");
    private static final Pattern NUM_TERM = Pattern.compile("^([\\d.]+)$");

    public static double eval(String formula, Map<String, Double> stats) {
        if (formula == null) return 0;
        double total = 0;
        for (String raw : formula.split("\\+")) {
            total += term(raw.trim().toUpperCase().replace("REIRYOKU", "REI"), stats);
        }
        return total;
    }

    private static double stat(String name, Map<String, Double> stats) {
        Double v = stats.get(name);
        return v == null ? 0 : v;
    }

    private static double num(String s) {
        try { return Double.parseDouble(s); } catch (Exception e) { return 0; }
    }

    private static double term(String t, Map<String, Double> stats) {
        if (t.isEmpty()) return 0;
        Matcher m = PCT_TERM.matcher(t);
        if (m.matches()) {
            double mult = m.group(2) != null ? num(m.group(2)) : num(m.group(1)) / 100.0;
            return m.group(3) != null ? mult * stat(m.group(3), stats) : 0;
        }
        m = STAT_TERM.matcher(t);
        if (m.matches()) {
            double v = stat(m.group(1), stats);
            if (m.group(2) != null) v *= num(m.group(2));
            if (m.group(3) != null && num(m.group(3)) != 0) v /= num(m.group(3));
            return v;
        }
        m = NUM_TERM.matcher(t);
        if (m.matches()) return num(m.group(1));
        return 0; // unparseable term -> 0 (covered by effect text)
    }
}
