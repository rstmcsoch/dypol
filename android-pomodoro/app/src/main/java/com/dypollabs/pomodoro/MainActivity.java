package com.dypollabs.pomodoro;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import java.util.Locale;

public class MainActivity extends Activity {
    private static final String PREFS = "pomodoro";
    private static final String ACTION_TICK = "com.dypollabs.pomodoro.TICK";
    private SharedPreferences prefs;
    private LinearLayout page;
    private TextView timerText;
    private TextView modeText;
    private TextView statusText;
    private Button startButton;
    private Button themeButton;
    private SeekBar durationBar;
    private TextView durationValue;
    private boolean dark;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final BroadcastReceiver tickReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { refreshTimer(); }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        dark = prefs.getBoolean("dark", false);
        setTheme(dark ? android.R.style.Theme_Material_NoActionBar : android.R.style.Theme_Material_Light_NoActionBar);
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(dark ? Color.rgb(19,11,15) : Color.rgb(255,247,250));
        getWindow().setNavigationBarColor(dark ? Color.rgb(19,11,15) : Color.rgb(255,247,250));
        if (!dark && Build.VERSION.SDK_INT >= 23) getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        buildShell();
        showHome();
        handler.postDelayed(new Runnable() {
            @Override public void run() { refreshTimer(); handler.postDelayed(this, 700); }
        }, 700);
    }

    @Override protected void onResume() {
        super.onResume();
        IntentFilter f = new IntentFilter(ACTION_TICK);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(tickReceiver, f, RECEIVER_NOT_EXPORTED);
        else registerReceiver(tickReceiver, f);
        refreshTimer();
    }

    @Override protected void onPause() {
        try { unregisterReceiver(tickReceiver); } catch (Exception ignored) {}
        super.onPause();
    }

    private void buildShell() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(bg());

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(dp(18), dp(14), dp(18), dp(10));
        root.addView(column, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView brand = text("Pomodoro", 25, true);
        header.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        themeButton = pillButton(dark ? "☀" : "☾");
        themeButton.setOnClickListener(v -> toggleTheme());
        header.addView(themeButton, new LinearLayout.LayoutParams(dp(48), dp(42)));
        column.addView(header);

        android.widget.ScrollView scroll = new android.widget.ScrollView(this);
        scroll.setFillViewport(true);
        page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(page, new android.widget.ScrollView.LayoutParams(-1, -1));
        column.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout navWrap = new LinearLayout(this);
        navWrap.setPadding(0, dp(7), 0, 0);
        LinearLayout nav = new LinearLayout(this);
        nav.setGravity(Gravity.CENTER);
        nav.setPadding(dp(5), dp(4), dp(5), dp(4));
        nav.setBackground(round(dark ? 0xFF23151B : 0xFFFFE9EF, 100));
        String[] labels = {"⌂  Home", "◷  Timer", "ⓘ  About"};
        for (int i = 0; i < labels.length; i++) {
            final int tab = i;
            Button b = pillButton(labels[i]);
            b.setTextSize(13);
            b.setAllCaps(false);
            b.setOnClickListener(v -> { if (tab == 0) showHome(); else if (tab == 1) showTimer(); else showAbout(); });
            nav.addView(b, new LinearLayout.LayoutParams(0, dp(48), 1));
        }
        navWrap.addView(nav, new LinearLayout.LayoutParams(-1, dp(57)));
        column.addView(navWrap);

        setContentView(root);
    }

    private void showHome() {
        page.removeAllViews();
        addGap(10);
        TextView title = text("Protect your focus.", 31, true);
        page.addView(title);
        TextView sub = text("A lightweight, fully offline Pomodoro workspace with a floating timer you control.", 15, false);
        sub.setTextColor(textSecondary());
        page.addView(sub, new LinearLayout.LayoutParams(-1, -2));
        addGap(14);

        LinearLayout hero = card();
        TextView h = text("FLOATING PIP", 12, true);
        h.setTextColor(dark ? 0xFFFFB2C2 : 0xFFE42E58);
        hero.addView(h);
        TextView state = text(Settings.canDrawOverlays(this) ? "Ready to float anywhere" : "Permission required once", 22, true);
        hero.addView(state);
        TextView hint = text("Resize with the bottom-right grip • drag to move • tap the center to pause/resume", 13, false);
        hint.setTextColor(textSecondary());
        hero.addView(hint);
        addGapTo(hero, 12);
        Button floatBtn = gradientButton(Settings.canDrawOverlays(this) ? "Start floating timer" : "Allow floating timer");
        floatBtn.setOnClickListener(v -> startFloating());
        hero.addView(floatBtn, fullLp(50));
        addGapTo(hero, 8);
        Button hideBtn = secondaryButton("Stop floating timer");
        hideBtn.setOnClickListener(v -> sendAction(PomodoroService.ACTION_HIDE_OVERLAY));
        hero.addView(hideBtn, fullLp(46));
        page.addView(hero);

        addGap(12);
        LinearLayout stats = card();
        statusText = text(isRunning() ? "Running" : "Ready", 12, true);
        statusText.setTextColor(textSecondary());
        stats.addView(statusText);
        timerText = text(formatRemaining(), 46, true);
        stats.addView(timerText);
        modeText = text(modeLabel(), 15, false);
        modeText.setTextColor(textSecondary());
        stats.addView(modeText);
        page.addView(stats);
        refreshTimer();
    }

    private void showTimer() {
        page.removeAllViews();
        addGap(8);
        page.addView(text("Timer", 30, true));
        TextView subtitle = text("Choose a mode, set the duration, then start. State is saved locally.", 14, false);
        subtitle.setTextColor(textSecondary());
        page.addView(subtitle);
        addGap(12);

        LinearLayout display = card();
        modeText = text(modeLabel(), 13, true);
        modeText.setTextColor(dark ? 0xFFFFB2C2 : 0xFFE42E58);
        display.addView(modeText);
        timerText = text(formatRemaining(), 61, true);
        timerText.setGravity(Gravity.CENTER);
        display.addView(timerText, fullLp(86));
        startButton = gradientButton(isRunning() ? "Pause" : "Start focus");
        startButton.setOnClickListener(v -> sendAction(isRunning() ? PomodoroService.ACTION_PAUSE : PomodoroService.ACTION_RESUME_OR_START));
        display.addView(startButton, fullLp(54));
        addGapTo(display, 8);
        LinearLayout row = new LinearLayout(this);
        Button reset = secondaryButton("Restart");
        reset.setOnClickListener(v -> sendAction(PomodoroService.ACTION_RESET));
        Button skip = secondaryButton("Skip session");
        skip.setOnClickListener(v -> sendAction(PomodoroService.ACTION_SKIP));
        row.addView(reset, new LinearLayout.LayoutParams(0, dp(47), 1));
        addGapTo(row, 8);
        row.addView(skip, new LinearLayout.LayoutParams(0, dp(47), 1));
        display.addView(row);
        page.addView(display);

        addGap(12);
        LinearLayout modes = card();
        modes.addView(text("MODE", 12, true));
        LinearLayout modeRow = new LinearLayout(this);
        String[] labels = {"Focus · 25", "Short · 5", "Long · 15"};
        String[] modesKey = {"focus", "short", "long"};
        for (int i=0;i<3;i++) {
            final String key = modesKey[i];
            Button b = secondaryButton(labels[i]);
            b.setOnClickListener(v -> sendAction(PomodoroService.ACTION_SET_MODE + key));
            modeRow.addView(b, new LinearLayout.LayoutParams(0, dp(46), 1));
            if (i < 2) addGapTo(modeRow, 6);
        }
        modes.addView(modeRow);
        page.addView(modes);

        addGap(12);
        LinearLayout choose = card();
        choose.addView(text("FOCUS DURATION", 12, true));
        durationValue = text(getFocusMinutes()+" min", 22, true);
        choose.addView(durationValue);
        durationBar = new SeekBar(this);
        durationBar.setMax(115);
        durationBar.setProgress(Math.max(0, Math.min(115, getFocusMinutes()-5)));
        durationBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar s, int p, boolean fromUser) {
                int min = p + 5;
                durationValue.setText(min + " min");
                if (fromUser && !isRunning()) sendAction(PomodoroService.ACTION_SET_FOCUS + min);
            }
            @Override public void onStartTrackingTouch(SeekBar s) {}
            @Override public void onStopTrackingTouch(SeekBar s) {}
        });
        choose.addView(durationBar);
        page.addView(choose);

        addGap(12);
        LinearLayout settings = card();
        Button auto = secondaryButton("Auto-start next session: " + (prefs.getBoolean("autoStart", true) ? "ON" : "OFF"));
        auto.setOnClickListener(v -> { boolean n=!prefs.getBoolean("autoStart", true); prefs.edit().putBoolean("autoStart", n).apply(); showTimer(); });
        settings.addView(auto, fullLp(46));
        Button haptic = secondaryButton("Completion vibration: " + (prefs.getBoolean("vibrate", true) ? "ON" : "OFF"));
        haptic.setOnClickListener(v -> { boolean n=!prefs.getBoolean("vibrate", true); prefs.edit().putBoolean("vibrate", n).apply(); showTimer(); });
        settings.addView(haptic, fullLp(46));
        page.addView(settings);
        refreshTimer();
    }

    private void showAbout() {
        page.removeAllViews();
        addGap(12);
        LinearLayout about = card();
        TextView logo = text("◉ DYPOL", 32, true);
        logo.setTextColor(dark ? 0xFFFFB2C2 : 0xFFE42E58);
        about.addView(logo);
        TextView crafted = text("LABS", 18, true);
        about.addView(crafted);
        addGapTo(about, 13);
        TextView copy = text("Created and crafted by DYPOL LABS\n\ndypollabs@protonmail.com\ndypol.vercel.app", 15, false);
        copy.setTextColor(textSecondary());
        about.addView(copy);
        addGapTo(about, 14);
        TextView note = text("Completely offline. No account, analytics, cloud sync, or internet permission. The floating timer uses the system overlay permission so it can stay above other apps.", 13, false);
        note.setTextColor(textSecondary());
        about.addView(note);
        page.addView(about);

        addGap(12);
        LinearLayout facts = card();
        facts.addView(text("BUILT FOR", 12, true));
        TextView f = text("• Fast launch\n• Local-only state\n• Light + dark mode\n• Adjustable floating widget\n• Minimal runtime footprint", 14, false);
        f.setTextColor(textSecondary());
        facts.addView(f);
        page.addView(facts);
    }

    private void startFloating() {
        if (!Settings.canDrawOverlays(this)) {
            try { startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()))); }
            catch (Exception e) { startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)); }
            return;
        }
        sendAction(PomodoroService.ACTION_SHOW_OVERLAY);
    }

    private void sendAction(String action) {
        Intent i = new Intent(this, PomodoroService.class);
        i.setAction(action);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
    }

    private void toggleTheme() {
        dark = !dark;
        prefs.edit().putBoolean("dark", dark).apply();
        recreate();
    }

    private boolean isRunning() {
        return prefs.getBoolean("running", false) && remainingMillis() > 0;
    }

    private long remainingMillis() {
        long remaining = prefs.getLong("remainingMs", 25L * 60_000L);
        if (prefs.getBoolean("running", false)) {
            long end = prefs.getLong("endAtElapsed", 0);
            return Math.max(0, end - android.os.SystemClock.elapsedRealtime());
        }
        return Math.max(0, remaining);
    }

    private String formatRemaining() {
        long sec = (remainingMillis()+999)/1000;
        return String.format(Locale.US, "%02d:%02d", sec/60, sec%60);
    }

    private String modeLabel() {
        String mode=prefs.getString("mode","focus");
        if ("short".equals(mode)) return "SHORT BREAK";
        if ("long".equals(mode)) return "LONG BREAK";
        return "FOCUS";
    }

    private int getFocusMinutes() { return prefs.getInt("focusMinutes",25); }

    private void refreshTimer() {
        if (timerText != null) timerText.setText(formatRemaining());
        if (modeText != null) modeText.setText(modeLabel());
        if (startButton != null) startButton.setText(isRunning() ? "Pause" : "Start focus");
        if (statusText != null) statusText.setText(isRunning() ? "Running" : "Ready");
    }

    private int bg() { return dark ? 0xFF130B0F : 0xFFFFF7FA; }
    private int textPrimary() { return dark ? 0xFFFFF6F8 : 0xFF251218; }
    private int textSecondary() { return dark ? 0xFFBFAEB4 : 0xFF806A72; }

    private TextView text(String s, int size, boolean bold) {
        TextView v=new TextView(this);
        v.setText(s);
        v.setTextSize(size);
        v.setTextColor(textPrimary());
        v.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);
        if (bold) v.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return v;
    }

    private Button pillButton(String label) {
        Button b=new Button(this);
        b.setText(label);
        b.setTextColor(textPrimary());
        b.setTextSize(12);
        b.setAllCaps(false);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(4),0,dp(4),0);
        b.setBackground(round(dark ? 0xFF2A181F : 0xFFFFF2F5, 90));
        return b;
    }

    private Button gradientButton(String label) {
        Button b=pillButton(label);
        b.setTextColor(Color.WHITE);
        b.setTextSize(16);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setBackground(gradient(dark ? 0xFFF33F69 : 0xFFE82F59, dark ? 0xFFB61E52 : 0xFFFF6486));
        return b;
    }

    private Button secondaryButton(String label) {
        Button b=pillButton(label);
        b.setTextSize(13);
        b.setBackground(round(dark ? 0xFF24151B : 0xFFFFEEF2, 80));
        return b;
    }

    private LinearLayout card() {
        LinearLayout c=new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(16),dp(16),dp(16),dp(16));
        c.setBackground(round(dark ? 0xFF211218 : 0xFFFFFCFD, 28));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);
        lp.setMargins(0,dp(5),0,dp(5));
        c.setLayoutParams(lp);
        return c;
    }

    private ViewGroup.LayoutParams fullLp(int h) { return new LinearLayout.LayoutParams(-1,dp(h)); }
    private void addGap(int sizeDp) { View v=new View(this); page.addView(v,new LinearLayout.LayoutParams(1,dp(sizeDp))); }
    private void addGapTo(LinearLayout parent,int sizeDp) { View v=new View(this); parent.addView(v,new LinearLayout.LayoutParams(1,dp(sizeDp))); }
    private int dp(int v) { return (int)(v*getResources().getDisplayMetrics().density+0.5f); }

    private android.graphics.drawable.GradientDrawable round(int color,int radius) {
        android.graphics.drawable.GradientDrawable g=new android.graphics.drawable.GradientDrawable();
        g.setColor(color); g.setCornerRadius(dp(radius)); return g;
    }

    private android.graphics.drawable.GradientDrawable gradient(int a,int b) {
        android.graphics.drawable.GradientDrawable g=new android.graphics.drawable.GradientDrawable(android.graphics.drawable.GradientDrawable.Orientation.TL_BR,new int[]{a,b});
        g.setCornerRadius(dp(90)); return g;
    }
}