package panels;

import services.UIStyles;
import javax.swing.*;
import java.awt.*;

public class WelcomePanel extends JPanel {
        private final AppFrame appFrame;

        public WelcomePanel(AppFrame appFrame) {
                this.appFrame = appFrame;
                setupUI();
        }

        private void setupUI() {
                setLayout(new BorderLayout());
                setBackground(UIStyles.BACKGROUND_COLOR);

                // Panel central con BoxLayout
                JPanel centerPanel = new JPanel();
                centerPanel.setLayout(new BoxLayout(centerPanel, BoxLayout.Y_AXIS));
                centerPanel.setBackground(UIStyles.BACKGROUND_COLOR);
                centerPanel.setBorder(BorderFactory.createEmptyBorder(80, 40, 80, 40));

                // Icono
                JLabel iconLabel = new JLabel("💊", SwingConstants.CENTER);
                iconLabel.setFont(new Font("Arial", Font.PLAIN, 80));
                iconLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

                // Título
                JLabel titleLabel = UIStyles.createCenteredLabel("MediTime PRO",
                                UIStyles.TITLE_FONT, UIStyles.SECONDARY_COLOR);

                // Subtítulo
                JLabel subtitleLabel = new JLabel(
                                "<html><div style='text-align: center; width: 280px;'>" +
                                                "Recordatorios de medicamentos<br>" +
                                                "para adultos mayores" +
                                                "</div></html>",
                                SwingConstants.CENTER);
                subtitleLabel.setFont(UIStyles.NORMAL_FONT);
                subtitleLabel.setForeground(UIStyles.SECONDARY_COLOR);
                subtitleLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

                // Espaciadores
                centerPanel.add(Box.createVerticalStrut(40));
                centerPanel.add(iconLabel);
                centerPanel.add(Box.createVerticalStrut(30));
                centerPanel.add(titleLabel);
                centerPanel.add(Box.createVerticalStrut(20));
                centerPanel.add(subtitleLabel);
                centerPanel.add(Box.createVerticalStrut(60));

                // Botón DINÁMICO
                boolean isBlind = services.AccessibilityDetector.isBlindModeActive();
                JButton startButton = new JButton("C O M E N Z A R");
                startButton.setFont(new Font("Arial", Font.BOLD, isBlind ? 28 : 20));
                startButton.setBackground(new Color(76, 175, 80));
                startButton.setForeground(Color.WHITE);
                startButton.setFocusPainted(false);
                startButton.setBorder(BorderFactory.createCompoundBorder(
                                BorderFactory.createLineBorder(Color.BLACK, isBlind ? 3 : 1),
                                BorderFactory.createEmptyBorder(isBlind ? 15 : 10, 40, isBlind ? 15 : 10, 40)));
                startButton.setAlignmentX(Component.CENTER_ALIGNMENT);
                startButton.setMaximumSize(new Dimension(isBlind ? 350 : 250, isBlind ? 80 : 60));
                startButton.setCursor(new Cursor(Cursor.HAND_CURSOR));

                startButton.addActionListener(e -> appFrame.showMenu());

                // AUDIO FEEDBACK CONDICIONAL
                startButton.addMouseListener(new java.awt.event.MouseAdapter() {
                        public void mouseEntered(java.awt.event.MouseEvent evt) {
                                startButton.setBackground(new Color(56, 142, 60)); // Oscurecer al hover
                                if (isBlind) {
                                        services.TTSService.speak("Botón Comenzar. Pulse para iniciar.");
                                }
                        }

                        public void mouseExited(java.awt.event.MouseEvent evt) {
                                startButton.setBackground(new Color(76, 175, 80));
                        }
                });

                centerPanel.add(startButton);
                centerPanel.add(Box.createVerticalStrut(40));

                // Versión
                JLabel versionLabel = UIStyles.createCenteredLabel(
                                "Versión 1.0 · Diseño accesible",
                                UIStyles.SMALL_FONT,
                                new Color(120, 140, 120));

                centerPanel.add(versionLabel);

                // Contenedor final
                JPanel finalContainer = new JPanel(new GridBagLayout());
                finalContainer.setBackground(UIStyles.BACKGROUND_COLOR);
                finalContainer.add(centerPanel);

                add(finalContainer, BorderLayout.CENTER);
        }
}