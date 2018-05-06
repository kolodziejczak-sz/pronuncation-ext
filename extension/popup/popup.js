function getCurrentTab(callback) {
  chrome.tabs.query({ 
    active: true, 
    currentWindow: true 
  }, 
  tabs => callback(tabs[0]));
}

function sendToTab(tab, message, callback) {
  chrome.tabs.sendMessage(tab.id, message, response => callback(response));
}

function closeContentScript(tab, callback) {
  sendToTab(tab, { cmd: 'close' }, callback);
}

function openContentScript(tab, account, callback) {
  sendToTab(tab, { cmd: 'open', account: account }, callback);
}

function getContentScriptStatus(tab, callback) {
  sendToTab(tab, { cmd: 'status' }, callback);
}

function isHttps(url) {
  console.log(url);
  return url ? url.substring(0,5) === 'https': false;
}

document.addEventListener('DOMContentLoaded', () => {

  const barEl = document.getElementById('bar'),
        infoEl = document.getElementById('info'),
        triggerEl = document.getElementById('trigger');

  let accountType = 0;

  getCurrentTab(tab => initComponents(tab));

  function initComponents(tab) {
    // TODO: LOGIN AND CHECKING FOR STATUS
    const isEncrypted = isHttps(tab.url);
    console.log(isEncrypted);
    initTriggerEl(tab, isEncrypted);
    initBarEl(isEncrypted);
  }

  function initTriggerEl(tab, isHttps) {
    if(!isHttps) {
      triggerEl.disabled = true;
    }
    getContentScriptStatus(tab, isContentOpen => {

      if(isContentOpen) {
        triggerAsStop(tab);
      } else {
        triggerAsStart(tab);
      }
    });
  }

  function triggerAsStop(tab) {
    triggerEl.textContent = strings.triggerEl.stop;
    triggerEl.onclick = closeContentScript.bind(null,tab,() => triggerAsStart(tab));
  }

  function triggerAsStart(tab) {
    triggerEl.textContent = strings.triggerEl.start;

    if(!triggerEl.disabled) {
      triggerEl.onclick = openContentScript.bind(null,
        tab,
        accountType,
        () => window.close());
    } 
  }

  function initBarEl(isHttps) {
    const key = isHttps ? 'success' : 'danger';

    barEl.classList.add(key);
    infoEl.textContent = strings.infoEl[key];
  }

  const strings = {
    account: {
      0: 'Free',
      1: 'Premium'
    },
    infoEl: {
      success: 'Your connection is encrypted.',
      danger: 'Your connection is not encrypted.'
    },
    triggerEl: {
      stop: 'Stop',
      start: 'Try it'
    }
  };
});