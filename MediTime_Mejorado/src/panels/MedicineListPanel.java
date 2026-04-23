package panels;

import model.Medicine;
import services.StorageService;
import services.UIStyles;
import javax.swing.*;
import java.awt.*;
import java.util.List;

public class MedicineListPanel extends JPanel {
    private final AppFrame appFrame;
    private final DefaultListModel<Medicine> listModel;
    private JList<Medicine> medicineJList;

    public MedicineListPanel(AppFrame appFrame) {
        this.appFrame = appFrame;
        this.listModel = new DefaultListModel<>();
        setupUI();
        refreshList();
    }

    private void setupUI() {
        setLayout(new BorderLayout());
        setBackground(UIStyles.BACKGROUND_COLOR);

        // Encabezado
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(UIStyles.BACKGROUND_COLOR);
        headerPanel.setBorder(BorderFactory.createEmptyBorder(30, 20, 20, 20));

        JLabel titleLabel = new JLabel("Mis Medicamentos", SwingConstants.CENTER);
        titleLabel.setFont(UIStyles.TITLE_FONT);
        titleLabel.setForeground(UIStyles.SECONDARY_COLOR);
        headerPanel.add(titleLabel, BorderLayout.CENTER);

        // Contador
        JLabel countLabel = new JLabel("0 medicamentos");
        countLabel.setFont(UIStyles.SMALL_FONT);
        countLabel.setForeground(UIStyles.SECONDARY_COLOR);
        headerPanel.add(countLabel, BorderLayout.SOUTH);

        add(headerPanel, BorderLayout.NORTH);

        // Lista de medicamentos
        medicineJList = new JList<>(listModel);
        medicineJList.setFont(UIStyles.NORMAL_FONT);
        medicineJList.setBackground(Color.WHITE);
        medicineJList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        medicineJList.setCellRenderer(new MedicineCellRenderer());

        JScrollPane scrollPane = new JScrollPane(medicineJList);
        scrollPane.setBorder(BorderFactory.createEmptyBorder());
        scrollPane.getVerticalScrollBar().setUnitIncrement(16);
        add(scrollPane, BorderLayout.CENTER);

        // Botones inferiores - ¡CORREGIDOS!
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 15));
        buttonPanel.setBackground(UIStyles.BACKGROUND_COLOR);

        JButton addButton = new JButton("➕ Nuevo");
        UIStyles.stylePrimaryButton(addButton);  // ¡CORREGIDO!
        addButton.setFont(UIStyles.SMALL_FONT);
        addButton.addActionListener(e -> appFrame.showAddMedicine());

        JButton editButton = new JButton("✏️ Editar");
        UIStyles.styleSecondaryButton(editButton);  // ¡CORREGIDO!
        editButton.setFont(UIStyles.SMALL_FONT);
        editButton.addActionListener(e -> editSelected());

        JButton deleteButton = new JButton("🗑️ Eliminar");
        UIStyles.styleSecondaryButton(deleteButton);  // ¡CORREGIDO!
        deleteButton.setFont(UIStyles.SMALL_FONT);
        deleteButton.addActionListener(e -> deleteSelected());

        JButton backButton = new JButton("↩️ Volver");
        UIStyles.styleSecondaryButton(backButton);  // ¡CORREGIDO!
        backButton.setFont(UIStyles.SMALL_FONT);
        backButton.addActionListener(e -> appFrame.showMenu());

        buttonPanel.add(addButton);
        buttonPanel.add(editButton);
        buttonPanel.add(deleteButton);
        buttonPanel.add(backButton);

        add(buttonPanel, BorderLayout.SOUTH);
    }

    public void refreshList() {
        listModel.clear();
        List<Medicine> medicines = StorageService.getMedicines();

        if (medicines.isEmpty()) {
            Medicine emptyMsg = new Medicine("No hay medicamentos registrados",
                    "Agrega tu primer medicamento", "daily",
                    new java.util.ArrayList<>(), new java.util.ArrayList<>(), "");
            listModel.addElement(emptyMsg);
            medicineJList.setEnabled(false);
        } else {
            for (Medicine med : medicines) {
                listModel.addElement(med);
            }
            medicineJList.setEnabled(true);
            StorageService.printMatrixContent();  // Muestra la matriz en consola (para cumplir requisito)
        }

        // Actualizar contador
        Component header = getComponent(0);
        if (header instanceof JPanel) {
            Component[] comps = ((JPanel) header).getComponents();
            if (comps.length >= 2 && comps[1] instanceof JLabel) {
                ((JLabel) comps[1]).setText(medicines.size() + " medicamentos");
            }
        }
    }

    private void editSelected() {
        Medicine selected = medicineJList.getSelectedValue();
        if (selected == null || !medicineJList.isEnabled()) {
            JOptionPane.showMessageDialog(this,
                    "Seleccione un medicamento para editar",
                    "Sin selección",
                    JOptionPane.WARNING_MESSAGE);
            return;
        }
        appFrame.showEditMedicine(selected);
    }

    private void deleteSelected() {
        Medicine selected = medicineJList.getSelectedValue();
        if (selected == null || !medicineJList.isEnabled()) {
            JOptionPane.showMessageDialog(this,
                    "Seleccione un medicamento para eliminar",
                    "Sin selección",
                    JOptionPane.WARNING_MESSAGE);
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(this,
                "<html><body style='width: 250px;'>" +
                        "¿Eliminar el medicamento:<br>" +
                        "<b>" + selected.getName() + "</b>?<br><br>" +
                        "Esta acción no se puede deshacer." +
                        "</body></html>",
                "Confirmar eliminación",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.WARNING_MESSAGE);

        if (confirm == JOptionPane.YES_OPTION) {
            StorageService.removeMedicine(selected.getId());
            refreshList();
            JOptionPane.showMessageDialog(this,
                    "✅ Medicamento eliminado correctamente",
                    "Eliminado",
                    JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private class MedicineCellRenderer extends DefaultListCellRenderer {
        @Override
        public Component getListCellRendererComponent(JList<?> list, Object value,
                                                      int index, boolean isSelected, boolean cellHasFocus) {
            super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);

            if (value instanceof Medicine) {
                Medicine med = (Medicine) value;

                setText("<html><b>" + med.getName() + "</b><br>" +
                        "<small>Dosis: " + med.getDose() +
                        " | Horas: " + String.join(", ", med.getTimes()) + "</small></html>");

                if (isSelected) {
                    setBackground(new Color(0, 122, 255, 20));
                    setForeground(Color.BLACK);
                } else {
                    setBackground(index % 2 == 0 ? Color.WHITE : new Color(250, 250, 250));
                    setForeground(Color.BLACK);
                }

                setBorder(BorderFactory.createEmptyBorder(15, 20, 15, 20));
                setOpaque(true);
            }

            return this;
        }
    }
}