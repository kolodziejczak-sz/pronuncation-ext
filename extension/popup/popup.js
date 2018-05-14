function setToStorage(key, value) {
  let obj = {};
  obj[key]=value;
  chrome.storage.local.set(obj);
}

function getFromStorage(key, callback) {
  chrome.storage.local.get([key], (result) => callback(result[key]))
}

function getCurrentTab(callback) {
  chrome.tabs.query({ 
    active: true, 
    currentWindow: true 
  }, 
  tabs => callback(tabs[0]));
}

function sendToTab(tab, message, callback) {
  chrome.tabs.sendMessage(tab.id, message, callback);
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
  return url ? url.substring(0,5) === 'https': false;
}

function postData(url, data) {
  // Default options are marked with *
  return fetch(url, {
    body: JSON.stringify(data), // must match 'Content-Type' header
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    headers: { 'content-type': 'application/json' },
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
  })
  .then(response => response.json()) // parses response to JSON
}

document.addEventListener('DOMContentLoaded', () => {

  const barEl = document.getElementById('bar'),
        infoEl = document.getElementById('info'),
        triggerEl = document.getElementById('trigger'),
        loginFormEl = document.getElementById('login-form'),
        logoutFormEl = document.getElementById('logout-form'),
        usernameEl = document.getElementById('username'),
        passwordEl = document.getElementById('password'),
        logoutEl = document.getElementById('logout'),
        barUserEl = document.getElementById('bar-user'),
        barLicenseEl = document.getElementById('bar-license');

  const credentialsKey = 'jsonwebtoken';
  let isPremium = false;

  getCurrentTab(tab => initComponents(tab));

  function initComponents(tab) {
    getFromStorage(credentialsKey, (user) => {
      if(user) {
        const isSessionExpired = (new Date().getTime() - user.expirationTime) > 0;
        user = isSessionExpired ? null : user;
      }
      const isEncrypted = isHttps(tab.url);
      const isLoggedIn = !!user;
      isPremium = !!user && !!user.license;
      initLogginState(user);
      initTriggerEl(tab, isEncrypted, isLoggedIn);
      initBarEl(isEncrypted);
    });
  }

  function initLogginState(user) {
    if(user) {
      const isPremium = !!user.license;
      logoutEl.onclick = logout;
      barUserEl.textContent = user.name;
      barLicenseEl.textContent = strings.account[isPremium ? 1 : 0]
      logoutFormEl.style.display = 'block';
      return;
    } else {
      loginFormEl.style.display = 'block';    
    }
  }

  function initTriggerEl(tab, isHttps, isLogged) {
    if(!isHttps) {
      triggerEl.disabled = true;
    }
    if(!isLogged) {
      triggerAsLogin();
      return;
    }
    getContentScriptStatus(tab, isContentOpen => {
      if(isContentOpen) {
        triggerAsStop(tab);
      } else {
        triggerAsStart(tab);
      }
    });
  }

  function login() {
    const username = usernameEl.value;
    const password = passwordEl.value;
    if(!username || !password) return;
    postData('https://localhost:4200/api/login', {
      username: username,
      password: password
    })
    .then(res => {
      const user = res.data;
      setToStorage(credentialsKey, user);
      getCurrentTab(initComponents);
    }, err => {
      console.log(err);
    });
  }

  function logout() {
    setToStorage(credentialsKey, null);
    getCurrentTab(initComponents);
  }

  function triggerAsLogin() {
    triggerEl.textContent = strings.triggerEl.login;
    triggerEl.onclick = login;
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
        isPremium,
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
      start: 'Try it',
      login: 'Login in'
    }
  };
});