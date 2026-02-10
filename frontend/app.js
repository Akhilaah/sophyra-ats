const FORM_KEY = 'sophyra_generate_form'

function saveForm(){
  const form = document.getElementById('generate-form')
  if(!form) return
  const data = Object.fromEntries(new FormData(form).entries())
  sessionStorage.setItem(FORM_KEY, JSON.stringify(data))
}

function restoreForm(){
  const raw = sessionStorage.getItem(FORM_KEY)
  if(!raw) return
  const data = JSON.parse(raw)
  const form = document.getElementById('generate-form')
  if(!form) return
  for(const [k,v] of Object.entries(data)){
    if(form[k]) form[k].value = v
  }
}


const $ = sel => document.querySelector(sel)

function show(el){ el.hidden = false }
function hide(el){ el.hidden = true }

function setGenerating(isLoading){
  const genBtn = document.querySelector('#generate-form button[type="submit"]')
  if(genBtn) genBtn.disabled = isLoading
  const status = document.getElementById('generate-status')
  if(isLoading){ status.innerHTML = '<span class="spinner"></span> Generating...' }
  else { status.textContent = '' }
}

function setUploading(isLoading){
  const upBtn = document.querySelector('#upload-form button[type="submit"]')
  if(upBtn) upBtn.disabled = isLoading
  const status = document.getElementById('upload-status')
  if(isLoading){ status.innerHTML = '<span class="spinner"></span> Uploading...' }
  else { status.textContent = '' }
}

// Generate resume
$('#generate-form').addEventListener('submit', async (ev) =>{
  ev.preventDefault()
  const form = new FormData(ev.currentTarget)
  const payload = Object.fromEntries(form.entries())
  setGenerating(true)
  hide($('#generate-result'))

  try{
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if(!res.ok){
      const txt = await res.text()
      setGenerating(false)
      $('#generate-status').textContent = 'Error: ' + res.status
      console.error('generate error', txt)
      return
    }

    const data = await res.json()
    $('#gen-score').textContent = data.ats_score
    $('#gen-explanation').textContent = JSON.stringify(data.explanation, null, 2)
    const link = $('#download-link')
    if(data.resume_file){
      // backend returns a filename (path). Use /download?filename=...
      const url = '/download?filename=' + encodeURIComponent(data.resume_file)
      link.href = url
      try{
        const parts = data.resume_file.split('/')
        const basename = parts[parts.length-1]
        link.setAttribute('download', basename)
      }catch(e){ }
      link.removeAttribute('hidden')
    } else {
      link.setAttribute('hidden','')
    }

    // Render cleaned resume text into the preview area
    if(data.resume_text){
      renderResumeHTML(data.resume_text)
      // attempt to extract header info for name/contact
      const lines = data.resume_text.split('\n').map(l=>l.trim()).filter(Boolean)
      if(lines.length){
        // heuristics: first non-empty line often NAME or NAME: ...
        const first = lines[0]
        const name = first.replace(/^NAME:\s*/i, '')
        document.getElementById('res-name').textContent = name
      }
      // try to capture contact line(s)
      const contact = []
      for(let i=1;i<Math.min(5,lines.length);i++){
        const l = lines[i]
        if(/@|phone|\+|\d{7,}/i.test(l)) contact.push(l)
      }
      document.getElementById('res-contact').textContent = contact.join(' | ')
      show($('#generate-result'))
    }

    setGenerating(false)
  }catch(err){
    console.error(err)
    setGenerating(false)
    $('#generate-status').textContent = 'Request failed'
  }
})

// UI navigation between option, generate, and score screens
const optionScreen = document.getElementById('option-screen')
const generateScreen = document.getElementById('generate-screen')
const scoreScreen = document.getElementById('score-screen')
const backFromGenerate = document.getElementById('back-from-generate')
const backFromScore = document.getElementById('back-from-score')
const btnGenerate = document.getElementById('btn-generate')
const btnScore = document.getElementById('btn-score')

function showScreen(screen){
  // hide all
  if(optionScreen) optionScreen.hidden = true
  if(generateScreen) generateScreen.hidden = true
  if(scoreScreen) scoreScreen.hidden = true
  // show selected
  if(screen) screen.hidden = false
}

