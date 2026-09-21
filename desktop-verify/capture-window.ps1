# Captures ONE process's main window by handle using PrintWindow.
# PrintWindow reads that window's own content, never screen pixels, so it cannot capture another app.
param([Parameter(Mandatory)][int]$ProcessId, [Parameter(Mandatory)][string]$Out)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Cap { [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; } }
"@
$p = Get-Process -Id $ProcessId -ErrorAction Stop
$h = $p.MainWindowHandle
if ($h -eq [IntPtr]::Zero) { Write-Output "NO_MAIN_WINDOW"; exit 2 }
$r = New-Object Cap+RECT; [void][Cap]::GetWindowRect($h, [ref]$r)
$w = $r.R - $r.L; $ht = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $ht; $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
[void][Cap]::PrintWindow($h, $hdc, 2); $g.ReleaseHdc($hdc); $bmp.Save($Out); $g.Dispose(); $bmp.Dispose()
Write-Output ("CAPTURED {0}x{1} title='{2}'" -f $w, $ht, $p.MainWindowTitle)
