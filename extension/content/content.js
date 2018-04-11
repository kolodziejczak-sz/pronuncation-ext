const cssPrefix = 'ext-pronoun-';
const rootId = cssPrefix + 'root';
const bodyEl = document.querySelector('body');
const activeClassName = 'active';

const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

const synth = window.speechSynthesis;



let rootEl;
let selectionBarEl;
let recognitionEl;
let synthEl;
let readerEl;
let finalTranscriptionsEl;
let interimTranscriptionsEl;
let textContainerEl;
let listenerSelectionChange;
let listenerEsc;

let state = {
  isOpened: false,
  selectionMode: false,
  readerOpen: false,
  recording: false,
}

chrome.runtime.onMessage.addListener(function(req, sender, res) {
  switch(req.cmd) {
    case 'status':
      res(state.isOpened);
      break;
    case 'open':
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
  textEl.textContent = 'Use cursor to select the text you want to read.';
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
  const readerEl = createElement('div','reader');
  
  const toolbarEl = createToolbar();
  const textToReadEl = createTextToRead(text);
  const loggerEl = createLogger();

  readerEl.appendChild(toolbarEl);
  readerEl.appendChild(textToReadEl);
  readerEl.appendChild(loggerEl);
  return readerEl;
}


function createToolbar() {
  const toolbarEl = createElement('div', 'toolbar');
  const redoEl = createBtn('tab_unselected', () => { 
    closeReader();
    toggleSelectionMode();
  });
  recognitionEl = createBtn('mic', toggleRecognition);
  synthEl = createBtn('volume_up', toggleSynthesis);

  listenerSelectionChange=toggleDisabledWhenSelection.bind(null,synthEl);
  document.addEventListener('selectionchange',listenerSelectionChange);

  const closeEl = createBtn('clear', closeSelf.bind(this));

  toolbarEl.appendChild(redoEl);
  toolbarEl.appendChild(recognitionEl);
  toolbarEl.appendChild(synthEl);
  toolbarEl.appendChild(closeEl);
  return toolbarEl;
}

function toggleDisabledWhenSelection(el) {
  if(synth.speaking) return;
  el.disabled = (getSelectedText().length === 0);
}

function createTextToRead(text) {
  textContainerEl = createElement('div', 'article');
  textContainerEl.innerHTML = parseTextToHTML(text);
  return textContainerEl;
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

function parseTextToHTML(text) {
  return text
    .split(' ')
    .map(el => `<span class="unread">${el}</span>`)
    .join(' ')
}

function createBtn(iconName, clickFn) {
  const btnEl = createElement('button','btn');
  
  if(iconName) {
    const iconEl = createElement('img','img');
    const iconPath = getImageUrl(iconName);
    iconEl.src = iconPath;
    btnEl.appendChild(iconEl);
  }

  btnEl.onclick = clickFn;
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

function toggleRecognition() {
  if(state.recording) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

recognition.onstart = function() {
  console.log('recognition onstart');
  recognitionEl.classList.add(activeClassName);
  state.recording = true;
};

recognition.onend = function() {
  console.log('recognition onend');
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
      event.error.message="No speech was detected. You may need to adjust your microphone settings.";
      break;
    case 'audio-capture':
      event.error.message="No microphone was found. Ensure that a microphone is installed and that microphone settings are configured correctly.";
      break;
    case 'not-allowed':
      event.error.message="Permission to use microphone was denied or is already blocked.";
      break;
    default:
      event.error.message="Unknown error occured during speech recognition."
  }
  globalErrorHandler(event.error);
};

function onInterimTranscript(text) {
  addToInterimTranscriptions(text);
}

function onFinalTranscript(text) {
  addToFinalTranscriptions(text);
  findAndMark(text);
}

function findAndMark(text) {
  const words = text.split(' ').map(word => word.toUpperCase());

  words.forEach(word => {
    const el = [...textContainerEl.querySelectorAll('.unread')]
      .find(node => node.textContent.toUpperCase() === word);
    if(el) {
      el.classList.remove('unread');
      el.classList.add('mark');
    }
  })
}


function toggleSynthesis() {
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
  utterThis.onstart = onSynthStart;
  utterThis.onend = onSynthStop;

  synth.speak(utterThis);
}

function onSynthStop() {
  synthEl.classList.remove(activeClassName);
}

function onSynthStart() {
  synthEl.classList.add(activeClassName);
}

function globalErrorHandler(error) {

}

