package panels;

import services.UIStyles;
import javax.swing.*;
import java.awt.*;

public class MenuPanel extends JPanel {
    private final AppFrame appFrame;

    public MenuPanel(AppFrame appFrame) {
        this.appFrame = appFrame;
        setupUI();
    }

    private void setupUI() {
        setLayout(new BorderLayout());
        setBackground(UIStyles.BACKGROUND_COLOR);

        // Encabezado
        JLabel titleLabel = new JLabel("Menú Principal", SwingConstants.CENTER);
        titleLabel.setFont(UIStyles.TITLE_FONT);
        titleLabel.setForeground(Color.BLACK);
        titleLabel.setBorder(BorderFactory.createEmptyBorder(40, 20, 30, 20));
        add(titleLabel, BorderLayout.NORTH);

        // Panel de botones
        JPanel buttonPanel = new JPanel();
        buttonPanel.setLayout(new BoxLayout(buttonPanel, BoxLayout.Y_AXIS));
        buttonPanel.setBackground(UIStyles.BACKGROUND_COLOR);
        buttonPanel.setBorder(BorderFactory.createEmptyBorder(20, 30, 20, 30));

        // Botón 1: Agregar medicamento
        JButton addButton = createMenuButton("➕ Agregar Medicamento",
                "Registra un nuevo medicamento");
        addButton.addActionListener(e -> appFrame.showAddMedicine());

        // Botón 2: Ver medicamentos
        JButton listButton = createMenuButton("📋 Ver Medicamentos",
                "Consulta y gestiona tu lista");
        listButton.addActionListener(e -> appFrame.showMedicineList());

        // Botón 3: Probar recordatorio
        JButton testButton = createMenuButton("⏰ Probar Recordatorio",
                "Simula una notificación");
        testButton.addActionListener(e -> testReminder());

        // Botón 4: Configuración
        JButton settingsButton = createMenuButton("⚙️ Configuración",
                "Ajustes de la aplicación");
        settingsButton.addActionListener(e -> appFrame.showSettings());

        // Botón 5: Salir
        JButton exitButton = createMenuButton("🚪 Salir",
                "Cerrar la aplicación");
        exitButton.addActionListener(e -> {
            appFrame.stopReminders();
            System.exit(0);
        });

        // Agregar botones con espaciado
        buttonPanel.add(Box.createVerticalStrut(10));
        buttonPanel.add(addButton);
        buttonPanel.add(Box.createVerticalStrut(15));
        buttonPanel.add(listButton);
        buttonPanel.add(Box.createVerticalStrut(15));
        buttonPanel.add(testButton);
        buttonPanel.add(Box.createVerticalStrut(15));
        buttonPanel.add(settingsButton);
        buttonPanel.add(Box.createVerticalStrut(25));
        buttonPanel.add(exitButton);

        add(buttonPanel, BorderLayout.CENTER);
    }

    private JButton createMenuButton(String title, String subtitle) {
        boolean isBlind = services.AccessibilityDetector.isBlindModeActive();
        JButton button = new JButton();
        button.setLayout(new BorderLayout());
        button.setBackground(Color.WHITE);

        // Grosor de borde dinámico
        int borderThickness = isBlind ? 3 : 1;
        button.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Color.BLACK, borderThickness),
                BorderFactory.createEmptyBorder(isBlind ? 20 : 10, 20, isBlind ? 20 : 10, 20)));

        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        button.setFocusPainted(false);

        // Altura dinámica
        button.setPreferredSize(new Dimension(280, isBlind ? 100 : 70));

        // Títulos dinámicos
        JLabel titleLabel = new JLabel(title);
        titleLabel.setFont(new Font("Arial", Font.BOLD, isBlind ? 28 : 18));
        titleLabel.setForeground(Color.BLACK);

        JLabel subtitleLabel = new JLabel(subtitle);
        subtitleLabel.setFont(new Font("Arial", Font.PLAIN, isBlind ? 20 : 12));
        subtitleLabel.setForeground(new Color(80, 80, 80));

        JPanel contentPanel = new JPanel(new BorderLayout());
        contentPanel.setBackground(Color.WHITE);
        contentPanel.add(titleLabel, BorderLayout.NORTH);
        contentPanel.add(subtitleLabel, BorderLayout.SOUTH);

        button.add(contentPanel, BorderLayout.CENTER);

        // Efecto hover y AUDIO FEEDBACK CONDICIONAL
        button.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                button.setBackground(new Color(255, 255, 200));
                contentPanel.setBackground(new Color(255, 255, 200));

                if (isBlind) {
                    services.TTSService.speak(title.replaceAll("[^\\p{L}\\p{Nd}\\s]", "").trim());
                }
            }

            public void mouseExited(java.awt.event.MouseEvent evt) {
                button.setBackground(Color.WHITE);
                contentPanel.setBackground(Color.WHITE);
            }
        });

        return button;
    }

    private void testReminder() {
        JOptionPane.showMessageDialog(this,
                "<html><body style='width: 250px;'>" +
                        "<b>Prueba de recordatorio</b><br><br>" +
                        "Para probar correctamente:<br>" +
                        "1. Agrega un medicamento<br>" +
                        "2. Pon la hora actual + 1 minuto<br>" +
                        "3. Espera 30-60 segundos<br>" +
                        "4. Verás la notificación emergente" +
                        "</body></html>",
                "Probar Recordatorio",
                JOptionPane.INFORMATION_MESSAGE);
    }
}