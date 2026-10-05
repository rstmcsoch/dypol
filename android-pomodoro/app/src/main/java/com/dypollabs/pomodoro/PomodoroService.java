package com.dypollabs.pomodoro;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

import java.util.Locale;

public class PomodoroService extends Service {
    public static final String ACTION_SHOW_OVERLAY = "SHOW_OVERLAY";
    public static final String ACTION_HIDE_OVERLAY = "HIDE_OVERLAY";
    public static final String ACTION_RESUME_OR_START = "RESUME_OR_START";
    public static final String ACTION_PAUSE = "PAUSE";
    public static final String ACTION_RESET = "RESET";
    public static final String ACTION_SKIP = "SKIP";
    public static final String ACTION_SET_FOCUS = "SET_FOCUS:";
    public static final String ACTION_SET_MODE = "SET_MODE:";
    private static final String PREFS = "pomodoro";
    private static final String CHANNEL = "pomodoro_timer";
    private static final String TICK = "com.dypollabs.pomodoro.TICK";

    private SharedPreferences prefs;
    private Handler handler;
    private WindowManager wm;
    private OverlayView overlay;
    private WindowManager.LayoutParams overlayLp;

    @Override public void onCreate() {
        super.onCreate();
        prefs=getSharedPreferences(PREFS,MODE_PRIVATE);
        handler=new Handler(Looper.getMainLooper());
        wm=(WindowManager)getSystemService(WINDOW_SERVICE);
        createChannel();
        startForeground(7,buildNotification());
        handler.post(ticker);
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        if (intent!=null && intent.getAction()!=null) handle(intent.getAction());
        startForeground(7,buildNotification());
        return START_STICKY;
    }

    private void handle(String a) {
        if (ACTION_SHOW_OVERLAY.equals(a)) showOverlay();
        else if (ACTION_HIDE_OVERLAY.equals(a)) hideOverlay();
        else if (ACTION_RESUME_OR_START.equals(a)) startOrResume();
        else if (ACTION_PAUSE.equals(a)) pause();
        else if (ACTION_RESET.equals(a)) reset();
        else if (ACTION_SKIP.equals(a)) skip();
        else if (a.startsWith(ACTION_SET_FOCUS)) setFocus(parse(a.substring(ACTION_SET_FOCUS.length()),25));
        else if (a.startsWith(ACTION_SET_MODE)) setMode(a.substring(ACTION_SET_MODE.length()));
    }

    private void startOrResume() {
        long remaining=prefs.getLong("remainingMs",durationMs());
        if (remaining<=0) remaining=durationMs();
        prefs.edit().putBoolean("running",true).putLong("endAtElapsed",SystemClock.elapsedRealtime()+remaining).apply();
        notifyTick();
    }

    private void pause() {
        long rem=remainingNow();
        prefs.edit().putBoolean("running",false).putLong("remainingMs",rem).apply();
        notifyTick();
    }

    private void reset() {
        long d=durationMs();
        prefs.edit().putBoolean("running",false).putLong("remainingMs",d).apply();
        notifyTick();
    }

    private void setMode(String mode) {
        if (prefs.getBoolean("running",false)) return;
        long d;
        if ("short".equals(mode)) d=5*60_000L;
        else if ("long".equals(mode)) d=15*60_000L;
        else d=prefs.getInt("focusMinutes",25)*60_000L;
        prefs.edit().putString("mode",mode).putLong("remainingMs",d).putLong("durationMs",d).apply();
        notifyTick();
    }

    private void setFocus(int min) {
        min=Math.max(5,Math.min(120,min));
        prefs.edit().putInt("focusMinutes",min).apply();
        if (!prefs.getBoolean("running",false) && "focus".equals(prefs.getString("mode","focus"))) {
            long d=min*60_000L;
            prefs.edit().putLong("durationMs",d).putLong("remainingMs",d).apply();
        }
        notifyTick();
    }

    private void skip() { finishSession(true); }

    private void finishSession(boolean manual) {
        boolean focus="focus".equals(prefs.getString("mode","focus"));
        String next=focus ? (prefs.getInt("sessionCount",0)%4==3 ? "long" : "short") : "focus";
        int nextMin="focus".equals(next)?prefs.getInt("focusMinutes",25):("long".equals(next)?15:5);
        long d=nextMin*60_000L;
        int count=focus ? prefs.getInt("sessionCount",0)+1 : prefs.getInt("sessionCount",0);
        boolean auto=prefs.getBoolean("autoStart",true) && !manual;
        SharedPreferences.Editor e=prefs.edit().putString("mode",next).putInt("sessionCount",count).putLong("durationMs",d).putLong("remainingMs",d);
        if (auto) e.putBoolean("running",true).putLong("endAtElapsed",SystemClock.elapsedRealtime()+d);
        else e.putBoolean("running",false);
        e.apply();
        completionNotification(next);
        notifyTick();
    }

