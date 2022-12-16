/*jshint esversion: 6 */
/* eslint-env jquery */
/* exported init_guideline_process */

/* eslint-disable no-undef */
var display_volume = false;
const audioCtx = new AudioContext();
const destination = audioCtx.createMediaStreamDestination();
var output = new MediaStream();
var micsource;
var syssource;
var mediaRecorder = "";
var mediaConstraints;
var micstream;
var audiodevices = [];
var all_topics = {};
var do_topic = false;
var outGGTR = { "final_result": [], "final_transcript": [] };
var THRESHOLD_REFRESH = 6000; //minutes   //5 days 7200 minutes
var THRESHOLD_SAVE = 40; //minutes   //5 days 7200 minutes
var TOTAL_PAUSE_TIME = 0;
var REFRESH_OFFSET = 0;
var OFFSET_TOKEN = 0;
var OLD_OFFSET;
var BIG_OFFSET = 0;
var OFFSET_MIMI = 0;
var TRIGGER_DIAR_PAUSE = false;
var TRIGGER_LAST_DIAR = false;
var RECORDING_TAB = null;
var TRIGGER_RESTART_DIAR = false;
var DO_THE_SENTI = false;
// var THRESHOLD_SAVE = 1; //minutes   //1 hour = 60minutes
var START_RECORD;
var last_index_diar = 0;
var cancel = false;
var do_nl = false;
var recording = false;
var tabid = 0;
var maintabs = [];
var camtabs = [];
var recording_type = "tab-only";
var pushtotalk;
var micable = true;
var width = 1280;
var savetoken;
var refresh_token;
var time_get_cred;
var height = 720;
var quality = "max";
var camerasize = "small-size";
var camerapos = { x: "10px", y: "10px" };
var isMac = navigator.userAgentData.platform.toUpperCase().indexOf('MAC') >= 0;
var language = "en-US";
var the_title = "My record";
var the_email = "";
var the_folder = "default";
var the_guideline = "default";
var all_guidelines = "default";
var the_uuid_guidelines = "default";
var time_get_cred = "";
var tokenooti = "";
// var nbspeaker = "default";
var DIAR_DATA = [];
var CURRENT_DIAR = "speaker";
var OFF8SET_CURRENT_DIAR = "speaker";
var FINAL_GUIDELINES = {};
var VAD_ON_SPEAKER = false;
var PREVIOUS_GUIDELINE = null;
var PREVIOUS_KEY = null;
var BUFFER_TEXT = "";
var WinTabidLoginPage = false;
var WindowCanvasFreeDraw;
var PopupWin = false;
var Popup2Win = false;
var SecondPopUpState = null;
var TabCanvasFreeDraw;
var noAccount = true;
var ModalState = false;
// Route
var base_url_root = "https://stagingservice-dot-snappy-byway-271712.ew.r.appspot.com";
var environnement = "dev";
let volumeCallback = null;
let volumeInterval = null;
let volumeCallback2 = null;
let volumeInterval2 = null;
// var base_url_root = "https://127.0.0.1:8080";

// var base_url_root = "https://www.app.noota.io";
// var environnement = "prod";

var guideline_url_root = "https://noot-gl2679878798654-3jubxsftva-od.a.run.app";
var summy_url_root = "https://noomarizer-76943125534-3jubxsftva-od.a.run.app";
var senty_url_root = "https://quali-sentiment-3jubxsftva-ew.a.run.app";

chrome.runtime.setUninstallURL("https://61sesg0hj3g.typeform.com/to/vzNzfY7o", function () {
    var lastError = chrome.runtime.lastError;
    if (lastError && lastError.message) {
        console.warn(
            "Unable to set uninstall URL: " + lastError.message
        );
    } else {
        // The url is set
    }
});


var mixing = false;
var MixingMessage = true;

//console.log = function() {};


window.addEventListener("load", function () {
    try {
        Sentry.init({
            dsn: "https://72b002d2d80e406ca8c8b7b356e20e04@o456514.ingest.sentry.io/6509425",
            tracesSampleRate: 0.2,
            release: 1.1,
        });
    } catch (e) {
        console.log('Error in Sentry init', e);
    }
});

// Get list of available audio devices
getDeviceId();

chrome.runtime.onInstalled.addListener(function () {
    // Set defaults when the extension is installed
    // FIXME countdown at 3
    chrome.storage.sync.set({
        toolbar: true,
        countdown: false,
        countdown_time: 0,
        fmtexpt: "mp3",
        flip: false,
        pushtotalk: false,
        camera: 0,
        the_guideline: "default",
        all_guidelines: "default",
        mic: 0,
        type: "tab-only",
        the_uuid_guidelines: null,
        list_guidelines: [],
        diardata: [],
        language: "en-US",
        guideline: "default",
        title: "My_record",
        folder: "default",
        record_status: "true",
        quality: "max",
        token_auth_noota: "",
        select_nb_speaker: "default",
        url_converted: "",
        refresh_token: "",
        time_get_cred: "",
    });

    // Inject content scripts in existing tabs
    chrome.tabs.query({ currentWindow: true }, function gotTabs(tabs) {
        for (let index = 0; index < tabs.length; index++) {
            if (
                !tabs[index].url.includes("chrome://") &&
                !tabs[index].url.includes("chrome.com")
            ) {
                chrome.tabs.executeScript(tabs[index].id, {
                    file: "./js/detect.js",
                });
            }
        }
    });
});

