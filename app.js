const estados = [
  "Recepción",
  "Diagnóstico",
  "Presupuesto",
  "Reparación",
  "Pintura",
  "Entrega",
  "Cerrado"
]
const storageKey = "bodyshoop.orders"
function uuid() {
  if (self.crypto && self.crypto.randomUUID) return self.crypto.randomUUID()
  const bytes = self.crypto && self.crypto.getRandomValues ? self.crypto.getRandomValues(new Uint8Array(16)) : null
  const toHex = n => n.toString(16).padStart(2, "0")
  if (bytes) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, toHex).join("")
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  }
  const r = Math.random().toString(16).slice(2)
  const t = Date.now().toString(16)
  return `${t.slice(0,8)}-${r.slice(0,4)}-${r.slice(4,8)}-${r.slice(8,12)}-${t.slice(8)}${r.slice(12,20)}`
}
const db = {
  load() {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    try { return JSON.parse(raw) } catch { return [] }
  },
  save(items) {
    localStorage.setItem(storageKey, JSON.stringify(items))
  },
  seedIfEmpty() {
    const items = this.load()
    if (items.length) return items
    const today = new Date().toISOString().slice(0, 10)
    const sample = [
      { id: uuid(), cliente: "Juan Pérez", vehiculo: "Toyota Corolla", trabajo: "Cambio de puerta", estado: "Recepción", responsable: "Ana", fechaIngreso: today, fechaEntregaEstimada: today, notas: "" },
      { id: uuid(), cliente: "María López", vehiculo: "Honda Civic", trabajo: "Repintado capó", estado: "Diagnóstico", responsable: "Luis", fechaIngreso: today, fechaEntregaEstimada: today, notas: "" },
      { id: uuid(), cliente: "Carlos Ruiz", vehiculo: "Ford Focus", trabajo: "Reparación de golpe", estado: "Reparación", responsable: "Eva", fechaIngreso: today, fechaEntregaEstimada: today, notas: "" }
    ]
    this.save(sample)
    return sample
  },
  all() { return this.load() }
}
const state = {
  items: [],
  filtro: ""
}
const themeKey = "bodyshoop.theme"
function init() {
  state.items = db.seedIfEmpty()
  initTheme()
  mountTabs()
  mountForm()
  mountSearch()
  renderLista()
  renderTablero()
  renderEstadisticas()
}
function initTheme() {
  const current = localStorage.getItem(themeKey) || "light"
  document.documentElement.setAttribute("data-theme", current)
  const btn = document.getElementById("btnTheme")
  if (btn) btn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem(themeKey, next)
  })
}
function mountTabs() {
  const tabs = document.querySelectorAll(".tab")
  tabs.forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)))
}
function switchTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"))
  document.querySelector(`.tab[data-tab="${id}"]`).classList.add("active")
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"))
  if (id === "lista") document.getElementById("vista-lista").classList.remove("hidden")
  if (id === "tablero") document.getElementById("vista-tablero").classList.remove("hidden")
  if (id === "estadisticas") document.getElementById("vista-estadisticas").classList.remove("hidden")
}
function mountForm() {
  const sel = document.querySelector("select[name='estado']")
  estados.forEach(e => {
    const o = document.createElement("option")
    o.value = e
    o.textContent = e
    sel.appendChild(o)
  })
  const btnNueva = document.getElementById("btnNuevaOrden")
  const modal = document.getElementById("modalOrden")
  const form = document.getElementById("formOrden")
  btnNueva.addEventListener("click", () => openForm())
  form.addEventListener("submit", e => {
    e.preventDefault()
    const data = getFormData(form)
    const editing = !!form.elements.id.value
    if (!editing) createOrden({ ...data, id: uuid() })
    else updateOrden(data)
    modal.close()
    form.reset()
    renderAll()
  })
}
function openForm(item) {
  const modal = document.getElementById("modalOrden")
  const form = document.getElementById("formOrden")
  form.reset()
  if (item) fillForm(form, item)
  modal.showModal()
}
function fillForm(form, item) {
  form.elements.id.value = item.id
  form.elements.cliente.value = item.cliente || ""
  form.elements.vehiculo.value = item.vehiculo || ""
  form.elements.trabajo.value = item.trabajo || ""
  form.elements.estado.value = item.estado || estados[0]
  form.elements.responsable.value = item.responsable || ""
  form.elements.fechaIngreso.value = item.fechaIngreso || ""
  form.elements.fechaEntregaEstimada.value = item.fechaEntregaEstimada || ""
  form.elements.notas.value = item.notas || ""
}
function getFormData(form) {
  const fd = new FormData(form)
  const obj = Object.fromEntries(fd.entries())
  return {
    id: obj.id || "",
    cliente: obj.cliente,
    vehiculo: obj.vehiculo,
    trabajo: obj.trabajo,
    estado: obj.estado,
    responsable: obj.responsable,
    fechaIngreso: obj.fechaIngreso,
    fechaEntregaEstimada: obj.fechaEntregaEstimada,
    notas: obj.notas
  }
}
function createOrden(data) {
  state.items = [data, ...state.items]
  db.save(state.items)
}
function updateOrden(data) {
  state.items = state.items.map(i => i.id === data.id ? data : i)
  db.save(state.items)
}
function deleteOrden(id) {
  state.items = state.items.filter(i => i.id !== id)
  db.save(state.items)
}
function changeEstado(id, nuevo) {
  state.items = state.items.map(i => i.id === id ? { ...i, estado: nuevo } : i)
  db.save(state.items)
}
function mountSearch() {
  const input = document.getElementById("busqueda")
  input.addEventListener("input", () => {
    state.filtro = input.value.toLowerCase()
    renderLista()
    renderTablero()
    renderEstadisticas()
  })
}
function renderLista() {
  const tbody = document.getElementById("tbodyLista")
  tbody.innerHTML = ""
  filtered().forEach(i => {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${i.id.slice(0, 8)}</td>
      <td>${i.cliente}</td>
      <td>${i.vehiculo}</td>
      <td>${i.trabajo}</td>
      <td><span class="badge ${badgeClass(i.estado)}">${i.estado}</span></td>
      <td>${i.responsable || ""}</td>
      <td>${i.fechaIngreso || ""}</td>
      <td>${i.fechaEntregaEstimada || ""}</td>
      <td>
        <button data-id="${i.id}" class="btn btn-edit small">Editar</button>
        <button data-id="${i.id}" class="btn btn-borrar small danger">Borrar</button>
      </td>
    `
    tbody.appendChild(tr)
  })
  tbody.querySelectorAll(".btn-edit").forEach(b => b.addEventListener("click", () => {
    const id = b.getAttribute("data-id")
    const item = state.items.find(x => x.id === id)
    openForm(item)
  }))
  tbody.querySelectorAll(".btn-borrar").forEach(b => b.addEventListener("click", () => {
    const id = b.getAttribute("data-id")
    deleteOrden(id)
    renderAll()
  }))
}
function renderTablero() {
  const wrap = document.getElementById("kanban")
  wrap.innerHTML = ""
  estados.forEach(e => {
    const col = document.createElement("div")
    col.className = "col"
    const h = document.createElement("header")
    h.textContent = e
    const cards = document.createElement("div")
    cards.className = "cards"
    filtered().filter(i => i.estado === e).forEach(i => {
      const card = document.createElement("div")
      card.className = "card"
      const left = document.createElement("div")
      left.innerHTML = `<div class="card-title">${i.trabajo}</div><small>${i.cliente} • ${i.vehiculo}</small>`
      const right = document.createElement("div")
      const sel = document.createElement("select")
      estados.forEach(s => {
        const o = document.createElement("option")
        o.value = s
        o.textContent = s
        if (s === i.estado) o.selected = true
        sel.appendChild(o)
      })
      sel.addEventListener("change", () => {
        changeEstado(i.id, sel.value)
        renderTablero()
        renderLista()
        renderEstadisticas()
      })
      right.appendChild(sel)
      card.appendChild(left)
      const badge = document.createElement("span")
      badge.className = `badge ${badgeClass(i.estado)}`
      badge.textContent = i.estado
      left.appendChild(badge)
      card.appendChild(right)
      cards.appendChild(card)
    })
    col.appendChild(h)
    col.appendChild(cards)
    wrap.appendChild(col)
  })
}
function badgeClass(estado) {
  const map = {
    "Recepción": "badge-recepcion",
    "Diagnóstico": "badge-diagnostico",
    "Presupuesto": "badge-presupuesto",
    "Reparación": "badge-reparacion",
    "Pintura": "badge-pintura",
    "Entrega": "badge-entrega",
    "Cerrado": "badge-cerrado"
  }
  return map[estado] || ""
}
function renderEstadisticas() {
  const wrap = document.getElementById("estadisticas")
  const items = filtered()
  const porEstado = estados.map(e => ({ estado: e, cantidad: items.filter(i => i.estado === e).length }))
  const hoy = new Date().toISOString().slice(0, 10)
  const enProceso = items.filter(i => i.estado !== "Cerrado").length
  const cerradasHoy = items.filter(i => i.estado === "Cerrado" && i.fechaEntregaEstimada === hoy).length
  wrap.innerHTML = ""
  const blocks = [
    { titulo: "Órdenes en proceso", valor: enProceso },
    { titulo: "Órdenes cerradas hoy", valor: cerradasHoy },
    { titulo: "Total", valor: items.length }
  ]
  const top = document.createElement("div")
  top.className = "stats"
  blocks.forEach(b => {
    const s = document.createElement("div")
    s.className = "stat"
    s.innerHTML = `<h3>${b.titulo}</h3><div style="font-size:28px;font-weight:700;">${b.valor}</div>`
    top.appendChild(s)
  })
  const grid = document.createElement("div")
  grid.className = "stats"
  porEstado.forEach(x => {
    const s = document.createElement("div")
    s.className = "stat"
    s.innerHTML = `<h3>${x.estado}</h3><div style="font-size:24px;font-weight:700;">${x.cantidad}</div>`
    grid.appendChild(s)
  })
  wrap.appendChild(top)
  wrap.appendChild(grid)
}
function filtered() {
  if (!state.filtro) return state.items
  const f = state.filtro
  return state.items.filter(i =>
    (i.id || "").toLowerCase().includes(f) ||
    (i.cliente || "").toLowerCase().includes(f) ||
    (i.vehiculo || "").toLowerCase().includes(f) ||
    (i.trabajo || "").toLowerCase().includes(f) ||
    (i.responsable || "").toLowerCase().includes(f)
  )
}
function renderAll() {
  renderLista()
  renderTablero()
  renderEstadisticas()
}
document.addEventListener("DOMContentLoaded", init)