    private final Runnable ticker=new Runnable(){
        @Override public void run(){
            if (prefs.getBoolean("running",false)) {
                long rem=remainingNow();
                if(rem<=0) finishSession(false);
                else prefs.edit().putLong("remainingMs",rem).apply();
            }
            notifyTick();
            handler.postDelayed(this, prefs.getBoolean("running",false)?500:1000);
        }
    };

    private long remainingNow() {
        if (prefs.getBoolean("running",false))
            return Math.max(0,prefs.getLong("endAtElapsed",0)-SystemClock.elapsedRealtime());
        return Math.max(0,prefs.getLong("remainingMs",durationMs()));
    }

    private long durationMs() {
        String mode=prefs.getString("mode","focus");
        if("short".equals(mode)) return 5*60_000L;
        if("long".equals(mode)) return 15*60_000L;
        return prefs.getInt("focusMinutes",25)*60_000L;
    }

    private int parse(String s,int fallback){
        try{return Integer.parseInt(s);}catch(Exception e){return fallback;}
    }

    private void notifyTick(){
        Intent i=new Intent(TICK);
        i.setPackage(getPackageName());
        sendBroadcast(i);
        if(overlay!=null){
            overlay.remaining=remainingNow();
            overlay.running=prefs.getBoolean("running",false);
            overlay.mode=prefs.getString("mode","focus");
            overlay.invalidate();
        }
        if (prefs.getBoolean("running",false)) {
            NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            nm.notify(7,buildNotification());
        }
    }

