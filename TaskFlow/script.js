// TaskFlow Pro - script.js
// Arquitectura: funciones modulares en ES6 (arrow functions) para claridad y testabilidad.
// Seguridad: NO se usa innerHTML para renderizar contenido de usuario.

const STORAGE_KEY = 'taskflow_pro_tasks_v1';
const REMOVED_KEY = 'taskflow_pro_removed_v1';
const EMOJI_LIST = ['✅', '📝', '🎯', '🚀', '💡', '📚', '🛠️', '🎨', '🏆', '💼', '⚡', '🔥', '🌟', '💎', '📊', '✨', '🎭', '🎪', '🎬', '🎸', '🎮', '🏃', '🎓', '📱', '💻', '🔔', '📅', '⏰'];

// Estado de la app
let tasks = [];
let removedTasks = []; // tareas eliminadas recientemente (completadas)
let filters = { search: '', priority: 'all', status: 'all' };

// Utilidades
const q = (sel) => document.querySelector(sel);
const qs = (sel) => Array.from(document.querySelectorAll(sel));
const removeChildren = (el) => { while (el && el.firstChild) el.removeChild(el.firstChild); };

// Sanitiza texto usando RegEx para eliminar caracteres sospechosos.
const sanitizeText = (str = '') => {
  const trimmed = String(str).trim().slice(0, 1000);
  // Permitir letras, dígitos, espacios y puntuación básica
    return trimmed.replace(/[^\p{L}\p{N}\s\.,;:!\?"'()\-_/&%@ÄÖÜäöüñÑáéíóúÁÉÍÓÚ\[\]]/gu, '');
};

// Fecha válida (no anterior a hoy)
const isValidDueDate = (dateStr) => {
  if (!dateStr) return true;
  const input = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0); input.setHours(0,0,0,0);
  return input >= today;
};

// Persistencia
const saveToLocalStorage = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
const loadFromLocalStorage = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch(e){console.error(e); return []; } };
const saveRemovedToLocalStorage = () => localStorage.setItem(REMOVED_KEY, JSON.stringify(removedTasks));
const loadRemovedFromLocalStorage = () => { try { const raw = localStorage.getItem(REMOVED_KEY); return raw ? JSON.parse(raw) : []; } catch(e){console.error(e); return []; } };

// ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

// Construye el elemento de tarea (sin innerHTML)
let editingId = null;
const selectedSet = new Set();
const newTaskIds = new Set();
const archivingIds = new Set();
const deletingIds = new Set();
const restoringIds = new Set();
const editingAnimIds = new Set(); // para animación de edición

