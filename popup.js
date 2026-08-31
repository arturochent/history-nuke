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
const donateBtn = document.getElementById('donateBtn');

const PAYPAL_URL = 'https://paypal.me/arturochent';

let currentResults = [];

function t(key, subs) {
  return chrome.i18n.getMessage(key, subs) || key;
}

// Localize all static text based on the browser's language (falls back to English)
document.querySelectorAll('[data-i18n]').forEach((el) => {
  el.textContent = t(el.dataset.i18n);
});
document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
  el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
});

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

donateBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: PAYPAL_URL });
});

function formatDate(ts) {
  return new Date(ts).toLocaleString();
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

  statusDiv.textContent = t('statusSearching');
  selectAllCheckbox.checked = false;

  chrome.history.search(
    { text: text, startTime: startTime, endTime: endTime, maxResults: 5000 },
    (results) => {
      // Most-recent-first
      results.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
      currentResults = results;
      renderResults(results);
      statusDiv.textContent = '';
      resultCountSpan.textContent = t('resultCount', [String(results.length)]);
    }
  );
}

function renderResults(results) {
  resultsDiv.innerHTML = '';
  if (results.length === 0) {
    resultsDiv.innerHTML = `<div class="empty">${t('noResults')}</div>`;
    return;
  }
  const visitsLabel = t('visitsLabel');
  const frag = document.createDocumentFragment();
  results.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input type="checkbox" class="itemCheckbox" data-idx="${idx}">
      <div class="info">
        <div class="title">${escapeHtml(item.title || item.url)}</div>
        <div class="url">${escapeHtml(item.url)}</div>
        <div class="meta">${formatDate(item.lastVisitTime)} · ${item.visitCount} ${visitsLabel}</div>
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
    statusDiv.textContent = t('statusSelectAtLeastOne');
    return;
  }
  if (!confirm(t('confirmDelete', [String(checked.length)]))) {
    return;
  }

  const urls = checked.map((cb) => currentResults[parseInt(cb.dataset.idx, 10)].url);
  deleteBtn.disabled = true;
  statusDiv.textContent = t('statusDeleting');

  let remaining = urls.length;
  urls.forEach((url) => {
    chrome.history.deleteUrl({ url }, () => {
      remaining -= 1;
      if (remaining === 0) {
        deleteBtn.disabled = false;
        statusDiv.textContent = t('statusDeletedCount', [String(urls.length)]);
        doSearch();
      }
    });
  });
});

// Initial load: show recent history
doSearch();
