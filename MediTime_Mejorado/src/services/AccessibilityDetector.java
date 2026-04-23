package services;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class AccessibilityDetector {
    private static boolean blindModeActive = false;

    static {
        detectScreenReader();
    }

    private static void detectScreenReader() {
        try {
            // Comando PowerShell para detectar si el flag de ScreenReader está activado en
            // Windows
            String command = "powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; if([System.Windows.Forms.SystemInformation]::ScreenReader){write-host 'True'}else{write-host 'False'}\"";
            Process process = Runtime.getRuntime().exec(command);

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null && line.trim().equalsIgnoreCase("True")) {
                    blindModeActive = true;
                    System.out.println("♿ [Detector] Modo accesibilidad detectado: ACTIVADO");
                } else {
                    blindModeActive = false;
                    System.out.println("♿ [Detector] Modo accesibilidad detectado: Desactivado");
                }
            }
            process.waitFor();
        } catch (Exception e) {
            System.err.println("❌ [Detector] Error al detectar accesibilidad: " + e.getMessage());
            blindModeActive = false; // Por defecto desactivado si hay error
        }
    }

    public static boolean isBlindModeActive() {
        return blindModeActive;
    }

    public static void setBlindModeActive(boolean active) {
        blindModeActive = active;
    }
}
