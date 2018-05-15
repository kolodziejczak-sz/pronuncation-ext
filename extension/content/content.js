const cssPrefix = 'ext-pronun-';
const unreadClassName = cssPrefix + 'unread';
const markClassName = cssPrefix + 'mark';
const activeClassName = 'active';
const remoteUrl = 'https://localhost:4200/api/';
const freeAccountLimit = 750;

const speechRecognitionErrorMessages = {
  'no-speech': 'No speech was detected. You may need to adjust your microphone settings.',
  'audio-capture': 'No microphone was found. Ensure that a microphone is installed and that microphone settings are configured correctly.',
  'not-allowed': 'Permission to use microphone was denied or is already blocked.',
  'default': 'Unknown error occured during speech recognition.'
}

const guiStrings = {
  tooltipRecognitionOff:'Speak now',
  tooltipRecognitionOn:'Click on the mic or press space to record',
  selectionModeBar:'Use cursor to select the text you want to read.',
  sessionSaveSucced:'Session saved',
  sessionSaveFailed:'Saving session failed. Try again later.',
  newBtn:'New',
  saveBtn:'Save',
  freeAccountLimit:'Free users can read only' + freeAccountLimit + ' characters at once. Try premium now!'
}

const rootId = cssPrefix + 'root';
const bodyEl = document.querySelector('body');

let rootEl;
let selectLangEl;
let selectionBarEl;
let recognitionEl;
let synthEl;
let readerEl;
let notificationBarEl;
let finalTranscriptionsEl;
let interimTranscriptionsEl;
let textContainerEl;
let listenerSelectionChange;
let listenerEsc;
let toogleRecognitionHandler;

let state = {
  isOpened: false,
  selectionMode: false,
  readerOpen: false,
  recording: false,
}
let user = null;
let license = null;
let stats = null;
let voices = null;

const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

const synth = window.speechSynthesis;
synth.onvoiceschanged = () => voices = synth.getVoices();

chrome.runtime.onMessage.addListener((req, sender, res) => {
  switch(req.cmd) {
    case 'status':
      res(state.isOpened);
      break;
    case 'open':
      user = req.user;
      license = !!req.user.license;
      openSelf();
      res(true);
      break;
    case 'close':
      closeSelf();
      res(true);
      break;     
    default:
      console.log('unknown message');
  }
});

function createRoot() {
  const rootEl = document.createElement('div');
  rootEl.id = rootId;

  const wrapperEl = createWrapper();
  rootEl.appendChild(wrapperEl);
  return rootEl;
}

function escToClose(e) {
  const isEsc = e.keyCode === 27;
  if(isEsc) {
    closeSelf();
  }
}

function openSelf() {
  rootEl = createRoot();

  listenerEsc = escToClose.bind(this);
  document.addEventListener('keydown',listenerEsc);

  state.isOpened = true;
  createSelectionTool();
}

function closeSelf() {
  if(toogleRecognitionHandler) {
    document.removeEventListener('keydown',toogleRecognitionHandler);
  }
  if(listenerEsc) {
    document.removeEventListener('keydown',listenerEsc);
  }
  if(state.selectionMode) {
    toggleSelectionMode();
  }
  if(state.readerOpen) {
    closeReader();
  }
  rootEl.innerHTML = '';
  state.isOpened = false;  
}

function createSelectionTool() {
  toggleSelectionMode();
  bodyEl.appendChild(rootEl);
}

function createWrapper() {
  return createElement('div', 'wrapper');
}

function createSelectionModeBar() {
  const barEl = createElement('div','selection-mode-bar');
  const textEl = createElement('div','info');  
  textEl.textContent = guiStrings.selectionModeBar;
  const closeEl = createBtn('clear', closeSelf.bind(this));
  barEl.appendChild(textEl);
  barEl.appendChild(closeEl);
  return barEl;
}

function toggleSelectionMode() {
  const selectionClassName = cssPrefix + 'selection-mode';
  bodyEl.classList.toggle(selectionClassName);

  const isSelectionMode = state.selectionMode;
  if(isSelectionMode) {
    rootEl.removeChild(selectionBarEl);
    document.removeEventListener('mouseup', selectionEnd);
  } else {
    selectionBarEl = createSelectionModeBar();
    rootEl.appendChild(selectionBarEl);
    document.addEventListener('mouseup', selectionEnd);
  }

  state.selectionMode = !state.selectionMode;
  clearSelection();
}

