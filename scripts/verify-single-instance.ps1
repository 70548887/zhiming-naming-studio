$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskApp = Join-Path $taskRoot '.local\installed-app\知名起名工作室.exe'
$taskCase = Join-Path $taskRoot '.local\single-instance'
$taskPrimaryOut = Join-Path $taskCase 'primary'
$taskSecondaryOut = Join-Path $taskCase 'secondary'
New-Item -ItemType Directory -Force -Path $taskPrimaryOut,$taskSecondaryOut | Out-Null
function New-TaskStart([string]$outputDir) {
    $taskInfo = [Diagnostics.ProcessStartInfo]::new()
    $taskInfo.FileName = $taskApp
    $taskInfo.WorkingDirectory = [IO.Path]::GetDirectoryName($taskApp)
    $taskInfo.UseShellExecute = $false
    $taskInfo.WindowStyle = 'Hidden'
    $taskInfo.Environment['NAMING_STUDIO_USER_DATA'] = Join-Path $taskCase 'user'
    $taskInfo.Environment['NAMING_STUDIO_SMOKE'] = $outputDir
    $taskInfo.Environment['NAMING_STUDIO_SMOKE_EXIT'] = ''
    return $taskInfo
}
$taskFirst = $null
$taskSecond = $null
try {
    $taskStarted = Get-Date
    $taskFirst = [Diagnostics.Process]::Start((New-TaskStart $taskPrimaryOut))
    $taskResultFile = Join-Path $taskPrimaryOut 'smoke-result.json'
    $taskDeadline = (Get-Date).AddSeconds(25)
    while ((Get-Date) -lt $taskDeadline) {
        if ($taskFirst.HasExited) { throw "Primary app exited: $($taskFirst.ExitCode)" }
        if ((Test-Path -LiteralPath $taskResultFile) -and (Get-Item -LiteralPath $taskResultFile).LastWriteTime -ge $taskStarted) { break }
        Start-Sleep -Milliseconds 200
    }
    if (!(Test-Path -LiteralPath $taskResultFile) -or (Get-Item -LiteralPath $taskResultFile).LastWriteTime -lt $taskStarted) { throw 'No fresh primary runtime result' }
    $taskDatabase = Join-Path $taskCase 'user\customers.sqlite'
    $taskBeforeHash = (Get-FileHash -LiteralPath $taskDatabase -Algorithm SHA256).Hash
    $taskSecond = [Diagnostics.Process]::Start((New-TaskStart $taskSecondaryOut))
    if (!$taskSecond.WaitForExit(15000)) { throw 'Second app did not exit under the single-instance lock' }
    if ($taskFirst.HasExited) { throw 'Primary app unexpectedly exited' }
    $taskAfterHash = (Get-FileHash -LiteralPath $taskDatabase -Algorithm SHA256).Hash
    if ($taskBeforeHash -ne $taskAfterHash) { throw 'Second startup changed the customer archive' }
    $taskResult = [ordered]@{ PrimaryRemainsAlive = $true; SecondaryExitCode = $taskSecond.ExitCode; DatabaseUnchanged = $true; SecondaryProducedReport = (Test-Path -LiteralPath (Join-Path $taskSecondaryOut 'smoke-result.json')); VerifiedAt = (Get-Date).ToString('o') }
    if ($taskResult.SecondaryExitCode -ne 0 -or $taskResult.SecondaryProducedReport) { throw 'Secondary process entered the database workflow' }
    [IO.File]::WriteAllText((Join-Path $taskCase 'result.json'),($taskResult | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    $taskResult | ConvertTo-Json
}
finally {
    foreach ($taskProcess in @($taskFirst,$taskSecond)) { if ($taskProcess -and !$taskProcess.HasExited) { $taskProcess.Kill(); $taskProcess.WaitForExit(5000) | Out-Null } }
}
