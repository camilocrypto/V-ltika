package cl.voltika.moto;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.print.PrintManager;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String HOST = "app.voltika.invalid";
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(17, 19, 20));
        getWindow().setNavigationBarColor(Color.rgb(12, 14, 15));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(12, 14, 15));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new LocalClient());
        FrameLayout screen = new FrameLayout(this);
        screen.setBackgroundColor(Color.rgb(17, 19, 20));
        screen.addView(web);
        if (Build.VERSION.SDK_INT >= 35) {
            screen.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                    android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                    return insets;
                }
            });
        }
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, new OnBackInvokedCallback() {
                    @Override public void onBackInvoked() { goBack(); }
                });
        }
        setContentView(screen);
        web.loadUrl("https://" + HOST + "/index.html");
    }

    private final class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (safeHttps(uri) && HOST.equals(uri.getHost())) {
                String path = uri.getPath();
                if (path == null || path.indexOf("..") >= 0 || path.indexOf('\\') >= 0) return missing();
                String file = path.length() <= 1 ? "index.html" : path.substring(1);
                try {
                    InputStream stream = getAssets().open(file);
                    String type = mime(file);
                    boolean text = type.startsWith("text/") || type.endsWith("javascript") || type.endsWith("svg+xml");
                    return new WebResourceResponse(type, text ? "UTF-8" : null, stream);
                } catch (IOException e) {
                    return missing();
                }
            }
            String host = uri.getHost();
            if (safeHttps(uri) &&
                ("friendbot.stellar.org".equals(host) || "horizon-testnet.stellar.org".equals(host))) {
                return null;
            }
            return missing();
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!safeHttps(uri)) return true;
            if (HOST.equals(uri.getHost())) {
                if ("/imprimir".equals(uri.getPath())) {
                    if (request.isForMainFrame() && request.hasGesture()) printCurrentPage();
                    return true;
                }
                return false;
            }
            if (!request.isForMainFrame() || !request.hasGesture()) return true;
            boolean receipt = "horizon-testnet.stellar.org".equals(uri.getHost()) &&
                uri.getPath() != null && uri.getPath().matches("/transactions/[a-fA-F0-9]{64}");
            if (officialSource(uri.getHost()) || receipt) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "Instala un navegador para abrir este enlace.", Toast.LENGTH_LONG).show();
                }
            }
            return true;
        }
    }

    private static boolean safeHttps(Uri uri) {
        return "https".equals(uri.getScheme()) && uri.getUserInfo() == null &&
            (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private static boolean officialSource(String host) {
        return "www.bcn.cl".equals(host) || "www.chileatiende.gob.cl".equals(host)
            || "www.sernac.cl".equals(host) || "www.diariooficial.interior.gob.cl".equals(host);
    }

    private void printCurrentPage() {
        PrintManager printer = (PrintManager) getSystemService(PRINT_SERVICE);
        if (printer != null) {
            String title = "VÓLTIKA - copia de la demo";
            printer.print(title, web.createPrintDocumentAdapter(title), null);
        }
    }

    private static String mime(String file) {
        if (file.endsWith(".js")) return "application/javascript";
        if (file.endsWith(".css")) return "text/css";
        if (file.endsWith(".svg")) return "image/svg+xml";
        if (file.endsWith(".webp")) return "image/webp";
        if (file.endsWith(".woff2")) return "font/woff2";
        if (file.endsWith(".html")) return "text/html";
        return "text/plain";
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.<String,String>emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    @Override public void onBackPressed() { goBack(); }

    private void goBack() {
        web.evaluateJavascript("typeof window.voltikaBack==='function' && window.voltikaBack()", new ValueCallback<String>() {
            @Override public void onReceiveValue(String result) {
                if ("true".equals(result)) return;
                if (web.canGoBack()) web.goBack();
                else finish();
            }
        });
    }
    @Override public void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }
}
