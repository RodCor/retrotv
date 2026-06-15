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

/**
 * RetroTV RPG framework — foundation slice.
 *
 * RPG mode is OPT-IN PER ROOM (off by default). For this first prototype the room
 * owner toggles it with the chat command {@code :rpg on} / {@code :rpg off}; the
 * flag is persisted to {@code rooms.rpg_enabled}. (The toggle moves into the Nitro
 * Room Settings panel in a later step — see docs/RPG-FRAMEWORK.md.)
 */
public class RetroRpgPlugin extends HabboPlugin implements EventListener {

    @Override
    public void onEnable() {
        Emulator.getPluginManager().registerEvents(this, this);
        System.out.println("[RetroRPG] enabled — room owners can use :rpg on | :rpg off");
    }

    @Override
    public void onDisable() {
    }

    @Override
    public boolean hasPermission(Habbo habbo, String key) {
        return false;
    }

    @EventHandler
    public void onTalk(UserTalkEvent event) {
        final String raw = event.chatMessage.getMessage();
        if (raw == null) return;
        final String cmd = raw.trim().toLowerCase();
        if (!cmd.equals(":rpg") && !cmd.equals(":rpg on") && !cmd.equals(":rpg off")) return;

        // Don't broadcast the command as normal chat.
        event.setCancelled(true);

        final Habbo habbo = event.habbo;
        final Room room = habbo.getHabboInfo().getCurrentRoom();
        if (room == null) return;

        final boolean isOwner = room.getOwnerId() == habbo.getHabboInfo().getId()
                || habbo.hasPermission("acc_anyroomcontroller");
        if (!isOwner) {
            habbo.whisper("Solo el dueño de la sala puede cambiar el Modo RPG.");
            return;
        }

        if (cmd.equals(":rpg")) {
            habbo.whisper("Modo RPG: " + (isEnabled(room.getId()) ? "ACTIVADO" : "desactivado")
                    + ". Usa :rpg on o :rpg off.");
            return;
        }

        final boolean enable = cmd.equals(":rpg on");
        setEnabled(room.getId(), enable);
        habbo.whisper("Modo RPG " + (enable ? "ACTIVADO" : "DESACTIVADO") + " en esta sala.");
        System.out.println("[RetroRPG] room " + room.getId() + " rpg_enabled=" + enable
                + " by " + habbo.getHabboInfo().getUsername());
    }

    private boolean isEnabled(int roomId) {
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement("SELECT rpg_enabled FROM rooms WHERE id = ?")) {
            st.setInt(1, roomId);
            try (ResultSet rs = st.executeQuery()) {
                return rs.next() && rs.getInt(1) == 1;
            }
        } catch (Exception e) {
            System.out.println("[RetroRPG] isEnabled error: " + e.getMessage());
            return false;
        }
    }

    private void setEnabled(int roomId, boolean enabled) {
        try (Connection c = Emulator.getDatabase().getDataSource().getConnection();
             PreparedStatement st = c.prepareStatement("UPDATE rooms SET rpg_enabled = ? WHERE id = ?")) {
            st.setInt(1, enabled ? 1 : 0);
            st.setInt(2, roomId);
            st.executeUpdate();
        } catch (Exception e) {
            System.out.println("[RetroRPG] setEnabled error: " + e.getMessage());
        }
    }
}
