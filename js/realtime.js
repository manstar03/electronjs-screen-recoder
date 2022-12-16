/* eslint-disable no-undef */
/* eslint-env jquery */
let previousWordZ = 0;
var tracker_found = false;
var OFFSET_GDLINE;
var authorizationToken;
var lastrecognizingoffset = 0;
var RecognizedBool = true;
var punctuationMode = false;
var datepause;
var dateStarted;
var old_pack = null;
let WINDOW_SLICE = 8;
var already_processed = new Set([]);

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
/* Crédit User */
var dmeopt = false; //Exit looper
var total_credit;

// const REFRESH_TRANSCRIBE = 540; //540
const REFRESH_TRANSCRIBE = 540; //540

var REFRESH_MINUTES = 60 * 1000; // 10 secondes
var Rest = REFRESH_MINUTES / 1000;
var pausePLS = false;

/* Duration of token */
var DurationOfRefreshToken;

var old_status = "microphone";

/* ScreenShot */
var AllScreenShotFile = [];
var id_screenshotinDOM = 0;
var candoascreen = true;
var MaxScreenShot = 20; //Ici le max par session

/* Highlighting */
var highlight_buffer = [];
var highlight_global = null;
var releaseClickButton = true;
var HighlightingDate;
var SimpleClick_handle = false;
var LongPressClick_handle = false;
var candoaHighlight = true;
var Dotfind = false;

var SpeechSDK;
var reco;
var Mots = [];
var num_buf_nl = 0;

// console.log = function () { }


// DIAR
var div_recognized;
var try_global_DIV;

let PUNKT_VEKT = (".", "!", "।", "。", "?", "؟", ";", "か", "？");

/* ========================= */

/* Chrono */
var dictation_finished = false;
/* DOM Eternal */
var maincontainer = document.createElement("div");
var mainrecognizingcontainer = document.createElement("div");
/* Upload */

var dDUR = document.createElement("div");
var IdTrscpt = null;

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

/* Display */
Initialize(async function (speechSdk) {
  SpeechSDK = speechSdk;
  // in case we have a function for getting an authorization token, call it.
  if (typeof RequestAuthorizationToken === "function") {
    await RequestAuthorizationToken();
  }
});

function getAudioConfig() {
  return SpeechSDK.AudioConfig.fromStreamInput(output);
}



function getSpeechConfig(sdkConfigType) {
  let speechConfig;
  speechConfig = sdkConfigType.fromAuthorizationToken(
    authorizationToken,
    "francecentral"
  );
  speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
  speechConfig.setProfanity(SpeechSDK.ProfanityOption.Raw);
  speechConfig.requestWordLevelTimestamps();
  if (language != "record_only") {
    speechConfig.speechRecognitionLanguage = language;
  } else {
    return false;
  }
  //TRANSLATE
  // if (
  //   translate_language != "default" &&
  //   language.split("-")[1] == translate_language
  // ) {
  translate_language = "default";
  // }

  return speechConfig;
}

function applyCommonConfigurationTo(recognizer) {
  recognizer.recognizing = onRecognizing;
  recognizer.recognized = onRecognized;
  recognizer.canceled = onCanceled;
  recognizer.sessionStarted = onSessionStarted;
  recognizer.sessionStopped = onSessionStopped;
  return recognizer;
}


function preprocessSentTT(sent) {
  sent = sent.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
  sent = sent.replace(/\s{2,}/g, " ");
  return sent;
}



function sentenceToWordList(sent) {
  return sent.split(" ");
}

function word_in_tt(word) {
  // add coma to check in the list
  word = word.trim();
  // space MANDATORY : required to avoid colision words such as : "de," included in marmande,
  word = " " + word + ",";
  // Check if they are in one of the keys from all_topics (array jsonified) => add a coma
  // if found, return values of the dictionnary
  for (key in all_topics) {
    if (key.includes(word)) {
      return all_topics[key];
    }
  }
  return false;
}

function mwe_in_sent(sent) {
  for (mwe_key in all_topics["mwe"]) {
    if (sent.includes(mwe_key)) {
      key_message = all_topics["mwe"][mwe_key];
      return all_topics[key_message];
    }
  }
  return false;

}

async function process_topics(low_text) {
  if (tracker_found) {
    return;
  }
  // preprocess current sentence : lowwer + Remove all punkt + special chars
  let sent = preprocessSentTT(low_text);
  // get list of unique words in current sentence =>  and split by space.
  let word_list = sentenceToWordList(sent);

  for (const word of word_list) {
    // Check if it is already processed
    if (word in already_processed) {
      continue
    }
    let found = word_in_tt(word);
    if (found) {
      // If yes, then stop process until next recognizing
      chrome.runtime.sendMessage({
        type: "open_topic_tracker",
        data: found,
      });
      tracker_found = true;
      break
    } else {
      // If not ,add the word to the buffer li
      already_processed.add(word);
    }
  }
  let mwe_found = mwe_in_sent(sent);
  if (mwe_found) {
    chrome.runtime.sendMessage({
      type: "open_topic_tracker",
      data: mwe_found,
    });
    tracker_found = true;
  }
}






async function onRecognizing(sender, recognitionEventArgs) {

  let Iresult = recognitionEventArgs.result;
  let offset_recognizing;
  if (BIG_OFFSET != 0) {
    offset_recognizing =
      parseFloat(parseTime(Iresult.offset)) + BIG_OFFSET + OFFSET_MIMI;
  } else {
    offset_recognizing = OFFSET_MIMI + parseFloat(
      parseTime(Iresult.offset)
    );
  }
  let dataZ = offset_recognizing.toFixed(2);
  let duration = parseFloat(parseTime(Iresult.duration));
  let Itext = Iresult.text;
  let texte_lo = Itext.toLowerCase();
  if (do_topic) {
    // async call, no await needed.
    process_topics(texte_lo);
  }

  //Translation
  // if (translate_language != "default") {
  // texte = await translate_text(texte);
  // }
  let durationOfAllPreviousWord = 0.0;
  //First Occurence of Recognizing, capitalize first char.
  if (lastrecognizingoffset == 0) {
    let pushing_text;
    if (RecognizedBool) {
      pushing_text = Itext.charAt(0).toUpperCase() + Itext.slice(1);
    } else {
      pushing_text = Itext;
    }
    Mots.push({
      dataZ: dataZ,
      duration: duration,
      text: pushing_text,
    });
    if (highlight_global != null) {
      highlight_buffer.push({ dataZ: dataZ, hightlight: highlight_global });
    }

    /* OUTPUT */
    let div = document.createElement("div");
    div.setAttribute("data-start", Mots[0].dataZ);
    div.setAttribute("data-sequence", "recognizing");

    let span = document.createElement("span");
    span.setAttribute("data-z", Mots[0].dataZ);
    span.innerHTML = Mots[0].text;
    div.append(span);
    mainrecognizingcontainer.appendChild(div);

    if (!mainrecognizingcontainer.innerHTML.includes("[...]")) {
      div.insertAdjacentHTML("beforeend", " [...] ");
    }
    RecognizedBool = false;
    lastrecognizingoffset = dataZ;
  } else {
    //Translation ?
    if (translate_language == "default") {
      // let txt_bflp = ;
      for (let u = 0; u < Mots.length; u++) {
        let check_word = Mots[u].text.trim().toLowerCase() + " "
        let IndexOfWord = texte_lo.trim().toLowerCase().indexOf(check_word);
        if (IndexOfWord != -1 && IndexOfWord == 0) {
          let word_dur = parseFloat(Mots[u].duration);
          texte_lo = texte_lo.replace(check_word, " ");
          durationOfAllPreviousWord += word_dur;
        } else {
          Mots.splice(u, 1);
        }
      }
    }

    //New words
    if (texte_lo.trim() != "") {
      dataZ = offset_recognizing + parseFloat(durationOfAllPreviousWord);
      duration = duration - parseFloat(durationOfAllPreviousWord);

      //Replace last same DataZ
      for (let u = 0; u < Mots.length; u++) {
        if (Mots[u].dataZ >= dataZ) {
          Mots.pop(u);
        }

      }

      if (releaseClickButton || SimpleClick_handle) {
        if (highlight_global != null) {
          let same = false;

          for (let g = 0; g < highlight_buffer.length; g++) {
            if (highlight_buffer[g].dataZ == dataZ) {
              same = true;
            }
          }

          if (!same) {
            highlight_buffer.push({
              dataZ: dataZ.toFixed(2),
              hightlight: highlight_global,
              release: true,
            });
          }
        }
      } else {
        if (highlight_global != null) {
          let same = false;

          for (let g = 0; g < highlight_buffer.length; g++) {
            if (highlight_buffer[g].dataZ == dataZ) {
              same = true;
              break;
            }
          }

          if (!same) {
            highlight_buffer.push({
              dataZ: dataZ.toFixed(2),
              hightlight: highlight_global,
            });
          }
        }
      }


      Mots.push({
        dataZ: dataZ.toFixed(2),
        duration: duration.toFixed(2),
        text: texte_lo,
      }); //New words

      let div = document.createElement("div");
      div.setAttribute("data-start", Mots[0].dataZ);
      div.setAttribute("data-sequence", "recognizing");

      if (translate_language != "default") {
        let span = document.createElement("span");
        span.innerHTML = texte_lo;

        try {
          span.classList.add(highlight_buffer[0].hightlight);
        } catch (error) { }

        div.append(span);
      } else {
        //Get all Word
        for (
          let u = 0;
          u < Mots.length;
          u++
        ) {
          let span = document.createElement("span");
          span.setAttribute("data-z", Mots[u].dataZ);
          span.innerHTML = Mots[u].text;
          for (let y = 0; y < highlight_buffer.length; y++) {
            if (highlight_buffer[y].dataZ == Mots[u].dataZ) {
              span.classList.add(highlight_buffer[y].hightlight);
            }
          }
          div.append(span);
        }
      }

      try {
        mainrecognizingcontainer.removeChild(
          mainrecognizingcontainer.lastChild
        );
      } catch (error) { }
      // console.log("Recognizing text : ", div)

      mainrecognizingcontainer.innerHTML = "";
      mainrecognizingcontainer.appendChild(div);
      if (!mainrecognizingcontainer.innerHTML.includes("[...]")) {
        div.insertAdjacentHTML("beforeend", " [...] ");
      }
      chrome.runtime.sendMessage({
        type: "SetContext",
        subtype: "mainrecognizingcontainer",
        data: mainrecognizingcontainer.innerHTML,
      });
    }
  }
  if (do_nl) {
    nb_words = Mots.length;
    //8 in nlp papers // but one "Mot" => multiple space.
    new_nb = Math.floor(nb_words / WINDOW_SLICE);
    if (new_nb != num_buf_nl) {
      slices = Mots.slice(num_buf_nl * WINDOW_SLICE, new_nb * WINDOW_SLICE);
      OFFSET_GDLINE = parseFloat(slices[0].dataZ) + BIG_OFFSET + OFFSET_MIMI;
      let text_to_send = Object.entries(slices)
        .map(([k, v]) => (`${v.text}`))
        .join('').replace(/ +(?= )/g, '');
      // Handle GUidelines
      let bloc = text_to_send;
      let uuid = the_uuid_guidelines;
      if (uuid != "default") {
        post(guideline_url_root + "/rt_guidelines_rc", { uuid, bloc }, null, handleGuidelines);
      }


      let text = text_to_send;
      let id_trs = "";
      let token = tokenooti;
      if (token != "") {
        nb_mot = text.split(" ").length;
        //O NEED TO PROCESS TOO BIG SENTENCES
        if (nb_mot >= 2 && nb_mot < 42 && DO_THE_SENTI) {
          post(senty_url_root + "/catch_nootinex", { uuid, text, id_trs, token }, null, handleSenti);
        }
      }
      num_buf_nl = new_nb;
    }
  }

}

