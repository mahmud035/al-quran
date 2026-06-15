'use strict';

const toggleSpinner = (displayValue) => {
  document.getElementById('spinner').style.display = displayValue;
};

const loadAllData = async () => {
  // display spinner
  toggleSpinner('block');

  const url = `https://api.alquran.cloud/v1/quran/bn.bengali`;
  const res = await fetch(url);
  const data = await res.json();
  // console.log(data.data.surahs);
  return data.data.surahs;
};

const displayAllSurah = async () => {
  const allSurah = await loadAllData(); //* Bangla Quran Data

  const allSurahContainer = document.getElementById('surah-card-container');

  allSurah.forEach((surah = {}) => {
    const { englishName, englishNameTranslation, number } = surah;
    // console.log(surah);

    const newEnglishName = englishName.replaceAll("'", '-');
    // console.log(newEnglishName);

    const surahObject = JSON.stringify(surah);
    // console.log(surahObject);

    const surahDiv = document.createElement('div');
    surahDiv.classList.add('.col');

    surahDiv.innerHTML = `
       <div class="surah-card h-100"
       onclick='displayCompleteSurah(${surahObject}, ${number})' data-bs-toggle="modal"  data-bs-target="#exampleModal">
            <div class="surah-number-bookmark">
              <p>${number}</p>
              <i class="bx bx-heart heart bookmark"></i>
            </div>
            <div class="surah-name-info">
              <h3>${newEnglishName}</h3>
              <h4>${englishNameTranslation}</h4>
            </div>
        </div>
      `;

    allSurahContainer.appendChild(surahDiv);
  });

  // call createBookmark function
  createBookmark();

  // Hide Spinner
  toggleSpinner('none');
};

displayAllSurah();

//* Display Single Surah (Completely)
const displayCompleteSurah = async (surah, surahNumber) => {
  const { englishName, number } = surah;

  // display spinner
  toggleSpinner('block');

  //* get All Arabic Ayat from Corresponding Sura
  const allArabicAyat = await loadArabicText(surahNumber);
  // console.log(allArabicAyat);

  let count = 0;

  // console.log(surah, surahNumber);

  const surahName = document.getElementById('surah-name');
  surahName.innerText = englishName;

  const modalBody = document.getElementById('modal-body');
  modalBody.textContent = '';

  const allAyat = surah.ayahs; //* Single Surah's Bangla Data

  allAyat.forEach((ayat = {}) => {
    const { numberInSurah, text } = ayat;
    // console.log(ayat);

    const ayatDiv = document.createElement('div');
    ayatDiv.classList.add('ayat-card', 'w-50', 'mx-auto');
    ayatDiv.innerHTML = `
        <div id="arabic-text-container" class="number-and-arabic-ayat-info">
              <p id="sura-and-ayat-number">${number}:${numberInSurah}</p>
              <p id="arabic-ayat">${allArabicAyat[count].text} </p>

         </div>
         <div class="translation-info">
              <h6>
                  BANGLA - M KHAN | <span class="tafsir">SEE TAFSIR</span> | <span><i onclick="playAudio('${allArabicAyat[count].audio}')" class="fa-regular fa-circle-play ms-2 fs-5 "></i> </span>
              </h6>
          </div>

          <div class="bangla-meaning">
              <p id="bangla-meaning">${text}</p>
          </div>
        `;

    modalBody.appendChild(ayatDiv);
    count++;
  });

  // Hide Spinner
  toggleSpinner('none');
};

