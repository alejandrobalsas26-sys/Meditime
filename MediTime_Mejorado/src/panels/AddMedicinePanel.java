package panels;

import model.Medicine;
import services.StorageService;
import services.UIStyles;
import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

public class AddMedicinePanel extends JPanel {
    private final AppFrame appFrame;
    private Medicine editingMedicine = null;

    private JTextField nameField;
    private JTextField doseField;
    private JComboBox<String> frequencyCombo;
    private JList<String> daysList;
    private DefaultListModel<String> timesModel;
    private JList<String> timesList;
    private JTextField timeField;
    private JTextArea notesArea;

    private static final String[] DAYS_ES = {
            "Lunes", "Martes", "Miércoles", "Jueves",
            "Viernes", "Sábado", "Domingo"
    };

    public AddMedicinePanel(AppFrame appFrame) {
        this.appFrame = appFrame;
        setupUI();
    }

    private void setupUI() {
        setLayout(new BorderLayout());
        setBackground(UIStyles.BACKGROUND_COLOR);

        // Panel con scroll
        JPanel mainPanel = new JPanel();
        mainPanel.setLayout(new BorderLayout());
        mainPanel.setBackground(UIStyles.BACKGROUND_COLOR);

        // Título
        JLabel titleLabel = new JLabel("Nuevo Medicamento", SwingConstants.CENTER);
        titleLabel.setFont(UIStyles.TITLE_FONT);
        titleLabel.setForeground(UIStyles.SECONDARY_COLOR);
        titleLabel.setBorder(BorderFactory.createEmptyBorder(30, 20, 20, 20));
        mainPanel.add(titleLabel, BorderLayout.NORTH);

        // Panel de formulario con scroll
        JPanel formPanel = UIStyles.createContentPanel();

        // 1. NOMBRE
        formPanel.add(createSectionLabel("Nombre del medicamento:"));
        nameField = new JTextField();
        UIStyles.styleTextField(nameField);
        formPanel.add(nameField);
        formPanel.add(Box.createVerticalStrut(20));

        // 2. DOSIS
        formPanel.add(createSectionLabel("Dosis (ej: 1 tableta, 10ml):"));
        doseField = new JTextField();
        UIStyles.styleTextField(doseField);
        formPanel.add(doseField);
        formPanel.add(Box.createVerticalStrut(20));

        // 3. FRECUENCIA
        formPanel.add(createSectionLabel("Frecuencia:"));
        frequencyCombo = new JComboBox<>(new String[]{"Diario", "Días específicos"});
        UIStyles.styleComboBox(frequencyCombo);
        frequencyCombo.setAlignmentX(Component.CENTER_ALIGNMENT);
        formPanel.add(frequencyCombo);
        formPanel.add(Box.createVerticalStrut(20));

        // 4. DÍAS (solo si "Días específicos")
        JPanel daysPanel = new JPanel(new BorderLayout());
        daysPanel.setBackground(UIStyles.BACKGROUND_COLOR);
        daysPanel.setMaximumSize(new Dimension(320, 150));
        daysPanel.setVisible(false);

        daysList = new JList<>(DAYS_ES);
        daysList.setFont(UIStyles.SMALL_FONT);
        daysList.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
        daysList.setBackground(Color.WHITE);

        JScrollPane daysScroll = new JScrollPane(daysList);
        daysScroll.setBorder(BorderFactory.createLineBorder(UIStyles.BORDER_COLOR, 1));

        daysPanel.add(createSectionLabel("Seleccionar días:"), BorderLayout.NORTH);
        daysPanel.add(daysScroll, BorderLayout.CENTER);

        formPanel.add(daysPanel);
        formPanel.add(Box.createVerticalStrut(20));

        // Mostrar/ocultar días según frecuencia
        frequencyCombo.addActionListener(e -> {
            daysPanel.setVisible(frequencyCombo.getSelectedIndex() == 1);
            revalidate();
            repaint();
        });

        // 5. HORAS
        formPanel.add(createSectionLabel("Horas de toma (formato HH:mm):"));

        // Panel para agregar horas
        JPanel timeInputPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 0));
        timeInputPanel.setBackground(UIStyles.BACKGROUND_COLOR);

        timeField = new JTextField(8);
        timeField.setFont(UIStyles.NORMAL_FONT);
        timeField.setPreferredSize(new Dimension(100, 40));
        timeField.setBorder(BorderFactory.createLineBorder(UIStyles.BORDER_COLOR, 1));

        JButton addTimeButton = new JButton("➕ Agregar");
        addTimeButton.setFont(UIStyles.SMALL_FONT);
        addTimeButton.setBackground(UIStyles.ACCENT_COLOR);
        addTimeButton.setForeground(Color.WHITE);
        addTimeButton.setFocusPainted(false);
        addTimeButton.setBorder(BorderFactory.createEmptyBorder(8, 15, 8, 15));
        addTimeButton.addActionListener(e -> addTime());

        timeInputPanel.add(timeField);
        timeInputPanel.add(addTimeButton);
        formPanel.add(timeInputPanel);
        formPanel.add(Box.createVerticalStrut(10));

        // Lista de horas agregadas
        timesModel = new DefaultListModel<>();
        timesList = new JList<>(timesModel);
        timesList.setFont(UIStyles.SMALL_FONT);
        timesList.setBackground(Color.WHITE);

        JScrollPane timesScroll = new JScrollPane(timesList);
        timesScroll.setPreferredSize(new Dimension(320, 100));
        timesScroll.setBorder(BorderFactory.createLineBorder(UIStyles.BORDER_COLOR, 1));
        timesScroll.setAlignmentX(Component.CENTER_ALIGNMENT);

        JButton removeTimeButton = new JButton("🗑️ Quitar seleccionada");
        removeTimeButton.setFont(UIStyles.SMALL_FONT);
        removeTimeButton.setBackground(new Color(220, 220, 220));
        removeTimeButton.setFocusPainted(false);
        removeTimeButton.setBorder(BorderFactory.createEmptyBorder(8, 15, 8, 15));
        removeTimeButton.addActionListener(e -> removeSelectedTime());
        removeTimeButton.setAlignmentX(Component.CENTER_ALIGNMENT);

        formPanel.add(timesScroll);
        formPanel.add(Box.createVerticalStrut(5));
        formPanel.add(removeTimeButton);
        formPanel.add(Box.createVerticalStrut(20));

        // 6. NOTAS
        formPanel.add(createSectionLabel("Notas adicionales:"));
        notesArea = new JTextArea(4, 20);
        UIStyles.styleTextArea(notesArea);
        notesArea.setAlignmentX(Component.CENTER_ALIGNMENT);

        JScrollPane notesScroll = new JScrollPane(notesArea);
        notesScroll.setPreferredSize(new Dimension(320, 120));
        notesScroll.setAlignmentX(Component.CENTER_ALIGNMENT);
        formPanel.add(notesScroll);
        formPanel.add(Box.createVerticalStrut(30));

        // 7. BOTONES
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 20, 0));
        buttonPanel.setBackground(UIStyles.BACKGROUND_COLOR);

        JButton saveButton = new JButton("💾 Guardar");
        UIStyles.stylePrimaryButton(saveButton);
        saveButton.addActionListener(e -> saveMedicine());

        JButton cancelButton = new JButton("Cancelar");
        UIStyles.styleSecondaryButton(cancelButton);
        cancelButton.addActionListener(e -> {
            clearForm();
            appFrame.showMenu();
        });

        buttonPanel.add(saveButton);
        buttonPanel.add(cancelButton);
        formPanel.add(buttonPanel);

        // ScrollPane
        JScrollPane scrollPane = new JScrollPane(formPanel);
        scrollPane.setBorder(BorderFactory.createEmptyBorder());
        scrollPane.getVerticalScrollBar().setUnitIncrement(16);
        mainPanel.add(scrollPane, BorderLayout.CENTER);

        add(mainPanel, BorderLayout.CENTER);
    }

    private JLabel createSectionLabel(String text) {
        JLabel label = new JLabel(text);
        label.setFont(UIStyles.NORMAL_FONT);
        label.setForeground(UIStyles.SECONDARY_COLOR);
        label.setAlignmentX(Component.CENTER_ALIGNMENT);
        label.setBorder(BorderFactory.createEmptyBorder(0, 0, 8, 0));
        return label;
    }

    private void addTime() {
        String time = timeField.getText().trim();
        if (time.matches("^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")) {
            if (!timesModel.contains(time)) {
                timesModel.addElement(time);
                timeField.setText("");
            } else {
                JOptionPane.showMessageDialog(this,
                        " Esta hora ya fue agregada",
                        "Hora duplicada",
                        JOptionPane.WARNING_MESSAGE);
            }
        } else {
            JOptionPane.showMessageDialog(this,
                    " Formato incorrecto. Use HH:mm (ej: 08:00, 14:30)",
                    "Error de formato",
                    JOptionPane.ERROR_MESSAGE);
        }
        timeField.requestFocus();
    }

    private void removeSelectedTime() {
        int index = timesList.getSelectedIndex();
        if (index != -1) {
            timesModel.remove(index);
        }
    }

    public void setEditingMedicine(Medicine medicine) {
        this.editingMedicine = medicine;
        if (medicine != null) {
            nameField.setText(medicine.getName());
            doseField.setText(medicine.getDose());

            // Frecuencia
            frequencyCombo.setSelectedIndex("daily".equals(medicine.getFrequency()) ? 0 : 1);

            // Días
            if (medicine.getDays() != null && !medicine.getDays().isEmpty()) {
                List<Integer> indices = new ArrayList<>();
                for (String day : medicine.getDays()) {
                    for (int i = 0; i < DAYS_ES.length; i++) {
                        if (DAYS_ES[i].equals(day)) {
                            indices.add(i);
                            break;
                        }
                    }
                }
                int[] idxArray = indices.stream().mapToInt(i -> i).toArray();
                daysList.setSelectedIndices(idxArray);
            }

            // Horas
            timesModel.clear();
            if (medicine.getTimes() != null) {
                for (String time : medicine.getTimes()) {
                    timesModel.addElement(time);
                }
            }

            // Notas
            notesArea.setText(medicine.getNotes() != null ? medicine.getNotes() : "");

            // Actualizar título
            Component comp = getComponent(0);
            if (comp instanceof JPanel) {
                Component titleComp = ((JPanel) comp).getComponent(0);
                if (titleComp instanceof JLabel) {
                    ((JLabel) titleComp).setText("Editar Medicamento");
                }
            }
        }
    }

    public void clearForm() {
        nameField.setText("");
        doseField.setText("");
        frequencyCombo.setSelectedIndex(0);
        daysList.clearSelection();
        timesModel.clear();
        timeField.setText("");
        notesArea.setText("");
        editingMedicine = null;

        // Restaurar título
        Component comp = getComponent(0);
        if (comp instanceof JPanel) {
            Component titleComp = ((JPanel) comp).getComponent(0);
            if (titleComp instanceof JLabel) {
                ((JLabel) titleComp).setText("Nuevo Medicamento");
            }
        }
    }

    private void saveMedicine() {
        // Validaciones
        if (nameField.getText().trim().isEmpty()) {
            showError(" El nombre del medicamento es obligatorio");
            nameField.requestFocus();
            return;
        }

        if (doseField.getText().trim().isEmpty()) {
            showError(" La dosis es obligatoria");
            doseField.requestFocus();
            return;
        }

        if (timesModel.isEmpty()) {
            showError(" Debe agregar al menos una hora de toma");
            timeField.requestFocus();
            return;
        }

        if (frequencyCombo.getSelectedIndex() == 1 &&
                daysList.getSelectedIndices().length == 0) {
            showError("Debe seleccionar al menos un día");
            return;
        }

        // Obtener datos
        String name = nameField.getText().trim();
        String dose = doseField.getText().trim();
        String frequency = frequencyCombo.getSelectedIndex() == 0 ? "daily" : "specific";

        List<String> days = new ArrayList<>();
        if ("specific".equals(frequency)) {
            for (Object day : daysList.getSelectedValuesList()) {
                days.add((String) day);
            }
        }

        List<String> times = new ArrayList<>();
        for (int i = 0; i < timesModel.size(); i++) {
            times.add(timesModel.getElementAt(i));
        }

        String notes = notesArea.getText().trim();

        // Guardar o actualizar
        if (editingMedicine == null) {
            Medicine medicine = new Medicine(name, dose, frequency, days, times, notes);
            StorageService.addMedicine(medicine);
            JOptionPane.showMessageDialog(this,
                    "Medicamento agregado correctamente",
                    "Éxito",
                    JOptionPane.INFORMATION_MESSAGE);
        } else {
            editingMedicine.setName(name);
            editingMedicine.setDose(dose);
            editingMedicine.setFrequency(frequency);
            editingMedicine.setDays(days);
            editingMedicine.setTimes(times);
            editingMedicine.setNotes(notes);
            StorageService.updateMedicine(editingMedicine);
            JOptionPane.showMessageDialog(this,
                    " Medicamento actualizado correctamente",
                    "Éxito",
                    JOptionPane.INFORMATION_MESSAGE);
        }

        clearForm();
        appFrame.showMenu();
    }

    private void showError(String message) {
        JOptionPane.showMessageDialog(this,
                message,
                "Error de validación",
                JOptionPane.ERROR_MESSAGE);
    }
}