function onRecognized(sender, recognitionEventArgs) {
  var result = recognitionEventArgs.result;
  try {
    onRecognizedResult(result);
  } catch (error) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!The onRecognizedResult code failed silently", error);
  }
}



const handleSenti = (data) => {
  //console.log(data);
  // warning data is a list in case there are multiple sentences sent.
  if (data["message"] == "OK") {
    let posi = parseFloat(data["data"][0].p);
    let nega = parseFloat(data["data"][0].ng);
    if (posi > 0.8) {
      chrome.runtime.sendMessage({
        type: "new_sentie_pos",
        data: ""
      });
    } else if (nega > 0.8) {
      chrome.runtime.sendMessage({
        type: "new_sentie_neg",
        data: ""
      });
    }
  } else {
    console.log(" SENTIMENT BUG : ", data, "\n")
  }
}


// function handle_gd_buff() {

// }

function reset_buffer_guideline() {
  if (PREVIOUS_GUIDELINE != null) {
    // FIXME attention PREVIOUS_GUIDELINE peut etre une liste.
    FINAL_GUIDELINES[PREVIOUS_KEY] = {
      "guideline": PREVIOUS_GUIDELINE,
      "text": BUFFER_TEXT
    }
  }
  BUFFER_TEXT = "";
}

function add_data_to_buffer_gd(Mots, data_z_prev_q) {
  if (data_z_prev_q == null) {
    return;
  }
  if (PREVIOUS_GUIDELINE != null) {
    let start_buffer = parseFloat(data_z_prev_q);
    // Observer mot et construire ce qu'il faut ajouter dans buffer en fonction.
    let idx_start = null;
    for (let i = 0; i < Mots.length; i++) {
      let data_z = parseFloat(Mots[i].dataZ)
      if (data_z >= start_buffer) {
        idx_start = i;
        break;
      }
    }
    if (idx_start == null) {
      return;
    }
    slices = Mots.slice(idx_start);
    let text_to_send = "";
    if (slices.length != 0) {
      text_to_send = Object.entries(slices)
        .map(([k, v]) => (`${v.text}`))
        .join('').replace(/ +(?= )/g, '');
    }
    // texte_bloc, result, OFFSET_GDLINE,offset_recognized
    if (BUFFER_TEXT != "") {
      BUFFER_TEXT += " ";
    }
    BUFFER_TEXT += text_to_send;
  }
}



const handleGuidelines = (data) => {
  if (data["status"] == "ok") {
    let GUIDELINE_MATCHED = data["guideline"];
    chrome.storage.sync.get(["list_guidelines"], function (res) {
      let LIST_GL = res.list_guidelines;
      LIST_GL.push(GUIDELINE_MATCHED);
      chrome.storage.sync.set({ list_guidelines: LIST_GL });
    });

    let the_key = (OFFSET_GDLINE).toString();
    reset_buffer_guideline();
    PREVIOUS_GUIDELINE = GUIDELINE_MATCHED;
    PREVIOUS_KEY = the_key;
    chrome.runtime.sendMessage({
      type: "GuidelineOk",
      data: GUIDELINE_MATCHED,
    });
  }
}


async function handleBufferRec(obj, cur_packed) {

  try {
    obj["Display"] = obj.NBest[0]["Display"];
    if ("Words" in obj.NBest[0]) {
      obj["Words"] = obj.NBest[0]["Words"];
    } else {
      obj["Words"] = [];
    }

    if (obj["Display"].trim() != "") {
      if (BIG_OFFSET != OLD_OFFSET) {
        // Same pack as previous so no reason updating.
        if (old_pack == cur_packed) {
          obj["OFFSET"] = OLD_OFFSET + OFFSET_MIMI;
        } else {
          obj["OFFSET"] = BIG_OFFSET + OFFSET_MIMI;
          OLD_OFFSET = BIG_OFFSET;
        }
      } else {
        obj["OFFSET"] = BIG_OFFSET + OFFSET_MIMI;
        OLD_OFFSET = BIG_OFFSET;
      }
      old_pack = cur_packed
      delete obj['NBest'];
      outGGTR["final_result"].push(obj);
      outGGTR["final_transcript"].push(obj["Display"]);
    }
  } catch (error) {
    console.log("There is an ERROR IN FINAL RESULT FINAL TRANSCTRIPT !!!!!!", error);
    //in case it bugged at the wrong place.
    if (outGGTR["final_result"].length != outGGTR["final_transcript"].length) {
      console.log("POPPING AS ERROR!!!!!!!!", error);
      outGGTR["final_result"].pop();
    }
  }
}


function add_previous_paragraph(speaker_id) {
  if (div_recognized.childNodes.length !== 0) {
    if (!div_recognized.classList.contains(speaker_id)) {
      div_recognized.classList.add(speaker_id);
    }
    if (!div_recognized.classList.contains("chitchat")) {
      div_recognized.classList.add("chitchat");
    }
    maincontainer.appendChild(div_recognized);
  }
}

