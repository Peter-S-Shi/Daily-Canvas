# PROTOTYPE (M8-A spike): dumps the key controls of the native dialog owned by ONE process and captures it via PrintWindow.
param([Parameter(Mandatory)][int]$ProcessId, [Parameter(Mandatory)][string]$Out)
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Drawing
Add-Type 'using System;using System.Runtime.InteropServices;public class C2{[DllImport("user32.dll")]public static extern bool PrintWindow(IntPtr h,IntPtr d,uint f);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[StructLayout(LayoutKind.Sequential)]public struct R{public int L,T,Rr,B;}}'
$root = [System.Windows.Automation.AutomationElement]::RootElement
$c = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $ProcessId)
foreach ($w in $root.FindAll('Children', $c)) {
  if ($w.Current.ClassName -ne '#32770') { continue }
  foreach ($d in $w.FindAll('Descendants', [System.Windows.Automation.Condition]::TrueCondition)) {
    if ($d.Current.AutomationId -in '1001', '1', '2', 'FileNameControlHost', '1136', '1148' -or $d.Current.Name -match 'File name|Save as type|^Save$') {
      $val = ''; try { $val = $d.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
      '   {0} id={1} name={2} value={3}' -f $d.Current.ControlType.ProgrammaticName, $d.Current.AutomationId, $d.Current.Name, $val
    }
  }
  $h = [IntPtr]$w.Current.NativeWindowHandle; $r = New-Object C2+R; [void][C2]::GetWindowRect($h, [ref]$r)
  $bw = $r.Rr - $r.L; $bh = $r.B - $r.T; $b = New-Object System.Drawing.Bitmap $bw, $bh; $g = [System.Drawing.Graphics]::FromImage($b)
  $hd = $g.GetHdc(); [void][C2]::PrintWindow($h, $hd, 2); $g.ReleaseHdc($hd); $b.Save($Out); "CAPTURED dialog ${bw}x${bh}"
}
