package services;

import javax.sound.sampled.*;
import java.io.*;

public class SoundService {
    
    // Enum para tipos de sonido
    public enum TipoSonido {
        URGENTE,      // Medicina crítica (corazón, insulina)
        NORMAL,       // Medicina regular
        SUAVE,        // Vitaminas, suplementos
        CONFIRMACION, // Toma confirmada
        ERROR,        // Error o cancelación
        PRE_ALERTA    // 10 minutos antes
    }
    
    private static final String ASSETS_DIR = "assets/";
    
    /**
     * Reproduce un sonido según el tipo
     */
    public static void reproducir(TipoSonido tipo) {
        String archivo = obtenerArchivoSonido(tipo);
        reproducirArchivo(archivo);
    }
    
    /**
     * Reproduce un sonido en bucle hasta que se detenga manualmente
     */
    public static Clip reproducirEnBucle(TipoSonido tipo) {
        String archivo = obtenerArchivoSonido(tipo);
        return reproducirArchivoEnBucle(archivo);
    }
    
    private static String obtenerArchivoSonido(TipoSonido tipo) {
        switch (tipo) {
            case URGENTE:
                return ASSETS_DIR + "urgente.wav";
            case NORMAL:
                return ASSETS_DIR + "normal.wav";
            case SUAVE:
                return ASSETS_DIR + "suave.wav";
            case CONFIRMACION:
                return ASSETS_DIR + "confirmacion.wav";
            case ERROR:
                return ASSETS_DIR + "error.wav";
            case PRE_ALERTA:
                return ASSETS_DIR + "prealerta.wav";
            default:
                return ASSETS_DIR + "normal.wav";
        }
    }
    
    private static void reproducirArchivo(String archivo) {
        try {
            File soundFile = new File(archivo);
            
            if (!soundFile.exists()) {
                System.out.println("⚠️ Archivo de sonido no encontrado: " + archivo);
                System.out.println("🔧 Generando sonidos por defecto...");
                generarTodosSonidos();
                return;
            }
            
            AudioInputStream audioIn = AudioSystem.getAudioInputStream(soundFile);
            Clip clip = AudioSystem.getClip();
            clip.open(audioIn);
            clip.start();
            
            System.out.println("🔊 Reproduciendo: " + archivo);
            
        } catch (Exception e) {
            System.err.println("❌ Error reproduciendo sonido: " + e.getMessage());
            java.awt.Toolkit.getDefaultToolkit().beep();
        }
    }
    
