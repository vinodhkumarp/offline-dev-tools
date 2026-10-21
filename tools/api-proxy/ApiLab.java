import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import javax.net.ssl.*;
import java.awt.Desktop;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.zip.GZIPInputStream;

/**
 * ApiLab - a tiny Postman-style API client. No dependencies, JDK 11+.
 *
 *   java ApiLab.java            (default port 5050)
 *   java ApiLab.java 8080
 *
 * Serves index.html from the current folder and forwards requests from the UI
 * to the target API (so there are no browser CORS restrictions).
 * Listens on 127.0.0.1 only.
 *
 * Used from another page (e.g. offline-dev-tools served on http://localhost:5173)?
 * Browser origins that may call the proxy cross-origin (default: localhost:5173 and :4173 = Vite dev/preview):
 *   java -Dapilab.origins=https://tools.mycompany.local ApiLab.java      (comma separated, added to defaults)
 *   APILAB_ORIGINS env var works too.
 * Static UI folder: -Dapilab.ui=/path/to/folder-with-index.html (default: ./public/api-lab if present, else ./)
 *
 * Corporate proxy?  java -Djava.net.useSystemProxies=true ApiLab.java
 * Custom proxy?     java -Dhttps.proxyHost=host -Dhttps.proxyPort=8080 ApiLab.java
 */
public class ApiLab {

    static final Map<String, HttpClient> CLIENTS = new ConcurrentHashMap<>();
    static Path root;
    /** Extra browser origins allowed to call /proxy cross-origin (e.g. the offline-dev-tools page). */
    static final Set<String> ALLOWED = new HashSet<>();

