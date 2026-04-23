package services;

import model.Medicine;

import javax.sound.sampled.Clip;
import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ThreadFactory;

public class ReminderService {
    private final JFrame parentFrame;
    private final ScheduledExecutorService scheduler;
    private final Map<String, Date> lastShownMap = new HashMap<String, Date>();
    private final Map<Integer, Clip> activeClips = new HashMap<Integer, Clip>();

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public ReminderService(JFrame parent) {
        this.parentFrame = parent;
        this.scheduler = Executors.newScheduledThreadPool(3, new ThreadFactory() {
            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "Reminder-Thread");
                t.setDaemon(true);
                return t;
            }
        });
    }

    public void start() {
        // Verificación cada 10 segundos
        scheduler.scheduleAtFixedRate(new Runnable() {
            @Override
            public void run() {
                checkReminders();
            }
        }, 0, 10, TimeUnit.SECONDS);

        // Generar sonidos si no existen
        SoundService.generarTodosSonidos();

        System.out.println("⏰ [Reminder] Servicio iniciado. Intervalo: 10s");
        System.out.println("♿ [Reminder] Detección auto-accesibilidad activa.");
    }

    public void stop() {
        for (Clip clip : activeClips.values()) {
            if (clip != null && clip.isRunning()) {
                clip.stop();
                clip.close();
            }
        }
        activeClips.clear();
        scheduler.shutdown();
        System.out.println("⏹️ [Reminder] Servicio detenido");
    }

    private void checkReminders() {
        String currentTime = LocalTime.now().format(TIME_FORMATTER);
        String currentDay = getCurrentDayInSpanish();
        Date today = new Date();

        // Heartbeat log para diagnóstico
        System.out.println("🔍 [Reminder] Comprobando: " + currentTime + " (" + currentDay + ")");

        List<Medicine> medicines = StorageService.getMedicines();
        if (medicines.isEmpty()) {
            // System.out.println("ℹ️ [Reminder] No hay medicamentos registrados.");
        }

        for (Medicine med : medicines) {
            if (med.isConfirmado())
                continue;

            if ("specific".equals(med.getFrequency())) {
                if (!med.getDays().contains(currentDay))
                    continue;
            }

            for (String scheduledTime : med.getTimes()) {
                // ALERTA PRINCIPAL (hora exacta)
                if (scheduledTime.equals(currentTime)) {
                    String key = med.getId() + "_" + scheduledTime;
                    if (!yaSeAlerto(key, today)) {
                        mostrarAlertaPrincipal(med, scheduledTime);
                        lastShownMap.put(key, today);
                    }
                }

                // PRE-ALERTA (10 minutos antes)
                if (esHoraMenos10Minutos(currentTime, scheduledTime)) {
                    String key = med.getId() + "_prealerta_" + scheduledTime;
                    if (!yaSeAlerto(key, today)) {
                        mostrarPreAlerta(med, scheduledTime);
                        lastShownMap.put(key, today);
                    }
                }
            }
        }
    }

    private void mostrarPreAlerta(final Medicine medicine, String time) {
        System.out.println("⏰ [Alerta] Pre-alerta: " + medicine.getName());
        SoundService.reproducir(SoundService.TipoSonido.PRE_ALERTA);

        if (AccessibilityDetector.isBlindModeActive()) {
            leerTexto("Atención. En 10 minutos debe tomar " + medicine.getName());
        }

        SwingUtilities.invokeLater(() -> {
            JOptionPane pane = new JOptionPane("⏰ Recordatorio\n\nEn 10 minutos:\n" + medicine.getName(),
                    JOptionPane.INFORMATION_MESSAGE);
            final JDialog dialog = pane.createDialog(parentFrame, "Próximo medicamento");
            javax.swing.Timer timer = new javax.swing.Timer(5000, e -> dialog.dispose());
            timer.setRepeats(false);
            timer.start();
            dialog.setVisible(true);
        });
    }

    private void mostrarAlertaPrincipal(final Medicine medicine, final String time) {
        System.out.println("🚨 [Alerta] ¡HORA DE TOMAR " + medicine.getName() + "!");

        // 1. SONIDO PRIMERO (Para llamar la atención inmediata)
        SoundService.TipoSonido tipoSonido;
        String prioridad = medicine.getPrioridad();
        if ("URGENTE".equals(prioridad))
            tipoSonido = SoundService.TipoSonido.URGENTE;
        else if ("BAJA".equals(prioridad))
            tipoSonido = SoundService.TipoSonido.SUAVE;
        else
            tipoSonido = SoundService.TipoSonido.NORMAL;

        Clip clip = SoundService.reproducirEnBucle(tipoSonido);
        activeClips.put(medicine.getId(), clip);

        // 2. VOZ (Si está activo el modo ciego)
        if (AccessibilityDetector.isBlindModeActive()) {
            String mensaje = String.format(
                    "¡Atención! Es hora de tomar %s. Dosis: %s. Ubicación: %s. Presione el botón verde para confirmar.",
                    medicine.getName(), medicine.getDose(), medicine.getUbicacion());
            leerTexto(mensaje);
        }

        // 3. UI
        SwingUtilities.invokeLater(() -> mostrarDialogoAccesible(medicine, time));

        programarRecordatoriosSiNoConfirma(medicine, time);
    }

    private void mostrarDialogoAccesible(final Medicine medicine, String time) {
        final JDialog dialog = new JDialog(parentFrame, "⏰ HORA DE MEDICAMENTO", true);
        dialog.setUndecorated(true);
        dialog.setSize(380, 600);
        dialog.setLocationRelativeTo(parentFrame);
        dialog.setLayout(new BorderLayout());

        JPanel mainPanel = new JPanel(new BorderLayout());
        Color colorFondo = obtenerColorPrioridad(medicine.getPrioridad());
        mainPanel.setBackground(colorFondo);
        mainPanel.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Color.BLACK, 3),
                BorderFactory.createEmptyBorder(30, 30, 30, 30)));

        final JLabel iconLabel = new JLabel("💊", SwingConstants.CENTER);
        iconLabel.setFont(new Font("Segoe UI Emoji", Font.PLAIN, 100));

        final javax.swing.Timer blinkTimer = new javax.swing.Timer(500, new ActionListener() {
            boolean visible = true;

            public void actionPerformed(ActionEvent e) {
                iconLabel.setVisible(visible);
                visible = !visible;
            }
        });
        blinkTimer.start();

        JPanel infoPanel = new JPanel();
        infoPanel.setLayout(new BoxLayout(infoPanel, BoxLayout.Y_AXIS));
        infoPanel.setBackground(colorFondo);

        JLabel titleLabel = new JLabel("¡HORA DE MEDICAMENTO!", SwingConstants.CENTER);
        titleLabel.setFont(new Font("Arial", Font.BOLD, 32));
        titleLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel nameLabel = new JLabel(medicine.getName(), SwingConstants.CENTER);
        nameLabel.setFont(new Font("Arial", Font.BOLD, 48));
        nameLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

        JTextArea infoArea = new JTextArea();
        infoArea.setText(
                "Dosis: " + medicine.getDose() + "\nHora: " + time + "\nUbicación: " + medicine.getUbicacion());
        infoArea.setFont(new Font("Arial", Font.PLAIN, 24));
        infoArea.setEditable(false);
        infoArea.setBackground(colorFondo);
        infoArea.setAlignmentX(Component.CENTER_ALIGNMENT);

        infoPanel.add(titleLabel);
        infoPanel.add(Box.createVerticalStrut(20));
        infoPanel.add(nameLabel);
        infoPanel.add(Box.createVerticalStrut(20));
        infoPanel.add(infoArea);

        JPanel buttonPanel = new JPanel();
        buttonPanel.setLayout(new BoxLayout(buttonPanel, BoxLayout.Y_AXIS));
        buttonPanel.setBackground(colorFondo);

        JButton takenButton = new JButton("✅ YA TOMÉ");
        takenButton.setFont(new Font("Arial", Font.BOLD, 36));
        takenButton.setBackground(new Color(76, 175, 80));
        takenButton.setForeground(Color.WHITE);
        takenButton.addActionListener(e -> {
            blinkTimer.stop();
            detenerSonido(medicine.getId());
            medicine.setConfirmado(true);
            StorageService.updateMedicine(medicine);
            SoundService.reproducir(SoundService.TipoSonido.CONFIRMACION);
            if (AccessibilityDetector.isBlindModeActive())
                leerTexto("Medicamento confirmado. Muy bien.");
            dialog.dispose();
        });

        buttonPanel.add(takenButton);
        buttonPanel.add(Box.createVerticalStrut(20));

        // Botón Posponer
        JButton snoozeButton = new JButton("⏰ POSPONER 10 MIN");
        snoozeButton.setFont(new Font("Arial", Font.BOLD, 28));
        snoozeButton.setBackground(new Color(255, 193, 7)); // Amber/Yellow
        snoozeButton.setForeground(Color.BLACK);
        snoozeButton.addActionListener(e -> {
            blinkTimer.stop();
            detenerSonido(medicine.getId());
            // Programar re-aviso en 10 minutos
            scheduler.schedule(() -> {
                mostrarAlertaPrincipal(medicine, time);
            }, 10, TimeUnit.MINUTES);

            if (AccessibilityDetector.isBlindModeActive())
                leerTexto("Recordatorio pospuesto por 10 minutos.");
            dialog.dispose();
        });
        buttonPanel.add(snoozeButton);
        mainPanel.add(iconLabel, BorderLayout.NORTH);
        mainPanel.add(infoPanel, BorderLayout.CENTER);
        mainPanel.add(buttonPanel, BorderLayout.SOUTH);

        dialog.add(mainPanel);
        dialog.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                blinkTimer.stop();
                detenerSonido(medicine.getId());
            }
        });
        dialog.setVisible(true);
    }

    private void programarRecordatoriosSiNoConfirma(final Medicine medicine, final String time) {
        for (int i = 1; i <= 3; i++) {
            final int intento = i;
            scheduler.schedule(() -> {
                if (!medicine.isConfirmado()) {
                    System.out.println("🔔 Recordatorio " + intento + "/3: " + medicine.getName());
                    SoundService.reproducir(SoundService.TipoSonido.NORMAL);
                    if (AccessibilityDetector.isBlindModeActive()) {
                        leerTexto("Recordatorio: ¿Ya tomó " + medicine.getName() + "?");
                    }
                }
            }, i * 5, TimeUnit.MINUTES);
        }
    }

    private boolean yaSeAlerto(String key, Date today) {
        Date lastShown = lastShownMap.get(key);
        if (lastShown != null) {
            long diff = today.getTime() - lastShown.getTime();
            return diff < 60000;
        }
        return false;
    }

    private boolean esHoraMenos10Minutos(String horaActual, String horaObjetivo) {
        try {
            LocalTime actual = LocalTime.parse(horaActual, TIME_FORMATTER);
            LocalTime objetivo = LocalTime.parse(horaObjetivo, TIME_FORMATTER);
            return actual.equals(objetivo.minusMinutes(10));
        } catch (Exception e) {
            return false;
        }
    }

    private Color obtenerColorPrioridad(String prioridad) {
        if ("URGENTE".equals(prioridad))
            return new Color(255, 235, 238);
        return new Color(255, 249, 196);
    }

    private void detenerSonido(int medicineId) {
        Clip clip = activeClips.get(medicineId);
        if (clip != null && clip.isRunning()) {
            clip.stop();
            clip.close();
            activeClips.remove(medicineId);
        }
    }

    private void leerTexto(String texto) {
        TTSService.speak(texto);
    }

    private String getCurrentDayInSpanish() {
        String[] days = { "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado" };
        return days[Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1];
    }
}