function init_next_paragraph(new_speaker_id, _dataStart, _dataEnd) {
  //Reset
  // all the following are global variables
  try_global_DIV = document.createElement("div");
  try_global_DIV.setAttribute("id", "SpanDuration");
  try_global_DIV.innerHTML = displayRecordDuration(_dataStart.toString());
  div_recognized = document.createElement("div");
  let spannewline = document.createElement("br");
  // if last elm (div) has class chit chat : chitchat
  let lastBaby = maincontainer.lastChild
  if (lastBaby != undefined) {
    if (!lastBaby.classList.contains("chitchat")) {
      return;
    }
  }
  maincontainer.appendChild(spannewline);
  if (new_speaker_id == "microphone") {
    try_global_DIV.classList.add("mipmip");
  }
  maincontainer.appendChild(try_global_DIV);
  try {
    div_recognized.setAttribute("data-start", _dataStart);
  } catch {
    console.log("returned as not Mot[0] dataz")
    return;
  }
  div_recognized.setAttribute("data-end", _dataEnd.toFixed(2));
  div_recognized.setAttribute("style", "color:black");
  div_recognized.classList.add(new_speaker_id);
  div_recognized.classList.add("chitchat");
}


function check_if_same_diar(idx_diar, worddataz) {
  let infos = DIAR_DATA[idx_diar];
  let start = parseFloat(infos["s"]);
  let stop = parseFloat(infos["e"]);
  let type = infos["id"];
  if (worddataz < stop && worddataz >= start) {
    return [true, type];
  }
  return [false, ""];
}

function search_new_diar(word_data_z, idx_diar) {
  // return [
  // ok   or    oob
  // last index
  // speaker id
  // ]
  let tmp_idx, infost;
  for (let iter = 1; iter < 15; iter++) {
    tmp_idx = idx_diar + iter;
    infost = DIAR_DATA[tmp_idx];
    if (infost == undefined) {
      // if out of bound, lastindex is the on in diar data
      return ["oob", Math.max(tmp_idx - 1, 0), ONGOING_DIAR["id"]];
    }
    let new_speaker = infost["id"];
    let test_start = parseFloat(infost["s"]);
    let test_stop = parseFloat(infost["e"]);
    if (word_data_z < test_stop && word_data_z >= test_start) {
      return ["ok", tmp_idx, new_speaker];
    }
  }
}



