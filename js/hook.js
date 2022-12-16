/* eslint-disable no-undef */
// /* eslint-env jquery */

//Hook & utils
chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.browserAction.setPopup({
    popup: "html/popup.html", // Open this html file within the popup.
  });
  PopupWin = true;
});

function GetPopup2CurrentState() {
  let out = chrome.runtime.sendMessage({ type: "window", subtype: "IsAlive" });
  if (out) {
    SecondPopUpState = "opened";
  }
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}


//Get jwt token from Noota
chrome.runtime.onMessageExternal.addListener(function (
  request,
  sender,
  sendResponse
) {
  Sentry.wrap(function () {

    if (request) {
      if (request.message) {
        if (request.message == "version") {
          sendResponse({ version: 1.0 });
        }
      }

      if (request.type == "SetDataLocal") {
        savetoken = request.obj.value;
        refresh_token = request.obj.refresh;
        //Store
        var today = new Date().toJSON();
        chrome.storage.sync.set({ time_get_cred: today });
        chrome.storage.sync.set({
          token_auth_noota: {
            savetoken: savetoken,
            refresh_token: refresh_token,
          },
        });
        chrome.runtime.sendMessage({ type: "clickConnect", subtype: "IsAlive" });
      }
    }
    return true;
  });
});

// Listen for messages from content / popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  Sentry.wrap(function () {

    if (request.type == "useragent") {
      useragent = request.value;
    } else if (request.type == "ModalState") {
      console.log("update ModalState :" + request.subtype);

      ModalState = request.subtype;
    } else if (request.type == "Redirection") {
      if (request.subtype == "the_end") {
        clear_guidelines(request.subtype)
      } else {
        let listen_gd;
        if (the_guideline != "default") {
          listen_gd = true;
        } else {
          listen_gd = false;
        }
        redirectUsertotranscribe(request.subtype, listen_gd);
      }
    } else if (request.type == "first_login") {
      handleFirstLogin(true);
      chrome.storage.sync.get(["token_auth_noota"], (obj) => {
        savetoken = obj.token_auth_noota.savetoken;
        refresh_token = obj.token_auth_noota.refresh_token;
      });
    } else if (request.type == "do_nl") {
      do_nl = request.id;
    } else if (request.type == "update_topics") {
      all_topics = request.id;
      if (all_topics.length != 0) {
        do_topic = true;
      } else {
        do_topic = false;
      }
    } else if (request.type == "AuthNoota") {
      if (request.subtype == "skip") {
        noAccount = true;
        sendResponse({
          status: false,
        });
      } else if (request.subtype == "first_jwt") {
        let status = QueryTokens();
        // console.log("first jwt !!!", status);
        chrome.storage.sync.get(["token_auth_noota"], (obj) => {
          savetoken = obj.token_auth_noota.savetoken;
          refresh_token = obj.token_auth_noota.refresh_token;
        });
        sendResponse({
          status: status,
        });

        // .then((data) => {
        //   console.log("first jwt !!!", data);
        //   if (data === true) {

        //     noAccount = false;

        //   } else {
        //     noAccount = true;
        //     sendResponse({
        //       status: false,
        //     });
        //   }
        // });
        // return true from the event listener to indicate you wish to send a response asynchronously
        // (this will keep the message channel open to the other end until sendResponse is called).
        // return true;

        // add no
      }
    } else if (request.type == "process_redirect") {
      ProcessRedirectToLogin();
    } else if (request.type == "RGBAModal") {
      chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
        chrome.tabs.sendMessage(TabCanvasFreeDraw, {
          type: "pickonChange",
          colorOfpickr: request.RGB,
          colorOfpickrRGBA: request.RGBA,
        });
      });
    } else if (request.type === "candoascreen") {
      AsyncTakeScreenShotHandler();
    } else if (request.type === "AddHighlight") {
      AddHighlight();
    } else if (request.type === "AddHighlight2") {
      AddHighlight2EventHandler();
    } else if (request.type === "GetContext") {
      sendResponse({
        ModalState: ModalState,
        noAccount: noAccount,
        mainrecognizingcontainer: mainrecognizingcontainer.innerHTML,
        maincontainer: maincontainer.innerHTML,
        status: mediaRecorder.state,
        dDur: dDUR.innerHTML,
      });
    } else if (request.type == "windowload") {
      try {
        if (SecondPopUpState == "opened") {
          chrome.windows.update(Popup2Win.id, { focused: true });
        }
      } catch (error) {
        // console.log("windowload BUG UNHANDLEDED!!!!!!");
      }
      //Permit to recover popup2 when user have close it
      if (ModalState != false) {
        try {
          if (request.winid != Popup2Win.id) {
            PopupWin = true;
            sendResponse({ PopupWin: 1, popup2State: "closed" });

            GetPopup2CurrentState();

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
            }
          }
        } catch (error) {
          PopupWin = true;
          sendResponse({ PopupWin: 1, popup2State: "closed" });

          GetPopup2CurrentState();

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
          }
        }
      }

      if (SecondPopUpState == null) {
        //Init the first PopupMain win
        PopupWin = true;
        sendResponse({ PopupWin: 1 });
      } else {
        // console.log("STATE COMPUTED IN windowload  ", recording, PopupWin, mediaRecorder)

        if (!recording && !PopupWin && mediaRecorder.state == "inactive") {
          console.log("!recording && !PopupWin && mediaRecorder.state == \"inactive\"")
          sendResponse({ PopupWin: 1 });
          return;
        }
        //ReOpen Popup2 immediat and close popup1
        if (SecondPopUpState == "closed" && mediaRecorder.state != "inactive") {
          PopupWin = true;
          console.log("//ReOpen Popup2 immediat and close popup1")

          sendResponse({ PopupWin: 1, popup2State: SecondPopUpState });
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
          if (SecondPopUpState == "opened" && request.winid != Popup2Win.id) {
            //ITS POPUP1 SO instant close
            console.log("//ITS POPUP1 SO instant close")

            sendResponse({ PopupWin: 1, popup2State: "closed" });
          } else {
            GetPopup2CurrentState();

            if (SecondPopUpState == "opened" && request.winid == Popup2Win.id) {
              //ITS POPUP1 SO instant close
              sendResponse({
                PopupWin: 2,
                WinID: Popup2Win.id,
                WindowCanvasFreeDraw: WindowCanvasFreeDraw,
                TabCanvasFreeDraw: TabCanvasFreeDraw,
              });
            }

            //ITS POPUP1 SO instant close
            if (SecondPopUpState == "opened" && request.winid != Popup2Win.id) {
              sendResponse({ PopupWin: 1, popup2State: "closed" });
            }

            //ITS A RENEW OF POPUPWIN ID
            if (
              SecondPopUpState == "closed" &&
              mediaRecorder.state == "inactive"
            ) {
              sendResponse({ PopupWin: 1 });
            }
          }
        }
      }
    } else if (request.type == "windowclose") {
      // console.log("windowclose " + request.PopupWin);
      if (request.PopupWin == 2) {
        Popup2Win = null;
        SecondPopUpState = "closed";
      }
    } else if (request.type == "record") {
      startRecording(false);
    } else if (request.type == "stop-save") {
      stopRecording(request.type);
    } else if (request.type == "stop-cancel") {
      stopRecording(request.type);
      PopupWin = false;
      SecondPopUpState = null;
      Popup2Win = false;
      chrome.runtime.sendMessage({ type: "window", subtype: "CloseEvent" });

    } else if (request.type == "record-w-video") {
      startRecording(true);
    } else if (request.type == "pause") {
      let status = PauseRecord();
      if (noAccount) {
        sendResponse({ success: true });
      } else {
        sendResponse({ success: status });
      }
    } else if (request.type == "resume") {
      ResumeRecord();
      if (noAccount) {
        sendResponse({ success: true });
      } else {
        sendResponse({ success: true });
      }
    } else if (request.type == "audio-request") {
      sendResponse({ devices: audiodevices });
    } else if (request.type == "update-mic") {
      updateMicrophone(request.id, request);
    } else if (request.type == "update-multimedia") {
      updateMultimedia(request.id, request);
    } else if (request.type == "update-camera") {
      updateCamera(request);
      // } else if (request.type == "update-nb-speaker") {
      // nbspeaker = request.id;
    } else if (request.type == "update-language") {
      language = request.id;
      DO_THE_SENTI = ["hi", "es", "pt", "ar", "en", "fr", "de", "ko",
        "ja", "id", "tr", "ru", "th", "pl", "nl", "et",
        "ca", "sv", "fi", "el", "cs", "he", "ta", "zh",
        "da", "lv", "hu", "ro", "lt", "vi", "uk", "sl", "is",
        "sr", "bn", "bg", "mr", "si", "te", "kn", "gu", "my", "am",
        "km"].includes(language.split("-")[0]);
      chrome.storage.sync.set({
        language: request.id,
      });
    } else if (request.type == "update-title") {
      the_title = request.id;
      chrome.storage.sync.set({
        the_title: request.id,
      });
    } else if (request.type == "update-email") {
      the_email = request.id;
      chrome.storage.sync.set({
        the_email: request.id,
      });
    } else if (request.type == "update-folder") {
      the_folder = request.id;
      chrome.storage.sync.set({
        the_folder: request.id,
      });
    } else if (request.type == "update-guideline") {
      the_guideline = request.id;
      chrome.storage.sync.set({
        the_guideline: request.id,
      });

    } else if (request.type == "set-guidelines") {
      all_guidelines = request.id;
      chrome.storage.sync.set({
        all_guidelines: request.id,
      });
    } else if (request.type == "diar-data") {
      chrome.storage.sync.set({
        diardata: request.id,
      });
    } else if (request.type == "generate-uuid-guideline") {
      the_uuid_guidelines = String(uuidv4());
      chrome.storage.sync.set({
        the_uuid_guidelines: request.id,
      });
    } else if (request.type == "update-translate-language") {
      translate_language = request.id;
    } else if (request.type == "upd-time-get-cred") {
      time_get_cred = request.id;
    } else if (request.type == "audio-switch") {
      audioSwitch(request.source, request.enable);
    } else if (request.type == "camera-list") {
      // chrome.storage.sync.set({
      //   language: "record_only"
      // });
      // chrome.tabs.getSelected(null, function (tab) {
      //   chrome.tabs.sendMessage(tab.id, {
      //     type: request.type,
      //     devices: request.devices,
      //     audio: request.audio,
      //   });
      // });
    } else if (request.type == "flip-camera") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: request.type,
          enabled: request.enabled,
        });
      });
    } else if (request.type == "push-to-talk") {
      pushtotalk(request);
    } else if (request.type == "switch-toolbar") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: request.type,
          enabled: request.enabled,
        });
      });
    } else if (request.type == "countdown") {
      countdownOver();
    } else if (request.type == "recording-type") {
      recording_type = request.recording;
    } else if (request.type == "record-request") {
      if (mainrecognizingcontainer != "" || mainrecognizingcontainer != "") {
        chrome.runtime.sendMessage({ type: "ShowRecordingPanel" });
      }
      sendResponse({
        recording: recording,
        data: {
          mainrecognizingcontainer: mainrecognizingcontainer,
          mainrecognizedcontainer: maincontainer,
        },
      });
    } else if (request.type == "pause-camera") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "pause-camera",
        });
      });
    } else if (request.type == "resume-camera") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "resume-record",
        });
      });
    } else if (request.type == "no-camera-access") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "no-camera-access",
        });
      });
    } else if (request.type == "audio-check") {
      getDeviceId();
    } else if (request.type == "end-camera-recording") {
      recording = false;
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "end-recording",
        });
      });
    } else if (request.type == "sources-loaded") {
      pageUpdated(sender);
    } else if (request.type == "camera-pos") {
      camerapos.x = request.x;
      camerapos.y = request.y;
    }
  });
});