// Set up recording
function newRecording(stream, with_videor, id_tab = null) {
    setTimeout(() => {
        SecondPopUpState = "opened";

        chrome.windows.create(
            {
                url: chrome.extension.getURL("html/popup2.html"), type: "popup"
            },
            function (win) {
                Popup2Win = win;
            }
        );
    }, 1500);

    let the_mime_type, out_video;
    if (with_videor) {
        the_mime_type = "video/webm;codecs=vp8,vp9,opus"; //;codecs=vp8,opus   video/webm;codecs=vp9
        out_video = {
            height: { min: 360, max: 720 },
            width: { min: 640, max: 1280 },
            frameRate: { min: 15, ideal: 24, max: 30 },
        }
    } else {
        the_mime_type = "audio/webm;codecs=opus";
        out_video = false;
    }
    // videoBitsPerSecond: 1500000,
    // echoCancellationType: "browser",
    mediaConstraints = {
        audio: { sampleRate: 16000, echoCancellation: false, channelCount: 1 },
        video: out_video,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 1000000,
        mimeType: the_mime_type,
    };
    mediaRecorder = new MediaRecorder(stream, mediaConstraints);
    START_RECORD = new Date();
    mediaRecorder.start(1000);
    //Show popup2


    if (!noAccount) {
        status_rt = initRealTime();
        if (status_rt) {
            recording = true;
            // Show recording icon
            chrome.browserAction.setIcon({
                path: "../assets/extension-icons/logo-32-rec.png",
            });
        } else {
            //fish net
            // chrome.tabs.sendMessage(id_tab, {
            //     type: "stopMicrophone",
            // });
        }
    }

    injectContent(true);

    // console.log("injected content");
    // if (id_tab != null) {
    //     console.log("asked STOP MICROPHONE !!! ??");

    //     chrome.tabs.sendMessage(id_tab, {
    //         type: "stopMicrophone",
    //     });
    // }
}


async function saveRecording(recordedBlobs, multimedia_type) {
    let file;
    if (multimedia_type) {
        file = new File(recordedBlobs, "My Record.webm", {
            type: "video/webm;codecs=vp8,vp9,opus",
        });
    } else {
        file = new File(recordedBlobs, "My Record.webm", {
            type: "audio/webm;codecs=opus",
        });
    }

    //Here Download the file
    let a = document.createElement("a");
    a.href = window.URL.createObjectURL(file);
    var out_rec = "My Record";
    // chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
    //     if (tab.title != null) {
    //         out_rec = tab.title;
    //     }
    // });
    a.download = out_rec;
    a.click();


    var p = new Promise(function (resolve, reject) {
        chrome.storage.sync.get(["record_status"], function (result) {
            resolve(result.record_status);
        })
    });
    let record_status = await p;

    recording = false;
    if (!noAccount && record_status == "true") {
        sendData(file, file.size, ".webm");
    } else {
        chrome.runtime.sendMessage({
            type: "ModalSaveFile",
            action: "tg",
        });
    }
}


const handle_fail_json = (response) => {
    if (!response.ok) {
        return response
            .json()
            .catch(() => {
                // Couldn't parse the JSON
                throw new Error(response.status);
            })
            .then(({ message }) => {
                if (response.status == 422) {
                    ProcessRedirectToLogin(true);
                }
                // Got valid JSON with error response, use it
                // Sentry.captureMessage(message);
                // let check_cookie = "User does not exist";P
                // if (message != null) {
                //   alert(message);
                // }
                throw new Error(message || response.status);
            });
    }
    return response.json();
};

const handle_fail_blob = (response) => {
    if (!response.ok) {
        return response
            .json()
            .catch(() => {
                // Couldn't parse the blob
                throw new Error(response.status);
            })
            .then(({ message }) => {
                // Got valid JSON with error response, use it
                throw new Error(message || response.status);
            });
    }
    return response.blob();
};

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function get(
    url,
    type_output,
    auth_mode,
    handleResponse,
) {
    const requestOptions = {
        method: "GET",
        credentials: "same-origin",
        headers: {},
        cache: "no-cache",
    };

    if (auth_mode == "jwt") {
        await QueryTokensv2(false);
        await delay(300);
        var p2 = new Promise(function (resolve, reject) {
            chrome.storage.sync.get(["token_auth_noota"], function (obj) {
                resolve(obj.token_auth_noota.savetoken)
            });
        });
        let savetoken = await p2;
        requestOptions.headers["Authorization"] = `Bearer ${savetoken}`;
        requestOptions.headers["Access-Control-Allow-Origin"] = "*";
    }

    if (type_output == "empty") {

        return fetch(url, requestOptions);



    } else if (type_output == "blob") {
        if (handleResponse != null) {
            return fetch(url, requestOptions)
                .then(handle_fail_blob)
                .then(handleResponse);
        } else {
            return fetch(url, requestOptions).then(handle_fail_blob);
        }
    } else {
        if (handleResponse != null) {
            return fetch(url, requestOptions)
                .then(handle_fail_json)
                .then(handleResponse);
        } else {
            return fetch(url, requestOptions).then(handle_fail_json);
        }
    }
}

async function post(
    url,
    body,
    auth_mode,
    handleResponse,
    check_offline = false,
    custom_handle = false,
    type_output = "null"
) {

    if (!(body instanceof FormData) && body != null) {
        body = JSON.stringify(body);
    }

    const requestOptions = {
        method: "POST",
        // credentials: "same-origin",
        headers: {
            Accept: "application/json, text/plain, */*",
        },
        body: body,
        cache: "no-cache",
    };
    if (!(body instanceof FormData) && body != null) {
        requestOptions.headers["Content-Type"] = "application/json";
    }
    if (!url.includes(base_url_root)) {
        requestOptions["mode"] = "cors"
        requestOptions.headers["Content-Type"] = "application/json";
    }
    if (auth_mode == "jwt") {
        await QueryTokensv2(false);
        await delay(300);
        var p = new Promise(function (resolve, reject) {
            chrome.storage.sync.get(["token_auth_noota"], function (obj) {
                resolve(obj.token_auth_noota.savetoken)
            });
        });
        let savetoken = await p;
        requestOptions.headers["Authorization"] = `Bearer ${savetoken}`;
    }


    if (type_output == "null") {
        if (handleResponse != null) {
            return fetch(url, requestOptions)
                .then(handle_fail_json)
                .then(handleResponse);
        } else {
            if (custom_handle) {
                return fetch(url, requestOptions).then((response) => {
                    return response.json();
                });
            } else {
                return fetch(url, requestOptions).then((response) => {
                    if (response.status == 200) {
                    } else {
                    }
                });
            }
        }
    }
}


