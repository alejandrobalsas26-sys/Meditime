import javax.sound.sampled.*;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.URL;

public class DescargarSonido {
    public static void main(String[] args) {
        System.out.println(" CREANDO SONIDO DE ALERTA PROFESIONAL...");

        try {
            // 1. Crear carpeta assets si no existe
            File assetsDir = new File("assets");
            if (!assetsDir.exists()) {
                assetsDir.mkdir();
                System.out.println(" Carpeta assets creada");
            }

            // 2. Crear sonido de alerta (5 segundos)
            crearSonidoAlerta();

            System.out.println(" SONIDO LISTO EN: assets/alerta.wav");
            System.out.println(" Para probar: java -cp . DescargarSonido");

        } catch (Exception e) {
            System.out.println(" Error: " + e.getMessage());
            // Crear sonido simple como respaldo
            crearSonidoSimple();
        }
    }

    private static void crearSonidoAlerta() throws Exception {
        // Sonido de alerta médico (5 segundos)
        int duration = 5000; // 5 segundos
        int sampleRate = 44100; // Calidad CD

        byte[] buffer = new byte[sampleRate * duration / 1000];

        // Crear tono de alerta médica (alterna entre dos frecuencias)
        for (int i = 0; i < buffer.length; i++) {
            // Alternar entre 800Hz y 1200Hz cada 0.5 segundos
            double baseFreq = 800;
            if ((i / (sampleRate / 2)) % 2 == 0) {
                baseFreq = 1200; // Cambia cada medio segundo
            }

            // Añadir variación
            double freq = baseFreq + 100 * Math.sin(i * 0.001);
            double angle = 2.0 * Math.PI * i * freq / sampleRate;

            // Crear envolvente (suave inicio y fin)
            double envelope = 1.0;
            if (i < sampleRate * 0.1) { // Ataque: 0.1 segundos
                envelope = i / (sampleRate * 0.1);
            }
            if (i > buffer.length - sampleRate * 0.2) { // Decaimiento: 0.2 segundos
                envelope = (buffer.length - i) / (sampleRate * 0.2);
            }

            buffer[i] = (byte)(Math.sin(angle) * 80 * envelope);
        }

        // Guardar como WAV
        File outputFile = new File("assets/alerta.wav");
        AudioFormat format = new AudioFormat(sampleRate, 8, 1, true, false);
        ByteArrayInputStream bais = new ByteArrayInputStream(buffer);
        AudioInputStream ais = new AudioInputStream(bais, format, buffer.length);

        AudioSystem.write(ais, AudioFileFormat.Type.WAVE, outputFile);

        System.out.println(" Tamaño: " + outputFile.length() / 1024 + " KB");
        System.out.println(" Duración: 5 segundos");
        System.out.println("Frecuencias: 800Hz - 1200Hz (alternantes)");
    }

    private static void crearSonidoSimple() {
        try {
            // Sonido de respaldo (beep largo)
            byte[] buf = new byte[40000]; // 5 segundos a 8000Hz
            for (int i = 0; i < buf.length; i++) {
                buf[i] = (byte)(Math.sin(i * 0.2) * 100);
            }

            File file = new File("assets/alerta.wav");
            AudioFormat af = new AudioFormat(8000, 8, 1, true, false);
            AudioInputStream ais = new AudioInputStream(
                    new ByteArrayInputStream(buf), af, buf.length);

            AudioSystem.write(ais, AudioFileFormat.Type.WAVE, file);
            System.out.println(" Sonido simple creado como respaldo");

        } catch (Exception e) {
            System.out.println(" No se pudo crear ningún sonido");
        }
    }
}