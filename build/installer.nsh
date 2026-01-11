; Custom NSIS installer script for Onyx
; Adds a component page for optional suspend/resume feature

!macro customInstall
  ; Add custom component page for suspend feature
  !insertmacro MUI_PAGE_COMPONENTS
  
  ; Component descriptions
  !define MUI_COMPONENTSPAGE_TEXT_TOP "Select additional features to install:"
  !define MUI_COMPONENTSPAGE_TEXT_COMPLIST "Select the features you want to install:"
  
  ; Suspend feature component
  Section "Suspend/Resume Feature" SecSuspend
    ; Write to registry: HKCU\Software\Onyx\Features\SuspendEnabled = 1
    WriteRegStr HKCU "Software\Onyx\Features" "SuspendEnabled" "1"
    DetailPrint "Suspend/Resume feature enabled"
  SectionEnd
  
  ; Default section (unchecked) - writes 0 if suspend feature is not selected
  Section "-" SecSuspendDisabled
    ; Only write if the suspend section was not selected
    SectionGetFlags ${SecSuspend} $0
    IntOp $0 $0 & ${SF_SELECTED}
    IntCmp $0 ${SF_SELECTED} skip_write
    WriteRegStr HKCU "Software\Onyx\Features" "SuspendEnabled" "0"
    skip_write:
  SectionEnd
!macroend

; Custom uninstaller macro (optional)
!macro customUnInstall
  ; Remove registry key on uninstall (optional)
  ; DeleteRegKey HKCU "Software\Onyx\Features"
!macroend