//* get Single Surah's Arabic Text and Audio Data
const loadArabicText = async (surahNumber) => {
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`;
  // console.log(url);
  const res = await fetch(url);
  const data = await res.json();
  // console.log(data.data.ayahs);
  return data.data.ayahs;
};

//* play audio function
const playAudio = async (url) => {
  const audio = new Audio(url);
  audio.play();
  console.log(url);
};

// const getBookmarkArrayFromLocalStorage = async () => {
//   let bookmarkArray = JSON.parse(localStorage.getItem('bookmarkArray'))
//     ? JSON.parse(localStorage.getItem('bookmarkArray'))
//     : [];
//   return bookmarkArray;
// };

//* add Event listener to Bookmark Icon
const createBookmark = () => {
  const allBookmarks = document.querySelectorAll('.bookmark');
  // console.log(surah);

  allBookmarks.forEach((bookmark) => {
    // console.log(bookmark);
    bookmark.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      // console.log('bookmark icon clicked');

      const bookmarkIcon = e.target;
      bookmarkIcon.classList.toggle('bxs-heart');
      console.log(bookmarkIcon);
    });
  });
};

//* add event listener to search input field
document.getElementById('search-surah').addEventListener('keyup', async (e) => {
  // display spinner
  toggleSpinner('block');

  const searchText = e.target.value;
  // console.log(searchText);

  const allSurah = await loadAllData(); //* Bangla Quran Data

  const searchedSurah = allSurah.filter((surah) => {
    // console.log(surah);
    return surah.englishName.startsWith(`${searchText}`);
  });
  displaySearchedSurah(searchedSurah);
});

const displaySearchedSurah = (searchedSurah) => {
  console.log(searchedSurah);
  const allSurahContainer = document.getElementById('surah-card-container');
  allSurahContainer.textContent = '';

  searchedSurah.forEach((surah = {}) => {
    const { englishName, englishNameTranslation, number } = surah;
    console.log(surah);

    const newEnglishName = englishName.replaceAll("'", '-');
    // console.log(newEnglishName);

    const surahObject = JSON.stringify(surah);
    // console.log(surahObject);

    const surahDiv = document.createElement('div');
    surahDiv.classList.add('.col');

    surahDiv.innerHTML = `
       <div class="surah-card"
       onclick='displayCompleteSurah(${surahObject}, ${number})' data-bs-toggle="modal"  data-bs-target="#exampleModal">
            <div class="surah-number-bookmark">
              <p>${number}</p>
              <i  class="bx bx-heart heart "></i>
            </div>
            <div class="surah-name-info">
              <h3>${newEnglishName}</h3>
              <h4>${englishNameTranslation}</h4>
            </div>
        </div>
      `;

    allSurahContainer.appendChild(surahDiv);
  });

  // Hide Spinner
  toggleSpinner('none');
};

//* set and remove .active class to 3 filter category
const setAndRemoveClassToElement = (id1, id2, id3, className) => {
  document.getElementById(id1).classList.add(className);
  document.getElementById(id2).classList.remove(className);
  document.getElementById(id3).classList.remove(className);
};

//* add event listeners to sort by Serial
document.getElementById('serial').addEventListener('click', async () => {
  setAndRemoveClassToElement('serial', 'alphabet', 'total-ayah', 'active');
  // for responsive purposes on mobile devices
  document.getElementById('serial').classList.remove('ps-4', 'ps-sm-0');

  const allSurah = await loadAllData(); //* Bangla Quran Data

  const sortedSurahArray = allSurah.sort((a, b) => {
    // console.log(a.number);
    // console.log(b.number);
    return a.number - b.number;
  });

  displaySortedSurah(sortedSurahArray);
});

//* add event listener to sort by Alphabet
document.getElementById('alphabet').addEventListener('click', async () => {
  setAndRemoveClassToElement('alphabet', 'total-ayah', 'serial', 'active');
  // for responsive purposes on mobile devices
  document.getElementById('serial').classList.add('ps-4', 'ps-sm-0');

  const allSurah = await loadAllData(); //* Bangla Quran Data
  // console.log(allSurah);

  const sortedSurahArray = allSurah.sort((a, b) => {
    let fa = a.englishName.toLowerCase();
    let fb = b.englishName.toLowerCase();

    if (fa < fb) {
      return -1;
    }
    if (fa > fb) {
      return 1;
    }
    return 0;
  });

  displaySortedSurah(sortedSurahArray);
});

//* add event listener to sort by total ayah
document.getElementById('total-ayah').addEventListener('click', async (e) => {
  setAndRemoveClassToElement('total-ayah', 'serial', 'alphabet', 'active');

  const allSurah = await loadAllData(); //* Bangla Quran Data

  const sortedSurahArray = allSurah.sort((a, b) => {
    // console.log(a.ayahs.length);
    // console.log(b.ayahs.length);
    return a.ayahs.length - b.ayahs.length;
  });

  displaySortedSurah(sortedSurahArray);
});

const displaySortedSurah = (sortedSurahArray) => {
  const allSurahContainer = document.getElementById('surah-card-container');
  allSurahContainer.textContent = '';

  const sortedSurah = sortedSurahArray;

  sortedSurah.forEach((surah = {}) => {
    const { englishName, englishNameTranslation, number } = surah;
    // console.log(surah);

    const newEnglishName = englishName.replaceAll("'", '-');
    // console.log(newEnglishName);

    const surahObject = JSON.stringify(surah);
    // console.log(surahObject);

    const surahDiv = document.createElement('div');
    surahDiv.classList.add('.col');

    surahDiv.innerHTML = `
       <div class="surah-card h-100"
       onclick='displayCompleteSurah(${surahObject}, ${number})' data-bs-toggle="modal"  data-bs-target="#exampleModal">
            <div class="surah-number-bookmark">
              <p>${number}</p>
              <i  class="bx bx-heart heart bookmark"></i>
            </div>
            <div class="surah-name-info">
              <h3>${newEnglishName}</h3>
              <h4>${englishNameTranslation}</h4>
            </div>
        </div>
      `;

    allSurahContainer.appendChild(surahDiv);
  });

  // Hide Spinner
  toggleSpinner('none');
};