async function _delete(
    url,
    body,
    auth_mode,
    handleResponse,
    check_offline = false,
    custom_handle = false,
    type_output = "null",
) {

    if (!(body instanceof FormData) && body != null) {
        body = JSON.stringify(body);
    }

    const requestOptions = {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
            Accept: "application/json, text/plain, */*",
        },
        body: body,
        cache: "no-cache",
    };
    if (!(body instanceof FormData) && body != null) {
        requestOptions.headers["Content-Type"] = "application/json";
    }
    requestOptions["mode"] = "cors"
    requestOptions.headers["Content-Type"] = "application/json";
    if (auth_mode == "jwt") {
        await QueryTokensv2(false);
        await delay(300);
        var p = new Promise(function (resolve, reject) {
            chrome.storage.sync.get(["token_auth_noota"], function (obj) {
                resolve(obj.token_auth_noota.savetoken)
            });
        });
        let savetoken = await p;
        requestOptions.headers["Authorization"] = `Bearer ${savetoken}`;
    }


    if (type_output == "null") {
        if (handleResponse != null) {
            return fetch(url, requestOptions)
                .then(handle_fail_json)
                .then(handleResponse);
        } else {
            if (custom_handle) {
                return fetch(url, requestOptions).then((response) => {
                    return response.json();
                });
            } else {
                return fetch(url, requestOptions).then((response) => {
                    if (response.status == 200) {
                        console.log("STATUS 200 no custom handle");
                    } else {
                        console.log("Status not 200 no custom handle");
                    }
                });
            }
        }
    }
}




// Stop recording
function endRecording(stream, recordedBlobs, multimedia_type) {
    // Show default icon
    chrome.browserAction.setIcon({
        path: "../assets/extension-icons/logo-32.png",
    });

    // Save recording if requested
    recording = false;
    chrome.tabs.getSelected(null, function (tab) {
        try {
            chrome.tabs.sendMessage(tab.id, {
                type: "end"
            });
        } catch (error) {
        }
    });


    if (!cancel) {
        TRIGGER_LAST_DIAR = true;
        saveRecording(recordedBlobs, multimedia_type);
    }

    // Stop tab and microphone streams
    stream.getTracks().forEach(function (track) {
        track.stop();
    });

    if (micable) {
        micstream.getTracks().forEach(function (track) {
            track.stop();
        });
    }
}

// Start recording the entire desktop / specific application
function getDesktop(with_videor) {
    var constraints = {
        audio: true,
        video: with_videor,
    };
    navigator.mediaDevices.getDisplayMedia(constraints).then(function (stream) {
        output = new MediaStream();
        if (stream.getAudioTracks().length == 0) {
            // Get mic audio (system audio is unreliable & doesn't work on Mac)
            if (!useragent) {
                if (micable && !mixing) {
                    micsource.connect(destination);
                    output.addTrack(destination.stream.getAudioTracks()[0]);
                }
            }
        } else {
            if (!mixing) {
                syssource = audioCtx.createMediaStreamSource(stream);
                if (micable) {
                    micsource.connect(destination);
                }
                syssource.connect(destination);
                output.addTrack(destination.stream.getAudioTracks()[0]);
            }
        }
        if (with_videor) {
            output.addTrack(stream.getVideoTracks()[0]);
        }

        // Set up media recorder & inject content
        newRecording(output, with_videor);

        // Record desktop stream
        recordedBlobs = [];
        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedBlobs.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            stream.getVideoTracks()[0].stop();
            let tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            endRecording(stream, recordedBlobs, with_videor);
            RECORDING_TAB = null;
            if (SecondPopUpState == "closed" && PopUp2Win == null) {
                SecondPopUpState = "opened";
                chrome.windows.create(
                    {
                        url: chrome.extension.getURL("html/popup2.html"), type: "popup"
                    },
                    function (win) {
                        Popup2Win = win;
                    }
                );
            }
        };

        if (with_videor) {
            stream.getVideoTracks()[0].onended = function () {
                cancel = false;
                mediaRecorder.stop();
            };
        }
    });
}

function init_guideline_process() {
    if (the_guideline != "default" && the_guideline != null) {
        if (all_guidelines != "default" && all_guidelines != null) {
            try {
                guidelines = JSON.parse(all_guidelines).contents;
                if (guidelines.length == 0 || guidelines == null) {
                    return;
                }
                let uuid = the_uuid_guidelines;
                console.log("query guideline init")
                output_data = post(guideline_url_root + "/rt_guidelines_rc_init", { uuid, guidelines, environnement }, "jwt", null);
            } catch (error) {
                console.log("query guideline init fail")
            }
        }
    }
}
async function init_nootiment() {
    try {
        guidelines = ["fake", "list"];
        let uuid = "uuid";
        console.log("query nootiment init")
        output_data = await post(senty_url_root + "/init_nootinex", { uuid, guidelines, environnement }, "jwt", null, false, true, "null");
        tokenooti = output_data.data;

    } catch (error) {
        console.log("query nootiment init fail")
        tokenooti = "";
    }


}

