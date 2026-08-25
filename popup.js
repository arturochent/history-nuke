const searchInput = document.getElementById('searchTerm');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const selectAllCheckbox = document.getElementById('selectAll');
const deleteBtn = document.getElementById('deleteBtn');
const statusDiv = document.getElementById('status');
const resultCountSpan = document.getElementById('resultCount');
const darkModeToggle = document.getElementById('darkModeToggle');

let currentResults = [];

function applyDarkMode(isDark) {
  document.body.classList.toggle('dark', isDark);
  darkModeToggle.checked = isDark;
}

chrome.storage.local.get(['darkMode'], (data) => {
  applyDarkMode(!!data.darkMode);
});

darkModeToggle.addEventListener('change', () => {
  const isDark = darkModeToggle.checked;
  applyDarkMode(isDark);
  chrome.storage.local.set({ darkMode: isDark });
});

function formatDate(ts) {
  return new Date(ts).toLocaleString('es-PA');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function doSearch() {
  const text = searchInput.value.trim();
  const startTime = startDateInput.value
    ? new Date(startDateInput.value + 'T00:00:00').getTime()
    : 0;
  const endTime = endDateInput.value
    ? new Date(endDateInput.value + 'T23:59:59').getTime()
    : Date.now();

  statusDiv.textContent = 'Buscando...';
  selectAllCheckbox.checked = false;

  chrome.history.search(
    { text: text, startTime: startTime, endTime: endTime, maxResults: 5000 },
    (results) => {
      // Most-recent-first
      results.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
      currentResults = results;
      renderResults(results);
      statusDiv.textContent = '';
      resultCountSpan.textContent = `${results.length} resultado(s)`;
    }
  );
}

function renderResults(results) {
  resultsDiv.innerHTML = '';
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="empty">Sin resultados.</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  results.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input type="checkbox" class="itemCheckbox" data-idx="${idx}">
      <div class="info">
        <div class="title">${escapeHtml(item.title || item.url)}</div>
        <div class="url">${escapeHtml(item.url)}</div>
        <div class="meta">${formatDate(item.lastVisitTime)} · ${item.visitCount} visita(s)</div>
      </div>
    `;
    frag.appendChild(row);
  });
  resultsDiv.appendChild(frag);
}

selectAllCheckbox.addEventListener('change', () => {
  document.querySelectorAll('.itemCheckbox').forEach((cb) => {
    cb.checked = selectAllCheckbox.checked;
  });
});

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

deleteBtn.addEventListener('click', () => {
  const checked = Array.from(document.querySelectorAll('.itemCheckbox:checked'));
  if (checked.length === 0) {
    statusDiv.textContent = 'Selecciona al menos un resultado.';
    return;
  }
  if (!confirm(`¿Eliminar ${checked.length} entrada(s) del historial? Esta acción no se puede deshacer.`)) {
    return;
  }

  const urls = checked.map((cb) => currentResults[parseInt(cb.dataset.idx, 10)].url);
  deleteBtn.disabled = true;
  statusDiv.textContent = 'Eliminando...';

  let remaining = urls.length;
  urls.forEach((url) => {
    chrome.history.deleteUrl({ url }, () => {
      remaining -= 1;
      if (remaining === 0) {
        deleteBtn.disabled = false;
        statusDiv.textContent = `${urls.length} entrada(s) eliminada(s).`;
        doSearch();
      }
    });
  });
});

// Carga inicial: muestra historial reciente
doSearch();
