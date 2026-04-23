package model;

import java.io.Serializable;
import java.util.Arrays;
import java.util.List;

public class Medicine implements Serializable {
    private static int NEXT_ID = 1;

    private final int id;
    private String name;
    private String dose;
    private String frequency; // "daily" o "specific"
    private String days;      // "Lunes,Martes,Viernes" o vacío para daily
    private String times;     // "08:00,12:00,20:00"
    private String notes;
    
    // NUEVOS CAMPOS PARA ACCESIBILIDAD
    private String prioridad;     // "URGENTE", "NORMAL", "BAJA"
    private String ubicacion;     // "En el cajón del baño", "Cocina"
    private String colorCaja;     // "Rojo", "Azul" para asociación visual
    private boolean confirmado;   // Si ya se tomó
    private long ultimaConfirmacion; // Timestamp última toma
    
    public Medicine(String name, String dose, String frequency,
                    List<String> daysList, List<String> timesList, String notes) {
        this.id = NEXT_ID++;
        this.name = name;
        this.dose = dose;
        this.frequency = frequency;
        this.days = (daysList != null && !daysList.isEmpty()) ? String.join(",", daysList) : "";
        this.times = (timesList != null && !timesList.isEmpty()) ? String.join(",", timesList) : "";
        this.notes = notes != null ? notes : "";
        
        // Valores por defecto
        this.prioridad = "NORMAL";
        this.ubicacion = "Sin especificar";
        this.colorCaja = "Verde";
        this.confirmado = false;
        this.ultimaConfirmacion = 0;
    }

    // Getters originales
    public int getId() { return id; }
    public String getName() { return name; }
    public String getDose() { return dose; }
    public String getFrequency() { return frequency; }
    public List<String> getDays() {
        return days.isEmpty() ? new java.util.ArrayList<>() : Arrays.asList(days.split(","));
    }
    public List<String> getTimes() {
        return times.isEmpty() ? new java.util.ArrayList<>() : Arrays.asList(times.split(","));
    }
    public String getNotes() { return notes; }
    
    // NUEVOS GETTERS para accesibilidad
    public String getPrioridad() { return prioridad; }
    public String getUbicacion() { return ubicacion; }
    public String getColorCaja() { return colorCaja; }
    public boolean isConfirmado() { return confirmado; }
    public long getUltimaConfirmacion() { return ultimaConfirmacion; }

    // Setters originales
    public void setName(String name) { this.name = name; }
    public void setDose(String dose) { this.dose = dose; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public void setDays(List<String> daysList) {
        this.days = (daysList != null && !daysList.isEmpty()) ? String.join(",", daysList) : "";
    }
    public void setTimes(List<String> timesList) {
        this.times = (timesList != null && !timesList.isEmpty()) ? String.join(",", timesList) : "";
    }
    public void setNotes(String notes) { this.notes = notes != null ? notes : ""; }
    
    // NUEVOS SETTERS para accesibilidad
    public void setPrioridad(String prioridad) { this.prioridad = prioridad; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
    public void setColorCaja(String colorCaja) { this.colorCaja = colorCaja; }
    public void setConfirmado(boolean confirmado) { 
        this.confirmado = confirmado;
        if (confirmado) {
            this.ultimaConfirmacion = System.currentTimeMillis();
        }
    }
    
    // Método para resetear confirmación (nuevo día)
    public void resetearConfirmacion() {
        this.confirmado = false;
    }

    // Conversión a arreglo AMPLIADO (ahora 11 campos)
    public String[] toArray() {
        return new String[]{
                String.valueOf(id),
                name != null ? name : "",
                dose != null ? dose : "",
                frequency != null ? frequency : "",
                days != null ? days : "",
                times != null ? times : "",
                notes != null ? notes : "",
                prioridad != null ? prioridad : "NORMAL",
                ubicacion != null ? ubicacion : "",
                colorCaja != null ? colorCaja : "Verde",
                String.valueOf(confirmado)
        };
    }

    // Crear Medicine desde una fila de la matriz AMPLIADA
    public static Medicine fromArray(String[] row) {
        if (row == null || row.length < 7) return null;
        int id = Integer.parseInt(row[0]);
        NEXT_ID = Math.max(NEXT_ID, id + 1);

        List<String> daysList = row[4].isEmpty() ? new java.util.ArrayList<>() : Arrays.asList(row[4].split(","));
        List<String> timesList = row[5].isEmpty() ? new java.util.ArrayList<>() : Arrays.asList(row[5].split(","));

        Medicine med = new Medicine(row[1], row[2], row[3], daysList, timesList, row[6]);
        
        // Cargar campos nuevos si existen
        if (row.length >= 8) med.setPrioridad(row[7]);
        if (row.length >= 9) med.setUbicacion(row[8]);
        if (row.length >= 10) med.setColorCaja(row[9]);
        if (row.length >= 11) med.setConfirmado(Boolean.parseBoolean(row[10]));
        
        // Forzar el ID correcto
        try {
            java.lang.reflect.Field idField = Medicine.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(med, id);
        } catch (Exception e) {
            // Ignorar error
        }
        return med;
    }
    
    // Método para obtener descripción completa (para lectores de pantalla)
    public String getDescripcionCompleta() {
        return String.format(
            "Medicamento: %s. Dosis: %s. Prioridad: %s. " +
            "Ubicación: %s. Color de caja: %s. " +
            "Horarios: %s. %s",
            name, dose, prioridad, ubicacion, colorCaja,
            String.join(", ", getTimes()),
            notes.isEmpty() ? "" : "Notas: " + notes
        );
    }

    @Override
    public String toString() {
        return name + " - " + dose;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Medicine other = (Medicine) obj;
        return this.id == other.id;
    }
}