async function getTKfromBK() {
    var p = new Promise(function (resolve, reject) {
        chrome.storage.sync.get(["token_auth_noota", "time_get_cred"], function (result) {
            resolve(result);
        })
    });
    const configOut = await p;
    // savetoken
    // token_auth_noota
    time_get_cred = configOut["time_get_cred"]
    savetoken = configOut.token_auth_noota["savetoken"];
    refresh_token = configOut.token_auth_noota["refresh_token"];
}


function addToDiar(start, offset, current_spk) {
    let stop = ((new Date() - START_RECORD) / 1000) - offset;
    if (start != 0) {
        start = start - offset;
    }
    try {
        OLD_DIAR = DIAR_DATA[DIAR_DATA.length - 1];
    } catch (error) {
        OLD_DIAR = undefined
    }
    DIAR_DATA.push({ "s": start, "e": stop, "id": current_spk });
}
// Start recording the current tab
function getTab(with_videor) {
    //try to remove all old mediarecorder if exist
    DIAR_DATA = [];

    OLD_DIAR = undefined;
    ONGOING_DIAR = { "spk": "speaker", "start": 0, "stop": 0 }
    FINAL_GUIDELINES = {};
    outGGTR = { "final_result": [], "final_transcript": [] };
    PREVIOUS_GUIDELINE = null;
    PREVIOUS_KEY = null;
    BUFFER_TEXT = "";
    OLD_OFFSET = 0;
    TOTAL_PAUSE_TIME = 0;
    OFFSET_TOKEN = 0;
    BIG_OFFSET = 0;
    REFRESH_OFFSET = 0;
    OFFSET_MIMI = 0;
    START_MIMI = undefined;
    count_span = 0;
    last_index_diar = 0;
    GLOB_txt = "";
    let SPK_VOL = 1;
    let MIC_VOL = 1;
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabCapture.capture(
            {
                video: with_videor,
                audio: true,
                videoConstraints: {
                    mandatory: {
                        chromeMediaSource: "tab",
                        minWidth: width,
                        minHeight: height,
                        maxWidth: width,
                        maxHeight: height,
                        maxFrameRate: 30,
                    },
                },
            },
            function (stream) {
                // Combine tab and  mic  audio
                output = new MediaStream();
                syssource = audioCtx.createMediaStreamSource(stream);

                if (micable) {
                    micsource.connect(destination);
                }
                syssource.connect(destination);
                output.addTrack(destination.stream.getAudioTracks()[0]);
                if (with_videor) {
                    output.addTrack(stream.getVideoTracks()[0]);
                }
                //DIAR HERE!!!
                // Keep playing tab audio
                this.context = new AudioContext();
                this.stream = this.context.createMediaStreamSource(stream);
                this.stream.connect(this.context.destination);
                var START_TIME = 0
                var STOP_TIME;
                var STARTED_MIC = null;
                // micable = true;
                // micstream = mic;
                // micsource = audioCtx.createMediaStreamSource(micstream);
                var previousVal = true;
                // Speakers ALEX FROM HERE
                audioContext = new AudioContext();
                const output_audio_screen = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 1024;
                analyser.minDecibels = -90;
                analyser.maxDecibels = -10;
                analyser.smoothingTimeConstant = 0.7;
                //https://developers.google.com/web/updates/2017/12/audio-worklet
                // javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                // analyser.smoothingTimeConstant = 0.8;
                // analyser.fftSize = 1024;
                output_audio_screen.connect(analyser);
                const volumes = new Uint8Array(analyser.frequencyBinCount);
                volumeCallback = () => {

                    if (pausePLS && !TRIGGER_DIAR_PAUSE && !TRIGGER_LAST_DIAR && !TRIGGER_RESTART_DIAR) {
                        return;
                    }
                    analyser.getByteFrequencyData(volumes);
                    let volumeSum = 0;
                    for (const volume of volumes) {
                        volumeSum += volume;
                    }
                    const averageVolume = volumeSum / volumes.length;
                    SPK_VOL = averageVolume;

                    if (display_volume) {
                        console.log("Speaker volume", averageVolume);
                    }

                    if (TRIGGER_RESTART_DIAR) {
                        START_TIME = (new Date() - START_RECORD) / 1000;
                        TRIGGER_RESTART_DIAR = false;
                        return;
                    }

                    if (TRIGGER_LAST_DIAR) {
                        let total_offset = TOTAL_PAUSE_TIME + REFRESH_OFFSET + OFFSET_MIMI;
                        addToDiar(START_TIME, total_offset, CURRENT_DIAR);
                        TRIGGER_LAST_DIAR = false;
                        return;
                    }
                    // Value range: 127 = analyser.maxDecibels - analyser.minDecibels;
                    if (TRIGGER_DIAR_PAUSE) {
                        let total_offset = TOTAL_PAUSE_TIME + REFRESH_OFFSET + OFFSET_MIMI;
                        addToDiar(START_TIME, total_offset, CURRENT_DIAR);
                        TRIGGER_DIAR_PAUSE = false;
                        START_TIME = (new Date() - START_RECORD) / 1000;
                        return;
                    }

                    let total_offset = TOTAL_PAUSE_TIME + REFRESH_OFFSET + OFFSET_MIMI;
                    ONGOING_DIAR = { "spk": CURRENT_DIAR, "start": Math.max(0, START_TIME - total_offset) };

                    if ((SPK_VOL >= MIC_VOL * 2) && (SPK_VOL > 8)) {
                        VAD_ON_SPEAKER = true;
                        if (previousVal === true) {
                            chrome.tabs.sendMessage(tab.id, {
                                type: "stopMicrophone",
                            });
                            previousVal = false;
                        }
                        if (CURRENT_DIAR == "microphone") {
                            let total_offset = TOTAL_PAUSE_TIME + REFRESH_OFFSET + OFFSET_MIMI;
                            addToDiar(START_TIME, total_offset, "microphone");
                            // console.log("DIAR MIC READY  / VAD SPEAKER > 42 !!!")
                            START_TIME = (new Date() - START_RECORD) / 1000;
                            CURRENT_DIAR = "speaker";
                        }
                    } else if (SPK_VOL < 3) {
                        VAD_ON_SPEAKER = false;
                        if (previousVal === false) {
                            chrome.tabs.sendMessage(tab.id, {
                                type: "restartMicrophone",
                            });
                            previousVal = true;
                        }
                    }
                };

                if (volumeCallback !== null && volumeInterval === null) {
                    volumeInterval = setInterval(volumeCallback, 100);
                }

                let nb_sec_from_start = 0;
                let THRESHOLD_CONFIRM_DIAR = 0//0.15; // seconds
                // Microphone Darius FROM HERE
                audioContext2 = new AudioContext();
                input_mic_stream = audioContext2.createMediaStreamSource(micstream);
                analyserMi = audioContext2.createAnalyser();
                analyserMi.fftSize = 1024;
                analyserMi.minDecibels = -90;
                analyserMi.maxDecibels = -10;
                analyserMi.smoothingTimeConstant = 0.7;
                input_mic_stream.connect(analyserMi);
                const volumes2 = new Uint8Array(analyserMi.frequencyBinCount);
                volumeCallback2 = () => {
                    if (pausePLS) {
                        return;
                    }
                    analyserMi.getByteFrequencyData(volumes2);
                    let volumeSum4 = 0;
                    for (const volume of volumes2) {
                        volumeSum4 += volume;
                    }
                    const averageVolume2 = volumeSum4 / volumes2.length;
                    MIC_VOL = averageVolume2;

                    // Value range: 127 = analyser.maxDecibels - analyser.minDecibels;
                    if (display_volume) {
                        console.log("Microphone volume", averageVolume2);
                    }

                    if (VAD_ON_SPEAKER || CURRENT_DIAR == "microphone") {
                        return;
                    }
                    // && previousVal2 === true
                    if ((MIC_VOL > SPK_VOL * 2.4) && (MIC_VOL > 3)) {
                        if (STARTED_MIC == null) {
                            STARTED_MIC = new Date();
                            nb_sec_from_start = 0;
                        } else {
                            nb_sec_from_start = (new Date() - STARTED_MIC) / 1000;
                            if (nb_sec_from_start >= THRESHOLD_CONFIRM_DIAR) {
                                CURRENT_DIAR = "microphone";
                                let total_offset = TOTAL_PAUSE_TIME + REFRESH_OFFSET + OFFSET_MIMI;
                                addToDiar(START_TIME, total_offset, "speaker");
                                // console.log("DIAR SPEAKER READY / VAD MIC >0.2 for 0.15")
                                // console.log("New diar speaker finished : ", DIAR_DATA);
                                START_TIME = ((new Date() - START_RECORD) / 1000) - THRESHOLD_CONFIRM_DIAR;
                                STARTED_MIC = null;//until next trigger.
                            }
                        }

                    } else {
                        STARTED_MIC = null
                    }
                };
                if (volumeCallback2 !== null && volumeInterval2 === null) {
                    volumeInterval2 = setInterval(volumeCallback2, 100);
                }

                RECORDING_TAB = tab.id;
                // Set up media recorder & inject content
                newRecording(output, with_videor, tab.id);

                // Record tab stream
                recordedBlobs = [];
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        recordedBlobs.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    // Last Diarizaton.
                    STOP_TIME = (new Date() - START_RECORD) / 1000;
                    if (START_TIME != 0) {
                        START_TIME = START_TIME - TOTAL_PAUSE_TIME - REFRESH_OFFSET - OFFSET_MIMI;
                    }
                    DIAR_DATA.push({ "s": START_TIME, "e": STOP_TIME - TOTAL_PAUSE_TIME - REFRESH_OFFSET - OFFSET_MIMI, "id": CURRENT_DIAR });
                    console.log("Ended media recorder");
                    //Stop the actuel active record tab
                    //stream.getVideoTracks()[0].stop();
                    let tracks = stream.getTracks();
                    tracks.forEach((track) => track.stop());

                    //Just in case
                    clearInterval(volumeInterval2);
                    clearInterval(volumeInterval);
                    volumeInterval = null;
                    volumeInterval2 = null
                    try {
                        syssource.disconnect(destination);
                    } catch (error) {
                        console.log("could not disconnect syssource")
                    }

                    endRecording(stream, recordedBlobs, with_videor);
                };
            }
        );
    });
}



