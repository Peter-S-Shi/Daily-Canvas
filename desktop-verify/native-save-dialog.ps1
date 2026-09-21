# Completes the native Save dialog that belongs to ONE given app process.
# Finds the dialog by owning process id + class #32770, then talks only to that dialog's own child controls
# (reads its pre-filled file name via WM_GETTEXT, then presses Save; the dialog itself decides directory + name). No screen coordinates, no keystrokes, no other windows.
param([Parameter(Mandatory)][int]$ProcessId, [Parameter(Mandatory)][string]$ExpectedDir, [int]$TimeoutSeconds = 20)
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -TypeDefinition @"
using System; using System.Text; using System.Runtime.InteropServices;
public class Dlg {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr p, EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder sb, int n);
  [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  static string Cls(IntPtr h) { var sb = new StringBuilder(128); GetClassName(h, sb, 128); return sb.ToString(); }
  public static IntPtr FindFileNameEdit(IntPtr dlg) {
    IntPtr found = IntPtr.Zero;
    EnumChildWindows(dlg, (h, l) => { if (Cls(h) == "Edit") { var p = GetParent(h); if (p != IntPtr.Zero && Cls(p) == "ComboBox") { var pp = GetParent(p); if (pp != IntPtr.Zero && Cls(pp) == "ComboBoxEx32") { found = h; return false; } } } return true; }, IntPtr.Zero);
    return found;
  }
  public static IntPtr FindSaveButton(IntPtr dlg) {
    IntPtr found = IntPtr.Zero;
    EnumChildWindows(dlg, (h, l) => { if (Cls(h) == "Button" && GetDlgCtrlID(h) == 1) { found = h; return false; } return true; }, IntPtr.Zero);
    return found;
  }
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, StringBuilder l);
  public static string Text(IntPtr h) { var sb = new StringBuilder(1024); SendMessage(h, 0x000D, (IntPtr)1024, sb); return sb.ToString(); } // WM_GETTEXT works across processes
  public static void SetText(IntPtr h, string s) { SendMessage(h, 0x000C, IntPtr.Zero, s); }
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
$edit = [Dlg]::FindFileNameEdit($h)
if ($edit -eq [IntPtr]::Zero) { Write-Output "NO_EDIT"; exit 3 }
$name = ''
for ($i = 0; $i -lt 15 -and -not $name; $i++) {
  foreach ($d in $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1001')))) {
    if ($d.Current.Name -match '.[A-Za-z0-9]{2,5}$' -and $d.Current.Name -notmatch '^Address') { $name = $d.Current.Name; break }
  }
  if (-not $name) { Start-Sleep -Milliseconds 200 }
}
Write-Output ("PREFILLED_NAME=" + $name)
if (-not $name) { Write-Output "NO_NAME"; exit 7 }
# Safety: never overwrite an existing file the app did not just create.
if (Test-Path -LiteralPath (Join-Path $ExpectedDir $name)) { Write-Output "WOULD_OVERWRITE"; exit 6 }
$save = [Dlg]::FindSaveButton($h)
if ($save -eq [IntPtr]::Zero) { Write-Output "NO_SAVE_BUTTON"; exit 4 }
[Dlg]::Click($save)
Write-Output "SAVED_INVOKED"
