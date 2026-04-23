import javax.swing.*;

public class Main {
    public static void main(String[] args) {
        // Optimización gráfica
        System.setProperty("sun.java2d.opengl", "true");

        // Configurar accesibilidad del sistema
        System.setProperty("javax.accessibility.assistive_technologies",
                "com.sun.java.accessibility.util.Translator");

        try {
            // Configuraciones personalizadas de accesibilidad
            UIManager.put("Panel.background", new java.awt.Color(232, 245, 232));
            UIManager.put("Button.arc", 15);
            UIManager.put("Component.arc", 10);

            // Fuentes EXTRA grandes para accesibilidad
            UIManager.put("Button.font", new java.awt.Font("Arial", java.awt.Font.BOLD, 24));
            UIManager.put("Label.font", new java.awt.Font("Arial", java.awt.Font.PLAIN, 20));

        } catch (Exception e) {
            System.out.println("⚠ Usando Look and Feel por defecto");
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }

        // Ejecutar aplicación
        SwingUtilities.invokeLater(() -> {
            panels.AppFrame frame = new panels.AppFrame();
            frame.setVisible(true);
            System.out.println("✅ MediTime PRO ACCESIBLE - Aplicación iniciada");
            System.out.println("♿ Modo accesibilidad: ACTIVADO");
            System.out.println("🔊 Soporte para lectores de pantalla: ACTIVADO");
            System.out.println("📳 Sistema de alertas mejorado: ACTIVADO");
        });
    }
}