function selectionEnd() {
  const selectedText = getSelectedText();
  if(selectedText.length === 0) return;
  toggleSelectionMode();
  openReader(selectedText);
}

function getSelectedText() {
  return window.getSelection().toString();
}

function clearSelection() {
  window.getSelection().removeAllRanges();
}

function closeReader() {
  if(listenerSelectionChange) {
    document.removeEventListener('selectionchange',listenerSelectionChange);
  }
  if(state.recording) {
    recognition.stop();
  }
  if(synth.speaking) {
    synth.stop();
  }
  rootEl.removeChild(readerEl);  
  state.readerOpen = false;
}

function openReader(text) {
  readerEl = createReader(text);
  rootEl.appendChild(readerEl);
  state.readerOpen = true;
}

function createReader(text) {
  if(license) {
    stats = {
      pageURL: window.location.href,
      startTime: new Date().getTime(),
      synthesis: [],
      interimResults: [],
      finalResults: [],
      innerHTML: null
    };
  }
  const readerEl = createElement('div','reader');
  
  const menuBarEl = createMenuBar();
  const notificationBarEl = createNotificationBar();
  const textToReadEl = createTextToRead(text);
  const loggerEl = createLogger();
  const toolbarEl = createToolbar();

  readerEl.appendChild(menuBarEl);
  readerEl.appendChild(notificationBarEl);
  readerEl.appendChild(textToReadEl);
  readerEl.appendChild(toolbarEl);
  readerEl.appendChild(loggerEl);
  return readerEl;
}

function createMenuBar() {
  const menuBarEl = createElement('div', 'menu-bar');
  const closeEl = createBtn('clear', closeSelf.bind(this));
  const redoEl = createBtnWithText(guiStrings.newBtn,'tab_unselected', () => { 
    closeReader();
    toggleSelectionMode();
  });

  menuBarEl.appendChild(redoEl);
  if(license) {
    const saveEl = createBtnWithText(guiStrings.saveBtn,'save', saveSession.bind(this));
    menuBarEl.appendChild(saveEl);
  }
  menuBarEl.appendChild(closeEl);
  return menuBarEl;
}

function createNotificationBar() {
  notificationBarEl = createElement('div', 'notification-bar');
  return notificationBarEl;
}

function createTextToRead(text) {
  if(!license) {
    text = text.slice(0,freeAccountLimit);
    alert(guiStrings.freeAccountLimit);
  }
  textContainerEl = createElement('div', 'article');
  textContainerEl.innerHTML = parseTextToHTML(text, unreadClassName);

  synthEl = createBtn('volume_up', toggleSynthesis, 'synth-mic');
  listenerSelectionChange=showSynthesisOption.bind(null,textContainerEl);

  textContainerEl.addEventListener('mouseup',listenerSelectionChange);
  textContainerEl.appendChild(synthEl);

  return textContainerEl;
}

function parseTextToHTML(text, className) {
  return text.replace(/(\S+)/g,`<span class="${className}">$1</span>`);
}

function showSynthesisOption(parent, event) {
  if(synth.speaking || event.target === synthEl) return;
  const selectionIsEmpty = (getSelectedText().length === 0);
  synthEl.style.display = selectionIsEmpty ? 'none' : 'flex';
  if(!selectionIsEmpty) {
    synthEl.style.left = (event.offsetX - parent.offsetLeft) + 'px';
    synthEl.style.top = (event.offsetY - parent.offsetTop + 35) + 'px';
  }
}

function createToolbar() {
  const toolbarEl = createElement('div', 'toolbar');
  
  const settingsEl = createSettings();
  const tooltipTextEl = createElement('p', 'tooltip');
  tooltipTextEl.textContent = guiStrings.tooltipRecognitionOn;

  recognitionEl = createBtn('mic', toggleRecognition.bind(null,tooltipTextEl), 'recognition-trigger'); 

  toogleRecognitionHandler = spaceToToggleRecognition.bind(null,tooltipTextEl);
  document.addEventListener('keydown', toogleRecognitionHandler); 

  toolbarEl.appendChild(settingsEl);
  toolbarEl.appendChild(tooltipTextEl);
  toolbarEl.appendChild(recognitionEl);
  return toolbarEl;
}

