param([switch]$Install,[ValidatePattern('^[a-z0-9-]*$')][string]$Case='')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskLocal = [IO.Path]::GetFullPath((Join-Path $taskRoot '.local'))
$taskVerifyRoot = if ($Case) { Join-Path $taskLocal $Case } else { $taskLocal }
$taskAppDir = [IO.Path]::GetFullPath((Join-Path $taskVerifyRoot 'installed-app'))
$taskOut = Join-Path $taskVerifyRoot 'installed-smoke'
if (!$taskAppDir.StartsWith($taskLocal + '\')) { throw 'Unexpected install target' }
New-Item -ItemType Directory -Force -Path $taskOut | Out-Null
if ($Install) {
    $taskVersion = (Get-Content -LiteralPath (Join-Path $taskRoot 'package.json') -Raw | ConvertFrom-Json).version
    $taskSetup = Start-Process -FilePath (Join-Path $taskRoot ('release\NamingStudio-' + $taskVersion + '-Setup.exe')) -ArgumentList @('/S',('/D=' + $taskAppDir)) -WindowStyle Hidden -PassThru
    if (!$taskSetup.WaitForExit(30000)) { throw "Installer remains live: PID $($taskSetup.Id)" }
    if ($taskSetup.ExitCode -ne 0) { throw "Installer failed: $($taskSetup.ExitCode)" }
}
$taskExe = Join-Path $taskAppDir '知名起名工作室.exe'
if (!(Test-Path -LiteralPath $taskExe)) { throw 'Run with -Install first' }
$taskStart = [Diagnostics.ProcessStartInfo]::new()
$taskStart.FileName = $taskExe
$taskStart.WorkingDirectory = $taskAppDir
$taskStart.UseShellExecute = $false
$taskStart.WindowStyle = 'Hidden'
$taskStart.Environment['PATH'] = "$env:SystemRoot\System32;$env:SystemRoot"
$taskStart.Environment['NODE_PATH'] = ''
$taskStart.Environment['NODE_OPTIONS'] = ''
$taskStart.Environment['NAMING_STUDIO_USER_DATA'] = Join-Path $taskOut 'user'
$taskStart.Environment['NAMING_STUDIO_SMOKE'] = $taskOut
$taskStart.Environment['NAMING_STUDIO_SMOKE_EXIT'] = '1'
$taskBefore = Get-Date
$taskRun = [Diagnostics.Process]::Start($taskStart)
# The isolated smoke exports twelve complete reports before exiting; keep each observation bounded.
$taskWaitSeconds=0
while (!$taskRun.WaitForExit(1000)) {
    $taskWaitSeconds++
    if ($taskWaitSeconds -ge 120) { throw "Application remains live: PID $($taskRun.Id)" }
}
if ($taskRun.ExitCode -ne 0) { throw "Application failed: $($taskRun.ExitCode)" }
$taskResultFile = Join-Path $taskOut 'smoke-result.json'
$taskResultInfo = Get-Item -LiteralPath $taskResultFile
if ($taskResultInfo.LastWriteTime -lt $taskBefore) { throw 'No fresh runtime result' }
$taskResult = Get-Content -LiteralPath $taskResultFile -Raw | ConvertFrom-Json
if ($taskResult.candidates -ne 12 -or !$taskResult.protectedSecretVerified -or $taskResult.runtime.bridge -ne 'function' -or $taskResult.numerology.status -ne 'complete' -or $taskResult.numerology.grids.Count -ne 5) { throw 'Runtime assertions failed' }
if ($taskResult.analysis.qimen.auxiliary.markers.Count -ne 2 -or $taskResult.qimenUI.body -notmatch '时旬空' -or $taskResult.qimenUI.body -notmatch '时驿马' -or $taskResult.qimenUI.horizontalOverflow) { throw 'Qimen auxiliary runtime assertions failed' }
if ($taskResult.deliveryUI.names.Count -ne 12 -or $taskResult.deliveryUI.text -notmatch '本次导出名单' -or $taskResult.deliveryUI.horizontalOverflow) { throw 'Delivery confirmation runtime assertions failed' }
if ($taskResult.analysis.qimen.patterns.checks.Count -ne 7 -or $taskResult.qimenUI.structuralChecks -ne 7) { throw 'Qimen structural runtime assertions failed' }
if (!$taskResult.reviewTokenPresent -or $taskResult.sourceSnapshot.sources.Count -lt 1 -or $taskResult.sourcesUI.count -ne $taskResult.sourceSnapshot.sources.Count -or $taskResult.sourcesUI.horizontalOverflow) { throw 'Saved source snapshot and review token runtime assertions failed' }
if ($taskResult.baziUI.opinionCount -ne 2 -or $taskResult.baziUI.horizontalOverflow -or $taskResult.analysis.bazi.evidence.monthAuthority.status -ne 'determined' -or $taskResult.analysis.bazi.evidence.monthAuthority.methodId -ne 'sanming-first-paragraph/1.0.0') { throw 'Bazi evidence runtime assertions failed' }
if ($taskResult.seasonalUI.cases -ne 1 -or $taskResult.seasonalUI.horizontalOverflow -or $taskResult.analysis.bazi.evidence.monthlySeasonal.methodId -ne 'qiongtong-2294674-initial/1.0.0') { throw 'Monthly seasonal reference runtime assertions failed' }
if ($taskResult.factVerification.status -ne 'verified-builtin' -or !$taskResult.favorableUI.exportBlocked -or $taskResult.favorableUI.horizontalOverflow) { throw 'Candidate fact verification or manual draft runtime assertions failed' }
if ($taskResult.qimenUI.stemTombChecks -ne 10 -or !$taskResult.guideUI.skipped -or !$taskResult.maintenanceUI.guideReopened -or $taskResult.maintenanceUI.horizontalOverflow) { throw 'Stem tomb, guide or maintenance UI runtime assertions failed' }
if (!$taskResult.maintenancePreviewUI.existingSessionsUnchanged -or $taskResult.maintenancePreviewUI.chooserFixtureSelections -ne 2 -or $taskResult.maintenancePreviewUI.initial.sha256 -ne $taskResult.maintenancePreviewUI.cancelled.active.sha256 -or $taskResult.maintenancePreviewUI.fixtureSha256 -ne $taskResult.maintenancePreviewUI.applied.active.sha256 -or $taskResult.maintenancePreviewUI.initial.sha256 -ne $taskResult.maintenancePreviewUI.rolledBack.active.sha256) { throw 'Maintenance preview/cancel/import/rollback runtime assertions failed' }
if (!$taskResult.aiCapabilityUI.savedSettingsUnchanged -or !$taskResult.aiCapabilityUI.customerArchiveBytesUnchanged -or !$taskResult.aiCapabilityUI.staleAfterModelEdit.stale -or $taskResult.aiCapabilityUI.malformed.bodyContainsFixtureKey -or $taskResult.aiCapabilityUI.passed.checks.Count -ne 4 -or !$taskResult.termsKeyboardUI.closed.summaryFocus -or $taskResult.conditionAnalysis.bazi.evidence.seasonalConditions.checks.Count -ne 2) { throw 'AI capability, terminology or seasonal supplemental runtime assertions failed' }
if ($taskResult.patternUI.activeCards -ne 1 -or $taskResult.patternUI.criteria -ne 2 -or $taskResult.patternUI.horizontalOverflow -or $taskResult.congUnknownAnalysis.bazi.evidence.patternEvidence.checks.Where({$_.status -eq 'pending'}).Count -lt 1) { throw 'Month-specific following evidence UI or unknown-time runtime assertions failed' }
if ($taskResult.shaUI.activeCards -ne 1 -or $taskResult.shaUI.branches -ne 1 -or $taskResult.shaUI.qualifiedSignals -ne 1 -or $taskResult.shaUI.opposedCriteria -ne 0 -or $taskResult.shaUI.horizontalOverflow -or $taskResult.shaUI.text -notmatch '前提未齐 · 整句尚未裁决') { throw 'Dependent sha signal UI runtime assertions failed' }
if ($taskResult.shaAnalysis.bazi.evidence.patternEvidence.checks.Where({$_.pattern -eq 'cong-sha' -and $_.applicability -eq 'applicable' -and $_.status -eq 'pending'}).Count -ne 1 -or $taskResult.shaUnknownAnalysis.bazi.evidence.patternEvidence.checks.Where({$_.pattern -eq 'cong-sha' -and $_.applicability -eq 'applicable' -and $_.status -eq 'pending'}).Count -ne 1) { throw 'Dependent sha known/unknown runtime states failed' }
if (!$taskResult.restoreDraftUI.continueRetainedDrafts -or !$taskResult.restoreDraftUI.nativeCancellationRetainedDrafts -or !$taskResult.restoreDraftUI.draftKeyRetained -or !$taskResult.restoreDraftUI.reading.beforeUnloadPrevented -or !$taskResult.restoreDraftUI.lateLogoIgnored -or !$taskResult.restoreDraftUI.persistedSettingsUnchanged -or !$taskResult.restoreDraftUI.customerArchiveBytesUnchanged -or $taskResult.restoreDraftUI.chooserFixtureCancellations -ne 1 -or $taskResult.restoreDraftUI.horizontalOverflow) { throw 'Restore draft cancellation or pending logo protection runtime assertions failed' }
if (!$taskResult.solarTime.realStoredSessions -or $taskResult.solarTime.known.bazi.timeBasis.basis -ne 'apparent-solar' -or $taskResult.solarTime.known.bazi.timeBasis.calculationDateTime -notmatch '^2024-02-09' -or $taskResult.solarTime.known.bazi.solarDate -notmatch '^2024-02-10' -or $taskResult.solarTime.unknown.bazi.timeBasis.dayStatus -ne 'uncertain' -or $taskResult.solarTime.unknown.bazi.pillars.Where({$_.label -eq '日柱' -or $_.label -eq '时柱'}).Count -ne 0 -or $taskResult.solarTime.unknown.bazi.favorable.Count -ne 0 -or $taskResult.solarTime.unknown.qimen.available -or $taskResult.solarTime.ui.horizontalOverflow) { throw 'Solar clock, original civil record or unknown-day protection runtime assertions failed' }
$taskRestriction = $taskResult.followingRestrictions
if (!$taskRestriction.realStoredSessions -or !$taskRestriction.storeReloadDidNotWrite -or $taskRestriction.sourceId -ne 'bazi-following-restrictions-qiongtong-2294674' -or @($taskRestriction.cases.PSObject.Properties).Count -ne 4) { throw 'Following restriction real save/reload or source binding assertions failed' }
foreach ($taskRestrictionName in @('jia-yin','gui-wei','jia-lichun-pending','solar-day-pending')) {
    $taskRestrictionCase = $taskRestriction.cases.$taskRestrictionName
    $taskRestrictionUI = $taskRestriction.ui.$taskRestrictionName
    if (!$taskRestrictionCase.sourceBound -or !$taskRestrictionCase.reloadedEqual -or !$taskRestrictionCase.reviewSaved -or $taskRestrictionCase.restrictions.checks.Count -ne 2 -or $taskRestrictionUI.horizontalOverflow -or $taskRestrictionUI.text -notmatch '未命中限制不代表从格成立') { throw "Following restriction persisted state or rendered scope failed: $taskRestrictionName" }
}
if (($taskRestriction.cases.'jia-yin'.restrictions.checks.status -join ',') -ne 'applies,not-applicable' -or ($taskRestriction.cases.'gui-wei'.restrictions.checks.status -join ',') -ne 'not-applicable,applies' -or ($taskRestriction.cases.'jia-lichun-pending'.restrictions.checks.status -join ',') -ne 'pending,not-applicable' -or ($taskRestriction.cases.'solar-day-pending'.restrictions.checks.status -join ',') -ne 'pending,pending') { throw 'Following restriction actual known/unknown states failed' }
if ($taskRestriction.cases.'jia-lichun-pending'.hasMonthPillar -or $taskRestriction.cases.'jia-lichun-pending'.restrictions.checks[0].dayStem -ne '甲' -or ($taskRestriction.cases.'jia-lichun-pending'.restrictions.checks[0].monthBranches -join ',') -ne '丑,寅' -or $taskRestriction.cases.'solar-day-pending'.hasEvidence -or $taskRestriction.cases.'solar-day-pending'.hasDayPillar) { throw 'Following restriction unknown day/month protection failed' }
if (!$taskRestriction.keyboard.sourceDisclosureVerified -or $taskRestriction.keyboard.nativeEnterVerified -isnot [bool] -or !$taskRestriction.keyboard.before.focused -or !$taskRestriction.keyboard.before.closed -or !$taskRestriction.keyboard.opened.opened -or !$taskRestriction.keyboard.opened.summaryFocus -or $taskRestriction.keyboard.opened.horizontalOverflow -or $taskRestriction.keyboard.opened.text -notmatch 'oldid=2294674' -or $taskRestriction.restoredUI.page -ne $taskRestriction.originalUI.page) { throw 'Following restriction source disclosure, separately recorded native input, focus or original page restoration failed' }
if (!$taskRestriction.keyboard.nativeEnterVerified -and (!$taskRestriction.keyboard.nativeError -or !$taskRestriction.keyboard.nativeEnterPending)) { throw 'Following restriction unverified native input was not recorded with its pending reason' }
foreach ($taskRestrictionArtifact in @($taskRestriction.pdf,$taskRestriction.sessionsFile)) {
    if (!(Test-Path -LiteralPath $taskRestrictionArtifact)) { throw 'Following restriction runtime artifact missing' }
    $taskRestrictionInfo = Get-Item -LiteralPath $taskRestrictionArtifact
    if ($taskRestrictionInfo.Length -lt 1000 -or $taskRestrictionInfo.LastWriteTime -lt $taskBefore) { throw 'Following restriction runtime artifact empty or stale' }
}
$taskRen=$taskResult.renCommentary
if (!$taskRen.realStoredSessions -or !$taskRen.readOnlyReloadUnchanged -or $taskRen.sourceId -ne 'bazi-ditian-ren-2600158') { throw 'Independent Ren real-store/reload/source verification failed' }
foreach ($taskRenKey in @('strong-yes','strong-no','solar-unknown')) {
    $taskRenCase=$taskRen.cases.$taskRenKey
    $taskRenUI=$taskRen.ui.$taskRenKey
    if (!$taskRenCase.sourceBound -or $taskRenCase.analysis.bazi.version -notmatch '/1\.10\.0;' -or !$taskRenUI.graphOpened -or !$taskRenUI.sourceOpened -or $taskRenUI.actionContracts -ne 11 -or $taskRenUI.horizontalOverflow) { throw "Independent Ren version/source/structure UI failed: $taskRenKey" }
}
if ($taskRen.cases.'strong-yes'.analysis.renCommentary.sourceCaseMatches.caseId -notcontains 'strong-wood-yes' -or $taskRen.cases.'strong-no'.analysis.renCommentary.sourceCaseMatches.caseId -notcontains 'strong-wood-no' -or $taskRen.cases.'solar-unknown'.analysis.renCommentary.sourceCaseMatches.Count -ne 0 -or $taskRen.cases.'solar-unknown'.analysis.renCommentary.input.complete -or $taskRen.cases.'solar-unknown'.analysis.renCommentary.input.dayStem) { throw 'Independent Ren exact-source or unknown-time matching failed' }
foreach ($taskRenArtifact in @($taskRen.pdfs.'strong-yes',$taskRen.pdfs.'solar-unknown',$taskRen.sessionsFile)) {
    if (!(Test-Path -LiteralPath $taskRenArtifact)) { throw 'Independent Ren runtime artifact missing' }
    $taskRenInfo=Get-Item -LiteralPath $taskRenArtifact
    if ($taskRenInfo.Length -lt 1000 -or $taskRenInfo.LastWriteTime -lt $taskBefore) { throw 'Independent Ren runtime artifact stale' }
}
$taskNecessary=$taskResult.renNecessary
if (!$taskNecessary.realStoredSessions -or !$taskNecessary.readOnlyReloadUnchanged) { throw 'Necessary-condition real storage/reload failed' }
foreach ($taskNecessaryKey in @('no-wealth','no-output','child-source','unknown')) {
    $taskNecessaryCase=$taskNecessary.cases.$taskNecessaryKey
    $taskNecessaryUI=$taskNecessary.ui.$taskNecessaryKey
    if ($taskNecessaryCase.analysis.bazi.version -notmatch '/1\.11\.0;' -or $taskNecessaryCase.analysis.renCommentary.necessaryConditions.checks.Count -ne 2 -or !$taskNecessaryUI.sourceExpanded -or $taskNecessaryUI.horizontalOverflow) { throw "Necessary-condition actual input or UI failed: $taskNecessaryKey" }
}
if ($taskNecessary.cases.'no-wealth'.analysis.renCommentary.necessaryConditions.checks[0].status -ne 'contradicted' -or $taskNecessary.cases.'no-output'.analysis.renCommentary.necessaryConditions.checks[1].status -ne 'contradicted' -or ($taskNecessary.cases.unknown.analysis.renCommentary.necessaryConditions.checks.status -join ',') -ne 'unknown,unknown') { throw 'Necessary-condition finite contradictions or unknown protection failed' }
foreach ($taskGlyph in @('厚','自','升')) {
    if ($taskNecessary.glyphs.$taskGlyph.candidate.numerology.status -ne 'complete' -or $taskNecessary.glyphs.$taskGlyph.candidate.numerology.dataVersion -ne 'kangxi-radical-candidates-2026.10.19-v2') { throw "New Kangxi sourced glyph calculation failed: $taskGlyph" }
}
[pscustomobject]@{ Installed = [bool]$Install; ExitCode = $taskRun.ExitCode; Candidates = $taskResult.candidates; ProtectedSecret = $taskResult.protectedSecretVerified; Numerology = $taskResult.numerology.status; App = $taskExe; Result = $taskResultFile; DeveloperToolsPathRemoved = $true } | ConvertTo-Json
