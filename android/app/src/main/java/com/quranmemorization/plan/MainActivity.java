package com.quranmemorization.plan;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidOrientationPlugin.class);
        super.onCreate(savedInstanceState);
        setupOrientationBridge();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupOrientationBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupOrientationBridge();
    }

    private boolean bridgeAttached = false;

    private void setupOrientationBridge() {
        if (bridgeAttached || this.bridge == null) return;
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new OrientationBridge(), "AndroidOrientation");
            bridgeAttached = true;
        }
    }

    private class OrientationBridge {
        @JavascriptInterface
        public void lockPortrait() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
        }

        @JavascriptInterface
        public void unlock() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }
    }
}

@CapacitorPlugin(name = "AndroidOrientation")
class AndroidOrientationPlugin extends Plugin {
    @PluginMethod
    public void lockPortrait(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            call.resolve();
        });
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            call.resolve();
        });
    }
}
