const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz69f9meOqyJVknD-vbENOWXI7XXpT52EBrXWFtgZOuhXRbwJOEJqr2Lft3SlE3Gdpw3g/exec";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1-bxm3WlHadL_KXzOP8BSX542PMVMqkDBfY1njFpvdjs/edit?usp=sharing";

document.addEventListener('DOMContentLoaded', () => {
  const screens = {
    home: document.getElementById('home-screen'),
    add: document.getElementById('add-screen'),
    study: document.getElementById('study-screen'),
    flashcards: document.getElementById('flashcard-screen')
  };

  const toast = document.getElementById('toast');
  const inputSubject = document.getElementById('input-subject');
  const inputTerm = document.getElementById('input-term');
  const inputDef = document.getElementById('input-def');
  const subjectDropdown = document.getElementById('subject-dropdown');

  const flashcard = document.getElementById('flashcard');
  const cardTerm = document.getElementById('card-term');
  const cardDef = document.getElementById('card-def');
  const cardCounter = document.getElementById('card-counter');

  let pendingTerms = [];
  let allSpreadsheetData = [];
  let activeDeck = [];
  let currentIndex = 0;

  function showScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenKey].classList.add('active');
  }

  // --- HOME SCREEN ---
  document.getElementById('home-add-btn').addEventListener('click', () => {
    pendingTerms = [];
    inputSubject.value = '';
    inputTerm.value = '';
    inputDef.value = '';
    showScreen('add');
  });

  document.getElementById('home-study-btn').addEventListener('click', () => {
    showScreen('study');
    fetchSubjects();
  });

  document.getElementById('home-edit-sheet-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: SPREADSHEET_URL });
  });

  document.getElementById('home-delete-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all previous terms from your spreadsheet?")) {
      fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "clear" })
      });
      alert("Spreadsheet cleared!");
    }
  });

  // --- ADD SCREEN ---
  function saveCurrentInput() {
    const subject = inputSubject.value.trim();
    const term = inputTerm.value.trim();
    const definition = inputDef.value.trim();

    if (subject && term && definition) {
      pendingTerms.push({ subject, term, definition });
      inputTerm.value = '';
      inputDef.value = '';
      return true;
    }
    return false;
  }

  document.getElementById('add-another-btn').addEventListener('click', () => {
    if (!saveCurrentInput()) {
      alert("Please fill in Subject, Term, and Definition before adding another word.");
    } else {
      inputTerm.focus();
    }
  });

  document.getElementById('done-btn').addEventListener('click', () => {
    saveCurrentInput();

    if (pendingTerms.length === 0) {
      showScreen('home');
      return;
    }

    const payload = [...pendingTerms];
    pendingTerms = [];

    showScreen('home');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);

    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error("Error saving terms:", err));
  });

  // --- STUDY SCREEN ---
  async function fetchSubjects() {
    subjectDropdown.innerHTML = '<option value="">Loading subjects...</option>';
    try {
      const res = await fetch(SCRIPT_URL);
      allSpreadsheetData = await res.json();

      const subjects = [...new Set(allSpreadsheetData.map(item => item.subject))];
      
      subjectDropdown.innerHTML = '<option value="">-- Select Subject --</option>';
      subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectDropdown.appendChild(opt);
      });
    } catch (err) {
      subjectDropdown.innerHTML = '<option value="">Error loading subjects</option>';
    }
  }

  document.getElementById('go-btn').addEventListener('click', () => {
    const selectedSub = subjectDropdown.value;
    if (!selectedSub) return;

    activeDeck = allSpreadsheetData.filter(item => item.subject === selectedSub);
    if (activeDeck.length === 0) return;

    currentIndex = 0;
    showScreen('flashcards');
    renderCard();
  });

  document.getElementById('study-back-btn').addEventListener('click', () => showScreen('home'));

  // --- FLASHCARD SCREEN ---
  function renderCard() {
    flashcard.classList.remove('is-flipped');
    setTimeout(() => {
      const item = activeDeck[currentIndex];
      cardTerm.textContent = item.term;
      cardDef.textContent = item.definition;
      cardCounter.textContent = `${currentIndex + 1} / ${activeDeck.length}`;
    }, 150);
  }

  flashcard.addEventListener('click', () => flashcard.classList.toggle('is-flipped'));

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentIndex < activeDeck.length - 1) {
      currentIndex++;
      renderCard();
    }
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCard();
    }
  });

  document.getElementById('deck-back-btn').addEventListener('click', () => showScreen('study'));
});