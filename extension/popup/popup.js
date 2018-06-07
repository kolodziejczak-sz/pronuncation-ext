const remoteUrl = 'https://localhost:4200/';

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

function openContentScript(tab, user, callback) {
  sendToTab(tab, { cmd: 'open', user }, callback);
}

function getContentScriptStatus(tab, callback) {
  sendToTab(tab, { cmd: 'status' }, callback);
}

function isHttps(url) {
  return url ? url.substring(0,5) === 'https': false;
}

function postData(url, data) {
  // Default options are marked with *
  return fetch(remoteUrl + url, {
    body: JSON.stringify(data),
    cache: 'no-cache',
    headers: { 'content-type': 'application/json' },
    method: 'POST'
  })
  .then(response => response.json())
}

document.addEventListener('DOMContentLoaded', () => {

  const barEl = document.getElementById('bar'),
        triggerEl = document.getElementById('trigger'),
        loginFormEl = document.getElementById('login-form'),
        logoutFormEl = document.getElementById('logout-form'),
        usernameEl = document.getElementById('username'),
        passwordEl = document.getElementById('password'),
        logoutEl = document.getElementById('logout'),
        loginEl = document.getElementById('login'),
        barUserEl = document.getElementById('bar-user'),
        barLicenseEl = document.getElementById('bar-license');

  const credentialsKey = 'jsonwebtoken';
  let user = null;

  getCurrentTab(tab => initComponents(tab));

  function initComponents(tab) {
    const isEncrypted = isHttps(tab.url);
    if(isEncrypted)
      alert(strings.messages.secure, 'success');
    else
      alert(strings.messages.unsecure, 'danger');

    getFromStorage(credentialsKey, (userFromStorage) => {
      if(userFromStorage) {
        const isSessionExpired = (new Date().getTime() - userFromStorage.expirationTime) > 0;
        user = isSessionExpired ? null : userFromStorage;
      }
      else {
        alert(strings.messages.login,'danger')
      }
      initLogginState(user);
      initTriggerEl(tab, isEncrypted, !!user);
    });
  }

  function initLogginState(user) {
    if(user) {
      logoutEl.onclick = logout;
      barUserEl.textContent = user.name;
      barUserEl.href= remoteUrl + 'profile/' + user.name;
      barLicenseEl.textContent = strings.account[user.license ? 1 : 0]
      logoutFormEl.style.display = 'block';
      loginFormEl.style.display = 'none';
    } else {
      loginEl.onclick = login;
      loginFormEl.style.display = 'block';
      logoutFormEl.style.display = 'none';
    }
  }

  function initTriggerEl(tab, isHttps, isLogged) {
    triggerEl.disabled = (!isHttps || !isLogged);
    
    getContentScriptStatus(tab, isContentOpen => {
      if(isContentOpen) {
        triggerAsStop(tab);
      } else {
        triggerAsStart(tab);
      }
    });
  }

  function login(event) {
    event.preventDefault();
    const username = usernameEl.value;
    const password = passwordEl.value;
    if(!username || !password) return;
    postData('api/login', {
      username: username,
      password: password
    })
    .then(res => {
      clearAlert();
      const user = res.data;
      if(user) {
        setToStorage(credentialsKey, user);
        getCurrentTab(initComponents);
      } else {
        alert(strings.messages.login401, 'danger');
      }
    }, err => {
      alert(strings.messages.login500, 'danger');
    });
  }

  function logout(event) {
    event.preventDefault();
    setToStorage(credentialsKey, null);
    getCurrentTab(initComponents);
  }

  function triggerAsStop(tab) {
    triggerEl.textContent = strings.triggerEl.stop;
    triggerEl.onclick = closeContentScript.bind(null,tab,() => triggerAsStart(tab));
  }

  function triggerAsStart(tab) {
    triggerEl.textContent = strings.triggerEl.start;

    if(!triggerEl.disabled) {
      triggerEl.onclick = openContentScript.bind(null,tab,user,() => window.close());
    } 
  }


  function alert(text, type) {
    barEl.classList = type;
    barEl.textContent = text;
  }

  function clearAlert() {
    alert('');
  }

  const strings = {
    account: {
      0: 'Free',
      1: 'Premium'
    },
    messages: {
      login: 'Login to start use extension',
      login500: 'Login failed due to server error.',
      login401: 'Incorrect username or password.',
      unsecure: 'Your connection is not encrypted.',
      secure: 'Your connection is encrypted.'
    },
    triggerEl: {
      stop: 'Stop',
      start: 'Try it'
    }
  };
});