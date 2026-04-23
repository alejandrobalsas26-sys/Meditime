package panels;

import services.ReminderService;
import services.UIStyles;
import javax.swing.*;
import java.awt.*;

public class AppFrame extends JFrame {
    private final CardLayout cardLayout;
    private final JPanel cardPanel;
    private final ReminderService reminderService;

    private final WelcomePanel welcomePanel;
    private final MenuPanel menuPanel;
    private final AddMedicinePanel addMedicinePanel;
    private final MedicineListPanel medicineListPanel;
    private final SettingsPanel settingsPanel;

    private JButton[] navButtons;

    public AppFrame() {

        setTitle("MediTime PRO");
        setSize(380, 720); // Tamaño exacto móvil
        setResizable(false);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null); // Centrar ventana

        setLayout(new BorderLayout());

        JPanel topBar = createTopBar();
        add(topBar, BorderLayout.NORTH);

        cardLayout = new CardLayout();
        cardPanel = new JPanel(cardLayout);
        cardPanel.setBackground(UIStyles.BACKGROUND_COLOR);

        welcomePanel = new WelcomePanel(this);
        menuPanel = new MenuPanel(this);
        addMedicinePanel = new AddMedicinePanel(this);
        medicineListPanel = new MedicineListPanel(this);
        settingsPanel = new SettingsPanel(this);

        cardPanel.add(welcomePanel, "WELCOME");
        cardPanel.add(menuPanel, "MENU");
        cardPanel.add(addMedicinePanel, "ADD");
        cardPanel.add(medicineListPanel, "LIST");
        cardPanel.add(settingsPanel, "SETTINGS");

        JPanel centerContainer = new JPanel(new GridBagLayout());
        centerContainer.setBackground(UIStyles.BACKGROUND_COLOR);
        centerContainer.add(cardPanel);

        add(centerContainer, BorderLayout.CENTER);

        JPanel bottomNav = createBottomNavigation();
        add(bottomNav, BorderLayout.SOUTH);

        reminderService = new ReminderService(this);
        reminderService.start();

        showWelcome();
        updateNavSelection(0); // Seleccionar "Inicio"
    }

    private JPanel createTopBar() {
        JPanel topBar = new JPanel(new BorderLayout());
        topBar.setBackground(new Color(100, 180, 100)); // Verde
        topBar.setPreferredSize(new Dimension(380, 50));
        topBar.setBorder(BorderFactory.createEmptyBorder(5, 0, 5, 0));

        JLabel title = new JLabel(" MediTime PRO", SwingConstants.LEFT);
        title.setFont(new Font("Arial", Font.BOLD, 20));
        title.setForeground(Color.WHITE);
        title.setBorder(BorderFactory.createEmptyBorder(0, 20, 0, 0));

        // Hora simulada
        JLabel timeLabel = new JLabel("9:41", SwingConstants.RIGHT);
        timeLabel.setFont(new Font("Arial", Font.BOLD, 16));
        timeLabel.setForeground(Color.WHITE);
        timeLabel.setBorder(BorderFactory.createEmptyBorder(0, 0, 0, 20));

        topBar.add(title, BorderLayout.WEST);
        topBar.add(timeLabel, BorderLayout.EAST);

        // Simulador de voz (Solo si es modo ciego)
        if (services.AccessibilityDetector.isBlindModeActive()) {
            JButton micButton = new JButton("🎤");
            micButton.setFont(new Font("Segoe UI Emoji", Font.PLAIN, 24));
            micButton.setBackground(new Color(100, 180, 100));
            micButton.setForeground(Color.WHITE);
            micButton.setBorderPainted(false);
            micButton.setFocusPainted(false);
            micButton.setCursor(new Cursor(Cursor.HAND_CURSOR));

            micButton.addActionListener(e -> {
                services.TTSService.speak("Escuchando...");
                JOptionPane.showMessageDialog(this,
                        "Escuchando comandos de voz...\n(Simulación)",
                        "Control por Voz",
                        JOptionPane.INFORMATION_MESSAGE);
            });
            topBar.add(micButton, BorderLayout.CENTER);
        }

        startClock(timeLabel);

        return topBar;
    }

    private void startClock(JLabel timeLabel) {
        Timer timer = new Timer(1000, e -> {
            java.time.LocalTime now = java.time.LocalTime.now();
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("HH:mm");
            timeLabel.setText(now.format(formatter));
        });
        timer.start();
    }

    private JPanel createBottomNavigation() {
        JPanel navPanel = new JPanel(new GridLayout(1, 3));
        navPanel.setBackground(Color.WHITE);
        navPanel.setPreferredSize(new Dimension(380, 60));
        navPanel.setBorder(BorderFactory.createMatteBorder(2, 0, 0, 0, new Color(200, 200, 200)));

        navButtons = new JButton[3];
        String[] icons = { "🏠", "💊", "⚙️" };
        String[] labels = { "Inicio", "Medicinas", "Ajustes" };

        for (int i = 0; i < 3; i++) {
            navButtons[i] = new JButton("<html><center>" + icons[i] + "<br>" + labels[i] + "</center></html>");
            navButtons[i].setFont(new Font("Arial", Font.PLAIN, 12));
            navButtons[i].setBackground(Color.WHITE);
            navButtons[i].setForeground(new Color(100, 100, 100));
            navButtons[i].setFocusPainted(false);
            navButtons[i].setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));
            navButtons[i].setCursor(new Cursor(Cursor.HAND_CURSOR));

            final int index = i;
            navButtons[i].addActionListener(e -> {
                handleNavigation(index);
                updateNavSelection(index);
            });

            navPanel.add(navButtons[i]);
        }

        return navPanel;
    }

    private void handleNavigation(int index) {
        switch (index) {
            case 0:
                showWelcome();
                break;
            case 1:
                showMedicineList();
                break;
            case 2:
                showSettings();
                break;
        }
    }

    private void updateNavSelection(int selectedIndex) {
        for (int i = 0; i < navButtons.length; i++) {
            if (i == selectedIndex) {
                navButtons[i].setBackground(new Color(240, 255, 240)); // Verde claro
                navButtons[i].setForeground(new Color(0, 100, 0)); // Verde oscuro
                navButtons[i].setFont(new Font("Arial", Font.BOLD, 12));
            } else {
                navButtons[i].setBackground(Color.WHITE);
                navButtons[i].setForeground(new Color(100, 100, 100));
                navButtons[i].setFont(new Font("Arial", Font.PLAIN, 12));
            }
        }
    }

    public void showWelcome() {
        cardLayout.show(cardPanel, "WELCOME");
        updateNavSelection(0);
    }

    public void showMenu() {
        cardLayout.show(cardPanel, "MENU");
        updateNavSelection(1);
    }

    public void showAddMedicine() {
        addMedicinePanel.clearForm();
        cardLayout.show(cardPanel, "ADD");
    }

    public void showEditMedicine(model.Medicine medicine) {
        addMedicinePanel.setEditingMedicine(medicine);
        cardLayout.show(cardPanel, "ADD");
    }

    public void showMedicineList() {
        medicineListPanel.refreshList();
        cardLayout.show(cardPanel, "LIST");
        updateNavSelection(1);
    }

    public void showSettings() {
        cardLayout.show(cardPanel, "SETTINGS");
        updateNavSelection(2);
    }

    public void stopReminders() {
        if (reminderService != null) {
            reminderService.stop();
        }
    }
}