function handleRecognized(result) {
  // Add 500 ms lag to limit bug with diar.

  if (!Mots.length) {
    return;
  }

  // CHECK THAT THERE ARE SOME WORDS in results.
  let KICKED_SPEAKER = CURRENT_DIAR;
  let WordLength = 0;
  let duration = parseFloat(parseTime(result.duration));
  let dataZ = parseFloat(parseTime(result.offset)) + BIG_OFFSET + OFFSET_MIMI;
  let offset_recognized = parseFloat(parseTime(result.offset)) + BIG_OFFSET + OFFSET_MIMI;
  let dataEnd = offset_recognized + duration;
  let obj = JSON.parse(result.json);
  delete obj['Id'];
  delete obj['RecognitionStatus'];
  delete obj['DisplayText'];
  let cur_packed = result.privResultId;
  if (old_pack == undefined) {
    old_pack = cur_packed;
  }
  handleBufferRec(obj, cur_packed);
  var texte_bloc = result.text.trim();



  if (do_nl) {
    let nbwnl = Mots.length;
    //8 in nlp papers // but one "Mot" => multiple space.
    slices = Mots.slice(num_buf_nl * WINDOW_SLICE);
    if (slices.length != 0) {
      OFFSET_GDLINE = parseFloat(slices[0].dataZ) + BIG_OFFSET + OFFSET_MIMI;
      let text_to_send = Object.entries(slices)
        .map(([k, v]) => (`${v.text}`))
        .join('').replace(/ +(?= )/g, '');
      // Handle GUidelines
      let bloc = text_to_send;
      let uuid = the_uuid_guidelines;
      if (uuid != "default") {
        post(guideline_url_root + "/rt_guidelines_rc", { uuid, bloc }, null, handleGuidelines);
      }


      // Handle Sents last reco.
      let text = text_to_send;
      let id_trs = "";
      let token = tokenooti;
      if (token != "") {
        nb_mot = text.split(" ").length;
        //O NEED TO PROCESS TOO BIG SENTENCES
        if (nb_mot >= 2 && nb_mot < 42 && DO_THE_SENTI) {
          post(senty_url_root + "/catch_nootinex", { uuid, text, id_trs, token }, null, handleSenti);
        }
      }
      num_buf_nl = 0;
    }
  }


  // nlp recognized
  //Translation
  // if (translate_language != "default") {
  //   texte = await translate_text(texte);
  // }

  try_global_DIV = document.createElement("div");
  try_global_DIV.setAttribute("id", "SpanDuration");
  try_global_DIV.innerHTML = displayRecordDuration(Mots[0].dataZ);

  let uppercase = false;


  for (let i = 0; i < Mots.length; i++) {
    WordLength = 0;
    let WordTrim = Mots[i].text.trim().replace(/[*]/, "[*]");
    if (WordTrim.split(" ")[1] != undefined) {
      let WordCounter = WordTrim.split(" ").length;
      for (let y = 0; y < WordCounter; y++) {
        try {
          WordLength += texte_bloc.trim().split(" ")[y].length + 1;
        } catch (error) {
          // another kind of silent fail
        }
      }
    } else {
      if (texte_bloc.trim().split(" ")[0].length == 0) {
        WordLength += WordTrim.length;
      } else {
        WordLength += texte_bloc.trim().split(" ")[0].length;
      }
    }
    let slicedtexte = texte_bloc.trim().slice(0, WordLength);

    var isValid = true;
    try {
      GeneralRegex = new RegExp(WordTrim, "i");
    } catch (e) {
      GeneralRegex = new RegExp(
        "LECASNARRIVERAIJAMAISCARAUCUNTESTNESTENMAJUSCULE",
        "i"
      );
      isValid = false;
    }

    if (slicedtexte.search(GeneralRegex) != -1) {
      //Recognized words
      let withoutspace = false;
      if (
        slicedtexte.slice(0, WordTrim.length + 1)[WordTrim.length + 1] ==
        "-"
      ) {
        Mots[i].text = WordTrim + "-";
        withoutspace = true;
      }
      if (
        slicedtexte.slice(0, WordTrim.length + 1)[WordTrim.length + 1] ==
        "'"
      ) {
        Mots[i].text = WordTrim + "'";
        withoutspace = true;
      }

      let regex = new RegExp(escapeRegExp(Mots[i].text), "i");

      if (slicedtexte.search(regex) != -1) {
        texte_bloc = texte_bloc.replace(regex, "");
      } else {
        Mots[i].text = slicedtexte;
        regex = new RegExp(escapeRegExp(Mots[i].text), "i");
        texte_bloc = texte_bloc.replace(regex, "");
      }

      if (uppercase) {
        if (!withoutspace) {
          Mots[i].text =
            Mots[i].text.charAt(0).toUpperCase() +
            Mots[i].text.slice(1) +
            " ";
        } else {
          Mots[i].text =
            Mots[i].text.charAt(0).toUpperCase() + Mots[i].text.slice(1);
        }
        uppercase = false;
      } else if (!withoutspace) {
        Mots[i].text += " ";
      }
      dataZ += parseFloat(Mots[i].duration);
    } else if (i == 0) {
      //recognized != recognizing
      if (Mots[0].dataZ != offset_recognized) {
        let regexOfFirstWordList = new RegExp(
          escapeRegExp(Mots[0].text.trim()),
          "i"
        );

        let FirstWordFromRecognized = slicedtexte.replace(
          regexOfFirstWordList,
          ""
        );
        FirstWordFromRecognized += " ";
        Mots.unshift({
          text: FirstWordFromRecognized,
          dataZ: offset_recognized.toFixed(2),
        });

        // console.log("word added at start : " + FirstWordFromRecognized);

        let regex = new RegExp(
          escapeRegExp(FirstWordFromRecognized.trim()),
          "i"
        );
        texte_bloc = texte_bloc.replace(regex, "");
      } else {
        //ca match entre RCNIZING et RCNIZED
        Mots[i].text = slicedtexte + " ";
        dataZ += parseFloat(Mots[i].duration);
        let regex;
        try {
          regex = new RegExp(escapeRegExp(Mots[i].text.trim()), "i");
        } catch (e) {
          regex = new RegExp(
            "LECASNARRIVERAIJAMAISCARAUCUNTESTNESTENMAJUSCULE",
            "i"
          );
        }
        texte_bloc = texte_bloc.replace(regex, "");
      }

    } else {
      Mots[i].text = slicedtexte + " ";
      dataZ += parseFloat(Mots[i].duration);
      let regex;
      try {
        regex = new RegExp(escapeRegExp(Mots[i].text.trim()), "i");
      } catch (e) {
        regex = new RegExp(
          "LECASNARRIVERAIJAMAISCARAUCUNTESTNESTENMAJUSCULE",
          "i"
        );
      }
      texte_bloc = texte_bloc.replace(regex, "");
    }

  }

  //Get the rest of texte_bloc and put it on the last word
  let nb_words = Mots.length;

  if (texte_bloc.trim() != "" && nb_words > 0) {
    if (Mots[nb_words - 1].dataZ == dataZ.toFixed(2)) {
      Mots[nb_words - 1].text += texte_bloc;
      console.log("rest of texte_bloc added to previousWord cause same dataZ");
    }
    Mots.push({
      text: texte_bloc,
      dataZ: dataZ.toFixed(2),
      rest: true,
      previouswordataZ: dataZ.toFixed(2),
    });
  }

  div_recognized = document.createElement("div");
  div_recognized.setAttribute("data-start", Mots[0].dataZ);
  div_recognized.setAttribute("data-end", dataEnd.toFixed(2));
  div_recognized.setAttribute("style", "color:black");
  div_recognized.classList.add("chitchat");

  //Get all Word
  Dotfind = false;
  let releaseCount = 0;
  highlight_buffer.map((el) => {
    if (el.release) {
      releaseCount++;
    }
  });


  if (DIAR_DATA.length > 0) {
    DO_DIAR = true;
  } else {
    DO_DIAR = false;
  }

  nb_words = Mots.length;
  until_new = false;

  // Prevent empty sentences from beeing added.
  let one_ok = false;
  for (let u = 0; u < nb_words; u++) {
    the_mot = Mots[u].text.trim();
    if (the_mot.length != 0) {
      if (/^[\p{L}0-9\s]+[.,?]?/u.test(the_mot)) {
        one_ok = true;
        break
      }
    }
  }
  if (!one_ok) {
    // console.log("returned because condition /^[\p{L}0-9\s]+[.,?]?/u regex not validated !!! ")
    return;
  }
  // FROM HERE
  // ad
  // console.log("la liste des mots : ", Mots);
  // capitalize first word
  // Mots[0].text = Mots[0].text.slice(0).toUpperCase() + Mots[0].text.slice(1);
  // Eventuellement rajouter un espace au dernier mot.
  // if (u == nb_words - 1) {
  //     span.innerHTML += " ";
  // } else
  let count_span = 0;
  let random = getRandomInt(999999);

  if (do_nl) {
    add_data_to_buffer_gd(Mots, PREVIOUS_KEY);
  }


  // setTimeout(function () {
  let prev_mode = null;
  for (let u = 0; u < nb_words; u++) {
    let span = document.createElement("span");
    let modataz = Mots[u].dataZ;
    let curr_data_z = parseFloat(modataz);
    span.setAttribute("data-z", curr_data_z);
    let text_mot = Mots[u].text;
    span.innerHTML = text_mot;
    if (LongPressClick_handle && !releaseClickButton) {
      span.classList.add(
        highlight_buffer[highlight_buffer.length - 1].hightlight
      );
      span.setAttribute(
        "Highlight",
        highlight_buffer[highlight_buffer.length - 1].hightlight
      );
    }
    if (Mots[u].rest) {
      //retrieve the last span
      let last = div_recognized.querySelector("span:last-child");

      if (last.getAttribute("Highlight")) {
        span.classList.add(last.getAttribute("Highlight"));
        span.setAttribute("Highlight", last.getAttribute("Highlight"));
      }

      if (text_mot.includes(".", "!", "।", "。", "?", "؟", ";", "か", "？") == true) {
        if (LongPressClick_handle && !releaseClickButton) Dotfind = false;
        else Dotfind = true;
        if (SimpleClick_handle && releaseClickButton)
          SimpleClick_handle_DotFind = true;
      }
    }
    for (let y = 0; y < highlight_buffer.length; y++) {
      let cur_hgl = highlight_buffer[y];
      // Useless code below
      if (cur_hgl.dataZ == Mots[u].dataZ) {
        let hgl_val = cur_hgl.hightlight;
        span.classList.add(hgl_val);
        span.setAttribute("Highlight", hgl_val);
        if (cur_hgl.release == true) {
          if (text_mot.includes(".", "!", "।", "。", "?", "؟", ";", "か", "？") == true) {
            if (LongPressClick_handle && !releaseClickButton)
              Dotfind = false;
            else Dotfind = true;
            if (SimpleClick_handle && releaseClickButton)
              SimpleClick_handle_DotFind = true;
          }
        }
      }

      //Same but take releaseKey for multiple Simple_click
      if (
        SimpleClick_handle &&
        releaseCount > 1 &&
        highlight_buffer[y].dataZ == Mots[u].dataZ
      ) {
        span.classList.add(highlight_buffer[y].hightlight);

        span.setAttribute("Highlight", highlight_buffer[y].hightlight);

        if (highlight_buffer[y].release == true) {
          if (text_mot.includes(".", "!", "।", "。", "?", "؟", ";", "か", "？") == true) {
            Dotfind = true;
          }
        }
      } else {
        //Same but just a Simple_click
        if (
          highlight_buffer[y].dataZ == Mots[u].dataZ &&
          Dotfind == false
        ) {
          span.classList.add(highlight_buffer[y].hightlight);

          span.setAttribute("Highlight", highlight_buffer[y].hightlight);

          if (text_mot.includes(".", "!", "।", "。", "?", "؟", ";", "か", "？") == true) {
            if (LongPressClick_handle && !releaseClickButton)
              Dotfind = false;
            else Dotfind = true;
            if (SimpleClick_handle && releaseClickButton)
              SimpleClick_handle_DotFind = true;
          }
        }
      }
    }
    let old_speaker = "speaker";
    // last_index_diar for optimisation in the research.
    if (DO_DIAR) {
      // try {
      // debugger;
      let out = check_if_same_diar(last_index_diar, curr_data_z);
      let is_same_diar = out[0];
      let curr_speak_id = out[1]; // type

      if (is_same_diar) {
        count_span += 1;
        old_speaker = curr_speak_id;
        // console.log("Same diar !!!!")
        // nothing to do here.
      } else {
        // add paragraph +  create new.
        // console.log("Not same Diar ! ", "For index", random, DIAR_DATA.length);
        let out = search_new_diar(curr_data_z, last_index_diar);
        // find the new diar.
        // two scenario :  out of index
        // or research the correct new index.
        let mode = out[0] // out of index or correct index.      particular_case = true => mode out of bound.                       
        last_index_diar = out[1];
        let out_speak_id = out[2];
        //FIXME 9999 
        // particular case when index of DIAR data change during this loop. in relatime.
        // console.log("Checkin noob : ", prev_mode, mode);
        if (count_span != 0 && !(prev_mode == "oob" && mode == "oob")) {
          // FIXME set previous dataset data end if it is 999
          add_previous_paragraph(old_speaker);
          init_next_paragraph(out_speak_id, curr_data_z, 9999)
          count_span = 0;
        }
        old_speaker = out_speak_id;
        prev_mode = mode;
      }

    } else {
      //  first reco  case.
      if (!div_recognized.classList.contains("microphone") && !div_recognized.classList.contains("speaker")) {
        div_recognized.classList.add(KICKED_SPEAKER);
      }
    }

    div_recognized.append(span);
    previousWordZ = curr_data_z;
    count_span += 1;
  }
  // UNKNOWN CODE TO HANDLE LATER.
  let RecognizingChild = mainrecognizingcontainer.querySelector(
    "div[data-sequence='recognizing']"
  );
  mainrecognizingcontainer.removeChild(RecognizingChild);

  if (maincontainer != null) {
    let divdataend = Array.from(
      maincontainer.querySelectorAll('div[data-end]')
    ).pop();

    //Not First Occurence of Recognizing
    if (divdataend != undefined) {
      var PrevDataEnd = parseFloat(divdataend.dataset.end);
      let DataStartActual = parseFloat(div_recognized.dataset.end);
      let vad = parseFloat(DataStartActual) - PrevDataEnd;//- TOTAL_PAUSE_TIME
      if (vad > 2) {
        let spannewline = document.createElement("br");
        if (div_recognized.childNodes.length !== 0) {
          maincontainer.appendChild(spannewline);
          if (KICKED_SPEAKER == "microphone") {
            try_global_DIV.classList.add("mipmip");
          }
          maincontainer.appendChild(try_global_DIV);
          if (!div_recognized.classList.contains("microphone") && !div_recognized.classList.contains("speaker")) {
            div_recognized.classList.add(KICKED_SPEAKER);
          }
          if (!div_recognized.classList.contains("chitchat")) {
            div_recognized.classList.add("chitchat");
          }
          // FIXME VAD                until_new = false;
          maincontainer.appendChild(div_recognized);
        }

      } else {
        let newline = document.createElement("div");
        let br = document.createElement("br");
        newline.append(br);
        maincontainer.appendChild(newline);
        if (!div_recognized.classList.contains("microphone") && !div_recognized.classList.contains("speaker")) {
          div_recognized.classList.add(KICKED_SPEAKER);
        }
        if (!div_recognized.classList.contains("chitchat")) {
          div_recognized.classList.add("chitchat");
        }
        maincontainer.appendChild(div_recognized);
      }
    } else {
      if (KICKED_SPEAKER == "microphone") {
        try_global_DIV.classList.add("mipmip");
      }
      maincontainer.appendChild(try_global_DIV);
      if (!div_recognized.classList.contains("microphone") && !div_recognized.classList.contains("speaker")) {
        div_recognized.classList.add(KICKED_SPEAKER);
      }
      if (!div_recognized.classList.contains("chitchat")) {
        div_recognized.classList.add("chitchat");
      }
      maincontainer.appendChild(div_recognized);
    }
  }
  //TO HERE BIG CLEAN !!!

  // send Recognizied data.
  chrome.runtime.sendMessage({
    type: "SetContext",
    subtype: "mainrecognizedcontainer",
    data: maincontainer.innerHTML,
  });

  if (Dotfind) {
    //Long press event
    if (
      SecondhighlightClick &&
      releaseClickButton &&
      LongPressClick_handle
    ) {
      chrome.runtime.sendMessage({
        type: "ChangeHighlightState",
        action: "stopped",
      });
      highlight_global = null;
      SimpleClick_handle = false;
      SecondhighlightClick = false;
      LongPressClick_handle = false;
    }

    //Main event
    if (SimpleClick_handle && releaseClickButton) {
      chrome.runtime.sendMessage({
        type: "ChangeHighlightState",
        action: "stopped",
      });
      highlight_global = null;
      SimpleClick_handle = false;
    }
  }

  //Stop Highlight if needed.
  if (
    SecondhighlightClick &&
    releaseClickButton &&
    !LongPressClick_handle
  ) {
    chrome.runtime.sendMessage({
      type: "ChangeHighlightState",
      action: "stopped",
    });
    SecondhighlightClick = false;
  }

  //Reset variables.
  Mots = [];
  already_processed = new Set([]);
  tracker_found = false;
  lastrecognizingoffset = 0;
  RecognizedBool = true;
  highlight_buffer = [];
  num_buf_nl = 0;

}