    private Notification buildNotification(){
        String title="Pomodoro • "+format(remainingNow());
        Intent in=new Intent(this,MainActivity.class);
        PendingIntent pi=PendingIntent.getActivity(this,1,in,Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        return b.setContentTitle(title)
                .setContentText("Offline focus timer")
                .setSmallIcon(com.dypollabs.pomodoro.R.drawable.ic_logo)
                .setContentIntent(pi)
                .setOngoing(prefs.getBoolean("running",false))
                .setCategory(Notification.CATEGORY_SERVICE)
                .build();
    }

    private void completionNotification(String next){
        NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        b.setContentTitle("Session complete")
                .setContentText("Next: "+("focus".equals(next)?"Focus":"Break"))
                .setSmallIcon(com.dypollabs.pomodoro.R.drawable.ic_logo)
                .setAutoCancel(true);
        nm.notify(8,b.build());
        if(prefs.getBoolean("vibrate",true)){
            android.os.Vibrator v=(android.os.Vibrator)getSystemService(VIBRATOR_SERVICE);
            if(Build.VERSION.SDK_INT>=26) v.vibrate(android.os.VibrationEffect.createOneShot(220,android.os.VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(220);
        }
    }

    private void createChannel(){
        if(Build.VERSION.SDK_INT>=26){
            NotificationChannel c=new NotificationChannel(CHANNEL,"Pomodoro timer",NotificationManager.IMPORTANCE_LOW);
            c.setDescription("Foreground status for the offline timer and floating widget");
            ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
    }

    private void showOverlay(){
        if(!Settings.canDrawOverlays(this) || overlay!=null) return;
        int w=prefs.getInt("overlayW",300), h=prefs.getInt("overlayH",175);
        overlay=new OverlayView(this);
        overlay.remaining=remainingNow();
        overlay.running=prefs.getBoolean("running",false);
        overlay.mode=prefs.getString("mode","focus");

        overlayLp=new WindowManager.LayoutParams(
                w,h,
                Build.VERSION.SDK_INT>=26?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_SYSTEM_ALERT,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN|
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        overlayLp.gravity=Gravity.TOP|Gravity.START;
        overlayLp.x=prefs.getInt("overlayX",24);
        overlayLp.y=prefs.getInt("overlayY",150);
        try { wm.addView(overlay,overlayLp); }
        catch(Exception e){ overlay=null; overlayLp=null; }
    }

    private void hideOverlay(){
        if(overlay!=null){
            try{wm.removeView(overlay);}catch(Exception ignored){}
            overlay=null;
            overlayLp=null;
        }
        if(!prefs.getBoolean("running",false)) stopSelf();
    }

    @Override public void onDestroy(){
        if(overlay!=null){try{wm.removeView(overlay);}catch(Exception ignored){}}
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent){return null;}

    private String format(long ms){
        long s=(ms+999)/1000;
        return String.format(Locale.US,"%02d:%02d",s/60,s%60);
    }

    private int dp(float v){return (int)(v*getResources().getDisplayMetrics().density+0.5f);}

    private class OverlayView extends View {
        Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF r=new RectF();
        long remaining;
        boolean running;
        String mode="focus";
        float downX,downY;
        int startX,startY,startW,startH;
        boolean resizing;

        OverlayView(Context c){
            super(c);
            setLayerType(View.LAYER_TYPE_SOFTWARE,null);
            setBackgroundColor(Color.TRANSPARENT);
        }

        @Override protected void onDraw(Canvas c){
            super.onDraw(c);
            float w=getWidth(),h=getHeight(),radius=Math.min(w,h)*0.26f;

            p.setShader(new LinearGradient(0,0,w,h,Color.rgb(242,57,98),Color.rgb(255,111,151),Shader.TileMode.CLAMP));
            r.set(0,0,w,h);
            c.drawRoundRect(r,radius,radius,p);
            p.setShader(null);

            p.setColor(0x22FFFFFF);
            r.set(9,9,w-9,42);
            c.drawRoundRect(r,20,20,p);

            p.setColor(Color.WHITE);
            p.setTypeface(Typeface.DEFAULT_BOLD);
            p.setTextSize(dp(11));
            c.drawText("POMODORO",dp(17),dp(29),p);

            p.setTextSize(Math.max(dp(28),Math.min(dp(52),w*0.17f)));
            String t=format(remaining);
            float tw=p.measureText(t);
            c.drawText(t,(w-tw)/2f,h*0.55f,p);

            p.setTypeface(Typeface.DEFAULT);
            p.setTextSize(dp(11));
            String m="focus".equals(mode)?"FOCUS":("short".equals(mode)?"SHORT BREAK":"LONG BREAK");
            float mw=p.measureText(m);
            c.drawText(m,(w-mw)/2f,h*0.70f,p);

            float rowY=h-35;
            p.setColor(0x2EFFFFFF);
            r.set(10,rowY-14,w-10,rowY+20);
            c.drawRoundRect(r,25,25,p);

            p.setColor(Color.WHITE);
            p.setTextSize(dp(11));
            c.drawText("↺",18,rowY+4,p);
            c.drawText(running?"❚❚":"▶",w/2f-dp(6),rowY+4,p);
            c.drawText("›",w-28,rowY+4,p);

            p.setColor(0x88FFFFFF);
            for(int i=0;i<3;i++){
                c.drawRect(w-24+i*5,h-18+i*5,w-20+i*5,h-14+i*5,p);
            }

            if (w > dp(300)) {
                p.setTextSize(dp(8));
                c.drawText("DRAG",dp(16),h-dp(9),p);
                c.drawText("RESIZE",w-dp(56),h-dp(9),p);
            }
        }

        @Override public boolean onTouchEvent(MotionEvent e){
            float x=e.getX(),y=e.getY();
            if(e.getAction()==MotionEvent.ACTION_DOWN){
                downX=x;downY=y;
                startX=overlayLp.x;startY=overlayLp.y;startW=getWidth();startH=getHeight();
                resizing=x>getWidth()-dp(42)&&y>getHeight()-dp(42);
                return true;
            }
            if(e.getAction()==MotionEvent.ACTION_MOVE){
                float dx=x-downX,dy=y-downY;
                if(resizing){
                    overlayLp.width=Math.max(dp(220),Math.min(dp(600),(int)(startW+dx)));
                    overlayLp.height=Math.max(dp(130),Math.min(dp(360),(int)(startH+dy)));
                }else{
                    overlayLp.x=startX+(int)dx;
                    overlayLp.y=startY+(int)dy;
                }
                try{wm.updateViewLayout(this,overlayLp);}catch(Exception ignored){}
                return true;
            }
            if(e.getAction()==MotionEvent.ACTION_UP){
                float dx=x-downX,dy=y-downY;
                if(Math.abs(dx)<12&&Math.abs(dy)<12&&!resizing){
                    if(x>getWidth()-dp(52)&&y<dp(52)) hideOverlay();
                    else if(y>getHeight()-dp(62)){
                        if(x<getWidth()/3f) reset();
                        else if(x<getWidth()*0.72f){
                            if(running) pause(); else startOrResume();
                        }else skip();
                    }else{
                        if(running) pause(); else startOrResume();
                    }
                }
                prefs.edit()
                        .putInt("overlayX",overlayLp.x)
                        .putInt("overlayY",overlayLp.y)
                        .putInt("overlayW",overlayLp.width)
                        .putInt("overlayH",overlayLp.height)
                        .apply();
                return true;
            }
            return true;
        }
    }
}