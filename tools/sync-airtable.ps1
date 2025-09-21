# PowerShell: Sync local images into Airtable table via API (create/update)
# Usage (PowerShell 7+):
#   $env:AIRTABLE_PAT="<your_pat>"
#   $env:AIRTABLE_BASE_ID="appCyGCMhGEMMt2Pq"
#   $env:SITE_URL="https://extraordinary-gelato-08fef1.netlify.app"
#   $env:AIRTABLE_TABLE="products"   # optional (default products)
#   pwsh ./tools/sync-airtable.ps1

param(
  [string]$Pat = $env:AIRTABLE_PAT,
  [string]$BaseId = $env:AIRTABLE_BASE_ID,
  [string]$Table = $(if ($env:AIRTABLE_TABLE) { $env:AIRTABLE_TABLE } else { 'products' }),
  [string]$SiteUrl = $env:SITE_URL
)

$ErrorActionPreference = 'Stop'
if (-not $Pat -or -not $BaseId -or -not $SiteUrl) {
  Write-Error "Missing env vars. Required: AIRTABLE_PAT, AIRTABLE_BASE_ID, SITE_URL"
}

function Slug([string]$s) { return ($s.ToLower() -replace '[^a-z0-9]+','') }
function TitleClean([string]$s) { return ($s -replace '[_-]+',' ' -replace '\s+\d+x\d+"?','').Trim() }
function Encode([string]$s) { return ($s -replace ' ','%20') }
function PrevUrl([string]$dir,[string]$base){
  $c=@("$dir/$base.jpg","$dir/$base.png","$dir/${base}1.jpg","$dir/${base}1.png","$dir/${base}2.jpg","$dir/${base}2.png")
  foreach($p in $c){ if(Test-Path $p){ return "$SiteUrl/$(Encode $p)" } }
  return $null
}

# Build map of local images
$imgFiles = Get-ChildItem -File ./images -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' }
if (-not $imgFiles) { Write-Output "No images found in ./images"; exit 0 }

$imgMap = @{}
foreach($f in $imgFiles){ $base=[IO.Path]::GetFileNameWithoutExtension($f.Name); $imgMap[(Slug $base)] = "$SiteUrl/images/$(Encode $f.Name)" }

# Fetch existing Airtable rows (Title primary field)
$records=@(); $offset=$null
do {
  $url = "https://api.airtable.com/v0/$BaseId/$Table?pageSize=100" + ($(if($offset){"&offset=$offset"} else {''}))
  $resp = Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $Pat" }
  $records += $resp.records
  $offset = $resp.offset
} while ($offset)

$existingBySlug = @{}
foreach($r in $records){ $t = $r.fields.title; if(-not $t){ $t = $r.fields.Title }; if($t){ $existingBySlug[(Slug $t)] = $r.id } }

$creates = @(); $updates = @();

foreach($kv in $imgMap.GetEnumerator()){
  $slug = $kv.Key; $mainUrl = $kv.Value
  $title = TitleClean $slug
  # Default descriptions; you can customize
  $desc = 'Fine art photograph by Ryan Osmun.'
  $short = 'Premium print'

  $acPrev = PrevUrl 'acrylic_previews' $slug
  $mePrev = PrevUrl 'metal_previews' $slug
  $caPrev = PrevUrl 'canvas_previews' $slug

  $fields = [ordered]@{
    title         = $title
    Description   = $desc
    ShortDescription = $short
    InStock       = $true
    Stock         = 1
    Artist        = 'Ryan Osmun'
    MainImage     = @(@{ url = $mainUrl })
    Acrylic20x40  = 180; Acrylic24x36=130; Acrylic20x30=100; Acrylic16x24=60
    Metal20x40    = 220; Metal24x36=150; Metal20x30=120; Metal16x24=70
    Canvas20x40   = 180; Canvas24x36=130; Canvas20x30=100; Canvas16x24=60
  }
  if($acPrev){ $fields.AcrylicPreview = @(@{ url = $acPrev }) }
  if($mePrev){ $fields.MetalPreview   = @(@{ url = $mePrev }) }
  if($caPrev){ $fields.CanvasPreview  = @(@{ url = $caPrev }) }

  if($existingBySlug.ContainsKey($slug)){
    $updates += @{ id = $existingBySlug[$slug]; fields = $fields }
  } else {
    $creates += @{ fields = $fields }
  }
}

function Patch-Batches([object[]]$rows){
  if(-not $rows -or $rows.Count -eq 0){ return }
  for($i=0;$i -lt $rows.Count;$i+=10){
    $batch = $rows[$i..([Math]::Min($i+9,$rows.Count-1))]
    $body = @{ records = $batch } | ConvertTo-Json -Depth 12
    Invoke-RestMethod -Method Patch -Uri "https://api.airtable.com/v0/$BaseId/$Table" -Headers @{ Authorization = "Bearer $Pat"; 'Content-Type'='application/json' } -Body $body | Out-Null
  }
}

function Post-Batches([object[]]$rows){
  if(-not $rows -or $rows.Count -eq 0){ return }
  for($i=0;$i -lt $rows.Count;$i+=10){
    $batch = $rows[$i..([Math]::Min($i+9,$rows.Count-1))]
    $body = @{ records = $batch } | ConvertTo-Json -Depth 12
    Invoke-RestMethod -Method Post -Uri "https://api.airtable.com/v0/$BaseId/$Table" -Headers @{ Authorization = "Bearer $Pat"; 'Content-Type'='application/json' } -Body $body | Out-Null
  }
}

Post-Batches $creates
Patch-Batches $updates

Write-Output ("Created: " + ($creates.Count) + ", Updated: " + ($updates.Count))