async function onRecognizedResult(res_reco) {
  switch (res_reco.reason) {
    case SpeechSDK.ResultReason.NoMatch:
      var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(res_reco);
      break;
    case SpeechSDK.ResultReason.Canceled:
      // console.log("canceled PERDU !");
      var cancelDetails = SpeechSDK.CancellationDetails.fromResult(res_reco);

      break;
    case SpeechSDK.ResultReason.RecognizedSpeech:
      handleRecognized(res_reco)
      break
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
window.break_counter = false;

async function UseCredit() {
  (async function decompt_sec() {

    if (total_credit == 0) {
      chrome.runtime.sendMessage({
        type: "noCreditModal",
      });
    }

    if (window.break_counter || dmeopt) {
      if (Rest <= 30) {
        await PutCredit();
      }
      return false;
    }

    if (pausePLS != true) {
      Rest--;
      if (Rest <= 0) {
        if (total_credit == 0) {
          await PutCredit();
          dmeopt = true;
          reco.stopContinuousRecognitionAsync();
          dictation_finished = true;
          mediaRecorder.pause();
          chrome.runtime.sendMessage({
            type: "pauseByRealTime",
            subtype: "NoCredleft",
          });
          return false;
        } else {
          Rest = REFRESH_MINUTES / 1000;
          await PutCredit();
        }
      }
    }
    setTimeout(decompt_sec, 1000);
  })();



  if (dmeopt) {
    return;
  }

}

async function PutCredit() {
  let url_post = base_url_root + "/api/rt/credit_remover";

  const handleCredits = (data) => {
    total_credit = data[0].total_credit;
    let status = data[0].status;
    if (status == "no_credit") {
      mediaRecorder.pause();
      reco.stopContinuousRecognitionAsync();
      chrome.runtime.sendMessage({
        type: "pauseByRealTime",
        subtype: "NoCredleft",
      });
      // FIXME Darius Handle this Scenario where the guy cannot transcribe.
    } else if (status == "warning") {
      chrome.runtime.sendMessage({
        type: "DisplayWarning",
        argument: "final",
        total_credit: total_credit,
        Rest: Rest,
      });
      //FIXME  Handle warning scenario
    } else if (status == "noise") {
      chrome.runtime.sendMessage({
        type: "DisplayWarning",
        argument: "1min",
        total_credit: total_credit,
        Rest: Rest,
      });
      //FIXME  Handle warning scenario
    } else if (status == "ko") {
      dictation_finished = true;
      //FIXME handle KO scenario
    } else {
      // nothing to do? ??
    }
  };
  post(url_post, "json", "jwt", handleCredits);
}


async function getTokenFromBackend() {
  let url_post = base_url_root + "/api/rt/tokenrealtime";
  let STATUS_OUT;
  let TOKEN_OUT;
  const handleFromBackend = (data) => {
    STATUS_OUT = "ok";
    if (data.token == undefined) {
      STATUS_OUT = "nok";
    } else {
      TOKEN_OUT = data.token;
    }
  }
  await get(url_post, "json", "jwt", handleFromBackend, false);
  return [STATUS_OUT, TOKEN_OUT];
}


function canvas_scale(img, width, bitmapwidth, bitmapheight) {
  var canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = canvas.width * (bitmapheight / bitmapwidth);
  ctx.drawImage(img, 0, 0, width, canvas.height);

  return canvas.toDataURL();
}

function onSessionStarted(sender, sessionEventArgs) {
  console.log("Session STARTED");
  if (START_MIMI == undefined) {
    START_MIMI = new Date();
    OFFSET_MIMI = ((START_MIMI - START_RECORD) / 1000);
  }
}

function onSessionStopped(sender, sessionEventArgs) {
}

function onCanceled(sender, cancellationEventArgs) {
}

// MAIN
function doContinuousRecognition(savedtoken = false) {
  old_pack = undefined
  var timeRefreshDataZ = null;
  if (savedtoken == false) {
    maincontainer.innerHTML = "";
  } else if (savedtoken == true) {
    timeRefreshDataZ = new Date().getTime();
    reco.stopContinuousRecognitionAsync();
  } else {
    timeRefreshDataZ = new Date().getTime();
  }

  var audioConfig = getAudioConfig();
  var speechConfig = getSpeechConfig(SpeechSDK.SpeechConfig);
  let do_it = true;

  if (speechConfig == false) {
    do_it = false;
    chrome.storage.sync.set({ record_status: "false" })
    reco = null;
    return false;
  }
  if (speechConfig.authorizationToken == "") {
    do_it = false;
    chrome.storage.sync.set({ record_status: "false" })
    reco = null;
    return false;
  }
  chrome.storage.sync.set({ record_status: "true" })
  if (do_it) {
    reco = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    reco = applyCommonConfigurationTo(reco);
    reco.startContinuousRecognitionAsync();

    if (timeRefreshDataZ != null) {
      var TimeAfterGetToken = new Date().getTime();
      DurationOfRefreshToken = (TimeAfterGetToken - timeRefreshDataZ) / 1000;
      REFRESH_OFFSET += DurationOfRefreshToken;
      OLD_OFFSET = BIG_OFFSET;
      BIG_OFFSET = OFFSET_TOKEN - REFRESH_OFFSET;
    }
  }
}

function parseTime(nano) {
  return parseFloat(nano / 10000000).toFixed(2);
}

function displayRecordDuration(secs) {
  var hr = Math.floor(secs / 3600);
  var min = Math.floor((secs - hr * 3600) / 60);
  var sec = Math.floor(secs - hr * 3600 - min * 60);
  if (min < 10) {
    min = "0" + min;
  }
  if (sec < 10) {
    sec = "0" + sec;
  }
  if (hr <= 0) {
    return min + ":" + sec;
  }

  return hr + ":" + min + ":" + sec;
}

function looper_display_time_bottom() {
  (function looper2020() {
    if (dictation_finished) {
      return;
    } else if (pausePLS) {
      // wut
    } else {
      let Timeduration = (new Date().getTime() - dateStarted) / 1000 - TOTAL_PAUSE_TIME;
      dDUR.innerHTML = String(displayRecordDuration(Timeduration));
      chrome.runtime.sendMessage({ type: "UpdatedDur", dDur: dDUR.innerHTML });
    }
    setTimeout(looper2020, 1000);
  })();
}

async function StartLooperToken() {
  (async function looperToken() {
    if (pausePLS != true) {
      let Timeduration = (new Date().getTime() - last_fetched) / 1000;
      let totall = (new Date().getTime() - dateStarted) / 1000;

      if (dictation_finished) {
        return;
      }
      if (totall > 3600 * 4) {
        chrome.runtime.sendMessage({ type: "endRecord" });
      }
      // console.log("TimeDuration : " + Timeduration);
      if (Timeduration > REFRESH_TRANSCRIBE) {
        let TimeOfGetNewToken = new Date().getTime();
        let TimeAfterGetToken;

        if (total_credit != 0) {
          let data = await getTokenFromBackend();
          let the_status = data[0];
          if (the_status != "ok") {
            chrome.runtime.sendMessage({
              type: "noCreditModal",
            });
            return;
          } else {
            authorizationToken = data[1];
            TimeAfterGetToken = new Date().getTime();
            DurationOfRefreshToken = (TimeAfterGetToken - TimeOfGetNewToken) / 1000;
            console.log("duration of refrehs TOKEN : ", DurationOfRefreshToken)
            last_fetched = new Date().getTime();
            OFFSET_TOKEN = (new Date().getTime() - dateStarted) / 1000 - TOTAL_PAUSE_TIME;
            doContinuousRecognition(true);
          }
        }

      }
    }

    setTimeout(looperToken, 20000);
  })();
}

async function RefreshTokenWhenRestart() {

  if (typeof (last_fetched) !== "undefined") {
    let Timeduration = (new Date().getTime() - last_fetched) / 1000;

    if (Timeduration < REFRESH_TRANSCRIBE) {
      return false;
    }
  }


  let TimeOfGetNewToken = new Date().getTime();
  let TimeAfterGetToken;

  let data = await getTokenFromBackend();
  let the_status = data[0]

  if (the_status != "ok") {
    console.log("Ko send credit modal 1");

    chrome.runtime.sendMessage({
      type: "noCreditModal",
    });
  } else {
    authorizationToken = data[1];
    TimeAfterGetToken = new Date().getTime();
    DurationOfRefreshToken = TimeAfterGetToken - TimeOfGetNewToken;
    last_fetched = new Date().getTime();
  }

  return true;
}



async function fetchWithTimeout(resource) {

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 4000);
  const response = await fetch(resource, {
    "timeout": 4000,
    "method": "GET",
  });
  clearTimeout(id);

  // clearTimeout(id);
  return response;
}

async function getChromeRMC() {
  var p = new Promise(function (resolve, reject) {
    chrome.storage.sync.get(["enc_total_cred"], function (the_res) {
      resolve(the_res.enc_total_cred);
    })
  });
  const configOut = await p;
  return configOut;
}



async function timeToWait(pump, fileusername, folder_upload) {
  tt_cred = encodeURIComponent(await getChromeRMC());
  let url_post =
    base_url_root +
    `/records_lffm456EXT/${pump}?title=${fileusername}&id_r=${tt_cred}&dossier=${folder_upload}&langue=${language}`;
  let response = await post(url_post, "empty", "jwt", null, false, true);
  return response;
}

async function fetchWithTimeout(resource, options) {
  const { timeout = 8000 } = options;
  const response = await fetch(resource, {
    ...options,
  });
  return response;
}

async function loadSTTa(trsid) {
  const response = await fetchWithTimeout(trsid.id, {
    timeout: 5000,
    method: "GET",
  });
  const res = await response.json();
  return res;
}


async function gsubc(format, fz) {
  if (noAccount) {
    console.log("returned as no account.")
    return;
  }
  let url_post = base_url_root + "/smoothing_api" + "?format=" + format + "&fz=" + fz;
  let response = await get(url_post, "empty", "jwt", null);
  let data = await response.json();
  return data;
}


function handleClosing(SecondPopUpStatess, buggy = false) {
  // if window is closed, open it.
  if (SecondPopUpStatess == "closed") {
    SecondPopUpState = "opened";
    chrome.windows.create(
      {
        url: chrome.extension.getURL("html/popup2.html"),
        type: "popup"
      },
      function (win) {
        Popup2Win = win;
      }
    );
  } else {
    chrome.runtime.sendMessage({
      type: "ModalSaveFile",
      action: "open_noota",
    });
  }
  if (buggy) {
    chrome.runtime.sendMessage({ type: "stopItNow" });
  }

}




async function sendData(file, fsize, formattype) {
  ModalState = "loader";
  chrome.runtime.sendMessage({ type: "ModalSaveFile", action: "loading_modal" });

  var fileusername = the_title;//"My Record";
  var folder_upload = the_folder;
  var Avancemt = 0;
  var currentPer = `${Avancemt}%`;

  // Check if outGGTR contains something, else go back to the main menu.
  if (outGGTR["final_result"].length === 0) {
    alert("No transcript data was found. Going back to the main menu.");
    handleClosing(SecondPopUpState, buggy = true);
    return;
  }

  var json = await gsubc(formattype, fsize);
  if (json.text === "fmt_no_vld") {
    //CloseModal(false);
    alert(
      'Format de fichiers supportés : (".wav", ".mp3", ".flac", ".mp4", ".ogg", ".m4a",".m4v",".wma",".amr",".mov") 💿 + Contactez-nous pour les autres formats 🤗'
    );
    handleClosing(SecondPopUpState, buggy = true)
    return;
  } else if (json.text === "sz_to_bg") {
    //CloseModal(false);
    alert("Your file is too big to be uploaded, please try to reduce its size to 3GB maximum before uploading it to Noota. ");
    handleClosing(SecondPopUpState, buggy = true);
    return;
  } else if (json.text === "sz_to_mn") {
    alert("Your file is too small to be uploaded, please try with a bigger record. ");
    handleClosing(SecondPopUpState, buggy = true);
    return;
  }

  var DONE = 2 << 1;
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = async function () {
    if (this.readyState === DONE) {
      if (this.status == 200) {
        let uuuuuu = json.filename.split("_mono")[0].split(".")[0]
        sendAllScreenShot(
          uuuuuu,
          AllScreenShotFile
        );

        let trsid = await timeToWait(json.filename, fileusername, folder_upload);
        let stopped = false;
        // infinite loop
        let data;
        while (!stopped) {
          data = await loadSTTa(trsid);
          await sleep(4000);
          if (data.Status === 7) {
            stopped = true;
            if (!noAccount) {
              await main_generateTheTranscript(data.iddodio, uuuuuu);
              // FIXME Check if user has right
              await sleep(20000);
            }
            ModalState = false;
            IdTrscpt = data.iddodio;
            //Redirect here
            if (!noAccount) {
              handleClosing(SecondPopUpState, buggy = false);
            } else {
              ModalState = "SendToAPIForGuest";
              if (SecondPopUpState == "closed") {
                SecondPopUpState = "opened";
                chrome.windows.create(
                  {
                    url: chrome.extension.getURL("html/popup2.html"),
                    type: "popup"
                  },
                  function (win) {
                    Popup2Win = win;
                  }
                );
              } else {
                chrome.runtime.sendMessage({
                  type: "Redirection",
                  subtype: "Guest",
                });
              }
            }
          } else if (data.Status === -1) {
            stopped = true;
            // console.log("End as final value = ", data);

            if (data.Message.includes("Fichier corrompu.")) {
              alert(
                "File is corrupted."
              );
              // chrome.runtime.sendMessage({ type: "stopItNow" });
              handleClosing(SecondPopUpState, buggy = true);

            } else if (
              data.Message.includes(
                "Pas de contenu audio détécté dans votre fichier."
              )
            ) {
              alert(
                "It seems that your file doesnt include any audio content."
              );
              // chrome.runtime.sendMessage({ type: "stopItNow" });
              handleClosing(SecondPopUpState, buggy = true);


            } else {
              alert(
                "An error occured, please try again later, if the problem persists, please contact our support for further assistance."
              );
              handleClosing(SecondPopUpState, buggy = true);
            }
            // window.location.reload();
          }
          Avancemt = Math.min(99, Avancemt + 1);
        }
      } else {
        window.break_counter = true;
        dmeopt = true;
        handleClosing(SecondPopUpState, buggy = true);
      }
    } else {
      //Tout vient a point a qui sait attendre
    }
  };

  xhr.open("PUT", json.text, true);
  xhr.setRequestHeader("Content-Type", "application/octet-stream");
  xhr.setRequestHeader("Access-Control-Allow-Origin", "*");

  xhr.upload.addEventListener("progress", function (event) {
    if (event.lengthComputable) {
      Avancemt = parseInt((((event.loaded / event.total) * 100) | 0) / 4);
      currentPer = Avancemt.toString() + "%";

      chrome.runtime.sendMessage({
        type: "SavingFileProgress",
        currentPer: currentPer,
      });
    }
  });
  xhr.send(file);
}

function redirectUsertotranscribe(redirect_arg, listen_gd) {
  timeout = 500;
  setTimeout(function () {
    if (redirect_arg) {
      let the_url = base_url_root + "/transcribe/" + IdTrscpt + "?live=y";
      if (listen_gd) {
        the_url += "&lgg=true";
      }
      chrome.tabs.create({
        url: the_url,
      });
    }
    chrome.runtime.sendMessage({ type: "window", subtype: "CloseEvent" });
    chrome.runtime.sendMessage({ type: "clearGuidelines" });
  }, timeout);
}

function clear_guidelines(redirect_arg) {
  timeout = 2000;
  setTimeout(function () {
    chrome.runtime.sendMessage({ type: "window", subtype: "CloseEvent" });
    chrome.runtime.sendMessage({ type: "clearGuidelines" });
  }, timeout);
}


async function sendAllScreenShot(uuid, AllFile) {
  for (let i = 0; i < AllFile.length; i++) {
    let url_post =
      base_url_root +
      "/api/rt/screenshot/" +
      uuid +
      "/" +
      String(i + 1) +
      "/" +
      encodeURIComponent(AllFile[i].dataz);
    let data = await screenshot_signed_url(url_post);
    if (data[0].status2 == true) {
      let xhr = new XMLHttpRequest();
      xhr.open("PUT", data[0].url_signed, true);
      xhr.setRequestHeader("Content-Type", "image/jpeg");
      xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
      xhr.send(AllFile[i].file[0]);
      AllScreenShotFile[i]["filename"] = data[0].fname;
    } else {
      // fixmesentry error there
    }
  }
}

async function screenshot_signed_url(url_post) {
  response = await get(url_post, "empty", "jwt", null);
  let data = await response.json();
  return data;
}


async function main_generateTheTranscript(id_trs, uuid_trs) {
  let url_post = base_url_root + `/api/rt/get_the_template2/${id_trs}`;
  let Highlight_data;
  try {
    Highlight_data = construct_Highlight_Dict();
  } catch (error) {
    Highlight_data = {};
  }
  let Formatted_Screenshots = constructScreenshotDict();

  if (the_guideline != "default") {
    url_post += '?guidelines=yes';
  } else {
    url_post += '?guidelines=no';
  }
  url_post += `&the_email=${encodeURIComponent(the_email)}`;

  let save_output = await post(
    url_post,
    { Formatted_Screenshots, DIAR_DATA, outGGTR, Highlight_data },
    "jwt",
    null,
    false,
    true
  );
  if (save_output.status != 200) {
    throw ("Fail to generate the transcript...")
  }

  if (the_guideline != "default" && do_nl) {
    let title_guideline = the_guideline;
    let uuid = uuid_trs;
    // last one  
    if (PREVIOUS_GUIDELINE != null) {
      FINAL_GUIDELINES[PREVIOUS_KEY] = {
        "guideline": PREVIOUS_GUIDELINE,
        "text": BUFFER_TEXT.slice(0, 10000)
      }
    }
    let guidelines = FINAL_GUIDELINES;
    let email_sf = the_email;
    let mode = "guideline";
    let lng = language;
    let signature = "?signature=34g9878azfazfz";
    if (Object.keys(guidelines).length && ["fr", 'en', 'es'].includes(lng.split("-")[0])) {
      post(summy_url_root + "/noommarizer1706950dd11b471683fd06dcd26129fd" + signature, { lng, title_guideline, uuid, guidelines, id_trs, mode, email_sf, environnement }, "jwt", null);
    }
  }
}


function constructScreenshotDict() {
  let output_dict_sc = {};
  for (let i = 0; i < AllScreenShotFile.length; i++) {
    let data_z_key = AllScreenShotFile[i]["dataz"];
    if (data_z_key in output_dict_sc) {
      output_dict_sc[data_z_key].push([
        AllScreenShotFile[i]["filename"],
        AllScreenShotFile[i]["thumb"],
      ]);
    } else {
      output_dict_sc[data_z_key] = [
        [AllScreenShotFile[i]["filename"], AllScreenShotFile[i]["thumb"]],
      ];
    }
  }

  return output_dict_sc;
}

var next_element = function (elem, selector) {
  // Get the next element
  var nextElem = elem.nextElementSibling;
  // If there's no selector, return the next element
  if (!selector) {
    return nextElem;
  }
  // Otherwise, check if the element matches the selector
  if (nextElem && nextElem.matches(selector)) {
    return nextElem;
  }
  // if it's not a match, return null
  return null;
};

function constructDictFromCategory(TMP) {
  let OUT_DICT = [];
  let cond_jump;
  let old_one = TMP[0];
  let last_oo;
  let starting = old_one.dataset.z;

  for (let i = 0; i < TMP.length; i++) {
    cond_jump = old_one != TMP[i];
    old_one = next_element(TMP[i], false);

    if (cond_jump) {
      OUT_DICT.push({ start: starting, stop: last_oo.dataset.z });
      starting = TMP[i].dataset.z;
    }
    last_oo = TMP[i];
  }

  OUT_DICT.push({ start: starting, stop: last_oo.dataset.z });
  return OUT_DICT;
}

function construct_Highlight_Dict() {
  let the_selector = maincontainer.querySelectorAll("span.Highlighting1");
  if (the_selector.length == 0) {
    return {};
  }

  return constructDictFromCategory(the_selector);
}


async function GetCreditOfUser() {
  const handleCreditsLeft = (data) => {
    if (data[1] == 200) {
      total_credit = data[0].total_credit;
      return total_credit;
    } else {
      return 0;
    }
  };
  return await get(base_url_root + "/api/rt/credit_left", "json", "jwt", handleCreditsLeft);
}

function PauseRecord() {
  mediaRecorder.pause();
  if (!noAccount && reco != undefined) {
    reco.stopContinuousRecognitionAsync(); // take about 0.7 to execute.
    datepause = new Date().getTime();
    pausePLS = true;
    TRIGGER_DIAR_PAUSE = true;
  } else {
    datepause = new Date().getTime();
    pausePLS = true;
  }

  if (LongPressClick_handle) {
    highlight_global = null;
    LongPressClick_handle = false;
    SecondhighlightClick = true;
    SimpleClick_handle = true;
    chrome.runtime.sendMessage({
      type: "ChangeHighlightState",
      action: "stopped",
    });
  }

  if (SimpleClick_handle) {
    highlight_global = null;
    SimpleClick_handle = false;
    releaseClickButton = false;
    chrome.runtime.sendMessage({
      type: "ChangeHighlightState",
      action: "stopped",
    });
  }
  return true;

}
async function ResumeRecord() {
  total_credit = await GetCreditOfUser();
  if (total_credit == 0) {
    chrome.runtime.sendMessage({
      type: "noCreditModal",
    });
    return false;
  }
  //FIXME DD
  dmeopt = false;
  let refreshed = await RefreshTokenWhenRestart();
  TMP_PAUSE_TIME = (new Date().getTime() - datepause) / 1000;
  TOTAL_PAUSE_TIME += TMP_PAUSE_TIME;
  OFFSET_TOKEN =
    (new Date().getTime() - dateStarted) / 1000 - TOTAL_PAUSE_TIME;
  OLD_OFFSET = BIG_OFFSET;
  BIG_OFFSET = OFFSET_TOKEN;
  let TimeOfGetNewToken = new Date().getTime();
  pausePLS = false;

  if (refreshed) {
    doContinuousRecognition("restart");
  } else {
    mediaRecorder.resume(); //Maybe have some issue on firefox
    let TimeAfterGetToken = new Date().getTime();
    DurationOfRefreshToken =
      (TimeAfterGetToken - TimeOfGetNewToken) / 1000;
    REFRESH_OFFSET += DurationOfRefreshToken;
    OLD_OFFSET = BIG_OFFSET;
    BIG_OFFSET = OFFSET_TOKEN + REFRESH_OFFSET;
  }
  TRIGGER_RESTART_DIAR = true;

  dictation_finished = false;

  if (LongPressClick_handle) {
    // chrome.runtime.sendMessage({
    //   type: "ChangeHighlightState",
    //   action: "active",
    //   event: "longpress",
    // });
  }

  if (noAccount) {
    looper_display_time_bottom();
  } else {
    // RefreshTokenWhenRestart();
    if (reco != null) {
      reco.startContinuousRecognitionAsync();
    }
  }
  return true;
}



function stopRecording(save) {
  tabid = 0;
  // Show default icon
  //analyser.disconnect(javascriptNode);
  //javascriptNode.disconnect(audioContext.destination);
  var bgPage = chrome.extension.getBackgroundPage();
  let uuid = bgPage.the_uuid_guidelines
  if (uuid != "default") {
    _delete(bgPage.guideline_url_root + "/rt_guidelines_rc", { uuid, environnement }, "jwt", null);
  }


  chrome.browserAction.setIcon({
    path: "../assets/extension-icons/logo-32.png",
  });

  // query to end 



  // null WindowCanvasFreeDraw
  chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
    // Check if recording has to be saved or discarded
    if (save == "stop-save") {
      cancel = false;
    } else if (save == "stop-cancel") {
      cancel = true;
    }

    // Check if it's a desktop or tab recording (recording done in background script)
    if (recording_type != "camera-only") {
      if (!noAccount && reco != null) {
        reco.stopContinuousRecognitionAsync();
        Mots = [];
        num_buf_nl = 0;
      }
      // mediaRecorder.stop();
      // chrome.tabs.sendMessage(tab.id, {
      //   type: "end",
      // });
      // in Tab this line make the app crash;
      try {
        mediaRecorder.stop();
        console.log("STOP MEDIA RECORDER OK")
      } catch (error) {
        console.log("FAIL TO STOP MEDIA RECORDER")
      }

      recording = false;
      dictation_finished = true;
      dmeopt = true;
      console.log("Setting DEMOPT TRUE 4");

    } else {
      recording = false;
      // dictation_finished = true;
      // dmeopt = true;
    }

    // Remove injected content
    // try {
    chrome.tabs.query({}, function (tabs) {
      for (var i = 0; i < tabs.length; ++i) {
        try {
          chrome.tabs.sendMessage(tabs[i].id, {
            type: "end",
          });
        } catch { }
      }
    });

    // Remove injected content
    // chrome.tabs.sendMessage(tab.id, {
    //   type: "end"
    // });

    if (cancel) {
      chrome.runtime.sendMessage({ type: "window", subtype: "CloseEvent" });
    }

  });
}
function Initialize(onComplete) {
  SpeechSDK = window.SpeechSDK;
  if (!!window.SpeechSDK) {
    //document.getElementById('warning').style.display = 'none';
    onComplete(window.SpeechSDK);
  }
}