if(btnGenerate){
  btnGenerate.addEventListener('click', ()=>{ restoreForm() 
    showScreen(generateScreen)})
}
if(btnScore){
  btnScore.addEventListener('click', ()=> showScreen(scoreScreen))
}
if(backFromGenerate){ backFromGenerate.addEventListener('click', ()=>{ saveForm() 
    showScreen(optionScreen)}) }
if(backFromScore){ backFromScore.addEventListener('click', ()=> showScreen(optionScreen)) }

// Upload & Score
$('#upload-form').addEventListener('submit', async (ev) =>{
  ev.preventDefault()
  const formEl = ev.currentTarget
  const fd = new FormData()
  const file = $('#file-input').files[0]
  if(!file){ alert('Please select a file'); return }
  fd.append('file', file)
  const jd = formEl.querySelector('textarea[name="jd"]').value
  if(jd) fd.append('jd', jd)

  setUploading(true)
  hide($('#upload-result'))

  try{
  const res = await fetch('/ATS%20Score', { method: 'POST', body: fd })
    if(!res.ok){
      const txt = await res.text()
      setUploading(false)
      $('#upload-status').textContent = 'Error: ' + res.status
      console.error('upload error', txt)
      return
    }
    const data = await res.json()
    $('#up-filename').textContent = data.filename || ''
    $('#up-score').textContent = data.ats_score
    $('#up-explanation').textContent = JSON.stringify(data.explanation, null, 2)
  setUploading(false)
    show($('#upload-result'))
  }catch(err){
    console.error(err)
    setUploading(false)
    $('#upload-status').textContent = 'Request failed'
  }
})

// No special download handler — anchor href + download attribute used for direct GET downloads

// Drag & drop support for upload
const dropzone = document.getElementById('dropzone')
const fileInput = document.getElementById('file-input')
if(dropzone){
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); }
  ;['dragenter','dragover','dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, prevent))

  dropzone.addEventListener('dragover', () => { dropzone.style.borderColor = '#cfe3ff' })
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = '#e6eef9' })

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files
    if(files && files.length){
      // populate the file input using DataTransfer
      const dt = new DataTransfer()
      for(let i=0;i<files.length;i++) dt.items.add(files[i])
      fileInput.files = dt.files
      dropzone.textContent = files[0].name
    }
  })

  dropzone.addEventListener('click', () => fileInput.click())
}

// Render resume plain text into simple HTML structure
function renderResumeHTML(text){
  const body = document.getElementById('res-body')
  if(!body) return
  body.innerHTML = ''
  const lines = text.split('\n')
  let currentSection = null
  let ul = null
  for(let raw of lines){
    const line = raw.trim()
    if(!line) continue
    // headings (e.g., SUMMARY, SKILLS, PROJECTS, EDUCATION)
    const headMatch = line.match(/^(SUMMARY|SKILLS|PROJECTS|EDUCATION)\b[:\-]?/i)
    if(headMatch){
      currentSection = headMatch[1].toUpperCase()
      const h = document.createElement('h3')
      h.textContent = currentSection
      body.appendChild(h)
      ul = null
      continue
    }

    // skill lists: comma or hyphen-separated
    if(currentSection === 'SKILLS' && /,|\-|\//.test(line)){
      // split by comma or semicolon
      const items = line.split(/[;,|]/).map(s=>s.trim()).filter(Boolean)
      const skillsDiv = document.createElement('div')
      skillsDiv.className = 'skills'
      for(const s of items.slice(0,12)){
        const pill = document.createElement('span')
        pill.className = 'skill-pill'
        pill.textContent = s
        skillsDiv.appendChild(pill)
      }
      body.appendChild(skillsDiv)
      continue
    }

    // bullets
    if(/^[-•\*]\s+/.test(line)){
      if(!ul){ ul = document.createElement('ul'); body.appendChild(ul) }
      const li = document.createElement('li')
      li.textContent = line.replace(/^[-•\*]\s+/, '')
      ul.appendChild(li)
      continue
    }

    // project title lines (format: "Project — Short title")
    if(/^Project\s*\d?/i.test(line) || /^\w[\w\s]{0,40}—/.test(line)){
      const pTitle = document.createElement('div')
      pTitle.className = 'project-title'
      pTitle.textContent = line
      body.appendChild(pTitle)
      ul = null
      continue
    }

    // fallback: paragraph
    const p = document.createElement('p')
    p.textContent = line
    body.appendChild(p)
    ul = null
  }
}