    private static Clip reproducirArchivoEnBucle(String archivo) {
        try {
            File soundFile = new File(archivo);
            if (!soundFile.exists()) {
                generarTodosSonidos();
            }
            
            AudioInputStream audioIn = AudioSystem.getAudioInputStream(soundFile);
            Clip clip = AudioSystem.getClip();
            clip.open(audioIn);
            clip.loop(Clip.LOOP_CONTINUOUSLY);
            clip.start();
            
            System.out.println("🔁 Reproduciendo en bucle: " + archivo);
            return clip;
            
        } catch (Exception e) {
            System.err.println("❌ Error en reproducción en bucle: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Genera todos los archivos de sonido WAV
     */
    public static void generarTodosSonidos() {
        File assetsDir = new File(ASSETS_DIR);
        if (!assetsDir.exists()) {
            assetsDir.mkdir();
            System.out.println("📁 Carpeta assets creada");
        }
        
        try {
            crearSonidoUrgente();
            crearSonidoNormal();
            crearSonidoSuave();
            crearSonidoConfirmacion();
            crearSonidoError();
            crearSonidoPreAlerta();
            
            System.out.println("✅ Todos los sonidos generados correctamente");
            
        } catch (Exception e) {
            System.err.println("❌ Error generando sonidos: " + e.getMessage());
        }
    }
    
    /**
     * SONIDO URGENTE: 3 beeps rápidos a 1200Hz (medicinas críticas)
     */
    private static void crearSonidoUrgente() throws Exception {
        int duracion = 3000; // 3 segundos
        int sampleRate = 44100;
        byte[] buffer = new byte[sampleRate * duracion / 1000];
        
        // 3 beeps urgentes
        for (int beep = 0; beep < 3; beep++) {
            int inicio = beep * (sampleRate / 2); // Cada 0.5 segundos
            int fin = inicio + (sampleRate / 4);  // 0.25 segundos de duración
            
            for (int i = inicio; i < fin && i < buffer.length; i++) {
                double frecuencia = 1200.0; // Frecuencia alta (urgente)
                double angulo = 2.0 * Math.PI * i * frecuencia / sampleRate;
                
                // Envolvente para suavizar
                double envelope = 1.0;
                if (i - inicio < 100) {
                    envelope = (i - inicio) / 100.0;
                }
                if (fin - i < 100) {
                    envelope = (fin - i) / 100.0;
                }
                
                buffer[i] = (byte)(Math.sin(angulo) * 120 * envelope);
            }
        }
        
        guardarWAV(buffer, ASSETS_DIR + "urgente.wav", sampleRate);
        System.out.println("✅ Sonido URGENTE creado (3 beeps a 1200Hz)");
    }
    
    /**
     * SONIDO NORMAL: 2 beeps a 800Hz
     */
    private static void crearSonidoNormal() throws Exception {
        int duracion = 2500; // 2.5 segundos
        int sampleRate = 44100;
        byte[] buffer = new byte[sampleRate * duracion / 1000];
        
        // 2 beeps normales
        for (int beep = 0; beep < 2; beep++) {
            int inicio = beep * sampleRate; // Cada 1 segundo
            int fin = inicio + (sampleRate / 3); // 0.33 segundos
            
            for (int i = inicio; i < fin && i < buffer.length; i++) {
                double frecuencia = 800.0; // Frecuencia media
                double angulo = 2.0 * Math.PI * i * frecuencia / sampleRate;
                
                double envelope = 1.0;
                if (i - inicio < 200) {
                    envelope = (i - inicio) / 200.0;
                }
                if (fin - i < 200) {
                    envelope = (fin - i) / 200.0;
                }
                
                buffer[i] = (byte)(Math.sin(angulo) * 100 * envelope);
            }
        }
        
        guardarWAV(buffer, ASSETS_DIR + "normal.wav", sampleRate);
        System.out.println("✅ Sonido NORMAL creado (2 beeps a 800Hz)");
    }
    
    /**
     * SONIDO SUAVE: Campanita doble (600Hz y 750Hz)
     */
    private static void crearSonidoSuave() throws Exception {
        int duracion = 1500; // 1.5 segundos
        int sampleRate = 44100;
        byte[] buffer = new byte[sampleRate * duracion / 1000];
        
        double[] frecuencias = {600.0, 750.0}; // Do y Fa#
        
        for (int beep = 0; beep < frecuencias.length; beep++) {
            int inicio = beep * (sampleRate / 2);
            int fin = inicio + (sampleRate / 3);
            
            for (int i = inicio; i < fin && i < buffer.length; i++) {
                double angulo = 2.0 * Math.PI * i * frecuencias[beep] / sampleRate;
                
                double envelope = 1.0;
                if (i - inicio < 300) {
                    envelope = (i - inicio) / 300.0;
                }
                if (fin - i < 500) {
                    envelope = (fin - i) / 500.0;
                }
                
                buffer[i] = (byte)(Math.sin(angulo) * 80 * envelope);
            }
        }
        
        guardarWAV(buffer, ASSETS_DIR + "suave.wav", sampleRate);
        System.out.println("✅ Sonido SUAVE creado (campanita doble)");
    }
    
    /**
     * SONIDO CONFIRMACIÓN: Tono ascendente (éxito)
     */
    private static void crearSonidoConfirmacion() throws Exception {
        int duracion = 800; // 0.8 segundos
        int sampleRate = 44100;
        byte[] buffer = new byte[sampleRate * duracion / 1000];
        
        for (int i = 0; i < buffer.length; i++) {
            // Frecuencia que sube de 400Hz a 800Hz
            double progreso = (double)i / buffer.length;
            double frecuencia = 400 + (400 * progreso);
            double angulo = 2.0 * Math.PI * i * frecuencia / sampleRate;
            
            // Envolvente que baja al final
            double envelope = 1.0 - (progreso * 0.3);
            
            buffer[i] = (byte)(Math.sin(angulo) * 90 * envelope);
        }
        
        guardarWAV(buffer, ASSETS_DIR + "confirmacion.wav", sampleRate);
        System.out.println("✅ Sonido CONFIRMACIÓN creado (tono ascendente)");
    }
    
    /**
     * SONIDO ERROR: Tono descendente
     */
    private static void crearSonidoError() throws Exception {
        int duracion = 600; // 0.6 segundos
        int sampleRate = 44100;
        byte[] buffer = new byte[sampleRate * duracion / 1000];
        
        for (int i = 0; i < buffer.length; i++) {
            // Frecuencia que baja de 600Hz a 300Hz
            double progreso = (double)i / buffer.length;
            double frecuencia = 600 - (300 * progreso);
            double angulo = 2.0 * Math.PI * i * frecuencia / sampleRate;
            
            buffer[i] = (byte)(Math.sin(angulo) * 85);
        }
        
        guardarWAV(buffer, ASSETS_DIR + "error.wav", sampleRate);
        System.out.println("✅ Sonido ERROR creado (tono descendente)");
    }
    
    /**
     * SONIDO PRE-ALERTA: Suave y corto (10 min antes)
     */
    private static void crearSonidoPreAlerta() throws Exception {
        int duracion = 1000; // 1 segundo
        int sampleRate = 44100;
        byte[] buffer = new byte[sampleRate * duracion / 1000];
        
        for (int i = 0; i < buffer.length; i++) {
            double frecuencia = 500.0; // Frecuencia suave
            double angulo = 2.0 * Math.PI * i * frecuencia / sampleRate;
            
            // Envolvente suave
            double envelope = Math.sin((double)i / buffer.length * Math.PI);
            
            buffer[i] = (byte)(Math.sin(angulo) * 60 * envelope);
        }
        
        guardarWAV(buffer, ASSETS_DIR + "prealerta.wav", sampleRate);
        System.out.println("✅ Sonido PRE-ALERTA creado (suave a 500Hz)");
    }
    
    /**
     * Guarda el buffer como archivo WAV
     */
    private static void guardarWAV(byte[] buffer, String nombreArchivo, int sampleRate) 
            throws Exception {
        File outputFile = new File(nombreArchivo);
        AudioFormat format = new AudioFormat(sampleRate, 8, 1, true, false);
        ByteArrayInputStream bais = new ByteArrayInputStream(buffer);
        AudioInputStream ais = new AudioInputStream(bais, format, buffer.length);
        
        AudioSystem.write(ais, AudioFileFormat.Type.WAVE, outputFile);
    }
}
