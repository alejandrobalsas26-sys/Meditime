package services;

import javax.swing.*;
import java.awt.*;

public class UIStyles {
    // ========== COLORES VERDE PASTEL PARA ADULTOS MAYORES ==========
    public static final Color BACKGROUND_COLOR = new Color(232, 245, 232); // Verde pastel claro
    public static final Color PANEL_COLOR = new Color(210, 235, 210);      // Verde pastel medio
    public static final Color ACCENT_COLOR = new Color(76, 175, 80);       // Verde botones
    public static final Color SECONDARY_COLOR = new Color(56, 142, 60);    // Verde texto
    public static final Color CARD_COLOR = Color.WHITE;
    public static final Color BORDER_COLOR = new Color(180, 220, 180);     // Verde claro bordes

    // ========== FUENTES GRANDES Y CLARAS ==========
    public static final Font TITLE_FONT = new Font("Arial", Font.BOLD, 26);
    public static final Font HEADER_FONT = new Font("Arial", Font.BOLD, 20);
    public static final Font NORMAL_FONT = new Font("Arial", Font.PLAIN, 18);
    public static final Font BUTTON_FONT = new Font("Arial", Font.BOLD, 20);
    public static final Font SMALL_FONT = new Font("Arial", Font.PLAIN, 16);

    // ========== MÉTODOS PARA ESTILOS ==========

    // Botón principal (grande y claro)
    public static void stylePrimaryButton(JButton button) {
        button.setFont(BUTTON_FONT);
        button.setBackground(ACCENT_COLOR);
        button.setForeground(Color.WHITE);
        button.setFocusPainted(false);
        button.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(56, 142, 60), 2),
                BorderFactory.createEmptyBorder(15, 30, 15, 30)
        ));
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        button.setAlignmentX(Component.CENTER_ALIGNMENT);
    }

    // Botón secundario
    public static void styleSecondaryButton(JButton button) {
        button.setFont(NORMAL_FONT);
        button.setBackground(new Color(245, 245, 245));
        button.setForeground(SECONDARY_COLOR);
        button.setFocusPainted(false);
        button.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(BORDER_COLOR, 1),
                BorderFactory.createEmptyBorder(12, 25, 12, 25)
        ));
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        button.setAlignmentX(Component.CENTER_ALIGNMENT);
    }

    // Panel de contenido
    public static JPanel createContentPanel() {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBackground(BACKGROUND_COLOR);
        panel.setBorder(BorderFactory.createEmptyBorder(30, 25, 30, 25));
        return panel;
    }

    // Etiqueta centrada
    public static JLabel createCenteredLabel(String text, Font font, Color color) {
        JLabel label = new JLabel(text, SwingConstants.CENTER);
        label.setFont(font);
        label.setForeground(color);
        label.setAlignmentX(Component.CENTER_ALIGNMENT);
        return label;
    }

    // Campo de texto
    public static void styleTextField(JTextField field) {
        field.setFont(NORMAL_FONT);
        field.setMaximumSize(new Dimension(320, 45));
        field.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(BORDER_COLOR, 1),
                BorderFactory.createEmptyBorder(12, 15, 12, 15)
        ));
        field.setAlignmentX(Component.CENTER_ALIGNMENT);
    }

    // Área de texto
    public static void styleTextArea(JTextArea area) {
        area.setFont(NORMAL_FONT);
        area.setLineWrap(true);
        area.setWrapStyleWord(true);
        area.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(BORDER_COLOR, 1),
                BorderFactory.createEmptyBorder(10, 10, 10, 10)
        ));
    }

    // Lista desplegable
    public static void styleComboBox(JComboBox<String> combo) {
        combo.setFont(NORMAL_FONT);
        combo.setBackground(Color.WHITE);
        combo.setMaximumSize(new Dimension(320, 45));
    }
}