    public static void main(String[] args) throws Exception {
        System.setProperty("jdk.httpclient.allowRestrictedHeaders", "host,connection,expect,upgrade");
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 5050;
        Path cwd = Path.of(System.getProperty("user.dir"));
        String ui = System.getProperty("apilab.ui");
        root = ui != null ? Path.of(ui)
                : Files.exists(cwd.resolve("public/api-lab/index.html")) ? cwd.resolve("public/api-lab") : cwd;
        if (!Files.exists(root.resolve("index.html"))) {
            System.err.println("index.html not found in " + root + " - run from the ApiLab folder or set -Dapilab.ui=<folder>.");
            System.exit(1);
        }
        for (String o : new String[]{"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"}) ALLOWED.add(o);
        for (String src : new String[]{System.getProperty("apilab.origins", ""), System.getenv().getOrDefault("APILAB_ORIGINS", "")})
            for (String o : src.split(",")) if (!o.isBlank()) ALLOWED.add(o.trim().replaceAll("/+$", ""));
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 0);
        server.createContext("/", ApiLab::serveUi);
        server.createContext("/proxy", ApiLab::proxy);
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        String url = "http://localhost:" + port + "/";
        System.out.println("ApiLab running at " + url + "   (Ctrl+C to stop)");
        System.out.println("UI folder: " + root);
        System.out.println("Cross-origin callers allowed: " + ALLOWED);
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create(url));
            }
        } catch (Throwable ignored) { }
    }

    // ---------- static UI ----------
    static void serveUi(HttpExchange ex) throws IOException {
        String p = ex.getRequestURI().getPath();
        if (!p.equals("/") && !p.equals("/index.html")) {
            ex.sendResponseHeaders(404, -1);
            ex.close();
            return;
        }
        byte[] b = Files.readAllBytes(root.resolve("index.html"));
        ex.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(200, b.length);
        ex.getResponseBody().write(b);
        ex.close();
    }

    // ---------- proxy ----------
    static String h(HttpExchange ex, String name) {
        return ex.getRequestHeaders().getFirst(name);
    }

    static String b64(String s) {
        return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }

    static String unb64(String s) {
        return new String(Base64.getDecoder().decode(s), StandardCharsets.UTF_8);
    }

    static void proxy(HttpExchange ex) throws IOException {
        try {
            String host = Optional.ofNullable(h(ex, "Host")).orElse("");
            String hostName = host.replaceFirst(":\\d+$", "");
            String origin = h(ex, "Origin");
            // Host must be exactly loopback (blocks DNS-rebinding); caller must be this page or an allow-listed origin.
            boolean localHost = hostName.equals("localhost") || hostName.equals("127.0.0.1");
            boolean sameOrigin = origin == null || origin.equals("http://" + host);
            boolean allowedOrigin = origin != null && ALLOWED.contains(origin);
            if (allowedOrigin && localHost) {
                Headers ch = ex.getResponseHeaders();
                ch.set("Access-Control-Allow-Origin", origin);
                ch.set("Vary", "Origin");
                ch.set("Access-Control-Allow-Methods", "POST, OPTIONS");
                ch.set("Access-Control-Allow-Headers", "X-ApiLab, X-ApiLab-Method, X-ApiLab-Url, X-ApiLab-Headers, X-ApiLab-Timeout, X-ApiLab-Follow, X-ApiLab-Insecure");
                ch.set("Access-Control-Expose-Headers", "X-ApiLab-Status, X-ApiLab-Time, X-ApiLab-Proto, X-ApiLab-Headers, X-ApiLab-Error");
                ch.set("Access-Control-Allow-Private-Network", "true");
                ch.set("Access-Control-Max-Age", "600");
            }
            if ("OPTIONS".equals(ex.getRequestMethod())) {
                ex.sendResponseHeaders(allowedOrigin && localHost ? 204 : 403, -1);
                return;
            }
            if (!"POST".equals(ex.getRequestMethod()) || h(ex, "X-ApiLab") == null || !localHost || !(sameOrigin || allowedOrigin)) {
                ex.sendResponseHeaders(403, -1);
                return;
            }
            String method = h(ex, "X-ApiLab-Method").toUpperCase();
            String url = unb64(h(ex, "X-ApiLab-Url"));
            String headerBlock = h(ex, "X-ApiLab-Headers") == null ? "" : unb64(h(ex, "X-ApiLab-Headers"));
            long timeout = Long.parseLong(Optional.ofNullable(h(ex, "X-ApiLab-Timeout")).orElse("30000"));
            boolean follow = "1".equals(h(ex, "X-ApiLab-Follow"));
            boolean insecure = "1".equals(h(ex, "X-ApiLab-Insecure"));
            byte[] body = ex.getRequestBody().readAllBytes();

            HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(url));
            if (timeout > 0) rb.timeout(Duration.ofMillis(timeout));
            for (String line : headerBlock.split("\n")) {
                int i = line.indexOf(':');
                if (i <= 0) continue;
                String name = line.substring(0, i).trim();
                String value = line.substring(i + 1).trim();
                if (name.equalsIgnoreCase("content-length")) continue;
                try {
                    rb.header(name, value);
                } catch (IllegalArgumentException ignored) { }
            }
            rb.method(method, body.length == 0 ? HttpRequest.BodyPublishers.noBody()
                                               : HttpRequest.BodyPublishers.ofByteArray(body));

            HttpClient client = clientFor(follow, insecure);
            long t0 = System.nanoTime();
            HttpResponse<byte[]> resp = client.send(rb.build(), HttpResponse.BodyHandlers.ofByteArray());
            long ms = (System.nanoTime() - t0) / 1_000_000;

            byte[] out = resp.body();
            boolean gz = resp.headers().firstValue("content-encoding").map(v -> v.equalsIgnoreCase("gzip")).orElse(false);
            if (gz && out.length > 0) {
                try (GZIPInputStream in = new GZIPInputStream(new ByteArrayInputStream(out))) {
                    out = in.readAllBytes();
                } catch (IOException ignored) { gz = false; }
            }
            StringBuilder hb = new StringBuilder();
            for (Map.Entry<String, List<String>> e : resp.headers().map().entrySet()) {
                if (gz && (e.getKey().equalsIgnoreCase("content-encoding") || e.getKey().equalsIgnoreCase("content-length"))) continue;
                for (String v : e.getValue()) hb.append(e.getKey()).append(": ").append(v).append('\n');
            }
            Headers oh = ex.getResponseHeaders();
            oh.set("Content-Type", "application/octet-stream");
            oh.set("Cache-Control", "no-store");
            oh.set("X-ApiLab-Status", String.valueOf(resp.statusCode()));
            oh.set("X-ApiLab-Time", String.valueOf(ms));
            oh.set("X-ApiLab-Proto", resp.version() == HttpClient.Version.HTTP_2 ? "HTTP/2" : "HTTP/1.1");
            oh.set("X-ApiLab-Headers", b64(hb.toString()));
            ex.sendResponseHeaders(200, out.length == 0 ? -1 : out.length);
            if (out.length > 0) ex.getResponseBody().write(out);
        } catch (Exception e) {
            Throwable c = e.getCause() != null ? e.getCause() : e;
            String msg = e.getClass().getSimpleName() + ": " + e.getMessage()
                    + (c != e ? "\nCaused by " + c.getClass().getSimpleName() + ": " + c.getMessage() : "");
            ex.getResponseHeaders().set("X-ApiLab-Error", b64(msg));
            ex.sendResponseHeaders(502, -1);
        } finally {
            ex.close();
        }
    }

    static HttpClient clientFor(boolean follow, boolean insecure) {
        return CLIENTS.computeIfAbsent(follow + "/" + insecure, k -> {
            try {
                HttpClient.Builder b = HttpClient.newBuilder()
                        .version(HttpClient.Version.HTTP_1_1)
                        .connectTimeout(Duration.ofSeconds(30))
                        .proxy(ProxySelector.getDefault())
                        .followRedirects(follow ? HttpClient.Redirect.ALWAYS : HttpClient.Redirect.NEVER);
                if (insecure) b.sslContext(trustAll());
                return b.build();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }

    static SSLContext trustAll() throws Exception {
        TrustManager tm = new X509ExtendedTrustManager() {
            public void checkClientTrusted(X509Certificate[] c, String s) { }
            public void checkServerTrusted(X509Certificate[] c, String s) { }
            public void checkClientTrusted(X509Certificate[] c, String s, Socket k) { }
            public void checkServerTrusted(X509Certificate[] c, String s, Socket k) { }
            public void checkClientTrusted(X509Certificate[] c, String s, SSLEngine e) { }
            public void checkServerTrusted(X509Certificate[] c, String s, SSLEngine e) { }
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        };
        SSLContext sc = SSLContext.getInstance("TLS");
        sc.init(null, new TrustManager[]{tm}, new SecureRandom());
        return sc;
    }
}
