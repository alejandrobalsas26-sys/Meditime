package services;

import model.Medicine;

import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class StorageService {
    private static final String FILENAME = "medicamentos.db";
    private static final int MAX_MEDICINES = 100;
    private static final int NUM_FIELDS = 11; // AMPLIADO de 7 a 11 campos

    private static String[][] medicinesMatrix = new String[MAX_MEDICINES][NUM_FIELDS];
    private static int medicineCount = 0;

    private static synchronized void loadFromFile() {
        File file = new File(FILENAME);
        if (!file.exists()) {
            medicineCount = 0;
            return;
        }
        medicineCount = 0;
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = br.readLine()) != null && medicineCount < MAX_MEDICINES) {
                String[] fields = line.split("\\|");
                
                // Compatibilidad con archivos antiguos (7 campos)
                if (fields.length == 7) {
                    // Expandir a 11 campos con valores por defecto
                    String[] expandedFields = new String[NUM_FIELDS];
                    System.arraycopy(fields, 0, expandedFields, 0, 7);
                    expandedFields[7] = "NORMAL";     // prioridad
                    expandedFields[8] = "";           // ubicacion
                    expandedFields[9] = "Verde";      // colorCaja
                    expandedFields[10] = "false";     // confirmado
                    medicinesMatrix[medicineCount] = expandedFields;
                } else if (fields.length == NUM_FIELDS) {
                    medicinesMatrix[medicineCount] = fields;
                }
                medicineCount++;
            }
            System.out.println("✅ Cargados " + medicineCount + " medicamentos en la matriz 2D");
        } catch (IOException e) {
            System.err.println("❌ Error al cargar datos: " + e.getMessage());
            medicineCount = 0;
        }
    }

    private static synchronized void saveToFile() {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(FILENAME))) {
            for (int i = 0; i < medicineCount; i++) {
                bw.write(String.join("|", medicinesMatrix[i]));
                bw.newLine();
            }
            System.out.println("💾 Guardados " + medicineCount + " medicamentos desde la matriz 2D");
        } catch (IOException e) {
            System.err.println("❌ Error al guardar datos: " + e.getMessage());
        }
    }

    public static synchronized void addMedicine(Medicine medicine) {
        loadFromFile();
        if (medicineCount >= MAX_MEDICINES) {
            System.out.println("⚠️ Límite de medicamentos alcanzado");
            return;
        }
        medicinesMatrix[medicineCount] = medicine.toArray();
        medicineCount++;
        saveToFile();
        System.out.println("✅ Medicamento agregado: " + medicine.getName());
    }

    public static synchronized void updateMedicine(Medicine updated) {
        loadFromFile();
        for (int i = 0; i < medicineCount; i++) {
            if (Integer.parseInt(medicinesMatrix[i][0]) == updated.getId()) {
                medicinesMatrix[i] = updated.toArray();
                saveToFile();
                System.out.println("✅ Medicamento actualizado: " + updated.getName());
                return;
            }
        }
    }

    public static synchronized void removeMedicine(int id) {
        loadFromFile();
        for (int i = 0; i < medicineCount; i++) {
            if (Integer.parseInt(medicinesMatrix[i][0]) == id) {
                String nombre = medicinesMatrix[i][1];
                for (int j = i; j < medicineCount - 1; j++) {
                    medicinesMatrix[j] = medicinesMatrix[j + 1];
                }
                medicineCount--;
                saveToFile();
                System.out.println("🗑️ Medicamento eliminado: " + nombre);
                return;
            }
        }
    }

    public static synchronized List<Medicine> getMedicines() {
        loadFromFile();
        List<Medicine> list = new ArrayList<>();
        for (int i = 0; i < medicineCount; i++) {
            Medicine med = Medicine.fromArray(medicinesMatrix[i]);
            if (med != null) {
                list.add(med);
            }
        }
        return list;
    }

    public static synchronized Optional<Medicine> findById(int id) {
        loadFromFile();
        for (int i = 0; i < medicineCount; i++) {
            if (Integer.parseInt(medicinesMatrix[i][0]) == id) {
                return Optional.ofNullable(Medicine.fromArray(medicinesMatrix[i]));
            }
        }
        return Optional.empty();
    }

    public static synchronized void clearAll() {
        medicineCount = 0;
        saveToFile();
        System.out.println("🗑️ Todos los medicamentos eliminados");
    }

    // MÉTODO MEJORADO para mostrar la matriz con más detalle
    public static void printMatrixContent() {
        loadFromFile();
        System.out.println("\n╔═══════════════════════════════════════════════════════════════╗");
        System.out.println("║     CONTENIDO DE LA MATRIZ BIDIMENSIONAL (AMPLIADA)          ║");
        System.out.println("╠═══════════════════════════════════════════════════════════════╣");
        System.out.println("║ Dimensiones: [" + MAX_MEDICINES + " filas] x [" + NUM_FIELDS + " columnas]");
        System.out.println("║ Medicamentos registrados: " + medicineCount);
        System.out.println("╠═══════════════════════════════════════════════════════════════╣");
        
        for (int i = 0; i < medicineCount; i++) {
            System.out.printf("║ Fila %2d: ", i);
            System.out.println();
            System.out.println("║   ├─ ID: " + medicinesMatrix[i][0]);
            System.out.println("║   ├─ Nombre: " + medicinesMatrix[i][1]);
            System.out.println("║   ├─ Dosis: " + medicinesMatrix[i][2]);
            System.out.println("║   ├─ Frecuencia: " + medicinesMatrix[i][3]);
            System.out.println("║   ├─ Días: " + medicinesMatrix[i][4]);
            System.out.println("║   ├─ Horas: " + medicinesMatrix[i][5]);
            System.out.println("║   ├─ Notas: " + medicinesMatrix[i][6]);
            System.out.println("║   ├─ Prioridad: " + medicinesMatrix[i][7]);
            System.out.println("║   ├─ Ubicación: " + medicinesMatrix[i][8]);
            System.out.println("║   ├─ Color: " + medicinesMatrix[i][9]);
            System.out.println("║   └─ Confirmado: " + medicinesMatrix[i][10]);
            System.out.println("║");
        }
        
        System.out.println("╠═══════════════════════════════════════════════════════════════╣");
        System.out.println("║ CÁLCULOS DE LA MATRIZ:");
        System.out.println("║ • Total de medicamentos = " + medicineCount);
        System.out.println("║ • Espacios disponibles = " + (MAX_MEDICINES - medicineCount));
        System.out.println("║ • Memoria utilizada = " + (medicineCount * NUM_FIELDS) + " celdas");
        System.out.println("║ • Capacidad total = " + (MAX_MEDICINES * NUM_FIELDS) + " celdas");
        System.out.println("║ • Porcentaje de uso = " + 
                          String.format("%.1f%%", (medicineCount * 100.0 / MAX_MEDICINES)));
        System.out.println("╚═══════════════════════════════════════════════════════════════╝\n");
    }
    
    // NUEVO: Método para resetear confirmaciones (se puede llamar diariamente)
    public static synchronized void resetearConfirmacionesDiarias() {
        loadFromFile();
        for (int i = 0; i < medicineCount; i++) {
            medicinesMatrix[i][10] = "false"; // Resetear campo confirmado
        }
        saveToFile();
        System.out.println("🔄 Confirmaciones diarias reseteadas");
    }
}