function QueryTokens() {
    first_login = true;
    let debug = false;

    if (debug) {
        console.log("Called Query token function V1 !");
    }
    getTKfromBK();
    // debugger;
    if (
        time_get_cred != undefined &&
        time_get_cred != ""
    ) {
        var today = new Date();
        let diffMinutes = (today - new Date(time_get_cred)) / (1000 * 60);
        if (debug) {
            console.log("diff min", diffMinutes);
        }
        if (diffMinutes >= THRESHOLD_REFRESH && first_login) {
            console.log("Refresh token expired");
            chrome.runtime.sendMessage({ type: "Auth", status: false });
            noAccount = true;
            chrome.storage.sync.set({
                token_auth_noota: {
                    savetoken: "",
                    refresh_token: "",
                },
            });
            ProcessRedirectToLogin(true);
            return false
        }
        if (diffMinutes >= THRESHOLD_SAVE * 0.8) {

            try {
                fetch(base_url_root + '/scribes/refresh_token', {
                    method: "post",
                    credentials: "same-origin",
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${refresh_token}`,
                    },
                    body: null,
                    cache: "no-cache"
                }).then((result) => {
                    return result.json();
                }).then((data) => {
                    let date = new Date().toJSON();
                    chrome.storage.sync.set({ time_get_cred: date });
                    chrome.storage.sync.set({
                        token_auth_noota: {
                            savetoken: data["access_token"],
                            refresh_token: refresh_token,
                        },
                    });
                    chrome.runtime.sendMessage({ type: "authok", value: data["access_token"] });
                    chrome.runtime.sendMessage({ type: "Auth", status: true });
                    getTKfromBK();
                    return true
                });
                return true
            } catch (error) {
                return false;
            }
        } else {
            if (
                savetoken != null &&
                savetoken != "" &&
                savetoken != undefined
            ) {
                chrome.runtime.sendMessage({ type: "Auth", status: true, value: savetoken });
                noAccount = false;
                return true;
            } else {
                noAccount = true;
                return false;
            }
        }
    } else {
        if (first_login) {
            handleFirstLogin(true);
            chrome.runtime.sendMessage({ type: "Auth", status: false });
            noAccount = true;
            return false
        }

    }



}



async function QueryTokensv2(first_login = false) {
    let debug = false;
    if (debug) {
        console.log("Called Query token function V2 !");
    }
    var p = new Promise(function (resolve, reject) {
        chrome.storage.sync.get(["token_auth_noota", "time_get_cred"], function (result) {
            let tmp_refreshjwt2 = result.token_auth_noota.refresh_token
            if (debug) {
                console.log(result);
            }
            if (
                result.time_get_cred != undefined &&
                result.time_get_cred != ""
            ) {
                var today = new Date();
                let diffMinutes = (today - new Date(result.time_get_cred)) / (1000 * 60);

                if (debug) {
                    console.log(diffMinutes);
                }
                if (diffMinutes >= THRESHOLD_REFRESH && first_login) {
                    console.log("Refresh token expired");
                    chrome.runtime.sendMessage({ type: "Auth", status: false });
                    noAccount = true;
                    chrome.storage.sync.set({
                        token_auth_noota: {
                            savetoken: "",
                            refresh_token: "",
                        },
                    });
                    ProcessRedirectToLogin(true);
                    resolve(false);
                }
                else if (diffMinutes >= THRESHOLD_SAVE * 0.8) {
                    try {
                        fetch(base_url_root + '/scribes/refresh_token', {
                            method: "post",
                            credentials: "same-origin",
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${tmp_refreshjwt2}`,
                            },
                            body: null,
                            cache: "no-cache"
                        }).then((result) => {
                            return result.json();
                        }).then((data) => {
                            let date = new Date().toJSON();
                            chrome.storage.sync.set({ time_get_cred: date });
                            chrome.storage.sync.set({
                                token_auth_noota: {
                                    savetoken: data["access_token"],
                                    refresh_token: tmp_refreshjwt2,
                                },
                            });
                            chrome.runtime.sendMessage({ type: "authok", value: data["access_token"] });
                            chrome.runtime.sendMessage({ type: "Auth", status: true });
                            getTKfromBK();
                        });
                        resolve(true);
                    } catch (error) {
                        console.log("ERROR DURING REFRESH TOKEN !!!!!!! : ", error)
                        resolve(false);
                    }
                } else {
                    if (
                        savetoken != null &&
                        savetoken != "" &&
                        savetoken != undefined
                    ) {
                        chrome.runtime.sendMessage({ type: "Auth", status: true, value: savetoken });
                        noAccount = false;
                        resolve(true);
                    } else {
                        noAccount = true;
                        resolve(false);
                    }
                }
            } else {
                if (first_login) {
                    handleFirstLogin(true);
                    chrome.runtime.sendMessage({ type: "Auth", status: false });
                    noAccount = true;
                    resolve(false);
                }

            }
        });


    });
    // make this call blocking so that it is okay.
    let out = await p;
}





