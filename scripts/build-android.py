#!/usr/bin/env python3
"""Build the native APK using official JDK and Android SDK tools, without Gradle.

Set ANDROID_SDK_ROOT, JAVA_HOME, BIOVAULT_KEYSTORE, BIOVAULT_STORE_PASSWORD
and BIOVAULT_KEY_ALIAS. Signing credentials are never written into the repository.
"""
import os
import pathlib
import shutil
import subprocess
import zipfile

root=pathlib.Path(__file__).resolve().parent.parent
sdk=pathlib.Path(os.environ['ANDROID_SDK_ROOT'])
jdk=pathlib.Path(os.environ['JAVA_HOME'])
tools=sdk/'build-tools/35.0.0'
android=sdk/'platforms/android-35/android.jar'
build=root/'build/android'
build.mkdir(parents=True,exist_ok=True)
env={**os.environ,'PATH':str(jdk/'bin')+os.pathsep+os.environ['PATH']}
def run(*args):
    subprocess.run([str(a) for a in args],cwd=root,env=env,check=True)
run(tools/'aapt2','compile','--dir',root/'android/app/src/main/res','-o',build/'resources.zip')
run(tools/'aapt2','link','-o',build/'resources.apk','--manifest',root/'android/app/src/main/AndroidManifest.xml','-I',android,'-A',root/'android/app/src/main/assets','--java',build/'generated',build/'resources.zip')
classes=build/'classes'
classes.mkdir(exist_ok=True)
sources=list((root/'android/app/src/main/java').rglob('*.java'))+list((build/'generated').rglob('*.java'))
run(jdk/'bin/javac','--release','8','-classpath',android,'-d',classes,*sources)
run(jdk/'bin/jar','cf',build/'classes.jar','-C',classes,'.')
dex=build/'dex'
dex.mkdir(exist_ok=True)
run(tools/'d8','--release','--min-api','26','--lib',android,'--output',dex,build/'classes.jar')
unsigned=build/'unsigned.apk'
shutil.copyfile(build/'resources.apk',unsigned)
with zipfile.ZipFile(unsigned,'a',compression=zipfile.ZIP_DEFLATED) as archive:
    for file in dex.glob('*.dex'):
        archive.write(file,file.name)
run(tools/'zipalign','-f','-p','4',unsigned,build/'aligned.apk')
result=root/'build/BioVault_Pro_5.0.0.apk'
run(tools/'apksigner','sign','--ks',os.environ['BIOVAULT_KEYSTORE'],'--ks-type','PKCS12','--ks-key-alias',os.environ['BIOVAULT_KEY_ALIAS'],'--ks-pass','env:BIOVAULT_STORE_PASSWORD','--key-pass','env:BIOVAULT_STORE_PASSWORD','--out',result,build/'aligned.apk')
run(tools/'apksigner','verify','--verbose',result)
print(result)