function createSettings() {
  const settingsEl = createElement('div', 'settings');
  selectLangEl = createSelectLangs(voices);
  const triggerEl = createBtn('language', toggleVisibility.bind(this, selectLangEl), 'settings-trigger');

  settingsEl.appendChild(triggerEl);
  settingsEl.appendChild(selectLangEl);
  return settingsEl;
}

function createSelectLangs(voices) {
  const langsEl = createElement('select','lang-select');
  voices.map(createOption).forEach(appendOption.bind(null,langsEl));
  langsEl.onchange = onComboboxLangSelect.bind(this, voices)
  selectDefaultLang(langsEl, voices);  
  return langsEl;
}

function onComboboxLangSelect(voices, event) {
  const selectedVoice = voices.find(voice => voice.voiceURI === event.currentTarget.value);
  synth.voice = selectedVoice;
  recognition.voice = selectedVoice.lang;
}

function createOption(voice) {
  return new Option(voice.name,voice.voiceURI);
}

function appendOption(parent,option) {
  parent.options[parent.options.length] = option;
}

function selectDefaultLang(selectEl, voices) {
  const lang = getDocumentLang();
  let voiceIndex = voices.findIndex(voice => parseLangKey(voice) === lang);
  if(voiceIndex === -1) {
    voiceIndex = voices.findIndex(voice => voice.default);
  }
  selectEl.selectedIndex = voiceIndex;
  this.onComboboxLangSelect(voices, { currentTarget: selectEl})
}

function getDocumentLang() {
  return document.documentElement.lang;
}

function parseLangKey(voice) {
  return voice.lang.split('-').pop()
}

function toggleVisibility(el) {
  const current = el.style.display;
  el.style.display = current === 'inline' ? 'none' : 'inline';
}

function spaceToToggleRecognition(tooltipTextEl,event) {
  const isSpace = event.keyCode === 32;
  if(isSpace) {
    event.preventDefault();
    toggleRecognition(tooltipTextEl);
  }
}

function createLogger() {
  const loggerEl = createElement('div', 'logger');
  finalTranscriptionsEl = createElement('ul', 'final-transcriptions');
  interimTranscriptionsEl = createElement('span', 'interim-transcription');
  loggerEl.appendChild(finalTranscriptionsEl);
  loggerEl.appendChild(interimTranscriptionsEl);
  return loggerEl;
}

function addToFinalTranscriptions(text) {
  const line = createElement('li', 'item-list');
  line.textContent = text;
  finalTranscriptionsEl.appendChild(line);
  finalTranscriptionsEl.scrollTop = finalTranscriptionsEl.scrollHeight;
}

function addToInterimTranscriptions(text) {
  interimTranscriptionsEl.textContent = text;
}

function createBtnWithText(text, iconName, clickFn) {
  const btnEl = createElement('button', 'btn');
  btnEl.onclick = clickFn;

  if(iconName) {
    const iconEl = createElement('img','img');
    const iconPath = getImageUrl(iconName);
    iconEl.src = iconPath;
    btnEl.appendChild(iconEl);
  }

  const textEl = createElement('span','text');
  textEl.textContent=text;
  btnEl.appendChild(textEl);

  return btnEl;
}

function createBtn(iconName, clickFn, className) {
  const btnEl = createElement('button', 'btn');

  if(iconName) {
    const iconEl = createElement('img','img');
    const iconPath = getImageUrl(iconName);
    iconEl.src = iconPath;
    btnEl.appendChild(iconEl);
  }

  btnEl.onclick = clickFn;

  if(className) {
    btnEl.classList.add(cssPrefix+className);
  }
  
  return btnEl;
}

function getImageUrl(filename) {
  return chrome.runtime.getURL('content/icons/' + filename + '.svg');
}

function createElement(tag, className) {
  const el = document.createElement(tag);
  el.classList.add(cssPrefix+className);
  return el;  
}

