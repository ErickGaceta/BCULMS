RequestExecutionLevel user

!include "MUI2.nsh"

!define APP_NAME "BCULMS"
!define APP_PUBLISHER "Baguio Central University"
!define APP_VERSION "0.1.0-beta"
!define APP_DIR "$LOCALAPPDATA\${APP_NAME}"

Name "${APP_NAME}"
OutFile "BCULMS_Installer.exe"
InstallDir "${APP_DIR}"
InstallDirRegKey HKCU "Software\${APP_NAME}" "InstallDir"


VIProductVersion "0.1.0.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "FileDescription" "${APP_NAME} Installer"
VIAddVersionKey "FileVersion" "${APP_VERSION}"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath "$INSTDIR"

    File "dist\BCULMS\BCULMS-win_x64.exe"
    File "dist\BCULMS\resources.neu"
    CreateDirectory "$INSTDIR\.tmp"
    File /r "dist\BCULMS\.tmp\*.*"

    WriteRegStr HKCU "Software\${APP_NAME}" "InstallDir" "$INSTDIR"

    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\BCULMS-win_x64.exe" "" "$INSTDIR\BCULMS-win_x64.exe" 0
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\BCULMS-win_x64.exe" "" "$INSTDIR\BCULMS-win_x64.exe" 0

    WriteUninstaller "$INSTDIR\Uninstall.exe"

    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    RMDir  "$SMPROGRAMS\${APP_NAME}"

    Delete "$INSTDIR\BCULMS-win_x64.exe"
    Delete "$INSTDIR\resources.neu"
    RMDir /r "$INSTDIR\.tmp"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir /r "$INSTDIR"

    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
    DeleteRegKey HKCU "Software\${APP_NAME}"
SectionEnd