const createTaskElement = (task, mode = 'list') => {
  const li = document.createElement('li');
  li.className = `task-item prior-${task.priority}`;
  li.dataset.id = task.id;

  // Selección (checkbox) - aparece en todas las vistas según el requerimiento
  const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'task-select'; chk.checked = selectedSet.has(task.id);
  chk.addEventListener('change', (e) => { toggleSelection(task.id, e.target.checked); });
  li.appendChild(chk);

  // Badge (izquierda)
  const badgeWrap = document.createElement('div'); badgeWrap.className = 'task-badge';
  const pri = document.createElement('div'); pri.className = 'priority';
  pri.setAttribute('aria-hidden','true');
  pri.textContent = task.priority === 'Alta' ? 'A' : task.priority === 'Media' ? 'M' : 'B';
  const cat = document.createElement('div'); cat.className = 'category';
  cat.appendChild(createCategoryIcon(task.category));
  badgeWrap.appendChild(pri); badgeWrap.appendChild(cat);

  // Contenido principal
  const main = document.createElement('div'); main.className = 'task-main';
  const title = document.createElement('div'); title.className = 'task-title'; title.textContent = task.title;
  const meta = document.createElement('div'); meta.className = 'task-meta';
  const parts = [task.category]; if (task.dueDate) parts.push(`Vence: ${task.dueDate}`); parts.push(task.priority);
  meta.textContent = parts.join(' • ');
  if (task.description) { const desc = document.createElement('div'); desc.className = 'task-desc task-meta'; desc.textContent = task.description; main.appendChild(desc); }
  main.appendChild(title); main.appendChild(meta);

  // Acciones
  const actions = document.createElement('div'); actions.className = 'task-actions';

  if (mode === 'list' || mode === 'dashboard') {
    const editBtn = document.createElement('button'); editBtn.className = 'btn'; editBtn.textContent = 'Editar'; editBtn.addEventListener('click', () => editTask(task.id));
    const toggleBtn = document.createElement('button'); toggleBtn.className = 'btn'; toggleBtn.textContent = task.completed ? 'Marcar Pendiente' : 'Marcar Completada'; toggleBtn.addEventListener('click', () => toggleTaskStatus(task.id));
    const archiveBtn = document.createElement('button'); archiveBtn.className = 'btn'; archiveBtn.textContent = task.archived ? 'Desarchivar' : 'Archivar'; archiveBtn.addEventListener('click', () => toggleArchive(task.id));
    const delBtn = document.createElement('button'); delBtn.className = 'btn danger'; delBtn.textContent = 'Eliminar'; delBtn.addEventListener('click', () => deleteTask(task.id));
    actions.appendChild(editBtn); actions.appendChild(toggleBtn); actions.appendChild(archiveBtn); actions.appendChild(delBtn);
  } else if (mode === 'archived' || mode === 'removed') {
    // En historial: Rehacer (restaurar) y Eliminar definitivamente — con animaciones
    const restoreBtn = document.createElement('button'); restoreBtn.className = 'btn'; restoreBtn.textContent = 'Rehacer';
    restoreBtn.addEventListener('click', () => { restoreEntity(task.id, mode); });

    const permDel = document.createElement('button'); permDel.className = 'btn danger'; permDel.textContent = 'Eliminar Definitivo';
    permDel.addEventListener('click', () => { permDelete(task.id, mode); });

    actions.appendChild(restoreBtn); actions.appendChild(permDel);
  }

  if (task.completed) { title.style.textDecoration = 'line-through'; title.style.opacity = '0.85'; }

  // Orden: badge | main | actions
  li.appendChild(badgeWrap); li.appendChild(main); li.appendChild(actions);
  // Animaciones: pop-in para tareas recién creadas (in-memory set)
  if (newTaskIds.has(task.id)) {
    li.classList.add('new-task');
    // limpiar el flag in-memory después de reproducir la animación
    setTimeout(() => { newTaskIds.delete(task.id); li.classList.remove('new-task'); }, 700);
  }
  // Animación de edición: fade-pulse suave
  if (editingAnimIds.has(task.id)) {
    li.classList.add('anim-edit');
    setTimeout(() => { editingAnimIds.delete(task.id); li.classList.remove('anim-edit'); }, 600);
  }
  return li; 
};

// Crea iconos SVG para categorías (Trabajo, Estudio, Personal)
const createCategoryIcon = (category) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  if (category === 'Trabajo') {
    // Portafolio/Maletín
    path.setAttribute('d', 'M16 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H8V4h8v10z');
  } else if (category === 'Estudio') {
    // Libro/Educación
    path.setAttribute('d', 'M4.5 6.5c0-1 .5-3 3.5-3s3.5 2 3.5 3M4.5 6.5v8c0 1 .5 1.5 3.5 1.5s3.5-.5 3.5-1.5v-8M4 18h8c1 0 1.5.5 1.5 1.5S13 21 12 21H4c-1 0-1.5-.5-1.5-1.5S3 18 4 18');
  } else {
    // Persona/Usuario
    path.setAttribute('d', 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z');
  }
  svg.appendChild(path);
  return svg;
};

// Actualiza la vista previa en el modal
const updatePreviewBadge = () => {
  const wrap = q('#previewBadge'); if(!wrap) return; removeChildren(wrap);
  const priority = q('#taskPriority') ? q('#taskPriority').value : 'Media';
  const category = q('#taskCategory') ? q('#taskCategory').value : 'Personal';
  const pri = document.createElement('div'); pri.className = 'priority'; pri.textContent = priority === 'Alta' ? 'A' : priority === 'Media' ? 'M' : 'B';
  const cat = document.createElement('div'); cat.className = 'category';
  cat.appendChild(createCategoryIcon(category));
  wrap.appendChild(pri); wrap.appendChild(cat);
};

// Render principal
const applyFilters = () => {
  const s = filters.search.toLowerCase();
  return tasks.filter(t => {
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (filters.status === 'pending' && t.completed) return false;
    if (filters.status === 'completed' && !t.completed) return false;
    if (s) { const hay = [t.title, t.description, t.category].join(' ').toLowerCase(); return hay.includes(s); }
    return true;
  });
};

