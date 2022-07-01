const pruefungszeit_je_teil_minutes = 10; // in min
const pruefungszeit_uebergang_minutes = 0.25; // in min => 15sec;

const pruefungsteil_1_text = "1. Teil: Vortrag";
const pruefungsteil_2_text = "2. Teil";
const pruefungsteil_uebergang_text = "Übergang";
const pruefungsteil_reset_text = "- zurückgesetzt -";
/*
!!!
Pausenzeit nicht größer als 0.5 Minuten wählen, da diese lediglich als Übergang
gedacht ist und nicht als Pause in der Prüfung selbst. Diese Zeit wird am Ende
für die Angabe der Prüfungszeit wieder "herausgerechnet", damit die Protokoll-
daten bzw. -zeiten stimmen.
*/


/*
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Harald Hentschel; https://twitter.com/Mr_DblH
Lizenz CC BYNC: https://creativecommons.org/licenses/by-nc/4.0/
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
var timer_down;
var timestamp_start;
var timestamp_skip;
var timestamp_end;

var is_overlay_shown = false;
var is_fullscreen = false;
var is_timer_running = false;
var is_pruefung_pausiert = false;
var is_skipped = false;

let time = pruefungszeit_je_teil_minutes * 60;
let pruefungsteil = 1;

// - - - - getElements - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const timer_min_el = document.getElementById("timer__part--min");
const timer_sec_el = document.getElementById("timer__part--sec");
const timer_control_el = document.getElementById("timer__btn--control");
const timer_fullscreen_el = document.getElementById("timer__btn--fullscreen");
const timer_skip_el = document.getElementById("timer__btn--skip");
const timer_descr_1_el = document.getElementById("timer__descr-1");
const timer_descr_2_el = document.getElementById("timer__descr-2");

const timer_protocol_1_el = document.getElementById("timer__protocol-1");
const timer_protocol_2_el = document.getElementById("timer__protocol-2");
const timer_protocol_3_el = document.getElementById("timer__protocol-3");
const timer_protocol_dummy_1_el = document.getElementById("timer__protocol-dummy-1");
const timer_protocol_dummy_2_el = document.getElementById("timer__protocol-dummy-2");
const timer_protocol_left_el = document.getElementById("timer__protocol-left");
const timer_protocol_right_el = document.getElementById("timer__protocol-right");

const timer_license_el = document.getElementById("timer__license");

const timer_ettings_and_controls = document.getElementById("timer__settings_and_controls");
const timer_title_el = document.getElementById("timer__title");

// - - - - setUp - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Anzeige setzen
reset_timer_display()

timer_title_el.innerHTML = pruefungsteil_1_text;

timer_descr_1_el.innerHTML = pruefungszeit_je_teil_minutes + "min +"
timer_descr_2_el.innerHTML = pruefungszeit_je_teil_minutes + "min"

timer_skip_el.classList.add('hide');
timer_skip_el.addEventListener('click',
  function(){
    skip_to_part2();
    is_skipped = true;
    set_timestamp_skip();
  }
)

hide_protocol();

// - - - - eventListeners - - - - - - - - - - - - - - - - - - - - - - - - - - -
timer_control_el.addEventListener('click',
  function() {
    if (is_timer_running == false) {
      start_timer();
    } else {
      stop_timer();
    }
});

timer_fullscreen_el.addEventListener('click',
  enterFullscreen
);

// fullscreen-listener
add_fullscreenchange_listeners()


// - - - - functions - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// aktualisert die divs/spans
function update_timer(){
  if (pruefungsteil == 2 && is_pruefung_pausiert == true){
    timer_title_el.innerHTML = pruefungsteil_uebergang_text;
    document.body.classList.add('background_pause');
  }
  if (pruefungsteil == 2 && is_pruefung_pausiert == false){
    timer_title_el.innerHTML = pruefungsteil_2_text;
    document.body.classList.remove('background_pause');
    timer_descr_1_el.classList.add('timer__descr--done');
    set_timestamp_skip();
  }
  if  (time == 0 && pruefungsteil == 2 && is_pruefung_pausiert == false){
    // Ende der Prüfungszeit
    timer_title_el.innerHTML = "Ende der Prüfungszeit";
    stop_timer();
  }

  let mins = Math.floor(time/60);
  let secs = time % 60;

  mins = mins < 10 ? '0' + mins : mins;
  secs = secs < 10 ? '0' + secs : secs;

  timer_min_el.innerHTML = mins;
  timer_sec_el.innerHTML = secs;

  // time < 0: reset
  if (time <= 0 && pruefungsteil == 1 && is_pruefung_pausiert == false){
    skip_to_part2()
  }
  if  (time <= 0 && pruefungsteil == 2 && is_pruefung_pausiert == true){
    // zweiter Teil startet
    is_pruefung_pausiert = false;
    time = pruefungszeit_je_teil_minutes * 60
  }
  time--;
}


// startet den timer
function start_timer(){
  is_timer_running = true;
  timer_title_el.innerHTML = pruefungsteil_1_text;
  change_color_of_stop_el_if_fullscreen_and_running();
  set_timestamp_start();

  timer_down = setInterval(update_timer, 1000);
  timer_control_el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 24 24" width="32"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z" style="fill:white"/></svg>`
  timer_control_el.classList.remove('timer__btn--start');
  timer_control_el.classList.add('timer__btn--stop');
  timer_skip_el.classList.remove('hide')
  timer_descr_1_el.classList.remove('timer__descr--done');
  timer_protocol_left_el.classList.add('conceal');
  timer_protocol_right_el.classList.add('conceal');
  set_protocol_times();
}


// stoppt den timer
function stop_timer(){
  set_timestamp_end();
  set_protocol_times();
  is_timer_running = false;
  change_color_of_stop_el_if_fullscreen_and_running();
  clearInterval(timer_down);
  timer_control_el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 24 24" width="32"><path d="M0 0h24v24H0z" fill="none"/><path d="M8 5v14l11-7z" style="fill:white"/></svg>`
  timer_control_el.classList.add('timer__btn--start');
  timer_control_el.classList.remove('timer__btn--stop');
  is_pruefung_pausiert = false;
  pruefungsteil = 1;
  if (time != 0){
    timer_title_el.innerHTML = pruefungsteil_reset_text;
    setTimeout(function(){
      timer_title_el.innerHTML = pruefungsteil_1_text;
    }, 1500);
  }
  time = pruefungszeit_je_teil_minutes * 60;

  reset_timer_display();

  timer_skip_el.classList.add('hide');
  document.body.classList.remove('background_pause');
  timer_descr_1_el.classList.remove('timer__descr--done');

  timer_protocol_left_el.classList.remove('conceal');
  timer_protocol_right_el.classList.remove('conceal');
}






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

function change_color_of_stop_el_if_fullscreen_and_running(){
  if (is_fullscreen && is_timer_running){
    timer_control_el.classList.add('timer__btn--stop--fullscreen');
    timer_skip_el.classList.add('timer__btn--skip--fullscreen');
  } else {
    timer_control_el.classList.remove('timer__btn--stop--fullscreen');
    timer_skip_el.classList.remove('timer__btn--skip--fullscreen');
  }
}

function set_visibility_of_timer__settings_and_controls(){
  if (is_fullscreen){
    timer_fullscreen_el.classList.add('hide')
    timer_license_el.classList.add('hide')
  } else {
    timer_fullscreen_el.classList.remove('hide')
    timer_license_el.classList.remove('hide')
  }
  change_color_of_stop_el_if_fullscreen_and_running();
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
    set_visibility_of_timer__settings_and_controls();
  });
  /* Firefox */
  document.addEventListener("mozfullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer__settings_and_controls();
  });
  /* Chrome, Safari and Opera */
  document.addEventListener("webkitfullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer__settings_and_controls();
  });
  /* IE / Edge */
  document.addEventListener("msfullscreenchange", function() {
    toggle_is_fullscreen();
    set_visibility_of_timer__settings_and_controls();
  });
}




