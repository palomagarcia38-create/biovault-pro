package com.biovault.pro;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public final class MainActivity extends Activity {
  private static final String ASSET_HOST="appassets.androidplatform.net";
  private static final String START="https://"+ASSET_HOST+"/assets/www/index.html";
  private static final String UPDATES="https://palomagarcia38-create.github.io/biovault-pro/public/updates/";
  private static final int PICK_BACKUP=11, SAVE_EXPORT=12, UNKNOWN_SOURCES=13;
  private WebView web;
  private ValueCallback<Uri[]> fileCallback;
  private byte[] pendingExport;
  private final ExecutorService worker=Executors.newSingleThreadExecutor();
  private volatile boolean checkingUpdate=false;
  private boolean updateVerified=false;

  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().setStatusBarColor(Color.rgb(2,6,17));
    getWindow().setNavigationBarColor(Color.rgb(2,6,17));
    // Keep status/cutout/keyboard insets, while navigation is revealed transiently by swipe.
    if(android.os.Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
    if(android.os.Build.VERSION.SDK_INT>=29)getWindow().setNavigationBarContrastEnforced(false);
    web=new WebView(this);web.setBackgroundColor(Color.rgb(2,6,17));
    web.setOnApplyWindowInsetsListener((view,insets)->{
      if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout());int bottom=Math.max(bars.bottom,insets.getInsets(android.view.WindowInsets.Type.ime()).bottom);view.setPadding(bars.left,bars.top,bars.right,bottom);}
      else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
      return insets;
    });
    WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
    settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);
    settings.setMediaPlaybackRequiresUserGesture(true);
    web.addJavascriptInterface(new Bridge(),"BioVaultNative");
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();if(!ASSET_HOST.equals(uri.getHost()))return null;
        String path=uri.getPath();
        if(!"https".equals(uri.getScheme())||path==null||!path.startsWith("/assets/www/")||path.contains(".."))return missing();
        try{
          String file=path.substring("/assets/".length());
          String type=file.endsWith(".js")?"application/javascript":file.endsWith(".css")?"text/css":file.endsWith(".html")?"text/html":file.endsWith(".json")?"application/json":file.endsWith(".webp")?"image/webp":file.endsWith(".jpg")?"image/jpeg":file.endsWith(".woff2")?"font/woff2":"application/octet-stream";
          Map<String,String> headers=new HashMap<>();headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-cache");
          return new WebResourceResponse(type,"UTF-8",200,"OK",headers,getAssets().open(file));
        }catch(Exception error){return missing();}
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();if("https".equals(uri.getScheme())&&ASSET_HOST.equals(uri.getHost()))return false;
        if(request.isForMainFrame()&&Arrays.asList("https","mailto","tel").contains(uri.getScheme())){
          try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException error){toast("Nenhum aplicativo disponível para abrir este link.");}
        }
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
        if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("*/*");intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain"});
        try{startActivityForResult(intent,PICK_BACKUP);}catch(ActivityNotFoundException error){fileCallback.onReceiveValue(null);fileCallback=null;toast("Não foi possível abrir o seletor de arquivos.");}
        return true;
      }
    });
    setContentView(web);web.loadUrl(START);getWindow().getDecorView().post(this::hideSystemNavigation);
  }
  private void hideSystemNavigation(){
    if(android.os.Build.VERSION.SDK_INT>=30){
      android.view.WindowInsetsController controller=getWindow().getInsetsController();
      if(controller!=null){controller.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);controller.hide(android.view.WindowInsets.Type.navigationBars());}
    }else getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE|android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  }
  @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)hideSystemNavigation();}
  @Override protected void onResume(){super.onResume();getWindow().getDecorView().post(this::hideSystemNavigation);}
  private long versionCode(PackageInfo info){return android.os.Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;}
  private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream(new byte[0]));}
  private void toast(String message){runOnUiThread(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show());}
  private void updateStatus(String message){runOnUiThread(()->{if(!isFinishing())web.evaluateJavascript("document.getElementById('updateStatus').textContent="+JSONObject.quote(message),null);});}
  public final class Bridge {
    @JavascriptInterface public void printReport(){runOnUiThread(()->{
      PrintManager printer=(PrintManager)getSystemService(PRINT_SERVICE);printer.print("BIOSHAPE — acompanhamento",web.createPrintDocumentAdapter("BIOSHAPE"),null);
    });}
    @JavascriptInterface public void saveFile(String base64,String name,String type){
      if(base64==null||base64.length()>12*1024*1024)return;
      if(!"application/json".equals(type)&&!"text/csv;charset=utf-8".equals(type))return;
      final byte[] bytes;try{bytes=Base64.decode(base64,Base64.DEFAULT);}catch(IllegalArgumentException error){return;}
      final String filename=name==null?"BIOSHAPE_backup.json":name.replaceAll("[^A-Za-z0-9_.-]","_");
      runOnUiThread(()->{
        if(pendingExport!=null){toast("Conclua o salvamento anterior.");return;}
        pendingExport=bytes;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(type.startsWith("text/csv")?"text/csv":"application/json");intent.putExtra(Intent.EXTRA_TITLE,filename);
        try{startActivityForResult(intent,SAVE_EXPORT);}catch(ActivityNotFoundException error){pendingExport=null;toast("Não foi possível abrir o salvamento.");}
      });
    }
    @JavascriptInterface public void checkForUpdate(){checkUpdate();}
  }
  private HttpURLConnection connection(String address) throws Exception {
    if(!address.startsWith(UPDATES))throw new SecurityException("Invalid update address");
    HttpURLConnection connection=(HttpURLConnection)new URL(address).openConnection();
    connection.setConnectTimeout(15000);connection.setReadTimeout(30000);connection.setInstanceFollowRedirects(false);
    connection.setRequestProperty("Cache-Control","no-cache");
    if(connection.getResponseCode()!=200){connection.disconnect();throw new java.io.IOException("Update unavailable");}
    return connection;
  }
  private void checkUpdate(){
    if(checkingUpdate)return;checkingUpdate=true;updateStatus("Buscando atualização…");
    worker.submit(()->{
      try{
        HttpURLConnection request=connection(UPDATES+"latest.json");byte[] data;
        try(InputStream input=request.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
          byte[] buffer=new byte[4096];int count;while((count=input.read(buffer))!=-1){output.write(buffer,0,count);if(output.size()>16384)throw new java.io.IOException();}data=output.toByteArray();
        }finally{request.disconnect();}
        JSONObject release=new JSONObject(new String(data,StandardCharsets.UTF_8));
        long version=release.getLong("versionCode");String label=release.getString("version"),url=release.getString("apkUrl"),sha=release.getString("sha256");
        if(version<=versionCode(getPackageManager().getPackageInfo(getPackageName(),0))){updateStatus("Você está na versão mais recente.");return;}
        if(!url.startsWith(UPDATES)||!sha.matches("[a-fA-F0-9]{64}"))throw new SecurityException();
        runOnUiThread(()->new AlertDialog.Builder(this).setTitle("BIOSHAPE "+label).setMessage("Atualizar o aplicativo agora? Seu perfil e suas pesagens serão mantidos.")
          .setNegativeButton("Depois",(dialog,which)->updateStatus("Atualização disponível."))
          .setPositiveButton("Atualizar",(dialog,which)->downloadUpdate(url,sha,version)).show());
      }catch(Exception error){updateStatus("Não foi possível consultar agora. Tente com internet.");}
      finally{checkingUpdate=false;}
    });
  }
  private void downloadUpdate(String url,String sha,long expectedVersion){
    updateStatus("Baixando atualização…");worker.submit(()->{
      File file=new File(getCacheDir(),"update.apk");updateVerified=false;
      try{
        HttpURLConnection request=connection(url);MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0;
        try(InputStream input=request.getInputStream();FileOutputStream output=new FileOutputStream(file)){
          byte[] buffer=new byte[65536];int count;while((count=input.read(buffer))!=-1){total+=count;if(total>64*1024*1024)throw new java.io.IOException();digest.update(buffer,0,count);output.write(buffer,0,count);}
        }finally{request.disconnect();}
        StringBuilder actual=new StringBuilder();for(byte value:digest.digest())actual.append(String.format("%02x",value&255));
        if(!sha.equalsIgnoreCase(actual.toString()))throw new SecurityException("Hash mismatch");
        int flags=android.os.Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo candidate=getPackageManager().getPackageArchiveInfo(file.getPath(),flags);
        PackageInfo installed=getPackageManager().getPackageInfo(getPackageName(),flags);
        if(candidate==null||!getPackageName().equals(candidate.packageName)||versionCode(candidate)!=expectedVersion||expectedVersion<=versionCode(installed))throw new SecurityException("Invalid package");
        Signature[] next=android.os.Build.VERSION.SDK_INT>=28?candidate.signingInfo.getApkContentsSigners():candidate.signatures;
        Signature[] own=android.os.Build.VERSION.SDK_INT>=28?installed.signingInfo.getApkContentsSigners():installed.signatures;
        if(next.length!=own.length||next.length!=1||!next[0].equals(own[0]))throw new SecurityException("Signature mismatch");
        updateVerified=true;runOnUiThread(()->installUpdate());
      }catch(Exception error){file.delete();updateStatus("A atualização não pôde ser verificada. Seu aplicativo foi mantido.");}
    });
  }
  private void installUpdate(){
    if(!updateVerified)return;
    if(!getPackageManager().canRequestPackageInstalls()){
      new AlertDialog.Builder(this).setTitle("Permitir atualização do BIOSHAPE").setMessage("O Android precisa da sua permissão para instalar a atualização. Ative a permissão para o BioVault e volte. Cada instalação continuará pedindo sua confirmação.")
        .setNegativeButton("Cancelar",(dialog,which)->updateStatus("Atualização baixada. Toque em atualizar quando quiser."))
        .setPositiveButton("Abrir permissão",(dialog,which)->startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())),UNKNOWN_SOURCES)).show();return;
    }
    Uri uri=Uri.parse("content://com.biovault.pro.updates/update.apk");
    Intent intent=new Intent(Intent.ACTION_VIEW);intent.setDataAndType(uri,"application/vnd.android.package-archive");intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    try{startActivity(intent);updateStatus("Confirme a atualização na tela do Android.");}catch(ActivityNotFoundException error){updateStatus("Não foi possível abrir o instalador do Android.");}
  }
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(request==PICK_BACKUP&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
    if(request==SAVE_EXPORT){
      byte[] bytes=pendingExport;pendingExport=null;
      if(result==RESULT_OK&&data!=null&&bytes!=null){try(OutputStream output=getContentResolver().openOutputStream(data.getData())){if(output==null)throw new java.io.IOException();output.write(bytes);toast("Arquivo salvo.");}catch(Exception error){toast("Não foi possível salvar o arquivo. Tente novamente.");}}
    }
    if(request==UNKNOWN_SOURCES){if(getPackageManager().canRequestPackageInstalls())installUpdate();else updateStatus("Permissão não concedida. O aplicativo foi mantido.");}
  }
  @Override public void onBackPressed(){web.evaluateJavascript("(() => {const ids=['trainingModal','goalPlanModal','newWeighingModal','reportModal','importBackupModal','metricDetailModal','quickPanelModal'];return ids.some(id=>!document.getElementById(id)?.classList.contains('hidden'));})()",visible->{
    if("true".equals(visible))web.evaluateJavascript("if(!document.getElementById('trainingModal').classList.contains('hidden'))window.BioshapeTraining?.back();else if(!document.getElementById('goalPlanModal').classList.contains('hidden'))deferGoalPlan();else{closeMetricDetail();closeQuickPanel();closeNewWeighingModal();closeReportModal();closeImportBackup();}",null);
    else new AlertDialog.Builder(this).setTitle("Sair do BIOSHAPE?").setMessage("Suas pesagens continuarão salvas.").setNegativeButton("Continuar",null).setPositiveButton("Sair",(dialog,which)->finish()).show();
  });}
  @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);web.removeJavascriptInterface("BioVaultNative");web.destroy();worker.shutdownNow();super.onDestroy();}
}