function initGuidelines() {
  chrome.runtime.sendMessage({
    type: "init_guidelines"
  });
}

async function initRealTime() {
  console.log("Init realtime with", recording, mediaRecorder.state)
  if (mediaRecorder.state == "inactive" || recording === false) {
    maincontainer.innerHTML = "";
    mainrecognizingcontainer.innerHTML = "";
    highlight_buffer = [];
    highlight_global = null;
    await getCredFromBackend();
    total_credit = await GetCreditOfUser();
    dictation_finished = false;

    pausePLS = false;
    if (language == "record_only") {
      looper_display_time_bottom();
      chrome.storage.sync.set({
        record_status: "false"
      });
      // send message to hide folding.
    } else {
      init_guideline_process();
      // more on ?
      if (DO_THE_SENTI) {
        init_nootiment();
      }
      // refresh token just in case
      chrome.storage.sync.set({
        record_status: "true"
      });
      let data = await getTokenFromBackend();
      let the_status = data[0];
      let the_token = data[1];
      if (the_status == "ok" && the_token != undefined) {
        authorizationToken = the_token;
        doContinuousRecognition();
        recording = true;

        dateStarted = new Date().getTime();
        await GetCreditOfUser();
        UseCredit();
        looper_display_time_bottom();
        last_fetched = new Date().getTime();
        StartLooperToken();
      } else {
        await GetCreditOfUser();
        UseCredit();
        looper_display_time_bottom();
      }

    }
  }
  return true;
}