function skip_to_part2(){
  // erster Teil vorbei / vorzeitig abgebrochen
  // Mini-pause startet
  is_pruefung_pausiert = true;
  time = Math.round(pruefungszeit_uebergang_minutes * 60);
  pruefungsteil = 2;
  timer_skip_el.classList.add('hide');

  set_timestamp_skip();
  timer_protocol_2_el.innerHTML = get_current_time_as_string(timestamp_skip);
}

// setzt alle angegebenen Zeiten auf volle Sekunden
function check_pruefungszeiten(){

}

// setzt die Anzeige auf Ursprungsniveau - Ausgangsdaten
function reset_timer_display(){
  if (pruefungszeit_je_teil_minutes < 10) {
    timer_min_el.innerHTML = '0' + pruefungszeit_je_teil_minutes;
    if (pruefungszeit_je_teil_minutes < 1){
      timer_min_el.innerHTML = '00'
    }
  } else {
    timer_min_el.innerHTML = pruefungszeit_je_teil_minutes;
  }
  timer_sec_el.innerHTML = '00';
}


// versteckt die Protokollzeiten komplett
// nur zu Beginn
function hide_protocol(){
  timer_protocol_1_el.classList.add('conceal');
  timer_protocol_2_el.classList.add('conceal');
  timer_protocol_3_el.classList.add('conceal');
  timer_protocol_dummy_1_el.classList.add('conceal');
  timer_protocol_dummy_2_el.classList.add('conceal');
  timer_protocol_left_el.classList.add('conceal');
  timer_protocol_right_el.classList.add('conceal');
}

