package panels;

import services.UIStyles;
import javax.swing.*;
import java.awt.*;

public class SettingsPanel extends JPanel {
    private final AppFrame appFrame;

    public SettingsPanel(AppFrame appFrame) {
        this.appFrame = appFrame;
        setupUI();
    }

    private void setupUI() {
        setLayout(new BorderLayout());
        setBackground(UIStyles.BACKGROUND_COLOR);

        // Encabezado
        JLabel titleLabel = new JLabel("Configuración", SwingConstants.CENTER);
        titleLabel.setFont(UIStyles.TITLE_FONT);
        titleLabel.setForeground(UIStyles.SECONDARY_COLOR);
        titleLabel.setBorder(BorderFactory.createEmptyBorder(40, 20, 30, 20));
        add(titleLabel, BorderLayout.NORTH);

        // Panel de contenido
        JPanel contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        contentPanel.setBackground(UIStyles.BACKGROUND_COLOR);
        contentPanel.setBorder(BorderFactory.createEmptyBorder(20, 30, 20, 30));

        // ========== TARJETA 1: Información ==========
        JPanel infoCard = createCard("ℹ️ Información de la App");
        JLabel infoText = new JLabel(
                "<html><body style='width: 280px;'>" +
                        "<b>MediTime PRO v1.0</b><br><br>" +
                        "Aplicación de recordatorios de medicamentos<br>" +
                        "diseñada para adultos mayores.<br><br>" +
                        "<b>Características:</b><br>" +
                        "• Interfaz accesible (botones grandes)<br>" +
                        "• Recordatorios con sonido<br>" +
                        "• Guardado local de datos<br>" +
                        "• Notificaciones emergentes<br><br>" +
                        "<b>Tecnología:</b><br>" +
                        "• Java Swing<br>" +
                        "• Tamaño móvil: 380×720 px<br>" +
                        "• Colores verde pastel" +
                        "</body></html>"
        );
        infoText.setFont(UIStyles.NORMAL_FONT);
        infoText.setForeground(Color.DARK_GRAY);
        infoCard.add(infoText);
        contentPanel.add(infoCard);
        contentPanel.add(Box.createVerticalStrut(20));

        // ========== TARJETA 2: Instrucciones ==========
        JPanel instructionsCard = createCard("🧪 Probar Recordatorios");
        JLabel instructionsText = new JLabel(
                "<html><body style='width: 280px;'>" +
                        "<b>Para probar los recordatorios:</b><br><br>" +
                        "1. Agrega un medicamento<br>" +
                        "2. Configura la hora actual + 1 minuto<br>" +
                        "3. Espera 30-60 segundos<br>" +
                        "4. Aparecerá notificación con sonido<br><br>" +
                        "<b>Nota:</b> El sonido requiere archivo<br>" +
                        "<i>assets/alerta.wav</i> en la carpeta del proyecto" +
                        "</body></html>"
        );
        instructionsText.setFont(UIStyles.NORMAL_FONT);
        instructionsText.setForeground(Color.DARK_GRAY);
        instructionsCard.add(instructionsText);
        contentPanel.add(instructionsCard);
        contentPanel.add(Box.createVerticalStrut(20));

        // ========== BOTONES DE PRUEBA ==========
        JPanel testButtonsPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 0));
        testButtonsPanel.setBackground(UIStyles.BACKGROUND_COLOR);

        JButton clearDataButton = new JButton("🗑️ Limpiar datos (TEST)");
        UIStyles.styleSecondaryButton(clearDataButton);
        clearDataButton.setFont(UIStyles.SMALL_FONT);
        clearDataButton.addActionListener(e -> clearData());

        JButton testSoundButton = new JButton("🔔 Probar sonido");
        UIStyles.styleSecondaryButton(testSoundButton);
        testSoundButton.setFont(UIStyles.SMALL_FONT);
        testSoundButton.addActionListener(e -> testSound());

        testButtonsPanel.add(clearDataButton);
        testButtonsPanel.add(testSoundButton);
        contentPanel.add(testButtonsPanel);
        contentPanel.add(Box.createVerticalStrut(30));

        // ========== BOTÓN VOLVER ==========
        JButton backButton = new JButton("↩️ Volver al Menú");
        UIStyles.stylePrimaryButton(backButton);
        backButton.setAlignmentX(Component.CENTER_ALIGNMENT);
        backButton.addActionListener(e -> appFrame.showMenu());
        backButton.setMaximumSize(new Dimension(280, 50));

        contentPanel.add(backButton);

        // Scroll
        JScrollPane scrollPane = new JScrollPane(contentPanel);
        scrollPane.setBorder(BorderFactory.createEmptyBorder());
        scrollPane.getVerticalScrollBar().setUnitIncrement(16);
        add(scrollPane, BorderLayout.CENTER);
    }

    // Método para crear tarjetas SIN styleCardPanel()
    private JPanel createCard(String title) {
        JPanel card = new JPanel(new BorderLayout());

        // Estilo manual (en lugar de usar styleCardPanel)
        card.setBackground(Color.WHITE);
        card.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(UIStyles.BORDER_COLOR, 2),
                BorderFactory.createEmptyBorder(20, 20, 20, 20)
        ));
        card.setMaximumSize(new Dimension(340, 450));

        // Título
        JLabel titleLabel = new JLabel(title);
        titleLabel.setFont(UIStyles.HEADER_FONT);
        titleLabel.setForeground(UIStyles.SECONDARY_COLOR);
        titleLabel.setBorder(BorderFactory.createEmptyBorder(0, 0, 15, 0));
        card.add(titleLabel, BorderLayout.NORTH);

        return card;
    }

    private void clearData() {
        int confirm = JOptionPane.showConfirmDialog(this,
                "<html><body style='width: 250px;'>" +
                        "<b>¿Eliminar TODOS los medicamentos?</b><br><br>" +
                        "⚠️ ¡Esta acción no se puede deshacer!<br>" +
                        "Se borrarán todos los datos guardados." +
                        "</body></html>",
                "Confirmar limpieza",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.WARNING_MESSAGE);

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                services.StorageService.clearAll();
                JOptionPane.showMessageDialog(this,
                        "✅ Todos los datos han sido eliminados",
                        "Limpieza completada",
                        JOptionPane.INFORMATION_MESSAGE);
            } catch (Exception e) {
                JOptionPane.showMessageDialog(this,
                        "❌ Error al limpiar datos: " + e.getMessage(),
                        "Error",
                        JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void testSound() {
        try {
            // Intentar reproducir sonido del sistema
            java.awt.Toolkit.getDefaultToolkit().beep();

            JOptionPane.showMessageDialog(this,
                    "<html><body style='width: 250px;'>" +
                            "<b>✅ Sonido de prueba</b><br><br>" +
                            "Deberías haber escuchado un 'beep'.<br><br>" +
                            "<b>Para recordatorios reales:</b><br>" +
                            "1. Agrega medicamento con hora futura<br>" +
                            "2. Espera a que coincida la hora<br>" +
                            "3. Aparecerá notificación con sonido" +
                            "</body></html>",
                    "Prueba de sonido",
                    JOptionPane.INFORMATION_MESSAGE);

        } catch (Exception e) {
            JOptionPane.showMessageDialog(this,
                    "❌ No se pudo reproducir sonido de prueba",
                    "Error",
                    JOptionPane.ERROR_MESSAGE);
        }
    }
}