var SecondhighlightClick = false;
var SimpleClick_handle_DotFind = false;
function AddHighlight() {
  if (candoaHighlight) {
    candoaHighlight = false;

    setTimeout(function () {
      candoaHighlight = true;
    }, 2000);

    if (SimpleClick_handle) {
      console.log("AddHighlight SimpleClick stopped");
      chrome.runtime.sendMessage({
        type: "ChangeHighlightState",
        action: "stopped",
      });
      highlight_global = null;
      SecondhighlightClick = true;
      SimpleClick_handle = false;
      SimpleClick_handle_DotFind = false;
    } else {
      if (LongPressClick_handle) {
        let date2 = new Date().getTime();
        let time = (date2 - LongpressLastTime) / 1000;
        if (time > 5) {
          console.log("AddHighlight LongPress attempt dot for being stopped");
          // chrome.runtime.sendMessage({
          //   type: "ChangeHighlightState",
          //   action: "active",
          //   event: "LongPressstop",
          // });
          releaseClickButton = true;
          SecondhighlightClick = true;
        } else {
          console.log("AddHighlight LongPress CoolDown");
        }
      } else {
        //Simple Click
        try {
          console.log("AddHighlight SimpleClick started");
          highlight_global = "Highlighting1";
          chrome.runtime.sendMessage({
            type: "ChangeHighlightState",
            action: "active",
          });

          HighlightingDate = new Date().getTime();
          SimpleClick_handle = true;
        } catch {
          //NoSpan
        }
      }
    }
  }
}

