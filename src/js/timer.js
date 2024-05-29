var pruefungszeit_teil_1 = 10; // in min, Kommazahlen erlaubt
var pruefungszeit_teil_2 = 10; // in min, Kommazahlen erlaubt
var pruefungszeit_uebergang = 0.17; // in min => 10sec (0.17min);

// nur für Kombiprüfung in BW; Infos unter RP-BW: https://t1p.de/8ee30
//      Hinweis auf Übergang zum Nichtschwerpunkt-Fach
//      wenn =0; dann _keine_ Zweiteilung des zweiten Prüfungsteils
var pruefungszeit_teil_2_davon_teil_1 = 0; // in min, Kommazahlen erlaubt

var server_versatz = 0 // in h; 2 => +2h

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*
Pausenzeit nicht größer als 0-0.5 Minuten wählen, da diese lediglich als Übergang
gedacht ist und nicht als Pause in der Prüfung selbst. Diese Zeit wird am Ende
für die Angabe der Protokoll-Prüfungszeit wieder "herausgerechnet",
damit die Protokolldaten bzw. -zeiten stimmen.
*/

/*
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Harald Hentschel; https://mastodon.social/@MrDblH
Lizenz CC BYNC: https://creativecommons.org/licenses/by-nc/4.0/
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
*/

var timer_down;
var timestamp_start;
var timestamp_skip;
var timestamp_end;
var is_skipped;

var is_fullscreen = false;

var pruefungsteil;
var is_pruefung_pausiert;
var is_pruefung_done;
var is_timer_running;
var time = Math.ceil(pruefungszeit_teil_1 * 60); // in sec
var is_pruefung_zweigeteilt;

let lock;


// - - - - getElements - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const timer_start_stop_el = document.getElementById("timer__btn-start-stop");
const timer_skip_el = document.getElementById("timer__btn-skip");
const timer_prefs_el = document.getElementById("timer__btn-prefs");
const timer_fullscreen_el = document.getElementById("timer__btn-fullscreen");
const timer_refresh_el = document.getElementById("timer__btn-refresh");

const timer_desc_min_el = document.getElementById("timer__desc_part_min");
const timer_desc_sec_el = document.getElementById("timer__desc_part_sec");

const timer_protocol_1_el = document.getElementById("timer__protocol-1");
const timer_protocol_2_el = document.getElementById("timer__protocol-2");
const timer_protocol_3_el = document.getElementById("timer__protocol-3");

hide_dom(timer_skip_el);
hide_dom(timer_refresh_el);
hide_dom(timer_prefs_el); // ToDo

// - - - - setUp - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
reset_complete();
set_is_pruefung_zweigeteilt();


// - - - - eventListeners - - - - - - - - - - - - - - - - - - - - - - - - - - -
timer_start_stop_el.addEventListener('click',
  function() {
    if (is_timer_running == false) {
      pruefungsteil = 1;
      start_timer();
    } else {
      pruefungsteil = 0;
      stop_timer();
    }
});


timer_refresh_el.addEventListener('click',
  function() {
    reset_complete();
    hide_dom(timer_refresh_el);
    show_dom(timer_start_stop_el);
});


timer_fullscreen_el.addEventListener('click',
  enterFullscreen
);
// fullscreen-listener
add_fullscreenchange_listeners()