const renderTasks = () => {
  const listEl = q('#taskList'); const archivedEl = q('#archivedList'); const removedEl = q('#removedList'); const recentEl = q('#recentList');
  removeChildren(listEl); removeChildren(archivedEl); removeChildren(removedEl); removeChildren(recentEl);

  const visible = applyFilters();
  visible.forEach(task => {
    const el = createTaskElement(task, 'list');
    if (task.archived) archivedEl.appendChild(createTaskElement(task, 'archived')); else listEl.appendChild(el);
  });

  // Recently removed (most recent first) - use mode 'removed'
  removedTasks.slice().reverse().forEach(t => removedEl.appendChild(createTaskElement(t, 'removed')));

  // recent list (last 5 not archived) - usar createTaskElement para consistencia
  tasks.filter(t => !t.archived).slice(-5).reverse().forEach(t => {
    const el = createTaskElement(t, 'dashboard');
    recentEl.appendChild(el);
  });

  updateDashboardCounters();
  updateBulkUI();
};

// Counters
const updateDashboardCounters = () => {
  const total = tasks.length; const completed = tasks.filter(t => t.completed && !t.archived).length;
  const pending = tasks.filter(t => !t.completed && !t.archived).length; const high = tasks.reduce((a,t)=>a+(t.priority==='Alta'&&!t.archived?1:0),0);
  q('#counterTotal').textContent = total; q('#counterCompleted').textContent = completed; q('#counterPending').textContent = pending; q('#counterHigh').textContent = high;
};

// Mutaciones
const addTask = (raw) => { const task = { id: generateId(), title: sanitizeText(raw.title), description: sanitizeText(raw.description), priority: raw.priority, category: raw.category, emoji: raw.emoji||'✅', dueDate: raw.dueDate||'', completed:false, archived:false, createdAt:new Date().toISOString() }; newTaskIds.add(task.id); tasks.push(task); saveToLocalStorage(); renderTasks(); }; 
const toggleTaskStatus = (id) => { tasks = tasks.map(t => t.id===id?{...t,completed:!t.completed}:t); saveToLocalStorage(); renderTasks(); };
const toggleArchive = (id) => {
  const selector = `[data-id="${id}"]`;
  animateAndPerform(selector, 'anim-archive', () => {
    tasks = tasks.map(t => t.id===id?{...t,archived:!t.archived}:t);
    saveToLocalStorage(); renderTasks();
  });
};

// Cuando se elimina: envía a papelera (removedTasks) para mostrar en Historial con opción de Rehacer
const deleteTask = (id) => {
  const found = tasks.find(t=>t.id===id); if(!found) return;
  const selector = `[data-id="${id}"]`;
  const perform = () => {
    removedTasks.push({...found, removedAt:new Date().toISOString()}); 
    saveRemovedToLocalStorage();
    tasks = tasks.filter(t=>t.id!==id); 
    saveToLocalStorage();
    selectedSet.delete(id);
    renderTasks();
  };
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add('anim-delete');
    setTimeout(perform, 360);
  } else {
    perform();
  }
};

// funciones de animación y restauración
const animateAndPerform = (selector, cls, fn) => {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add(cls);
    setTimeout(fn, 360);
  } else {
    fn();
  }
};

const restoreEntity = (id, mode) => {
  if (mode === 'archived') {
    animateAndPerform(`[data-id="${id}"]`, 'anim-restore', () => {
      tasks = tasks.map(t => t.id === id ? {...t, archived: false} : t);
      saveToLocalStorage(); renderTasks();
    });
  } else {
    // removed -> restore to tasks
    animateAndPerform(`#removedList li[data-id="${id}"]`, 'anim-restore', () => {
      const item = removedTasks.find(r => r.id === id);
      if (!item) return;
      removedTasks = removedTasks.filter(r => r.id !== id);
      const restored = {...item}; delete restored.removedAt; tasks.push(restored);
      saveRemovedToLocalStorage(); saveToLocalStorage(); renderTasks();
    });
  }
};

