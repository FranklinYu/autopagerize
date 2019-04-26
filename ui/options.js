export {
  renderSettings,
  collectSettings,
};

import {loadRules, rulesEqual, collectRules} from './options-rules.js';

const changedElements = new Set();

Promise.all([
  import('/util/storage-idb.js').then(idb => idb.exec().count()),
  getCacheDate(),
  getSettings(),
  onDomLoaded().then(() => {
    import('./options-backup.js');
  }),
]).then(([
  cacheCount,
  cacheDate,
  settings,
]) => {
  renderSettings(settings);
  renderSiteinfoStats(cacheCount, cacheDate);
  loadRules(settings.rules);

  $.btnSave.onclick = save;
  $.btnUpdate.onclick = update;
  $.backup.oninput = ({target: el}) => ($.importWrapper.disabled = !el.value.trim());
  addEventListener('input', onChange, {passive: true});
  addEventListener('change', onChange, {passive: true});
});

function renderSettings({excludes, showStatus}) {
  let el;

  el = $.excludes;
  el.value = el.savedValue = arrayOrDummy(excludes).join('\n');
  el.rows = Math.max(2, Math.min(20, arrayOrDummy(excludes).length + 1));

  el = $.showStatus;
  el.checked = el.savedValue = showStatus !== false;
}

function renderSiteinfoStats(numRules, date) {
  $.size.textContent = numRules;
  $.updatedAt.textContent = date > 0 ? new Date(date).toLocaleString() : 'N/A';
}

async function save() {
  const settings = await getSettings();
  const ss = collectSettings();
  const changed =
    ss.excludes.join('\n') !== arrayOrDummy(settings.excludes).join('\n') ||
    ss.showStatus !== settings.showStatus ||
    !rulesEqual(ss.rules, settings.rules);
  if (!changed)
    return;

  $.excludes.savedValue = ss.excludes.join('\n');
  $.showStatus.savedValue = ss.showStatus;
  inBG.writeSettings({...settings, ...ss});

  changedElements.forEach(el => el.classList.remove('changed'));
  changedElements.clear();
  for (const el of $.rules.getElementsByClassName('deleted'))
    el.savedValue = !el.savedValue;

  $.btnSaveWrapper.hidden = true;
}

async function update() {
  const btn = $.btnUpdate;
  const label = btn.textContent;
  btn.disabled = true;

  const portName = performance.now() + '.' + Math.random();
  chrome.runtime.onConnect.addListener(port => {
    if (port.name === portName)
      port.onMessage.addListener(loaded => {
        btn.textContent = (loaded / 1024).toFixed(0) + ' kiB';
      });
  });
  const numRules = await inBG.updateSiteinfo(portName);

  renderSiteinfoStats(numRules, numRules > 0 ? new Date() : null);
  btn.textContent = label;
  btn.disabled = false;
}

function collectSettings() {
  return {
    rules: collectRules(),
    excludes: $.excludes.value.trim().split(/\s+/),
    showStatus: $.showStatus.checked,
  };
}

function onChange({target: el}) {
  if (el.closest('.ignore-changes'))
    return;
  const value = el[el.type === 'checkbox' ? 'checked' : 'value'];
  const changed = value !== el.savedValue;
  if (changed)
    changedElements.add(el);
  else
    changedElements.delete(el);
  if (changed !== el.classList.contains('changed'))
    el.classList.toggle('changed', changed);
  const unsalvageable = !changedElements.size || (el.checkValidity && !el.checkValidity());
  const btn = $.btnSaveWrapper;
  if (btn.hidden !== unsalvageable)
    btn.hidden = unsalvageable;
}