// Inject content scripts to start recording
function startRecording(with_videor) {
    if (recording_type == "camera-only") {
        injectContent(true);
        recording = true;
    }
    getDeviceId();
    dateStarted = new Date().getTime();
    chrome.storage.sync.set({ list_guidelines: [] });
    record(with_videor);
}

// Get microphone audio and start recording video
function record(with_videor) {
    // Get window dimensions to record
    chrome.windows.getCurrent(function (window) {
        width = window.innerWidth / 2;
        height = window.innerHeight / 2;
    });

    var constraints;
    chrome.storage.sync.get(["quality"], function (result) {
        quality = result.quality;
        chrome.storage.sync.get(["mic", "flip"], function (result) {
            // Set microphone constraints
            constraints = {
                audio: {
                    deviceId: result.mic,
                },
                video: result.flip,
            };
            //fixme was set
            // Start microphone stream
            navigator.mediaDevices
                .getUserMedia(constraints)
                .then(function (mic) {
                    micable = true;
                    micstream = mic;
                    micsource = audioCtx.createMediaStreamSource(mic);

                    // Check recording type
                    if (recording_type == "desktop") {
                        getDesktop(with_videor);
                    } else if (recording_type == "tab-only") {
                        getTab(with_videor);
                    }
                })
                .catch(function (error) {
                    micable = false;
                    console.log("Could not get the MIC !!!!! Going without Microphone recording?.")
                    // Check recording type
                    if (recording_type == "desktop") {
                        getDesktop(with_videor);
                    } else if (recording_type == "tab-only") {
                        getTab(with_videor);
                    }
                });
        });
    });
}

