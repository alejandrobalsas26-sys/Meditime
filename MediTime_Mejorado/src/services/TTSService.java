package services;

import java.io.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class TTSService {
    private static final BlockingQueue<String> queue = new LinkedBlockingQueue<>();
    private static Process scriptProcess;
    private static BufferedWriter writer;
    private static boolean running = true;
    private static File tempScript;

    static {
        prepareScript();
        startProcess();
        new Thread(() -> {
            while (running) {
                try {
                    String text = queue.take();
                    if (text == null || text.equals("QUIT"))
                        break;
                    sendToScript(text);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "TTS-Daemon").start();
    }

    private static void prepareScript() {
        try {
            tempScript = File.createTempFile("meditime_tts", ".js");
            tempScript.deleteOnExit();

            try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(tempScript), "UTF-8"))) {
                pw.println("var synth = WScript.CreateObject('SAPI.SpVoice');");
                pw.println("var voices = synth.GetVoices();");
                pw.println("for (var i = 0; i < voices.Count; i++) {");
                pw.println("  try {");
                pw.println("    var desc = voices.Item(i).GetDescription();");
                pw.println("    if (desc.indexOf('Spanish') !== -1 || desc.indexOf('Español') !== -1) {");
                pw.println("      synth.Voice = voices.Item(i);");
                pw.println("      break;");
                pw.println("    }");
                pw.println("  } catch(e) {}");
                pw.println("}");
                pw.println("synth.Rate = 1;");
                pw.println("while(!WScript.StdIn.AtEndOfStream) {");
                pw.println("  var line = WScript.StdIn.ReadLine();");
                pw.println("  if (line == 'QUIT') break;");
                pw.println("  if (line) synth.Speak(line, 1);"); // 1 = SVSFlagsAsync
                pw.println("}");
            }
        } catch (IOException e) {
            System.err.println("Error creando script TTS: " + e.getMessage());
        }
    }

    private static void startProcess() {
        try {
            if (tempScript == null)
                return;
            ProcessBuilder pb = new ProcessBuilder("cscript", "//Nologo", tempScript.getAbsolutePath());
            scriptProcess = pb.start();
            writer = new BufferedWriter(new OutputStreamWriter(scriptProcess.getOutputStream(), "UTF-8"));
        } catch (IOException e) {
            System.err.println("Error al iniciar motor TTS: " + e.getMessage());
        }
    }

    private static void sendToScript(String text) {
        try {
            if (writer != null) {
                writer.write(text.replace("\n", " ").replace("'", ""));
                writer.newLine();
                writer.flush();
            }
        } catch (IOException e) {
            System.err.println("Error al enviar texto a TTS: " + e.getMessage());
            // Intentar reiniciar si el proceso murió
            startProcess();
        }
    }

    public static void speak(String text) {
        // Solo hablar si el modo ciego está activo (detectado o forzado)
        if (!AccessibilityDetector.isBlindModeActive())
            return;

        if (text != null && !text.trim().isEmpty()) {
            queue.offer(text.trim());
        }
    }

    public static void stop() {
        running = false;
        queue.offer("QUIT");
        try {
            if (writer != null) {
                writer.write("QUIT");
                writer.newLine();
                writer.flush();
                if (scriptProcess != null)
                    scriptProcess.waitFor();
            }
        } catch (Exception e) {
            //Ignore
        }
    }
}
