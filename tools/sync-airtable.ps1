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

# Resolve tableId and existing fields using Meta API (needs schema.bases:read)
function Resolve-TableMeta([string]$baseId,[string]$tableOrId){
  $meta = Invoke-RestMethod -Uri "https://api.airtable.com/v0/meta/bases/$baseId" -Headers @{ Authorization = "Bearer $Pat" }
  $tableModel = $null
  if($tableOrId -match '^tbl'){
    $tableModel = ($meta.tables | Where-Object { $_.id -eq $tableOrId })
  }
  if(-not $tableModel){
    $tableModel = ($meta.tables | Where-Object { $_.name -eq $tableOrId })
  }
  if(-not $tableModel){ throw "Table not found in base schema: $tableOrId" }
  $fieldNames = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach($f in $tableModel.fields){ [void]$fieldNames.Add($f.name) }
  return @{ id = $tableModel.id; fields = $fieldNames }
}

# Ensure a set of fields exist on the table (needs schema.bases:write)
function Ensure-Fields([string]$baseId,[string]$tableId,[object[]]$desired){
  # read existing again to be safe
  $meta = Invoke-RestMethod -Uri "https://api.airtable.com/v0/meta/bases/$baseId" -Headers @{ Authorization = "Bearer $Pat" }
  $tbl = ($meta.tables | Where-Object { $_.id -eq $tableId })
  if(-not $tbl){ throw "Table $tableId not found while ensuring fields." }
  $existing = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach($f in $tbl.fields){ [void]$existing.Add($f.name) }
  foreach($d in $desired){
    if(-not $existing.Contains($d.name)){
      $body = @{ name = $d.name; type = $d.type }
      if($d.options){ $body.options = $d.options }
      try {
        Invoke-RestMethod -Method Post -Uri "https://api.airtable.com/v0/meta/bases/$baseId/tables/$tableId/fields" -Headers @{ Authorization = "Bearer $Pat"; 'Content-Type'='application/json' } -Body ($body | ConvertTo-Json -Depth 10) | Out-Null
        [void]$existing.Add($d.name)
        Write-Output ("Created field: " + $d.name)
      } catch {
        Write-Warning ("Failed creating field '" + $d.name + "': " + $_.Exception.Message)
        if($_.ErrorDetails.Message){ Write-Warning $_.ErrorDetails.Message }
      }
    }
  }
}

function Slug([string]$s) { return ($s.ToLower() -replace '[^a-z0-9]+','') }
function TitleClean([string]$s) { return ($s -replace '[_-]+',' ' -replace '\s+\d+x\d+"?','').Trim() }
function Encode([string]$s) { return ($s -replace ' ','%20') }
function PrevUrl([string]$dir,[string]$base){
  $c=@("$dir/$base.jpg","$dir/$base.png","$dir/${base}1.jpg","$dir/${base}1.png","$dir/${base}2.jpg","$dir/${base}2.png")
  foreach($p in $c){ if(Test-Path $p){ return "$SiteUrl/$(Encode $p)" } }
  # Fallback: accept variations like base_acrylic1.jpg, base-metal-1.png, etc.
  $wild = Get-ChildItem -File $dir -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match ("^" + [regex]::Escape($base) + ".*\.(jpg|jpeg|png)$") } |
    Select-Object -First 1
  if($wild){ return "$SiteUrl/$(Encode (Join-Path $dir $wild.Name))" }
  return $null
}

# Build map of local images
$imgFiles = Get-ChildItem -File ./images -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' }
if (-not $imgFiles) { Write-Output "No images found in ./images"; exit 0 }

$imgMap = @{}
foreach($f in $imgFiles){ $base=[IO.Path]::GetFileNameWithoutExtension($f.Name); $imgMap[(Slug $base)] = "$SiteUrl/images/$(Encode $f.Name)" }

# Determine table id via meta API and ensure required fields exist
$resolved = $null
try { $resolved = Resolve-TableMeta -baseId $BaseId -tableOrId $Table } catch { Write-Warning $_; $resolved = $null }
if($resolved){
  $tableId = $resolved.id
  $desiredFields = @(
    @{ name='Description'; type='singleLineText' },
    @{ name='ShortDescription'; type='singleLineText' },
    @{ name='InStock'; type='checkbox'; options=@{ color='greenBright'; icon='check' } },
    @{ name='Stock'; type='number' },
    @{ name='Artist'; type='singleLineText' },
    @{ name='MainImage'; type='multipleAttachments' },
    @{ name='AcrylicPreview'; type='multipleAttachments' },
    @{ name='MetalPreview'; type='multipleAttachments' },
    @{ name='CanvasPreview'; type='multipleAttachments' },
    @{ name='Acrylic20x40'; type='number' }, @{ name='Acrylic24x36'; type='number' }, @{ name='Acrylic20x30'; type='number' }, @{ name='Acrylic16x24'; type='number' },
    @{ name='Metal20x40'; type='number' }, @{ name='Metal24x36'; type='number' }, @{ name='Metal20x30'; type='number' }, @{ name='Metal16x24'; type='number' },
    @{ name='Canvas20x40'; type='number' }, @{ name='Canvas24x36'; type='number' }, @{ name='Canvas20x30'; type='number' }, @{ name='Canvas16x24'; type='number' }
  )
  try { Ensure-Fields -baseId $BaseId -tableId $tableId -desired $desiredFields } catch { Write-Warning $_ }
}