// Inject content script
function injectContent(start = false, desk = false) {
    InjectRefact();
}

function InjectRefact() {
    chrome.tabs.getSelected(null, function (tab) {
        if (maintabs.indexOf(tab.id) == -1 && recording_type != "camera-only") {
            // Inject content if it's not a camera recording and the script hasn't been injected before in this tab
            tabid = tab.id;
            chrome.tabs.executeScript(tab.id, {
                file: "./js/libraries/jquery-3.5.1.min.js",
            });

            chrome.tabs.executeScript(
                tab.id,
                {
                    code:
                        'window.countdownactive = false;window.camerasize = "' +
                        camerasize +
                        '";window.camerapos = {x:"' +
                        camerapos.x +
                        '",y:"' +
                        camerapos.y +
                        '"};',
                },
                function () {
                    chrome.tabs.executeScript(tab.id, {
                        file: "./js/content.js",
                    });
                }
            );

            chrome.tabs.insertCSS(tab.id, {
                file: "./css/content.css",
            });
            maintabs.push(tab.id);
        } else if (
            camtabs.indexOf(tab.id) == -1 &&
            recording_type == "camera-only"
        ) {
            // Inject content for camera recording if the script hasn't been injected before in this tab
            tabid = tab.id;
            chrome.tabs.executeScript(tab.id, {
                file: "./js/libraries/jquery-3.5.1.min.js",
            });

            chrome.tabs.executeScript(
                tab.id,
                {
                    code: "window.countdownactive = false;",
                },
                function () {
                    chrome.tabs.executeScript(tab.id, {
                        file: "./js/cameracontent.js",
                    });
                }
            );

            chrome.tabs.insertCSS(tab.id, {
                file: "./css/cameracontent.css",
            });
            // FIXME only if parameter is selected
            camtabs.push(tab.id);
        } else {
            // FIXME CAMERA QUI SE RALLUME
            // If the current tab already has the script injected
            // if (recording_type == "camera-only") {
            //     chrome.tabs.sendMessage(tab.id, {
            //         type: "restart-cam",
            //         countdown: false,
            //     });
            // } else {
            //     chrome.tabs.sendMessage(tab.id, {
            //         type: "restart",
            //         countdown: false,
            //         camerapos: camerapos,
            //         camerasize: camerasize,
            //     });
            // }
        }
    });

    chrome.tabs.getSelected(null, function (tab) {
        WindowCanvasFreeDraw = tab.windowId;
        TabCanvasFreeDraw = tab.id;
    });
}


function updateMultimedia(id, request) {
    chrome.storage.sync.set({
        multimedia: request.id,
    });
}

// Switch microphone input
function updateMicrophone(id, request) {
    // Save user preference for microphone device
    chrome.storage.sync.set({
        mic: request.id,
    });
    // Check recording type
    if (recording) {
        if (recording_type == "camera-only") {
            // Send microphone device ID to the camera content script
            chrome.tabs.sendMessage(tab.id, {
                type: "update-mic",
                mic: request.id,
            });
        } else {
            // Stop current microphone stream
            micstream.getTracks().forEach(function (track) {
                track.stop();
            });

            // Start a new microphone stream using the provided device ID
            chrome.tabs.getSelected(null, function (tab) {
                navigator.mediaDevices
                    .getUserMedia({
                        audio: {
                            deviceId: id,
                        },
                        video: false,
                    })
                    .then(function (mic) {
                        micstream = mic;
                        micsource = audioCtx.createMediaStreamSource(mic);
                        micsource.connect(destination);
                    })
                    .catch(function (error) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "no-mic-access",
                        });
                    });
            });
        }
    }
}

// Get a list of the available audio devices
function getDeviceId() {
    audiodevices = [];
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
        devices.forEach(function (device) {
            if (device.kind == "audioinput") {
                //Detect if mixing stereo exist
                if (device.label.toLowerCase().includes("mixage")) {
                    mixing = device.deviceId;
                }
                if (device.label.toLowerCase().includes("mixing")) {
                    mixing = device.deviceId;
                }

                audiodevices.push({
                    label: device.label,
                    id: device.deviceId,
                });
            }
        });

        chrome.runtime.sendMessage({ type: "audio-done" });
    });
}

// Mute/unmute microphone and system audio
function audioSwitch(source, enable) {
    if (recording_type != "camera-only") {
        // Start a new microphone stream if one doesn't exist already
        if (!micable) {
            chrome.tabs.getSelected(null, function (tab) {
                navigator.mediaDevices
                    .getUserMedia({
                        audio: true,
                        video: false,
                    })
                    .then(function (mic) {
                        micable = true;
                        micstream = mic;
                        micsource = audioCtx.createMediaStreamSource(mic);
                        micsource.connect(destination);
                    })
                    .catch(function (error) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "no-mic-access",
                        });
                    });
            });
        }
        if (source == "mic" && !enable && micable) {
            micsource.disconnect(destination);
        } else if (source == "mic" && enable && micable) {
            micsource.connect(destination);
        } else if (source == "tab" && !enable) {
            syssource.disconnect(destination);
        } else {
            syssource.connect(destination);
        }
    } else {
        chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.sendMessage(tab.id, {
                type: "mic-switch",
                enable: enable,
            });
        });
    }
}

// Update camera device
function updateCamera(request) {
    chrome.tabs.getSelected(null, function (tab) {
        // Save user preference
        chrome.storage.sync.set({
            camera: request.id,
        });

        // Send user preference to content script
        chrome.tabs.sendMessage(tab.id, {
            type: request.type,
            id: request.id,
        });
    });
}