const permDelete = (id, mode) => {
  if (mode === 'archived') {
    animateAndPerform(`[data-id="${id}"]`, 'anim-delete', () => { tasks = tasks.filter(t => t.id !== id); saveToLocalStorage(); renderTasks(); });
  } else {
    animateAndPerform(`#removedList li[data-id="${id}"]`, 'anim-delete', () => { removedTasks = removedTasks.filter(r => r.id !== id); saveRemovedToLocalStorage(); renderTasks(); });
  }
};

const bulkClearArchived = () => { if(!confirm('¿Eliminar permanentemente todas las tareas archivadas?')) return; tasks = tasks.filter(t=>!t.archived); saveToLocalStorage(); renderTasks(); };
const clearRemoved = () => { if(!confirm('¿Eliminar permanentemente el registro de eliminadas recientemente?')) return; removedTasks=[]; saveRemovedToLocalStorage(); renderTasks(); };

// Vaciar tareas completadas (enviar a papelera)
const clearCompleted = () => { 
  const completed = tasks.filter(t=>t.completed && !t.archived);
  if(completed.length === 0) return alert('No hay tareas completadas para vaciar.');
  if(!confirm(`¿Enviar ${completed.length} tarea(s) completada(s) a papelera?`)) return;
  completed.forEach(t => { removedTasks.push({...t, removedAt:new Date().toISOString()}); });
  tasks = tasks.filter(t=>!t.completed || t.archived);
  saveToLocalStorage(); saveRemovedToLocalStorage(); renderTasks();
};