function set_protocol_times(){
  if (pruefungsteil==1){
    timer_protocol_1_el.classList.remove('conceal');
    timer_protocol_dummy_1_el.classList.remove('conceal');
    timer_protocol_2_el.classList.remove('conceal');
    timer_protocol_dummy_2_el.classList.remove('conceal');
    timer_protocol_3_el.classList.remove('conceal');

    timer_protocol_1_el.innerHTML = get_current_time_as_string(timestamp_start);
    timer_protocol_2_el.innerHTML = "?";
    timer_protocol_3_el.innerHTML = "?";
  }
  if (pruefungsteil==2){
    timer_protocol_3_el.innerHTML = get_current_time_as_string(timestamp_end);
  }
}


// gibt die aktuelle Uhrzeit als String hh:mm zurück
// verrechnet auch die Überbrückungspause
function get_current_time_as_string(date){
  if (is_pruefung_pausiert==false && pruefungsteil==2){
    // Prüfungsende fürs Protokoll; Pause rausrechnen
    var current = new Date();
    var delta_start_end_fake_in_ms = (timestamp_skip-timestamp_start) + (current-timestamp_skip);
    if (delta_start_end_fake_in_ms>pruefungszeit_je_teil_minutes*2*60000){
      delta_start_end_fake_in_ms = pruefungszeit_je_teil_minutes*2*60000;
    }
    console.log(delta_start_end_fake_in_ms);
    date = new Date(timestamp_start.getTime() + delta_start_end_fake_in_ms); // 60000 millisecs per min
  }
  var hours = date.getHours();
  var minutes = date.getMinutes();
  hours = hours<10 ? '0' + hours : hours;
  minutes = minutes<10 ? '0' + minutes : minutes;
  return hours + ":" + minutes
}

// timestamps = dates
function set_timestamp_start(){
  timestamp_start = new Date();
}

function set_timestamp_skip(){
  timestamp_skip = new Date();
}

function set_timestamp_end(){
  timestamp_end = new Date();
}