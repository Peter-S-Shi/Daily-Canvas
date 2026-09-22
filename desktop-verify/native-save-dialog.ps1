# Completes the native Save dialog that belongs to ONE given app process.
# Finds the dialog by owning process id + class #32770 and talks only to that dialog: it reads the pre-filled file
# name through UI Automation and presses the dialog's own Save button (the dialog itself decides directory + name).
# No screen coordinates, no keystrokes, no other windows. The control layout differs between Windows client and
# Server builds, so the Save button is located with progressively looser strategies and the tree is dumped on failure.
param([Parameter(Mandatory)][int]$ProcessId, [Parameter(Mandatory)][string]$ExpectedDir, [string]$Extension = '', [int]$TimeoutSeconds = 20)
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -TypeDefinition @"
using System; using System.Text; using System.Runtime.InteropServices;
public class Dlg {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder sb, int n);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  static string Cls(IntPtr h) { var sb = new StringBuilder(128); GetClassName(h, sb, 128); return sb.ToString(); }
  public static IntPtr FindSaveButton(IntPtr dlg) {
    IntPtr found = IntPtr.Zero;
    EnumChildWindows(dlg, (h, l) => { if (Cls(h) == "Button" && GetDlgCtrlID(h) == 1) { found = h; return false; } return true; }, IntPtr.Zero);
    return found;
  }
  public static void Click(IntPtr h) { SendMessage(h, 0x00F5, IntPtr.Zero, IntPtr.Zero); } // BM_CLICK
}
"@
$root = [System.Windows.Automation.AutomationElement]::RootElement
$pidCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $ProcessId)
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$dialog = $null
while ((Get-Date) -lt $deadline -and -not $dialog) {
  foreach ($w in $root.FindAll([System.Windows.Automation.TreeScope]::Children, $pidCond)) {
    if ($w.Current.ClassName -eq '#32770') { $dialog = $w; break }
  }
  if (-not $dialog) { Start-Sleep -Milliseconds 300 }
}
if (-not $dialog) { Write-Output "NO_DIALOG"; exit 2 }
Write-Output ("DIALOG title='{0}'" -f $dialog.Current.Name)
Start-Sleep -Milliseconds 800   # let the shell view finish populating
$h = [IntPtr]$dialog.Current.NativeWindowHandle

function Dump-Tree { foreach ($d in $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition) | Select-Object -First 80) { Write-Output ("  {0} id='{1}' name='{2}'" -f $d.Current.ControlType.ProgrammaticName, $d.Current.AutomationId, $d.Current.Name) } }

# pre-filled file name: the control with AutomationId 1001 whose name looks like a file name (the other 1001 is the address bar)
$name = ''
for ($i = 0; $i -lt 15 -and -not $name; $i++) {
  foreach ($d in $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1001')))) {
    # Windows Server hides known extensions in the dialog, so the shown name may lack '.json' / '.docx'
    if ($d.Current.Name -and $d.Current.Name -notmatch '^Address') { $name = $d.Current.Name; break }
  }
  if (-not $name) { Start-Sleep -Milliseconds 200 }
}
if ($name -and $Extension -and -not $name.EndsWith(".$Extension")) { $name = "$name.$Extension" }
Write-Output ("PREFILLED_NAME=" + $name)
if (-not $name) { Write-Output "NO_NAME"; Dump-Tree; exit 7 }
# Safety: never overwrite an existing file the app did not just create.
if (Test-Path -LiteralPath (Join-Path $ExpectedDir $name)) { Write-Output "WOULD_OVERWRITE"; exit 6 }

# Save button: (1) classic Win32 button id 1, (2) UI Automation element id '1' named Save, (3) any button named Save
$save = [Dlg]::FindSaveButton($h)
if ($save -ne [IntPtr]::Zero) { [Dlg]::Click($save); Write-Output "SAVED_INVOKED (win32)"; exit 0 }
foreach ($cand in $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, 'Save')))) {
  $pattern = $null
  if ($cand.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) { $pattern.Invoke(); Write-Output ("SAVED_INVOKED (uia {0} id={1})" -f $cand.Current.ControlType.ProgrammaticName, $cand.Current.AutomationId); exit 0 }
}
Write-Output "NO_SAVE_BUTTON"; Dump-Tree; exit 4