function toggleRecognition(tooltipTextEl) {
  if(state.recording) {
    recognition.stop();
    tooltipTextEl.textContent = guiStrings.tooltipRecognitionOn;
  } else {
    recognition.start();
    tooltipTextEl.textContent = guiStrings.tooltipRecognitionOff;
  }
}

recognition.onstart = function() {
  recognitionEl.classList.add(activeClassName);
  state.recording = true;
};

recognition.onend = function() {
  recognitionEl.classList.remove(activeClassName);
  state.recording = false;
};

recognition.onresult = function(event) {
  let interimTranscript = '',
      finalTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; ++i) {
    if (event.results[i].isFinal) {
      finalTranscript += event.results[i][0].transcript;
    } else {
      interimTranscript += event.results[i][0].transcript;
    }
  }
  interimTranscript && onInterimTranscript(interimTranscript);
  finalTranscript && onFinalTranscript(finalTranscript);
};

recognition.onerror = function(event) {
  switch(event.error) {
    case 'no-speech':
    case 'audio-capture':
    case 'not-allowed':
      alert(speechRecognitionErrorMessages[event.error]);
      break;
    default:
      alert(speechRecognitionErrorMessages['default']);
  }
};

function onInterimTranscript(text) {
  addToInterimTranscriptions(text);
  findAndMark(text);
  if(license && stats) {
    stats.interimResults.push(text);
  }
}

function onFinalTranscript(text) {
  addToFinalTranscriptions(text);
  findAndMark(text);
  if(license && stats) {
    stats.finalResults.push(text);
  }
}

function findAndMark(text) {
  const words = text.trim().split(' ').map(word => word.toUpperCase());
  
  words.forEach(word => {
    const el = [...textContainerEl.querySelectorAll('.' + unreadClassName)]
      .find(node => {
        return normalizeText(node.textContent) === word
      });
    if(el) {
      el.classList.remove(unreadClassName);
      el.classList.add(markClassName);
    }
  })
}

function normalizeText(text) {
  const punctChars = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/;
  return text.replace(punctChars, '').toUpperCase();
}

function toggleSynthesis(e) {
  if(synth.speaking) {
    synthCancel();
  } else {
    synthStart();
  }
}

function synthCancel() {
  synth.cancel();
}

function synthStart() {
  const text = getSelectedText();

  if(text.length === 0) {
    return;
  }
  const utterThis = new SpeechSynthesisUtterance(text);
  utterThis.lang = synth.voice.lang;
  utterThis.voice = synth.voice;
  utterThis.onstart = onSynthStart;
  utterThis.onend = onSynthStop;
  synth.speak(utterThis);
  if(license && stats) {
    stats.synthesis.push(text);
  }
}

function onSynthStop() {
  synthEl.classList.remove(activeClassName);
}

function onSynthStart() {
  synthEl.classList.add(activeClassName);
}

function alert(msg, type) {
  const closeEl = createBtn('clear', clearNotification);
  const msgEl = createElement('p', 'notification-msg');
  msgEl.textContent = msg;

  type = type || 'alert';
  notificationBarEl.classList.remove(cssPrefix + 'alert');
  notificationBarEl.classList.remove(cssPrefix + 'info');
  notificationBarEl.classList.add(cssPrefix + type);

  clearNotification();  

  notificationBarEl.appendChild(msgEl);
  notificationBarEl.appendChild(closeEl);
}

function clearNotification() {
  notificationBarEl.innerHTML = '';
}

function saveSession() {
  if(license && stats) {
    const btnRegex = /<button(.*)button>/;
    const htmlWithoutButton = textContainerEl.innerHTML.replace(btnRegex,'');
    stats.innerHTML = htmlWithoutButton;
    postSession(stats);
  }
}

function postSession(stats) {
  postData('session', stats).then(
    res => {
      alert(res.msg || guiStrings.sessionSaveSucced, 'info') 
    },
    err => alert(res.msg || guiStrings.sessionSaveFailed)
  );
}

function postData(url, data) {
  data.user = user;
  return fetch(remoteUrl + url, {
    body: JSON.stringify(data), // must match 'Content-Type' header
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    headers: { 'content-type': 'application/json' },
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
  })
  .then(response => response.json()) // parses response to JSON
}