// Toggle push to talk
function pushToTalk(request, id) {
    chrome.tabs.getSelected(null, function (tab) {
        pushtotalk = request.enabled;

        // Send user preference to content script
        chrome.tabs.sendMessage(tab.id, {
            type: request.type,
            enabled: request.enabled,
        });
    });
}

// Countdown is over / recording can start
function countdownOver() {
    //FIXME DD What is this ???
    if (recording) {
        console.log("Returning countdownover as already recording.")
        return;
    }
    console.log("Count down over event !!!");
    if (recording_type == "camera-only") {
        chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.sendMessage(tab.id, {
                type: "camera-record",
            });
        });
        return;
    }
    // else {
    // if (!recording) {
    //     mediaRecorder.start(1000);
    //     console.log("count down over recording true")
    //     recording = true;
    // }
    // }
}

// Inject content when tab redirects while recording
function pageUpdated(sender) {
    chrome.tabs.getSelected(null, function (tab) {
        if (sender.tab.id == tab.id) {
            if (recording && tab.id == tabid && recording_type == "tab-only") {
                injectContent(false);
                getDeviceId();
                tabid = 0;
            } else if (recording && recording_type == "desktop") {
                injectContent(false);
                getDeviceId();
                tabid = 0;
            }
            maintabs.splice(maintabs.indexOf(tabid), 1);
        }
    });
}

// Changed tab selection
chrome.tabs.onActivated.addListener(function (tabId, changeInfo, tab) {
    if (!recording) {
        // Hide injected content if the recording is already over
        chrome.tabs.getSelected(null, function (tab) {
            if (tab != undefined) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "end",
                });
            }
        });
    } else if (
        recording &&
        recording_type == "desktop" &&
        maintabs.indexOf(tabId) == -1
    ) {
        // Inject content for entire desktop recordings (content should be on any tab)
        injectContent(false);
    }
});





chrome.tabs.onRemoved.addListener(function (tabid, removed) {
    // Stop recording if tab is closed in a camera only recording
    if (tabid == tabid && recording && recording_type == "camera-only") {
        recording = false;
        // Show default icon
        chrome.browserAction.setIcon({ path: "../assets/extension-icons/logo-32.png" });
        tabid = 0;
    }
    if (tabid == RECORDING_TAB && RECORDING_TAB != null) {
        //FIXME Handle this scenario with a confirm instead ?.
        try {
            mediaRecorder.stop();
            alert("Cannot record  your tab anymore as the source tab has been closed.");
        } catch (error) {
        }
    }
});




// Keyboard shortcuts
chrome.commands.onCommand.addListener(function (command) {
    if (recording) {
        if (command == "stop") {
            stopRecording(command);
        } else if (command == "pause/resume") {
            chrome.tabs.getSelected(null, function (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "pause/resume",
                });
            });
        } else if (command == "cancel") {
            stopRecording(command);
            PopupWin = false;
        } else if (command == "mute/unmute" && !pushtotalk) {
            chrome.tabs.getSelected(null, function (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "mute/unmute",
                });
            });
        }
    }
});

function ProcessRedirectToLogin(force = false) {
    if (!WinTabidLoginPage || force == true) {
        if (noAccount || force == true) {
            let url_open = base_url_root + "/?msg=lgExt";
            let url_open2 = base_url_root + "/dashboard";
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                if (tabs.length == 0) {
                    chrome.tabs.create({ url: url_open, active: true });
                } else {
                    const currentTab = tabs[0];
                    if (currentTab.url != url_open && currentTab.url != url_open2) {
                        chrome.tabs.query({}, function (tabs) {
                            URL_FOUND = false;
                            for (var i = 0; i < tabs.length; ++i) {
                                let the_tab = tabs[i].url;
                                if (the_tab == url_open || the_tab == url_open2) {
                                    var updateProperties = { 'active': true };
                                    chrome.tabs.update(tabs[i].id, updateProperties, (tab) => { });
                                    chrome.tabs.reload(tabs[i].id);
                                    URL_FOUND = true;
                                    //fallback to first one
                                    // chrome.tabs.update(currentTab.id, updateProperties, (tab) => { });
                                    break;
                                }
                            }
                            if (!URL_FOUND) {
                                // create only if one of the tab does not contain Noota.
                                chrome.tabs.create({ url: url_open, active: true });
                                //fallback to first one
                                // chrome.tabs.update(currentTab.id, updateProperties, (tab) => { });
                            }
                        });
                    } else {
                        // refresh window.
                        chrome.tabs.reload(currentTab.id);
                    }
                }
            });
            //FIXME DD add other to automatically init if user already on dashboard
        }
    }
}


async function getCredFromBackend() {
    let url_post = base_url_root + "/api/user/get_RMC";
    let status_nooken;
    const handleCred = (data) => {
        //UPDATE THE TOKEN
        status_nooken = true;
        if (data[1] != 200) {
            status_nooken = false;
            return;
        }
        // check the status
        chrome.storage.sync.set({ enc_total_cred: data[0].total_credit_encrypted });
    };
    await get(url_post, "json", "jwt", handleCred, false);
    console.log("status nooken : ", status_nooken)
    return status_nooken;
}

function handleFirstLogin(redir) {

    if (savetoken == null || savetoken == "") {
        // console.log("Redirect login 5");
        ProcessRedirectToLogin();
        return;
    }
    if (WinTabidLoginPage) {
        chrome.tabs.remove(WinTabidLoginPage, () => { });
        WinTabidLoginPage = false;
    }
    //Store
    let date = new Date().toJSON();
    chrome.storage.sync.set({ time_get_cred: date });

    noAccount = false;
}