//Use timer for trying to handle the event
function AddHighlight2EventHandler() {
  var doit;
  clearTimeout(doit);
  doit = setTimeout(AddHighlight2, 200);
}

function AddHighlight2() {
  if (HighlightingDate != null && !LongPressClick_handle) {
    try {
      let date2 = new Date().getTime();

      let time = (date2 - HighlightingDate) / 1000;

      HighlightingDate = null;

      LongpressLastTime = time;

      if (time > 0.7 && !SimpleClick_handle_DotFind) {
        //LongPress
        LongPressClick_handle = true;
        SecondhighlightClick = false;
        releaseClickButton = false;
        SimpleClick_handle = false;
        highlight_global = "Highlighting1";
        HighlightingDate = null;
        console.log("AddHighlight LongPress active");
        // chrome.runtime.sendMessage({
        //   type: "ChangeHighlightState",
        //   action: "active",
        //   event: "longpress",
        // });
      } else {
        releaseClickButton = true;
      }
    } catch {
      //NoSpan
    }
  }
}

async function AsyncTakeScreenShotHandler() {
  if (candoascreen == true) {
    if (MaxScreenShot == 0) {
      alert("Vous avez atteint votre limite de 20 screenshot !");
    } else {
      setTimeout(function () {
        candoascreen = true;
      }, 5000); //Ici le timer pour les screenshots

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" },
      });

      const track = stream.getVideoTracks()[0];
      const imageCapture = await new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
      const image = canvas.toDataURL();
      const mydiv = document.createElement("div");
      MaxScreenShot--;
      id_screenshotinDOM = id_screenshotinDOM++;
      mydiv.setAttribute("id", "screenshot_" + id_screenshotinDOM);
      mydiv.setAttribute("style", "text-align: center;");

      const res = await fetch(image);
      const buff = await res.arrayBuffer();
      const file = [
        new File([buff], `${new Date()}.jpeg`, { type: "image/jpeg" }),
      ];

      let img_thumb_resize = canvas_scale(
        canvas,
        150,
        canvas.width,
        canvas.height
      );
      let img_thumb;

      // horizontal image
      if (canvas.width >= canvas.height) {
        img_thumb = canvas_scale(canvas, 320, canvas.width, canvas.height);
      } else {
        img_thumb = canvas_scale(canvas, 260, canvas.width, canvas.height);
      }
      const img_to_append = document.createElement("img");
      img_to_append.src = img_thumb_resize;

      mydiv.append(img_to_append);

      let dataz;

      let lastRecognizedElement = maincontainer.querySelector(
        "div [data-end]:last-child"
      );

      try {
        dataz = parseFloat(
          lastRecognizedElement
            .querySelector("span[data-z]")
            .getAttribute("data-z")
        );
      } catch {
        dataz = "0";
      }

      let ScreenShotFile = {
        id: id_screenshotinDOM,
        file: file,
        thumb: img_thumb,
        dataz: dataz,
      };

      AllScreenShotFile.push(ScreenShotFile);

      maincontainer.append(mydiv);

      chrome.runtime.sendMessage({
        type: "SetContext",
        subtype: "Newscreenshot",
        data: maincontainer.innerHTML,
        id: id_screenshotinDOM - 1,
      });
    }
  }
}
