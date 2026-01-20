!macro customUnInstall
  MessageBox MB_ICONQUESTION|MB_YESNO "Would you like to remove all application data, including your game library, settings, and cached images? $\n$\nWarning: This cannot be undone." /SD IDNO IDNO end_label
    RMDir /r "$APPDATA\Onyx"
    RMDir /r "$APPDATA\Onyx Alpha"
    RMDir /r "$LOCALAPPDATA\onyx-launcher"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Onyx"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Onyx Alpha"
  end_label:
!macroend