# Fetch existing Airtable rows (Title primary field)
$records=@(); $offset=$null
do {
  $url = "https://api.airtable.com/v0/${BaseId}/${Table}?pageSize=100" + ($(if($offset){"&offset=$offset"} else {''}))
  Write-Output ("GET " + $url)
  $resp = Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $Pat" }
  $records += $resp.records
  $offset = $resp.offset
} while ($offset)

$existingBySlug = @{}
foreach($r in $records){ $t = $r.fields.title; if(-not $t){ $t = $r.fields.Title }; if($t){ $existingBySlug[(Slug $t)] = $r.id } }

# Determine allowed field names from existing records to avoid UNKNOWN_FIELD_NAME
$allowedFieldNames = New-Object 'System.Collections.Generic.HashSet[string]'
foreach($r in $records){
  if($r.fields){ foreach($p in $r.fields.PSObject.Properties){ [void]$allowedFieldNames.Add($p.Name) } }
}
# Ensure primary field candidates are present
[void]$allowedFieldNames.Add('Title')
[void]$allowedFieldNames.Add('title')
# Add safe known fields even if not present in the first page (no schema scope)
$alwaysAllow = @(
  'MainImage','AcrylicPreview','MetalPreview','CanvasPreview'
)
foreach($n in $alwaysAllow){ [void]$allowedFieldNames.Add($n) }

function Filter-AllowedFields([hashtable]$inputFields, $allowed){
  $out = [ordered]@{}
  foreach($k in $inputFields.Keys){ if($allowed.Contains($k)){ $out[$k] = $inputFields[$k] } }
  return $out
}

$creates = @(); $updates = @();

foreach($kv in $imgMap.GetEnumerator()){
  $slug = $kv.Key; $mainUrl = $kv.Value
  $title = TitleClean $slug
  # Default descriptions; you can customize
  $desc = 'Fine art photograph by Ryan Osmun.'
  $short = 'Premium print'

  $acPrev = PrevUrl 'acrylic_previews' $slug
  # Temporarily disable metal/canvas preview updates to avoid unknown-field errors
  $mePrev = $null
  $caPrev = $null

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

  $safeFields = Filter-AllowedFields $fields $allowedFieldNames
  if($existingBySlug.ContainsKey($slug)){
    $updates += @{ id = $existingBySlug[$slug]; fields = $safeFields }
  } else {
    # If no records existed to infer field names and we only have Title/title, still attempt create minimally
    if($safeFields.Count -eq 0){
      if($allowedFieldNames.Contains('Title')){ $safeFields = [ordered]@{ Title = $title } }
      elseif($allowedFieldNames.Contains('title')){ $safeFields = [ordered]@{ title = $title } }
      else { $safeFields = [ordered]@{ Title = $title } }
    }
    $creates += @{ fields = $safeFields }
  }
}

function Patch-Batches([object[]]$rows){
  if(-not $rows -or $rows.Count -eq 0){ return }
  for($i=0;$i -lt $rows.Count;$i+=10){
    $batch = $rows[$i..([Math]::Min($i+9,$rows.Count-1))]
    $body = @{ records = $batch } | ConvertTo-Json -Depth 12
    Invoke-RestMethod -Method Patch -Uri "https://api.airtable.com/v0/${BaseId}/${Table}" -Headers @{ Authorization = "Bearer $Pat"; 'Content-Type'='application/json' } -Body $body | Out-Null
  }
}

function Post-Batches([object[]]$rows){
  if(-not $rows -or $rows.Count -eq 0){ return }
  for($i=0;$i -lt $rows.Count;$i+=10){
    $batch = $rows[$i..([Math]::Min($i+9,$rows.Count-1))]
    $body = @{ records = $batch } | ConvertTo-Json -Depth 12
    Invoke-RestMethod -Method Post -Uri "https://api.airtable.com/v0/${BaseId}/${Table}" -Headers @{ Authorization = "Bearer $Pat"; 'Content-Type'='application/json' } -Body $body | Out-Null
  }
}

Post-Batches $creates
Patch-Batches $updates

Write-Output ("Created: " + ($creates.Count) + ", Updated: " + ($updates.Count))