// - - - - functions - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// timer
// startet den timer
function start_timer(){
  request_wakelock();
  is_timer_running = true;
  set_timestamp_start();
  timer_start_stop_el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 24 24" width="32"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z" style="fill:white"/></svg>`
  timer_start_stop_el.classList.add('btn-danger');
  timer_start_stop_el.classList.remove('btn-success');
  show_dom(timer_skip_el);
  hide_dom(timer_prefs_el)
  timer_down = setInterval(update_timer, 1000);
  set_protocol_times();
  // Transition erst jetzt setzen, damit beim (Neu-)Laden der Seite
  // kein Flackern auftaucht
  set_background_transition_property();
}


function stop_timer(){
  release_wakelock();
  if (is_pruefung_done){
    // reset without protocol
    // change button to reset
    reset_exam_done();
  } else {
    reset_complete(); // reset everything
  }
  clearInterval(timer_down);
}

function update_timer(){
  // zweiter Prüfungsteil beginnt _fast_: Übergang zum zweiten Teil
  if (pruefungsteil == 2 && is_pruefung_pausiert == true){
    document.body.classList.add('background_pause');
  }
  // zweiter Prüfungsteil beginnt
  if (pruefungsteil == 2 && is_pruefung_pausiert == false){
    document.body.classList.remove('background_pause');
    if (time <= 0){
      // Ende der Prüfungszeit
      set_timestamp_end();
      timer_protocol_3_el.innerHTML = get_current_time_as_string(timestamp_end);
      is_pruefung_done = true;
      stop_timer();
    }
    // ist es eine zweigeteilte Prüfung im zweiten Teil?
    // falls ja, ersten Teil markieren
    if (time >= pruefungszeit_teil_2_davon_teil_1*60){
      document.body.classList.add('background_zweigeteilt');
    } else {
      document.body.classList.remove('background_zweigeteilt');
    }
  }

  // Anzeige der aktuellen Countdown-Zeit
  let mins = Math.floor(time/60);
  let secs = time % 60;

  mins = mins < 10 ? '0' + mins : mins;
  secs = secs < 10 ? '0' + secs : secs;

  timer_desc_min_el.innerHTML = mins;
  timer_desc_sec_el.innerHTML = secs;

  // zweiter Prüfungsteil beginnt _gleich_: Übergang zum zweiten Teil
  if (time <= 0 && pruefungsteil == 1 && is_pruefung_pausiert == false){
    skip_to_part2()
  }
  // zweiter Prüfungsteil beginnt; Pause vorbei
  if  (time <= 0 && pruefungsteil == 2 && is_pruefung_pausiert == true){
    is_pruefung_pausiert = false;
    time = Math.ceil(pruefungszeit_teil_2 * 60)
    timer_protocol_2_el.innerHTML = get_current_time_as_string(timestamp_skip);
  }
  time--;
}


function skip_to_part2(){
  // erster Teil vorbei / vorzeitig abgebrochen
  // Mini-Pause startet
  is_pruefung_pausiert = true;
  time = Math.round(pruefungszeit_uebergang * 60);
  pruefungsteil = 2;

  hide_dom(timer_skip_el);
  set_timestamp_skip();
}


timer_skip_el.addEventListener('click',
  function(){
    skip_to_part2();
    is_skipped = true;
  }
)


function set_is_pruefung_zweigeteilt(){
  if (pruefungszeit_teil_2_davon_teil_1>0){
    is_pruefung_zweigeteilt = true;
  } else {
    is_pruefung_zweigeteilt = false;
  }
  if (pruefungszeit_teil_2_davon_teil_1>=pruefungszeit_teil_2){
    is_pruefung_zweigeteilt = false;
    console.warn('Zweigeteilte Prüfung; Übergangszeit ist größer als die Gesamtzeit in Teil 2. Zweiteilung wird ignoriert.')
  }
  pruefungszeit_teil_2_davon_teil_1 = pruefungszeit_teil_2 - pruefungszeit_teil_2_davon_teil_1;
}

// - - - - fullscreen - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Vollbild - fullscreen
// Quelle: https://wiki.selfhtml.org/wiki/JavaScript/Fullscreen
function enterFullscreen() {
  console.log('ENTER FULL')
  if(document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  } else if(document.documentElement.msRequestFullscreen) {      // for IE11 (remove June 15, 2022)
    document.documentElement.msRequestFullscreen();
  } else if(document.documentElement.webkitRequestFullscreen) {  // iOS Safari
    document.documentElement.webkitRequestFullscreen();
  }
}

function toggle_is_fullscreen(){
  if (is_fullscreen){
    is_fullscreen = false;
  } else {
    is_fullscreen = true;
  }
}

function add_fullscreenchange_listeners(){
  // Quelle: https://www.w3schools.com/jsref/event_fullscreenchange.asp
  /* Standard syntax */
  document.addEventListener("fullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer_fullscreen_button();
  });
  /* Firefox */
  document.addEventListener("mozfullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer_fullscreen_button();
  });
  /* Chrome, Safari and Opera */
  document.addEventListener("webkitfullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer_fullscreen_button();
  });
  /* IE / Edge */
  document.addEventListener("msfullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer_fullscreen_button();
  });
}

function toggle_is_fullscreen(){
  if (is_fullscreen){
    is_fullscreen = false;
  } else {
    is_fullscreen = true;
  }
}

function set_visibility_of_timer_fullscreen_button(){
  if (is_fullscreen){
    hide_dom(timer_fullscreen_el)
  } else {
    show_dom(timer_fullscreen_el)
  }
}


// - - - - Uhrzeit - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// gibt die aktuelle Uhrzeit als String hh:mm zurück
// verrechnet auch die Überbrückungspause
function get_current_time_as_string(date){
  // https://stackoverflow.com/questions/85116/display-date-time-in-users-locale-format-and-time-offset
  // .getTimezoneOffset() returns the time zone offset in minutes, .getTime() is in ms, hence the x 60000
  // date_local_time = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  date_local_time = new Date(date.getTime() + server_versatz * 3600000); // h in ms
  // console.log("lokale Uhrzeit:" + date_local_time.toString())
  // console.log("ausgeg. Uhrzeit:" + date.toString())
  var hours = date_local_time.getHours();
  var minutes = date_local_time.getMinutes();
  hours = hours<10 ? '0' + hours : hours;
  minutes = minutes<10 ? '0' + minutes : minutes;
  return hours + ":" + minutes
}

// - - - - protocol - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reset_protocol_times(){
  timer_protocol_1_el.innerHTML = "--:--";
  timer_protocol_2_el.innerHTML = "--:--"
  timer_protocol_3_el.innerHTML = "--:--"
}

function set_protocol_times(){
  if (pruefungsteil==1){
    timer_protocol_1_el.innerHTML = get_current_time_as_string(timestamp_start);
  }
  if (pruefungsteil==2){
    timer_protocol_3_el.innerHTML = get_current_time_as_string(timestamp_end);
  }
}

// timestamps = dates
function set_timestamp_start(){
  timestamp_start = new Date();
  if (is_pruefung_zweigeteilt){
    console.log("START (zweigeteilte Prüfungszeit in Teil 2):\n" + timestamp_start);
  } else {
    console.log("START:\n" + timestamp_start);
  }

}

function set_timestamp_skip(){
  timestamp_skip = new Date();
  if (timestamp_skip-timestamp_start>pruefungszeit_teil_1*60000){
    timestamp_skip = new Date(timestamp_start.getTime() + pruefungszeit_teil_1*60000);
  }
  console.log("ZWEITER TEIL:\n" + timestamp_skip);
}

function set_timestamp_end(){
  timestamp_end = new Date();
  if (timestamp_end-timestamp_skip>pruefungszeit_teil_2*60000){
    timestamp_end = new Date(timestamp_skip.getTime() + pruefungszeit_teil_2*60000);
  }
  console.log("ENDE:\n" + timestamp_skip);
}


// - - - - display - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// setzt die Anzeige auf Ursprungsniveau - Ausgangsdaten
function reset_timer_display(){
  pruefungszeit_teil_1_checked = pruefungszeit_teil_1;
  // check for integer
  if (pruefungszeit_teil_1 % 1 !== 0){
    pruefungszeit_teil_1_checked = Math.floor(pruefungszeit_teil_1)
    // console.log(pruefungszeit_je_teil_minutes_checked)
  }
  // check for lower than 10min
  if (pruefungszeit_teil_1_checked < 10) {
    timer_desc_min_el.innerHTML = '0' + pruefungszeit_teil_1_checked;
    if (pruefungszeit_teil_1_checked < 1){
      timer_desc_min_el.innerHTML = '00'
    }
  } else {
    timer_desc_min_el.innerHTML = pruefungszeit_teil_1_checked;
  }
  // check for seconds; lower than 10
  sec_mod_60 = Math.ceil(((pruefungszeit_teil_1)*60) % 60)
  if (sec_mod_60 < 10) {
    timer_desc_sec_el.innerHTML = '0' + sec_mod_60;
  } else {
    timer_desc_sec_el.innerHTML = sec_mod_60;
  }

}

function hide_dom(ele){
  ele.style.display = 'none';
}

function show_dom(ele){
  ele.style.removeProperty("display");
}

function reset_complete(){
  pruefungsteil = 0;
  is_pruefung_pausiert = false;
  is_pruefung_done = false;
  is_timer_running = false;
  is_skipped = false;
  time = Math.ceil(pruefungszeit_teil_1 * 60);
  // display
  reset_protocol_times();
  reset_timer_display();
  timer_start_stop_el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 24 24" width="32"><path d="M0 0h24v24H0z" fill="none"/><path d="M8 5v14l11-7z" style="fill:white"/></svg>`
  timer_start_stop_el.classList.add('btn-success');
  timer_start_stop_el.classList.remove('btn-danger');
  document.body.classList.remove('background_pause');
  document.body.classList.remove('background_zweitgeteilt');
  hide_dom(timer_skip_el);
  // show_dom(timer_prefs_el);
}

function reset_exam_done(){
  show_dom(timer_refresh_el);
  hide_dom(timer_start_stop_el);
}


function set_background_transition_property(){
  document.body.style.setProperty("-webkit-transition", "all .7s");
  document.body.style.setProperty("-moz-transition", "all .7s");
  document.body.style.setProperty("-ms-transition", "all .7s");
  document.body.style.setProperty("-o-transition", "all .7s");
  document.body.style.setProperty("transition", "all .7s");
}


// wake lock
// https://davidwalsh.name/wake-lock-api
//
async function request_wakelock(){
  try {
    lock = await navigator.wakeLock.request('screen');
  } catch (err) {
    // Error or rejection
    console.log('Wake Lock error: ', err);
  }
}

async function release_wakelock(){
  await lock.release();
}