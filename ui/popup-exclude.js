import * as popup from './popup.js';

import {
  arrayOrDummy,
  getSettings,
  inBG,
} from '/util/common.js';

import {$} from '/util/dom.js';

if (popup.tab.url)
  updateTitles();
else
  addEventListener('gotTab', updateTitles, {once: true});

async function exclude(e) {
  e.preventDefault();
  e.target.classList.add('done');
  $.excludeSection.classList.add('disabled');
  const ss = await getSettings();
  const exclusions = arrayOrDummy(ss.exclusions);
  if (!exclusions.includes(e.target.title)) {
    exclusions.push(e.target.title);
    inBG.writeSettings({exclusions});
  }
}

function updateTitles() {
  const {url} = popup.tab;
  for (const el of $.excludeSection.querySelectorAll('a')) {
    const {type} = el.dataset;
    el.title =
      type === 'url' ? url :
        type === 'prefix' ? url + '*' :
          type === 'domain' ? new URL(url).origin + '/*' : '';
    el.onclick = exclude;
  }
}