// Form handling
const handleFormSubmit = (ev) => {
  ev.preventDefault();
  const title = q('#taskTitle').value; const description = q('#taskDesc').value; const priority = q('#taskPriority').value; const category = q('#taskCategory').value; const dueDate = q('#taskDue').value;
  const cleanTitle = sanitizeText(title); if(cleanTitle.length<5) return alert('El título debe tener al menos 5 caracteres válidos.');
  if(!/^[-\w\s\.,;:!\?"'()&%@\xC0-\xFF]+$/u.test(cleanTitle)) return alert('El título contiene caracteres no permitidos.');
  if(!isValidDueDate(dueDate)) return alert('La fecha límite no puede ser anterior a hoy.');
  const emoji = q('#taskEmoji') ? q('#taskEmoji').value : '✅';
  if (editingId) {
    // editar tarea existente
    tasks = tasks.map(t => t.id === editingId ? {...t, title: sanitizeText(cleanTitle), description: sanitizeText(description), priority, category, emoji, dueDate } : t);
    editingAnimIds.add(editingId); // marcar para animación de edición
    saveToLocalStorage();
    renderTasks(); // IMPORTANTE: re-renderizar para mostrar cambios
    editingId = null;
  } else {
    addTask({title:cleanTitle,description,priority,category,emoji,dueDate});
  }
  closeModal(); ev.target.reset();
};

// UI
const switchPanel = (targetId) => { qs('.tab').forEach(b=>b.classList.toggle('active', b.dataset.target===targetId)); qs('.panel').forEach(p=>p.classList.toggle('hidden', p.id!==targetId)); };
const openModal = () => { q('#modal').classList.remove('hidden'); q('#taskTitle').focus(); };
const closeModal = () => { q('#modal').classList.add('hidden'); };

// Init
const initApp = () => {
  tasks = loadFromLocalStorage(); removedTasks = loadRemovedFromLocalStorage();
  qs('.tab').forEach(btn=>btn.addEventListener('click', ()=>switchPanel(btn.dataset.target)));
  q('#globalSearch').addEventListener('input', (e)=>{ filters.search = e.target.value; renderTasks(); });
  q('#filterPriority').addEventListener('change', (e)=>{ filters.priority = e.target.value; renderTasks(); });
  qs('.status-filter').forEach(b=>b.addEventListener('click', (ev)=>{ qs('.status-filter').forEach(x=>x.classList.remove('active')); ev.target.classList.add('active'); filters.status = ev.target.dataset.status; renderTasks(); }));
  q('#newTaskBtn').addEventListener('click', openModal); q('#closeModal').addEventListener('click', closeModal); q('#cancelBtn').addEventListener('click', closeModal); q('#taskForm').addEventListener('submit', handleFormSubmit);
  // Preview badge updates in modal
  const priorityEl = q('#taskPriority'); const categoryEl = q('#taskCategory');
  if(priorityEl) priorityEl.addEventListener('change', updatePreviewBadge);
  if(categoryEl) categoryEl.addEventListener('change', updatePreviewBadge);
  // also update when opening modal
  q('#newTaskBtn').addEventListener('click', () => setTimeout(updatePreviewBadge, 60));
  
  // Bulk action buttons (Task Panel)
  const bulkMarkComplete = q('#bulkMarkComplete'); const bulkSendTrash = q('#bulkSendTrash'); const bulkCancel = q('#bulkCancel');
  if (bulkMarkComplete) bulkMarkComplete.addEventListener('click', () => {
    Array.from(selectedSet).forEach(id => { tasks = tasks.map(t => t.id===id?{...t,completed:true}:t); }); saveToLocalStorage(); renderTasks();
  });
  if (bulkSendTrash) bulkSendTrash.addEventListener('click', () => { Array.from(selectedSet).forEach(id => deleteTask(id)); selectedSet.clear(); renderTasks(); });
  if (bulkCancel) bulkCancel.addEventListener('click', () => { selectedSet.clear(); updateBulkUI(); renderTasks(); });

  // Bulk action buttons (Dashboard)
  const bulkMarkCompleteDashboard = q('#bulkMarkCompleteDashboard'); const bulkSendTrashDashboard = q('#bulkSendTrashDashboard'); const bulkCancelDashboard = q('#bulkCancelDashboard');
  if (bulkMarkCompleteDashboard) bulkMarkCompleteDashboard.addEventListener('click', () => {
    Array.from(selectedSet).forEach(id => { tasks = tasks.map(t => t.id===id?{...t,completed:true}:t); }); saveToLocalStorage(); renderTasks();
  });
  if (bulkSendTrashDashboard) bulkSendTrashDashboard.addEventListener('click', () => { Array.from(selectedSet).forEach(id => deleteTask(id)); selectedSet.clear(); renderTasks(); });
  if (bulkCancelDashboard) bulkCancelDashboard.addEventListener('click', () => { selectedSet.clear(); updateBulkUI(); renderTasks(); });
  
  q('#bulkClear').addEventListener('click', bulkClearArchived); const clearRemovedBtn = q('#clearRemoved'); if(clearRemovedBtn) clearRemovedBtn.addEventListener('click', clearRemoved);
  const clearCompletedBtn = q('#clearCompletedBtn'); if(clearCompletedBtn) clearCompletedBtn.addEventListener('click', clearCompleted);
  renderTasks();
};

// Selección múltiple
const toggleSelection = (id, checked) => {
  if (checked) selectedSet.add(id); else selectedSet.delete(id);
  updateBulkUI();
};

const updateBulkUI = () => {
  // Actualiza AMBAS barras de acciones masivas (dashboard y tasks)
  const bar = q('#bulkActions'); if(bar) {
    const count = selectedSet.size;
    if (count > 0) { bar.classList.remove('hidden'); q('#selectedCount').textContent = `${count} seleccionada(s)`; } else { bar.classList.add('hidden'); }
  }
  const barDash = q('#bulkActionsDashboard'); if(barDash) {
    const count = selectedSet.size;
    if (count > 0) { barDash.classList.remove('hidden'); q('#selectedCountDashboard').textContent = `${count} seleccionada(s)`; } else { barDash.classList.add('hidden'); }
  }
  // also reflect checkbox state in DOM for consistency
  qs('.task-select').forEach(ch => ch.checked = selectedSet.has(ch.closest('li')?.dataset.id));
};

// Edit task
const editTask = (id) => {
  const t = tasks.find(x => x.id === id); if(!t) return;
  editingId = id;
  q('#taskTitle').value = t.title; q('#taskDesc').value = t.description; q('#taskPriority').value = t.priority; q('#taskCategory').value = t.category; q('#taskDue').value = t.dueDate || '';
  openModal(); updatePreviewBadge();
};

document.addEventListener('DOMContentLoaded', initApp);

/*
  Seguridad y notas para informe USO_IA.md:
  - No se usa innerHTML para inyectar contenido del usuario. Se usan createElement/textContent/appendChild.
  - sanitizeText + validaciones con RegEx reducen riesgo XSS.
  - Fecha límite validada contra hoy para evitar fechas pasadas.
  - Persistencia: localStorage para tareas y registro de eliminadas.
*/
