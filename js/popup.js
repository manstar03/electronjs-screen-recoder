//Route
/* eslint-disable no-undef */
/* eslint-env jquery */

var first_resize = true;
var useragent = false;
var GUIDELINE_UUID;
var GD = false;
console.log = function () { };
console.log(chrome);
if (
  window.navigator.userAgent.includes("Macintosh") ||
  window.navigator.userAgent.includes("AppleWebKit") ||
  window.navigator.userAgent.includes("Mac")
) {
  useragent = true;
  chrome.runtime.sendMessage({ type: "useragent", value: true });
}

var WindowCanvasFreeDraw;
var TabCanvasFreeDraw;
var HidePanelPopup = false;
var PopupWin = null;


var Autoscroll = true;


var NoAccount;

var mainrecognizingcontainer = document.querySelector(
  "#mainrecognizingcontainer"
);
var mainrecognizedcontainer = document.querySelector("#maincontainer");

var ModalState;

// window.addEventListener("resize", function (event) {
//   var newHeight = window.innerHeight;
//   $("#textcontainer").css("max-height", newHeight - 109);
// });

async function getLanguageInput() {
  // language
  // handle getFlipTranscript
  // language => "record_only" => ('#language_select_input').prop('disabled', true).niceSelect('update');
  // storage multimedia
  var p = new Promise(function (resolve, reject) {
    chrome.storage.sync.get(["language"], function (result) {
      resolve(result.language);
    })
  });
  let language = await p;
  console.log("language value ! ", language);

  var l = new Promise(function (resolve, reject) {
    chrome.storage.sync.get(["guideline"], function (result) {
      resolve(result.guideline);
    })
  });
  let guideline = await l;
  console.log("guideline value ! ", guideline);


  if (language == "record_only") {
    $("#flip_transcript")[0].checked = true;
    $('#language_select_input').prop('disabled', true).niceSelect('update');
    $("#language_select_input").next().find(".current").text("Record without Transcribe");
    $('#recordAudio, #folderBtnn').prop('disabled', true)
    $('#guideline_select_input').prop('disabled', true).niceSelect('update');
    $("#guideline_select_input").next().find(".current").text("Requires Transcription");
  } else {
    $("#flip_transcript")[0].checked = false;
    $('#recordAudio, #folderBtnn').prop('disabled', false);
    if (language != null) {
      $("#language_select_input").prop('disabled', false).val(language).niceSelect("update");
    }
    if (guideline != null) {
      $('#guideline_select_input').prop('disabled', false).val(guideline).niceSelect('update');
    }
    $("#folderBtnn").click();
  }
  return language;
}

async function getMultimediaSelect() {
  // storage multimedia
  var p = new Promise(function (resolve, reject) {
    chrome.storage.sync.get(["multimedia"], function (result) {
      resolve(result.multimedia);
    })
  });
  let multimedia = await p;
  console.log("multimedia value ! ", multimedia);

  if (multimedia != null) {
    $("#multimedia-select").val(multimedia).niceSelect("update");
  }
  return multimedia;
}


function open_topic_tracker(data) {
  // new one remove old one
  $("#part2title").text(data.title);
  updateColorToast(data.color);
  $("#extmsgdsp").html(data.messages)
  $("#exttoast").show("slow");
}

function luminance(r, g, b) {
  if (typeof r == "string") {
    r = r.trim();
    g = g.trim();
    b = b.trim();
  }
  var a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgbVec(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

function contrast(rgb1, rgb2) {
  let tmp1 = hexToRgbVec(rgb1);
  let tmp2 = hexToRgbVec(rgb2);
  rgb1 = [tmp1.r, tmp1.g, tmp1.b];
  rgb2 = [tmp2.r, tmp2.g, tmp2.b];

  var lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  var lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  var brightest = Math.max(lum1, lum2);
  var darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function updateColorToast(hex_value) {
  let black_ratio = contrast(hex_value, "#000000");
  let white_ratio = contrast(hex_value, "#ffffff");
  if (white_ratio <= 1.25) {
    hex_value = "#e8e8e8";
    $("#exttoastTitle").css("color", "black")
  } else if (white_ratio > black_ratio) {
    $("#exttoastTitle").css("color", "white")
  } else {
    $("#exttoastTitle").css("color", "black")
  }
  $("#color_front").css('background-color', hex_value);
  $("#exttoastTitle").css("background-color", hex_value)
}





function open_toast(mode) {
  let hasTime = null;

  $("#toast").removeClass("positive").removeClass("negative");
  if (mode == "positive") {
    $("#toastTitle").text("Wow 🤩");
    $("#toastText").html("People love what you say.<br> Good job continue like that  !");
    $("#toast").addClass("positive").addClass("active");
  } else {
    $("#toastTitle").text("Oups 😱");
    $("#toastText").html("Not sure about what you said.<br> People Doesn't seems happy.");
    $("#toast").addClass("negative").addClass("active");
  }
  if (hasTime != null) {
    clearTimeout(hasTime);
  }

  hasTime = setTimeout(function () {
    $("#toast").removeClass('active');
    $("#toastText").html('');
    $("#toastTitle").html('');
  }, 5000);
}

function CocherGuideline(input_gd, animate = false) {
  // FIXME attention input_gd peut etre une listee.
  $(".linesubGDL").each(function (index, value) {
    let $cc = $(value);
    if ($cc.find(".btnGuideline").hasClass("GDunactive")) {
      let text = $cc.find(".txtDitGd").text();
      if (text == input_gd) {
        $cc.find(".btnGuideline").removeClass("GDunactive").addClass("GDactive");
        if (animate) {
          $cc.addClass("highlightedGD");
          $cc.find(".btnGuideline").off();
          $cc.off();
        }
        // Scroll to container
        if ($("#guidelineContainer:visible").length && animate) {
          var elOffset = $cc.offset().top;
          var elHeight = $cc.height();
          var windowHeight = $("#GDTRSDIV").height();
          var offset;
          if (elHeight < windowHeight) {
            offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
          } else {
            offset = elOffset;
          }
          var speed = 700;
          $('#GDTRSDIV').animate({ scrollTop: offset }, speed);
        } else if (animate) {
          let ntf_value = parseInt($("#nbGDmatch").text());
          let new_value = ntf_value + 1;
          $("#nbGDmatch").text(new_value).parent().show("flex");
        }

        return false;
      }
    }
  });
}


async function getFlip() {
  // storage flip
  var p = new Promise(function (resolve, reject) {
    chrome.storage.sync.get(["flip"], function (result) {
      resolve(result.flip);
    })
  });
  let flip = await p;
  console.log("flip value ! ", flip);

  if (flip) {
    $("#flip")[0].checked = true;
  } else {
    $("#flip")[0].checked = false;
  }
  return flip;
}


async function getMicSelect() {
  // storage mic
  var p = new Promise(function (resolve, reject) {
    chrome.storage.sync.get(["mic"], function (result) {
      resolve(result.mic);
    })
  });
  let mic = await p;
  var exists = false;
  $('#mic-select').each(function () {
    if (this.value == mic) {
      exists = true;
      return false;
    }
  });

  if (exists && mic != null) {
    $("#mic-select").val(mic);
  }

  return mic;
}


/* WindowsEvent For popup1 & 2 */
/* INIT DISPLAY POPUP*/
chrome.windows.getCurrent(function (windowevent) {
  chrome.runtime.sendMessage(
    { type: "windowload", winid: windowevent.id },
    function (response) {
      // console.log("GET CURRENT !!", response);
      PopupWin = response.PopupWin;
      console.log("PopupWin : " + PopupWin);

      if (PopupWin === 2) {
        /*Only for popup 2 */

        WindowCanvasFreeDraw = response.WindowCanvasFreeDraw;
        TabCanvasFreeDraw = response.TabCanvasFreeDraw;

        /* Get Context */
        chrome.runtime.sendMessage(
          { type: "GetContext" },
          function (response2) {

            if (response2.ModalState != false) {
              showModal(response2.ModalState);
            }

            if (response2.status == "paused") {
              console.log("pause response2status paused !");
              $("#pause").hide();
              $("#play").show();
              $("#return").css("visibility", "visible");
              $("#AddHighlightTransparent").hide();
              //HideAllButton
              $("#AddScreenShot").css("visibility", "hidden");
              $("#AddHighlight").css("visibility", "hidden");
              $("#cursor").css("visibility", "hidden");
              window.resizeTo(408, 400);
            }
            if (response2.status == "recording") {
              //ShowAllButton
              $("#pause").show();
              $("#play").hide();
              $("#return").css("visibility", "visible");
              $("#AddScreenShot").css("visibility", "visible");
              $("#AddHighlight").css("visibility", "visible");
              $("body").css("width", "388px");
              handleCopierCollerTM(true);
              // debugger;
            }

            if (response2.noAccount) {
              NoAccount = false;
              //Hide screenshot & highlight
              $("#AddScreenShot").hide();
              $("#AddHighlight").hide();
              $("#AddHighlightTransparent").hide();
              //Hide all and not the toolbar
              $("#hidePanel").click();
              $("#hidePanel").hide();
              //Set maxwidth
              $("body").css("width", "273px");
              $("#cursor img").css("left", "0");
            } else {
              mainrecognizingcontainer.innerHTML =
                response2.mainrecognizingcontainer;
              mainrecognizedcontainer.innerHTML = response2.maincontainer;
            }

            document.querySelector("#timer").innerHTML = response2.dDur;
            try {
              if (response2.mainrecognizingcontainer != "") {
                mainrecognizingcontainer = response2.mainrecognizingcontainer;
              }
              if (response2.mainrecognizedcontainer != "") {
                mainrecognizedcontainer = response2.maincontainer;
              }
            } catch (error) { }
            Autoscroll = true;
            scrollTextcontainerTo();
          }
        );
        initialize_dom_guidelines();

      } else if (PopupWin === 1) {
        /* Only for popup 1 */
        PopupWin = response.PopupWin;
        WindowCanvasFreeDraw = windowevent.id;
        if (!NoAccount) {
          $("#connect_id").click();
          // return;
        }
        // MAYBE SHOULD AWAIT HERE


        //Removed GetJwt Here !

        if (NoAccount) {
          //FIXME DD obscure closing making everything work
          window.close();
        }

        //AutoClose
        if (response.popup2State == "closed") {
          window.close();
        }
      }
    }
  );
});

$(window).on("beforeunload", function () {
  //When user close popup2 without click on redirection

  chrome.runtime.sendMessage({
    type: "windowclose",
    PopupWin: PopupWin,
    ModalState: ModalState,
  });
});
/* ======================================================================================= */





/* Fonction pour les guidelines*/
function addNewQuestion(txt_content) {
  let the_template = `<div class="linesubGDL onhover" draggable="false">
  <div class="btnGuideline GDunactive"></div>
  <div class="txtDitGd" spellcheck="false">${txt_content}</div>
</div>`;
  $("#listGuidelines").append(the_template);
}

function showGuidelines() {
  $("#textcontainer").hide();
  $("#guidelineContainer").show();

}

function showTranscript() {
  $("#textcontainer").show();
  $("#guidelineContainer").hide();
}


function initialize_dom_guidelines() {
  var bgPage = chrome.extension.getBackgroundPage();

  let the_gd = bgPage.the_guideline;
  if (the_gd == "default" || the_gd == null) {
    return;
  }
  let all_GD = bgPage.all_guidelines;
  if (all_GD == "default" || all_GD == null) {
    return;
  }
  try {
    guidelines_content = JSON.parse(all_GD).contents;
  } catch (error) {
    return;
  }
  if (guidelines_content.length == 0 || guidelines_content == null) {
    return;
  } else {
    $("#ongletGdTrs").show();
    $("#GDTRSDIV").css("height", "calc(100% - 55px)");
  }

  for (let i = 0; i < guidelines_content.length; i++) {
    let txt_content = guidelines_content[i];
    addNewQuestion(txt_content);
  }
  $(".btnGuideline").on("click", function () {
    if ($(this).hasClass("GDactive")) {
      $(this).addClass("GDunactive").removeClass("GDactive");
    } else {
      $(this).addClass("GDactive").removeClass("GDunactive");
    }
  });

  $(".linesubGDL ").on("click", function () {
    let $btnGdn = $(this).find(".btnGuideline");
    let txt_clicked = $btnGdn.next().text();
    if ($btnGdn.hasClass("GDactive")) {
      $btnGdn.addClass("GDunactive").removeClass("GDactive");
      // remove from list
      chrome.storage.sync.get(["list_guidelines"], function (result) {
        let LIST_GL = result.list_guidelines;
        if (LIST_GL.includes(txt_clicked)) {
          const index_remove = LIST_GL.indexOf(txt_clicked);
          if (index_remove > -1) {
            LIST_GL.splice(index_remove, 1);
          }
        }
        chrome.storage.sync.set({ list_guidelines: LIST_GL });
      });


    } else {
      $btnGdn.addClass("GDactive").removeClass("GDunactive");
      // add to list
      chrome.storage.sync.get(["list_guidelines"], function (result) {
        let LIST_GL = result.list_guidelines;
        if (!LIST_GL.includes(txt_clicked)) {
          LIST_GL.push(txt_clicked);
        }
        chrome.storage.sync.set({ list_guidelines: LIST_GL });
      });


    }
  });

  let uuid = bgPage.the_uuid_guidelines;
  GUIDELINE_UUID = uuid;

  chrome.storage.sync.get(["list_guidelines"], function (result) {
    let LIST_GL = result.list_guidelines;

    if (LIST_GL.length != 0) {
      for (let i = 0; i < LIST_GL.length; i++) {
        let the_question = LIST_GL[i];
        CocherGuideline(the_question, animate = false);
      }
    }
  });



}


$(".ongletTrs").on("click", function () {
  $(".ongletTrs").removeClass("active");
  $(this).addClass("active");
});



$("#tabgdl, #badge,.notification").on("click", function () {
  let ntf_value = parseInt($("#nbGDmatch").text());
  if (ntf_value != 0) {
    $("#nbGDmatch").text("0").parent().hide();
  }
  showGuidelines();
});

$("#tabtrs").on("click", function () {
  showTranscript();
  scrollTextcontainerTo();
  $(".linesubGDL").removeClass("highlightedGD");
});

function reprisePlay() {
  chrome.runtime.sendMessage({ type: "resume" }, function (response) {
    if (response.success == true) {
      $("dialog").remove();
      $("#pause").show();
      $("#play").hide();
      $("#AddScreenShot").css("visibility", "visible");
      $("#AddHighlight").css("visibility", "visible");
      $("#AddHighlightTransparent").show();
    } else {
      $("#pause").hide();
      console.log("pause reprisePlay !");

      $("#play").show();
      $("#AddScreenShot").css("visibility", "hidden");
      $("#AddHighlightTransparent").hide();
      $("#AddHighlight").css("visibility", "hidden");
      $("#cursor").css("visibility", "hidden");
    }
  });
}

function handleCopierCollerTM(resize = false) {
  chrome.storage.sync.get(["record_status"], function (result) {
    if (result.record_status == "false") {
      if ($("#svgshidePanel:visible").length) {
        $("#LabelHidePanel").click();
      }
      $("#svgshidePanel").hide();
      $("#AddScreenShot").hide();
      $("#AddHighlight").hide();
      $("#main_panel").children().eq(0).css("justify-content", "space-between");

      if (resize && $("#main_panel:visible").length) {
        window.resizeTo(408, 200);
      }

    } else {
      if (first_resize == true && resize) {
        window.resizeTo(408, 550);
        first_resize = false;
      }
    }
  });
}

var list_gd_lng = [
  "fr", "en", "ar", "ko", "es", "zh", "de", "it", "pl", "ru", "pt", "ja", "tr", "th", "nl"
];

function updateLanguage(the_lng, init_gd) {
  if (list_gd_lng.includes(the_lng.split("-")[0]) && init_gd) {
    $("#containerGuideline").show();
  } else {
    $("#containerGuideline").hide();
    chrome.runtime.sendMessage({ type: "set-guidelines", id: "default" })
    chrome.runtime.sendMessage({ type: "update-guideline", id: "default" });
    $("#guideline_select_input").val("default").niceSelect("update");
  }
  chrome.runtime.sendMessage({ type: "update-language", id: the_lng });
}

$(document).ready(function () {
  var doit;
  /* ======================================================== */

  if ($("#AddScreenShot").length) {
    document.body
      .querySelector("#AddScreenShot")
      .addEventListener("click", function () {
        chrome.runtime.sendMessage({ type: "candoascreen" });
      });
  }

  // Reset to start a new recording
  recording = true;
  alt = false;
  mdown = false;
  dragging = false;
  drawing = false;
  erasing = false;
  mousedown = false;
  pendown = false;
  cameraon = true;
  micon = true;
  arrowon = false;
  texton = false;
  clickon = false;
  focuson = false;
  hideon = false;
  sliderhover = false;
  sliderhovereraser = false;
  penhover = false;
  eraserhover = false;

  $("#Toolbar").append($(".pcr-app"));

  var paramselected = false;

  // Navigate with enter Key !
  document.addEventListener("keypress", function (e) {
    if (e.key !== "Enter") {
      return;
    }

    if ($("#div_connection:visible").length) {
      $("#connect_id").click();
    }

  });

  // Record change nb speaker
  // $("#select_nb_speaker").on("change", function () {
  //   chrome.storage.sync.set({ select_nb_speaker: this.value });
  //   chrome.runtime.sendMessage({ type: "update-nb-speaker", id: this.value });
  // });

  // Record change lng




  $("#language_select_input").on("change", function () {
    updateLanguage(this.value, GD);
  });

  // init value
  if ($("#recordAudio:visible").length) {
    chrome.runtime.sendMessage({ type: "update-title", id: $("#recordAudio").val() });
  }

  if ($("#folderBtnn:visible").length) {
    chrome.runtime.sendMessage({ type: "update-title", id: $("#recordAudio").val() });
  }



  $("#folderBtnn").one("click", async function () {

    const handleFolders = (data) => {
      var listFolders = data;
      let $selectFolder = $("#addToFolders");
      if (listFolders.length == 0) {
        $("#addToFolders").css("justify-content", "center");
        return;
      } else {
        $("#folderBtnn").show();
      }
      Object.entries(listFolders).forEach(([index, info]) => {
        console.log(info)
        $selectFolder.append($('<option>', {
          value: info.id,
          text: "📁 " + info.name
        }));
        if (info.childrens) {
          Object.entries(info.childrens).forEach(([id, info2]) => {
            $selectFolder.append($('<option>', {
              value: info2.id,
              text: "\xA0\xA0\xA0\xA0📁 " + info2.name
            }));
          });
        }

      });
      $("#addToFolders").niceSelect();
      $("#addToFolders").niceSelect("update");
      $("#addToFolders + div > .current").click()
    }
    var bgPage = chrome.extension.getBackgroundPage();
    output_data = await bgPage.get(bgPage.base_url_root + "/api/folder/get-folders", "empty", "jwt", null);
    let data = await output_data.json();
    handleFolders(data);
    $("#addToFolders").on("change", function () {
      if (this.value == "default") {
        $("#folderOK").hide();
        $("#folderKO").show();
        chrome.runtime.sendMessage({ type: "update-folder", id: "default" });
      } else {
        $("#folderKO").hide();
        $("#folderOK").show();
        chrome.runtime.sendMessage({ type: "update-folder", id: this.value });
      }
    });
    await init_guidelines(bgPage);
    $("#folderBtnn").on("click", function (e) {
      $("#addToFolders + div > .current").click()
      e.stopPropagation();
    });
    $("#guideline_select_input").niceSelect("update");
    $("#loadingPorFavor").hide();
    $("#mainCtnr").show();
  });


  $("#recordAudio").on("input", function () {
    chrome.runtime.sendMessage({ type: "update-title", id: this.value });
  });

  $("#recordEmail").on("input", function () {
    chrome.runtime.sendMessage({ type: "update-email", id: this.value });
  });
  // TRANSLATE
  // $("#language_translate_select_input").on("change", function () {
  //   chrome.storage.sync.set({ select_translate_language: this.value });
  //   chrome.runtime.sendMessage({
  //     type: "update-translate-language",
  //     id: this.value,
  //   });
  // });

  // $("#language_translate_select_input").niceSelect();
  // $("#language_translate_select_input").niceSelect("update");
  setFirstLanguage("language_select_input");




  $("#language_select_input").niceSelect();
  $("#language_select_input").niceSelect("update");


  $("#guideline_select_input").niceSelect();
  $("#guideline_select_input").niceSelect("update");


  $("#skip_button").on("click", function () {
    token = "";
    savetoken = "";
    chrome.runtime.sendMessage({ type: "AuthNoota", subtype: "skip" });
    $("#main_panel").hide();
    $("#main_panel_before, #body_jason").show();
    $("#tabs").show();
    $("#navhead").show();
    $("#body").css("width", "85%");
    $("#body").css("background-color", "unset");
    $("#camera-select").niceSelect().hide();
    $("#multimedia-select").niceSelect();
    $("#mic-select").niceSelect();
    $("#language_select").niceSelect();
    $("#div_connection").hide();
    $("#upload_params").hide();
    $("#popup_original, #mainCtnr").show();
    $("#recording_ap").show();
  });



  //display when connected
  $("#connect_id").on("click", function () {
    chrome.runtime.sendMessage({ type: "AuthNoota", subtype: "first_jwt" }, function (response) {
      if (response.status) {
        chrome.storage.sync.get(["token_auth_noota"], (obj) => {
          tmpsavetoken = obj.token_auth_noota.savetoken;
          refresh_token = obj.token_auth_noota.refresh_token;
          if (tmpsavetoken == null || tmpsavetoken == "" || response.status == false) {
            $("#connect_id").prop("disabled", false);
          } else {
            DisplayMainMenu();
          }
        });
      } else {
        chrome.runtime.sendMessage({ type: "first_login" });
      }
    });
  });

  // Get default settings (set by the user)
  chrome.storage.sync.get(null, function (result) {
    if (!result.toolbar) {
      $("#persistent").prop("checked", true);
    }
    if (result.flip) {
      $("#flip").prop("checked", true);
    }
    if (result.pushtotalk) {
      $("#push").prop("checked", true);
    }
    if (result.countdown) {
      $("#countdown").prop("checked", true);
    }
    if (result.quality == "max") {
      $("#quality").html(chrome.i18n.getMessage("smaller_file_size"));
    } else {
      $("#quality").html(chrome.i18n.getMessage("highest_quality"));
    }
    if ($(".type-active").attr("id") == "tab-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("../assets/images/popup/tab-only.svg")
        );
    } else if ($(".type-active").attr("id") == "desktop") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("../assets/images/popup/desktop.svg")
        );
    } else if ($(".type-active").attr("id") == "camera-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("../assets/images/popup/camera-only.svg")
        );
    }
    $(".type-active").removeClass("type-active");
    $("#" + result.type).addClass("type-active");
    if ($("#" + result.type).attr("id") == "tab-only") {
      $("#" + result.type)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("../assets/images/popup/tab-only-active.svg")
        );
    } else if ($("#" + result.type).attr("id") == "desktop") {
      $("#" + result.type)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("../assets/images/popup/desktop-active.svg")
        );
    } else if ($("#" + result.type).attr("id") == "camera-only") {
      $("#" + result.type)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL(
            "../assets/images/popup/camera-only-active.svg"
          )
        );
    }
  });

  // Start recording
  async function record() {
    chrome.runtime.sendMessage({ type: "record" });
    $("#record").html(chrome.i18n.getMessage("starting_recording"));
  }

  async function record_w_video() {
    chrome.runtime.sendMessage({ type: "record-w-video" });
    $("#record").html(chrome.i18n.getMessage("starting_recording"));
  }

  // Request extension audio access if website denies it (for background)
  function audioRequest() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        var audiodevices = [];
        navigator.mediaDevices.enumerateDevices().then(function (devices) {
          devices.forEach(function (device) {
            if (device.kind == "audioinput") {
              audiodevices.push({ label: device.label, id: device.deviceId });
            }
          });
          getAudio(audiodevices);
          $("#language_select_input").next().find(".option").show();
          $("#language_select_input").next().find(".current").text("Record without Transcribe");
        });
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
      })
      .catch(function (error) {
        // ask user popup
        $("#language_select_input").next().find(".option").hide();
        $("#language_select_input").next().find(".current").text("Authorize Microphone to Transcribe");

        $("#mic-select").html(
          "<option value='disabled'>" +
          chrome.i18n.getMessage("disabled_allow_access") +
          "</option>"
        );
      });
  }

  // Get available audio devices
  function getAudio(audio) {
    $("#mic-select").html(
      "<option value='disabled'>" +
      chrome.i18n.getMessage("disabled") +
      "</option>"
    );
    audio.forEach(function (device) {
      if (device.label == "Disabled") {
        $("#mic-select").append(
          "<option value='" +
          device.id +
          "'>" +
          chrome.i18n.getMessage("disabled") +
          "</option>"
        );
      } else {
        $("#mic-select").append(
          "<option value='" + device.id + "'>" + device.label + "</option>"
        );
      }
    });
    $("#mic-select").niceSelect("update");
    chrome.storage.sync.get(["mic"], function (result) {
      if (result.mic != 0) {
        $("#mic-select").val(result.mic).niceSelect("update");
      } else {
        $("#mic-select")
          .val($("#mic-select option:nth-child(2)").val())
          .niceSelect("update");
        chrome.runtime.sendMessage({
          type: "update-mic",
          id: $("#mic-select").val(),
        });
      }
    });
  }
  // Get available camera devices
  function getCamera(camera) {
    $("#camera-select").html(
      "<option value='disabled' selected>" +
      chrome.i18n.getMessage("disabled") +
      "</option>"
    );
    camera.forEach(function (device) {
      if (device.label == "Disabled") {
        $("#camera-select").append(
          "<option value='" +
          device.id +
          "'>" +
          chrome.i18n.getMessage("disabled") +
          "</option>"
        );
      } else {
        $("#camera-select").append(
          "<option value='" + device.id + "'>" + device.label + "</option>"
        );
      }
    });
    $("#camera-select").niceSelect("update").hide();
    chrome.storage.sync.get(["camera"], function (result) {
      if (result.camera != 0 && result.camera != "disabled-access") {
        $("#camera-select").val(result.camera).niceSelect("update");
        if (
          $(".type-active").attr("id") == "camera-only" &&
          $("#camera-select").val() == "disabled"
        ) {
          $("#record").addClass("record-disabled");
        } else {
          $("#record").removeClass("record-disabled");
        }
      } else {
        // $("#camera-select")
        //   .val($("#camera-select option:nth-child(2)").val())
        //   .niceSelect("update");

        chrome.runtime.sendMessage({
          type: "update-camera",
          id: $("#camera-select").val(),
        });
      }
    });
  }
  // Get available camera devices
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: "camera-request",
    });
  });

  // Check if token is already here !!!

  // Check if recording is ongoing
  chrome.runtime.sendMessage({ type: "record-request" }, function (response) {
    // console.log(response);
    recording = response.recording;
    // console.log("recordt-request popup 602 result : ", response.recording)
    if (response.recording) {
      $("#record").html(chrome.i18n.getMessage("stop_recording"));
      $("#record").addClass("record-stop");
      if ($("#popup_original")[0] != null) {
        if ($("#popup_original")[0].style.display != "block") {
          $("#camera-select").niceSelect().hide();
          $("#multimedia-select").niceSelect();
          $("#mic-select").niceSelect();
          $("#div_connection").hide();
          $("#upload_params").hide();
          $("#popup_original, #mainCtnr").show();
          $("#recording_ap").show();
        }
      }
      // useless as let prevent from executing.
      // if (response.data.mainrecognizingcontainer != "") {
      //   let mainrecognizingcontainer = document.querySelector(
      //     "#mainrecognizingcontainer"
      //   );
      //   mainrecognizingcontainer = response.data.mainrecognizingcontainer;
      // }
      // if (response.data.mainrecognizedcontainer != "") {
      //   let mainrecognizedcontainer = document.querySelector("#maincontainer");
      //   mainrecognizedcontainer = response.data.mainrecognizedcontainer;
      // }
    }
  });


  // chrome.runtime.sendMessage({ type: "token-not-null" }, function (response) {
  // if (response.tokenexists) {

  if ((!recording && !paramselected) && ($("#popup_original")[0] != null)) {
    if ($("#popup_original")[0].style.display != "block") {
      if (savetoken != null) {
        // Already authenticated
        $("#main_panel").hide();
        $("#main_panel_before, #body_jason").show();
        $("#tabs").show();
        $("#navhead").show();
        $("#body").css("width", "85%");
        $("#body").css("background-color", "unset");

        $("#camera-select").niceSelect().hide();
        $("#multimedia-select").niceSelect();
        $("#mic-select").niceSelect();
        $("#record").attr("disabled", "");
        // $("#format-select").niceSelect();
        $("#language_select").niceSelect();

        $("#div_connection").hide();
        $("#upload_params").hide();
        $("#popup_original, #mainCtnr").show();
        $("#recording_ap").show();
      } else {
        // auth from the beginning
        $("#popup_original, #mainCtnr").hide();
        $("#upload_params").hide();
        $("#div_connection").show();
      }
    }
  }
  // Check if current tab is unable to be recorded
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (tabs.length == 0) {
      //FIXME handle theses scenraios.
      console.log("no tab!");
      return;
    } else if (tabs[0] == undefined) {
      console.log("tab undefined !");
      return;
    }


    if (
      tabs[0].url.includes("chrome://") ||
      tabs[0].url.includes("chrome-extension://") ||
      tabs[0].url.includes("chrome.com") ||
      tabs[0].url.includes("chrome.google.com")
    ) {
      $("#record").addClass("record-disabled");
      $("#record").html(chrome.i18n.getMessage("cannot_record"));
    } else {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "camera-request",
        });
      });
    }
  });

  $("#flip_transcript").on("change", function () {
    let no_transcript = this.checked;
    if (no_transcript) {
      chrome.runtime.sendMessage({ type: "update-language", id: "record_only" });
      chrome.storage.sync.set({ guideline: "default" });
      $('#language_select_input').prop('disabled', true).niceSelect('update');
      $("#language_select_input").next().find(".current").text("Record without Transcribe");
      $('#recordAudio, #folderBtnn').prop('disabled', true);
      $('#guideline_select_input').prop('disabled', true).niceSelect('update');
      $("#guideline_select_input").next().find(".current").text("Requires Transcription");
    } else {
      $("#folderBtnn").click();
      chrome.runtime.sendMessage({ type: "update-language", id: $("#language_select_input")[0].value });
      $('#language_select_input').prop('disabled', false).niceSelect('update');
      chrome.storage.sync.set({ guideline: $("#guideline_select_input")[0].value });
      $('#guideline_select_input').prop('disabled', false).niceSelect('update');
      $('#recordAudio, #folderBtnn').prop('disabled', false);
      $("#guideline_select_input").niceSelect("update");
    }
  });






  // Modify settings
  $("#flip").on("change", function () {
    let camera_checked = this.checked;
    chrome.storage.sync.set({ flip: camera_checked });
    chrome.storage.sync.set({ camera: 0 });
    if ($("#camera-select").val() == "Désactivé") {
      chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "hidecamera",
        });
      });
      return;
    }
    if (camera_checked) {
      let camera_value = $("#camera-select")[0].options[$("#camera-select")[0].options.length - 1].value
      $("#camera-select").val(camera_value);
      $("#camera-select").niceSelect("update").hide();
    } else {
      $("#camera-select").val("disabled");
      $("#camera-select").niceSelect("update").hide();
    }
    chrome.runtime.sendMessage({
      type: "update-camera",
      id: $("#camera-select").val(),
    });
  });
  $("#push").on("change", function () {
    chrome.storage.sync.set({ pushtotalk: this.checked });
    chrome.runtime.sendMessage({ type: "push-to-talk", enabled: this.checked });
  });
  $("#countdown").on("change", function () {
    chrome.storage.sync.set({ countdown: this.checked });
  });
  $("#persistent").on("change", function () {
    chrome.storage.sync.set({ toolbar: !this.checked });
    chrome.runtime.sendMessage({
      type: "switch-toolbar",
      enabled: !this.checked,
    });
  });
  $("#camera-select").on("change", function () {
    if ($("#camera-select").val() == "disabled") {
      chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "hidecamera",
        });
      });
    } else {
      chrome.runtime.sendMessage({
        type: "update-camera",
        id: $("#camera-select").val(),
      });
    }
  });


  $("#mic-select").on("change", function () {
    if (this.value == "disabled") {
      $("#record").text('Continue without microphone');
    } else {
      $("#record").text('Start recording');
    }
    chrome.runtime.sendMessage({
      type: "update-mic",
      id: $("#mic-select").val(),
    });
  });


  $("#multimedia-select").on("change", function () {
    chrome.runtime.sendMessage({
      type: "update-multimedia",
      id: $("#multimedia-select").val(),
    });
  });



  // Change recording area
  $(document).on("click", ".type:not(.type-active)", function () {
    if ($(".type-active").attr("id") == "tab-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/tab-only.svg")
        );
    } else if ($(".type-active").attr("id") == "desktop") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/desktop.svg")
        );
    } else if ($(".type-active").attr("id") == "camera-only") {
      $(".type-active")
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/camera-only.svg")
        );
    }
    $(".type-active").removeClass("type-active");
    $(this).addClass("type-active");
    if (
      $(".type-active").attr("id") == "camera-only" &&
      ($("#camera-select").val() == "disabled" ||
        $("#camera-select").val() == "disabled-access")
    ) {
      $("#record").addClass("record-disabled");
    } else {
      $("#record").removeClass("record-disabled");
    }
    if ($(this).attr("id") == "tab-only") {
      $(this)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/tab-only-active.svg")
        );
    } else if ($(this).attr("id") == "desktop") {
      $(this)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL("./assets/images/popup/desktop-active.svg")
        );
    } else if ($(this).attr("id") == "camera-only") {
      $(this)
        .find("img")
        .attr(
          "src",
          chrome.extension.getURL(
            "./assets/images/popup/camera-only-active.svg"
          )
        );
    }
    chrome.runtime.sendMessage({
      type: "recording-type",
      recording: $(".type-active").attr("id"),
    });
    chrome.storage.sync.set({ type: $(".type-active").attr("id") });
  });


  // Start recording
  $("#record").on("click", async function () {
    var bgPage = chrome.extension.getBackgroundPage();
    let GD_ID = $("#guideline_select_input").val();
    chrome.runtime.sendMessage({ type: "diar-data", id: [] });
    if (GD_ID != "default" && GD_ID != null && GD_ID != "null") {
      output_data = await bgPage.get(`${bgPage.base_url_root}/api/guidelines/get-guideline/${GD_ID}`, "empty", "jwt", null);
      let data = await output_data.json();
      chrome.runtime.sendMessage({ type: "set-guidelines", id: data });
      chrome.runtime.sendMessage({ type: "generate-uuid-guideline" });
    } else {
      chrome.runtime.sendMessage({ type: "set-guidelines", id: [] });
    }
    $(this).attr("disabled", "disabled");
    format_selected = $("#multimedia-select option:selected")[0].value;
    if (format_selected == "audio") {
      window.close();
      record();
    } else {
      window.close();
      record_w_video();
    }
  });

  // Show more dropdown
  $("#more").on("click", function (e) {
    if ($("#more-select").hasClass("countactive")) {
      $("#more-select").removeClass("countactive");
    } else {
      $("#more-select").addClass("countactive");
    }
  });



  // Go to the shortcuts page in Chrome (workaround, chrome:// links are a local resource so they can't be triggered via a normal link)
  $("#shortcuts").on("click", function (e) {
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts",
    });
  });

  // Higher quality or smaller file size for the recording
  $("#quality").on("click", function (e) {
    chrome.storage.sync.get(["quality"], function (result) {
      if (result.quality == "max") {
        chrome.storage.sync.set({
          quality: "min",
        });
        $("#quality").html(chrome.i18n.getMessage("highest_quality"));
      } else {
        chrome.storage.sync.set({
          quality: "max",
        });
        $("#quality").html(chrome.i18n.getMessage("smaller_file_size"));
      }
    });
  });

  $("#hidePanel").on("click", function () {
    if (!HidePanelPopup) {
      $("#textcontainer").hide();
      window.resizeTo(408, 100);
      $("#mainrecognizingcontainer").hide();
      $("#LabelHidePanel").text("");
      $("#svgshidePanel").hide();
      $("#svgshowPanel").show();
      HidePanelPopup = !HidePanelPopup;
    } else {
      $("#textcontainer").show();
      window.resizeTo(408, 400);
      $("#LabelHidePanel").text("");
      $("#mainrecognizingcontainer").show();
      $("#svgshidePanel").show();
      $("#svgshowPanel").hide();
      HidePanelPopup = !HidePanelPopup;
    }
  });


  $("#play").on("click", function () {
    reprisePlay();
  });

  $("#pause").on("click", function () {

    chrome.runtime.sendMessage({ type: "pause" }, function (response) {
      if (response.success == true) {
        pausePLS = true;

        $("#pause").hide();
        $("#play").show();
        $("#return").css("visibility", "visible");

        $("#AddHighlightTransparent").hide();

        $("#AddScreenShot").css("visibility", "hidden");
        $("#AddHighlight").css("visibility", "hidden");
        $("#HighlightSVGInitial").css("display", "block");

        $("#cursor").css("visibility", "hidden");
      } else {
        $("#pause").show();
        $("#play").hide();

        //$('#AddHighlightTransparent').hide();
        $("#AddScreenShot").css("visibility", "visible");
        $("#AddHighlight").css("visibility", "visible");
        $("#HighlightSVGInitial").css("display", "block");
        $("#AddHighlight").css("visibility", "visible");
        //$('#cursor').css('visibility', 'visible');
      }
    });
  });

  $("#stop").on("click", function () {
    chrome.runtime.sendMessage({ type: "stop-save" });
  });

  $("#return").on("click", function () {
    showModal("return");
  });

  // RECEIVE MESSAGES


  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {

    if (request.type == "ChangeHighlightState") {

      if (request.action == "stopped") {
        //get state of button pause
        let pausebtn_display = $("#pause").css("display");
        if (pausebtn_display == "block") {
          $("#AddHighlight").css("background-color", "");
          $("#AddHighlight").show();
          $("#AddHighlightTransparent").show();
          $("#HighlightSVGInitial").css("display", "block");

          $("#activeHighlight").css("display", "none");
        } else {
          $("#AddHighlight").css("background-color", "");
          $("#AddHighlight").hide();
          $("#AddHighlightTransparent").hide();
          $("#activeHighlight").css("display", "none");
        }
      } else {
        if (request.action == "active") {
          $("#HighlightSVGInitial").css("display", "none");
          $("#AddHighlight").show();
          $("#AddHighlightTransparent").show();
          $("#activeHighlight").css("display", "block");
          $("#AddHighlight").css("background-color", "white");

          if (request.event == "longpress") {
          } else {
            if (request.event == "LongPressstop") {
            } else {
              $('#AddHighlight').addClass('loadingAddHighlight');
            }
          }
        }
      }
    } else if (request.type == "window") {
      if (request.subtype == "CloseEvent") {
        window.close();
      }
      if (request.subtype == "IsAlive") {
        if (PopupWin == 2) {
          if (useragent) {
            window.focus();
          }
          return Win;
        }
      }
    } else if (request.type == "clearGuidelines") {
      chrome.storage.sync.set({ list_guidelines: [] });

    } else if (request.type == "stopItNow") {
      // ByeByeNootNoot();
      chrome.runtime.sendMessage({ type: "ModalState", subtype: false });
      chrome.runtime.sendMessage({ type: "Redirection", subtype: "the_end" });
      window.close();
    } else if (request.type == "clickConnect") {
      var today = new Date().toJSON();
      chrome.storage.sync.set({ time_get_cred: today });
      $("#connect_id").click();
    } else if (request.type == "Auth") {
      // console.log("Auth Status !", request.status);
      if (request.status) {
        DisplayMainMenu();
      } else {
        $("#connect_id").prop("disabled", false);
      }
      sendResponse({
        status: "ok",
        auth_stauts: request.status
      });
      //ANSWER
    } else if (request.type == "authok") {
      savetoken = request.value;
    } else if (request.type == "SavingFileProgress") {
      $("#maProgressBarDuFutur").addClass("width", "progress-bar-animated");
      // console.log("progress at : " + request.currentPer);
      let AllWidthForProgress = request.currentPer.replace("%", "") * 4 + "%";
      $("#maProgressBarDuFutur").css("width", AllWidthForProgress);
    } else if (request.type == "ModalSaveFile") {
      if (request.action == "loading_modal") {
        showModal("loader");
      } else if (request.action == "open_noota") {
        const dialog = document.querySelector("dialog");
        try {
          dialog.removeAttribute("open");
        } catch (error) { }
        showModal("open-transcript");
      } else {
        const dialog = document.querySelector("dialog");
        try {
          dialog.removeAttribute("open");
        } catch (error) { }
      }

      if (request.action == "SendFileAsGuest") {
        showModal("SendToAPIForGuest");
      }
    } else if (request.type == "DisplayWarning") {
      DisplayWarning(request.argument, request.total_credit, request.Rest);
    } else if (request.type == "noCreditModal") {
      if ($("#pause:visible").length == 1) {
        $("#pause").click();
      }
      if ($("#redirection:visible").length != 1) {
        showModal("nomore");
      }
    } else if (request.type == "endRecord") {

      chrome.runtime.sendMessage({ type: "stop-save" });

    } else if (request.type == "pauseByRealTime") {
      console.log("pause by real time !");
      $("#pause").hide();
      $("#play").show();
      if (request.subtype == "NoCredleft") {
        if ($("#pause:visible").length == 1) {
          $("#pause").click();
        }
        showModal("nomore");
      }
    } else if (request.type == "MouseUpTexton") {
      texton = false;
    } else if (request.type == "UpdatedDur") {
      let timer = document.querySelector("#timer");
      if (timer != undefined) {
        timer.innerHTML = request.dDur;

      }
    } else if (request.type == "candoascreen") {
      AsyncTakeScreenShotHandler(request);
    } else if (request.type == "SetContext") {
      if (request.subtype == "mainrecognizingcontainer") {
        let mainrecognizingcontainer = document.querySelector(
          "#mainrecognizingcontainer"
        );
        if (mainrecognizingcontainer != null) {
          mainrecognizingcontainer.innerHTML = request.data;
          scrollRecognizing();
          scrollTextcontainerTo();
        }
      }
      if (request.subtype == "mainrecognizedcontainer") {
        let mainrecognizedcontainer = document.querySelector("#maincontainer");
        // console.log("SetContext : ");
        // console.log(request.data);
        mainrecognizedcontainer.innerHTML = request.data;
        let mainrecognizingcontainer = document.querySelector(
          "#mainrecognizingcontainer"
        );
        mainrecognizingcontainer.innerHTML = "";
        scrollRecognized();
        scrollTextcontainerTo();
      }
      if (request.subtype == "Newscreenshot") {
        let mainrecognizedcontainer = document.querySelector("#maincontainer");
        mainrecognizedcontainer.innerHTML = request.data;
      }
    } else if (request.type == "ShowRecordingPanel") {
      $("#main_panel").show();
      $("#main_panel_before, #body_jason").hide();
      $("#tabs").hide();
    } else if (request.type == "GuidelineOk") {
      CocherGuideline(request.data, true);
    } else if (request.type == "open_topic_tracker") {
      open_topic_tracker(request.data);
    } else if (request.type == "new_sentie_neg") {
      open_toast("negative");
    } else if (request.type == "new_sentie_pos") {
      open_toast("positive");
    } else if (request.type == "loaded") {
      window.close();
    } else if (request.type == "sources") {
      getCamera(request.devices);
      // Allow user to start recording
      if (!recording) {
        $("#record").html("Start recording");
      }
      $("#record").removeClass("record-disabled");
    } else if (request.type == "sources-audio") {
      getAudio(request.devices);

      // Allow user to start recording
      if (!recording) {
        $("#record").html("Start recording");
      }
      $("#record").removeClass("record-disabled");
    } else if (request.type == "sources-noaccess") {
      console.log("init from request.type == \"sources-noaccess\"")
      $("#camera-select").html(
        "<option value='disabled-access'>" +
        chrome.i18n.getMessage("disabled_allow_access") +
        "</option>"
      );
      $("#camera-select").niceSelect("update").hide();
      chrome.storage.sync.set({
        camera: "disabled-access",
      });

      // Allow user to start recording
      if (!recording) {
        $("#record").html("Start recording");
      }
      if ($(".type-active").attr("id") != "camera-only") {
        $("#record").removeClass("record-disabled");
      }
    } else if (request.type == "sources-loaded") {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "camera-request",
        });
      });
    } else if (request.type == "sources-audio-noaccess") {
      console.log("Sources AUDIO no access !!!")

      audioRequest();
    }
  });

  // Localization (strings in different languages)
  $("#camera-select").html(
    "<option value='disabled'>" +
    chrome.i18n.getMessage("disabled") +
    "</option>"
  );
  $("#mic-select").html(
    "<option value='disabled'>" +
    chrome.i18n.getMessage("disabled") +
    "</option>"
  );
  $("#mic-select").niceSelect("update");
  $("#camera-select").niceSelect("update").hide();
  $("#shortcuts").html(chrome.i18n.getMessage("keyboard_shortcuts"));
  $("#madeby").html(chrome.i18n.getMessage("made_by_noota"));
  $("#desktop p").html(chrome.i18n.getMessage("desktop"));
  $("#camera-only p").html(chrome.i18n.getMessage("camera_only"));
  $("#camera-select-label").html(chrome.i18n.getMessage("camera"));
  $("#flip-label").html(chrome.i18n.getMessage("flip_camera"));
  $("#mic-label").html(chrome.i18n.getMessage("microphone"));
  $("#push-label").html(chrome.i18n.getMessage("push_to_talk"));
  $("#second-label").html(chrome.i18n.getMessage("second"));
  $(".seconds-label").html(chrome.i18n.getMessage("seconds"));
  $("#countdown-label").html(chrome.i18n.getMessage("countdown"));
  $("#hover-label").html(chrome.i18n.getMessage("only_on_hover"));
  $("#record").html(chrome.i18n.getMessage("loading"));
});


$("#AddHighlightTransparent").on("mousedown pointerdown", "", function () {
  chrome.runtime.sendMessage({ type: "AddHighlight" });

  $("#AddHighlightTransparent").one("pointerup", function () {
    chrome.runtime.sendMessage({ type: "AddHighlight2" });
  });

  window.event.preventDefault();
});

$("#AddHighlight").on("mousedown pointerdown", "", function () {
  chrome.runtime.sendMessage({ type: "AddHighlight" });

  $("#AddHighlight").one("pointerup", function () {
    chrome.runtime.sendMessage({ type: "AddHighlight2" });
  });

  window.event.preventDefault();
});

// Toolbar function
var drag, dragx, dragy, timer;
var dragging = false;
var dragged = false;
var drawing = false;
var erasing = false;
var mousedown = false;
var pendown = false;
var cameraon = true;
var micon = true;
var arrowon = false;
var texton = false;
var clickon = false;
var focuson = false;
var hideon = false;
var sliderhover = false;
var sliderhovereraser = false;
var penhover = false;
var eraserhover = false;
var cameradevices = [];
var audiodevices = [];
var alt = false;
var mdown = false;
var holdtalk = false;
var persistent = false;
var lastx = 0;
var lasty = 0;
var lastscrollx = 0;
var lastscrolly = 0;

// Open cursor toolbar, or save the recording if it's paused
$(document).on("click", "#toolbar-record #cursor", function () {
  if ($(" #toolbar-record #cursor").hasClass("pen-options")) {
    moretools = false;
    $(" #toolbar-record #cursor").removeClass("pen-options");
    $(" #toolbar-record #cursor img").attr(
      "src",
      chrome.extension.getURL("./assets/images/cursor.svg")
    );
    $(" #toolbar-record-cursor").addClass("toolbar-inactive");
  } else {
    moretools = true;
    $(" #toolbar-record #settings").removeClass("pen-options");
    $(" #toolbar-record #settings img").attr(
      "src",
      chrome.extension.getURL("./assets/images/settings.svg")
    );
    $("#toolbar-record #pen").removeClass("pen-options");
    if (arrowon || texton || drawing) {
      $(" #toolbar-record #pen").addClass("tool-active");
      $(" #toolbar-record #pen img").attr(
        "src",
        chrome.extension.getURL("./assets/images/penactive.svg")
      );
    } else {
      $(" #toolbar-record #pen img").attr(
        "src",
        chrome.extension.getURL("./assets/images/pen.svg")
      );
    }
    $(" #toolbar-record-pen").addClass("toolbar-inactive");
    $(" #toolbar-record #cursor").addClass("pen-options");
    $(" #toolbar-record #cursor img").attr(
      "src",
      chrome.extension.getURL("./assets/images/close.svg")
    );
    $(" #toolbar-record-cursor").removeClass("toolbar-inactive");
  }
});

//Enable/disable record-cursor-tool
$(document).on("mouseleave", "#toolbar-record-cursor", function (event) {
  $("#toolbar-record-cursor").addClass("toolbar-inactive");
  $("#cursor").removeClass("pen-options");
  $(" #toolbar-record #cursor img").attr(
    "src",
    chrome.extension.getURL("./assets/images/cursor.svg")
  );
  moretools = false;
});

// Enable/disable text tool
$(document).on("click", " #text", function () {
  if (texton) {
    texton = false;
    $(" #canvas-cont").css("pointer-events", "none");
    $(" #text").removeClass("tool-active");

    $(" #text img").attr(
      "src",
      chrome.extension.getURL("./assets/images/text.svg")
    );
  } else {
    resetDrawingTools();
    texton = true;

    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(TabCanvasFreeDraw, {
        type: "TextTool?",
        value: true,
      });
    });

    $(" #canvas-cont").css("pointer-events", "all");
    $(" #canvas-freedraw").css("pointer-events", "none");
    $(" #text").addClass("tool-active");
    $(" #text img").attr(
      "src",
      chrome.extension.getURL("assets/images/textactive.svg")
    );
  }
});

// Enable/disable arrow tool
$(document).on("click", " #arrow", function () {
  if (arrowon) {
    arrowon = false;
    $(" #canvas-cont").css("pointer-events", "none");
    $(" #arrow").removeClass("tool-active");
    $(" #arrow img").attr(
      "src",
      chrome.extension.getURL("./assets/images/arrow.svg")
    );

    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(TabCanvasFreeDraw, {
        type: "TextTool?",
        value: false,
      });
    });
  } else {
    resetDrawingTools();
    arrowon = true;
    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(TabCanvasFreeDraw, {
        type: "arrow?",
        value: true,
      });
    });

    $(" #canvas-cont").css("pointer-events", "all");
    $(" #canvas-freedraw").css("pointer-events", "none");
    $(" #arrow").addClass("tool-active");
    $(" #arrow img").attr(
      "src",
      chrome.extension.getURL("./assets/images/arrowactive.svg")
    );
  }
});

// Enable/disable click highlight
$(document).on("click", " #click-tool", function () {
  if (clickon) {
    clickon = false;
    $(" #click-tool").removeClass("tool-active");
    $(" #click-tool img").attr(
      "src",
      chrome.extension.getURL("./assets/images/click.svg")
    );

    chrome.runtime.sendMessage({
      type: "Cursor?",
      subtype: "hightlight",
      value: false,
    });
  } else {
    clickon = true;
    chrome.runtime.sendMessage({
      type: "Cursor?",
      subtype: "hightlight",
      value: true,
    });
    $(" #click-tool").addClass("tool-active");
    $(" #click-tool img").attr(
      "src",
      chrome.extension.getURL("./assets/images/clickactive.svg")
    );
  }
});

$(document).on("click", "#clear", function () {
  chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: "clear",
    });
  });
});

$(document).on("click", "#closeToast", function () {
  $("#exttoast").hide();
});


// Enable/disable hiding cursor on inactivity
$(document).on("click", " #hide-cursor-tool", function (e) {
  if (hideon) {
    hideon = false;

    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "Cursor?",
        subtype: "hide",
        value: false,
      });
    });

    $(" #hide-cursor-tool").removeClass("tool-active");
    $(" #hide-cursor-tool img").attr(
      "src",
      chrome.extension.getURL("./assets/images/hide-cursor.svg")
    );
  } else {
    hideon = true;

    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: "Cursor?",
        subtype: "hide",
        value: true,
      });
    });

    $(" #hide-cursor-tool").addClass("tool-active");
    $(" #hide-cursor-tool img").attr(
      "src",
      chrome.extension.getURL("./assets/images/hide-cursoractive.svg")
    );
  }
});

// Reset drawing toolbar
function resetDrawingTools() {
  arrowon = false;
  window.arrowon = arrowon;
  drawing = false;
  erasing = false;
  texton = false;

  $(" #pen-tool").removeClass("tool-active");
  $(" #pen-tool img").attr(
    "src",
    chrome.extension.getURL("./assets/images/pen.svg")
  );
  $(" #eraser").removeClass("tool-active");
  $(" #eraser img").attr(
    "src",
    chrome.extension.getURL("./assets/images/eraser.svg")
  );
  $(" #arrow").removeClass("tool-active");
  $(" #arrow img").attr(
    "src",
    chrome.extension.getURL("./assets/images/arrow.svg")
  );
  $(" #text").removeClass("tool-active");
  $(" #text img").attr(
    "src",
    chrome.extension.getURL("./assets/images/text.svg")
  );
}

// Change line thickness for pen and eraser
$(document).on("input change", "#pen-slider input", function () {
  penset = true;

  console.log("pen slider:  " + $("#pen-slider input").val());
  chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
    chrome.tabs.sendMessage(TabCanvasFreeDraw, {
      type: "inputchangetoolbar",
      value: $("#pen-slider input").val(),
    });
  });
});

$(document).on("mouseenter", "#toolbar-record-pen #pen-tool", function () {
  if (!$("#toolbar-record-pen #pen-tool").hasClass("toolbar-inactive")) {
    $("#pen-slider").removeClass("toolbar-inactive");
    sliderhover = false;
  }
});

$(document).on("mouseenter", "#pen-slider", function () {
  if (!$("#pen-slider").hasClass("toolbar-inactive")) {
    $("#toolbar-record-pen").removeClass("toolbar-inactive");
    sliderhover = true;
  }
});

$(document).on("mouseleave", "#pen-slider", function () {
  sliderhover = false;
  window.setTimeout(function () {
    if (!penhover && drawing && tooltype == "draw") {
      $("#pen-slider").addClass("toolbar-inactive");
    }
  }, 50);

  $("#toolbar-record-pen").addClass("toolbar-inactive");

  eraserhover = false;
});

// Show/hide slider for eraser tool
$(document).on("mouseenter", "#eraser", function () {
  if (drawing && tooltype == "erase") {
    $("#pen-slider").removeClass("toolbar-inactive");
    eraserhover = true;
  }
});

function scrollTextcontainerTo() {
  // FIXME javascript function is not Vegeta Power, fix this 999999999999999999
  if ($("#guidelineContainer:visible").length) {
    return;
  }

  if (Autoscroll) {
    var scr = $("#textcontainer")[0].scrollHeight;
    scr = scr + 9999999999999999999999999;
    document.querySelector("#GDTRSDIV").scrollTop = scr;
  }
}
var isVisible = null;

function scrollRecognizing() {
  let d = $('#mainrecognizingcontainer');
  if (d.height() > 50) {
    d.scrollTop(d.prop("scrollHeight"));
    let FINAL_OFFSET = (d.height() - 50);
    let FINAL_OFFSET2 = 89 + FINAL_OFFSET;
    if (isVisible === null) {
      isVisible = $("#ongletGdTrs:visible").length;
    }
    if (isVisible === 1) {
      FINAL_OFFSET = FINAL_OFFSET + 56;
    }
    $("#handlerZZZZZ").css("height", `calc(100% - ${FINAL_OFFSET2}px`);
  } else {
    if (isVisible === 0) {
      $("#GDTRSDIV").css("height", `calc(100%`);
      $("#handlerZZZZZ").css("height", `calc(100% - 89px`);
    } else {
      $("#GDTRSDIV").css("height", `calc(100% - 56px`);
    }

  }
}

function scrollRecognized() {
  let FINAL_OFFSET = 0;
  if (isVisible === null) {
    isVisible = $("#ongletGdTrs:visible").length;
  }
  if (isVisible === 1) {
    FINAL_OFFSET = FINAL_OFFSET + 56;
  }
  $("#GDTRSDIV").css("height", `calc(100% - ${FINAL_OFFSET}px`);
  $("#handlerZZZZZ").css("height", `calc(100% - 89px`);
  let d = $('#mainrecognizingcontainer');
  d.scrollTop(d.prop("scrollHeight"));
}




function ByeByeNootNoot() {
  chrome.runtime.sendMessage({ type: "stop-cancel" });
  try {
    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(TabCanvasFreeDraw, {
        type: "end",
      });
    });
  } catch { }

  try {

    chrome.tabs.query({}, function (tabs) {
      for (var i = 0; i < tabs.length; ++i) {
        chrome.tabs.sendMessage(tabs[i].id, {
          type: "end",
        });
      }
    });
  } catch { }

  window.close(); chrome.runtime.sendMessage({ type: "stop-cancel" });
  try {
    chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
      chrome.tabs.sendMessage(TabCanvasFreeDraw, {
        type: "end",
      });
    });
  } catch { }

  try {

    chrome.tabs.query({}, function (tabs) {
      for (var i = 0; i < tabs.length; ++i) {
        chrome.tabs.sendMessage(tabs[i].id, {
          type: "end",
        });
      }
    });
  } catch { }
  window.close();
}

//Utils for loading page/Send Modal (just in case)
function showModal(type) {
  if (PopupWin == 2) {
    const modal = document.createElement("dialog");

    if (type == "nomore") {
      if ($("#pause:visible").length == 1) {
        $("#pause").click();
      }
      modal.innerHTML = `<div style="
    width: 350px;
    /* position: relative;"></div>
        <div style="position:absolute; top:0px; left:5px;">
        <button id="closeBtnModal" style="padding: 3px 12px; font-size: 16px; border: none; border-radius: 20px;">x</button>
        </div>
        <div style="    
        padding-top: 20px;
        text-align: center;">
            <p class="text-center" font-size: 15px;>You need more credits to continue</p>
            <div style="display:flex;flex-direction:row;column-gap:15px;align-items:center;justify-content:space-evenly">
                <a  style="cursor:pointer" href="https://www.app.noota.io/upgrade#payHoursCredits" target="_blank"><button style="  background-color: #00236f;
                color: white;
                width: fit-content;
                font-size: 20px;
                border-radius: 8px;
                padding: 5px 15px;
                cursor:pointer;
                border: none;" id="redirection">Buy Now</button></a>
                <a id="reprisePlay" style="cursor:pointer" ><button id="btnReprise" style="background-color: #00236f;
                color: white;
                width: fit-content;
                font-size: 20px;
                border-radius: 8px;
                padding: 5px 15px;
                cursor:pointer;
                border: none;" id="redirection">Continue</button></a>
            </div>
        </div>
        `;
    } else if (type == "loader") {
      //Don't pay attention to the nbrs of div for the loader :choked:
      modal.innerHTML = `
      <div id="WrapLoaders">
        <div>
        <img class="logoNootaLoading" src="../assets/images/popup/noota.gif" />
        </div>
        <div>
            <button id="closeLoader" style="padding: 3px 12px; font-size: 16px; border: none; border-radius: 20px;">x</button>
        </div>
        <div>
            <p class="text-center" id="ModalText">
  Please wait while we finalize your transcript, the process usually takes less than 10 minutes</p>
        </div>
        <div class="progress progress-striped active">
        <div role="progressbar progress-striped" id="maProgressBarDuFutur" class="progress-bar"></div>
        </div>   
        </div>   
        `;

      chrome.runtime.sendMessage({ type: "ModalState", subtype: "loader" });
    } else if (type == "open-transcript") {
      modal.innerHTML = `
      <div style="position: relative; top:0px; left:5px;">
      </div>
      <div style="position: relative;text-align: center;width: 95%;">
          <p class="text-center" id="ModalText">Your record is now available in your Noota account</p>
      </div>
      <div style="text-align: center;width: 95%;">
          <button id="redirectionToNootaApp">Open transcript</button>
      </div>`;
    } else if (type == "return") {
      modal.innerHTML = `<div style="width: 500px;
    overflow: hidden;"></div>
        <div id="messageModalReturn" style="text-align: center;
    margin-top: 20px;">
            <p class="text-center">Are you sure you want to discard this record ?<br> It will be lost.<br>
        </div>
        <div id="wrapBtns">
            <button  id="DiscardBtnModal">Yes</button>
            <button  id="closeBtnModal">No</button>
        </div>
        `;
      if (!NoAccount) {
        $("#textcontainer").show();
        $("#LabelHidePanel").text("");
        $("#svgshidePanel").hide();
        $("#svgshowPanel").show();
        HidePanelPopup = true;
      } else {
        modal.style.height = "150px";
        modal.style.margintop = "65px";
      }
    } else if (type == "SendToAPIForGuest") {
      modal.innerHTML = `
        <div style="  display: flex;
        position: relative;
        top: 0;
        width: 100%;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 15px;
          column-gap: 20px;">
        <p class="text-center">Please wait until your download ends</p>
            <button  style="   background-color: #021a4e;
            color: white;
            width: auto!important;
            border-radius: 4px!important;
            font-size: 20px;
            padding: 3px 4px!important;
            height: auto!important;" id="closeBtnWindow" >Ok</button>
        </div>
        `;

      //Just preset for NoAccount
      if (NoAccount) {
        modal.style.height = "150px";
        modal.style.margintop = "65px";
      }
    }



    var dialog = document.querySelector("dialog");

    try {
      dialog.remove();
    } catch (error) { }

    document.body.appendChild(modal);

    // handle all JS after adding the modal .
    if (type == "loader") {
      //Init progressbar
      $("#maProgressBarDuFutur").css("width", "0%");
    } else if (type == "nomore") {
      // btnReprise
      $("#reprisePlay").on("click", function () {
        reprisePlay();
        $("dialog").remove();
      });
    }

    dialog = document.querySelector("dialog");
    dialog.showModal();

    try {
      $("#closeLoader").hide();
    } catch (error) { }

    $("#CheckboxMixing").off().on("change", function () {
      const dialog = document.querySelector("dialog");
      dialog.remove();

      DisplayMixingMessage = false;
      chrome.storage.sync.set({ DisplayMixingMessage: false });
    });

    $("#closebtnforMixing").off().on("click", function () {
      const dialog = document.querySelector("dialog");
      dialog.remove();
    });

    $("#closeLoader").off().on("click", function () {
      const dialog = document.querySelector("dialog");
      dialog.remove();
    });

    $("#closeBtnModal").off().on("click", function () {
      const dialog = document.querySelector("dialog");
      dialog.remove();
      //Just preset for NoAccount
    });

    $("#closeBtnWindow").off().on("click", function () {
      // chrome.runtime.sendMessage({ type: "ModalState", subtype: false });
      $("#record").html("Start recording");
      setTimeout(function () {
        chrome.runtime.sendMessage({ type: "window", subtype: "CloseEvent" }), 2000
      });
      // window.close();

    });

    $("#DiscardBtnModal").off().on("click", function () {
      ByeByeNootNoot();
    });

    $("#redirectionToNootaApp").off().on("click", function () {
      chrome.runtime.sendMessage({ type: "ModalState", subtype: false });
      chrome.runtime.sendMessage({ type: "Redirection", subtype: true });
      window.close();
    });

  }
}


async function init_guidelines(bgPage) {

  const handleGuidelines = (data) => {
    // listGuidelines = data;
    var listGuidelines = JSON.parse(data);
    let $selectFolder = $("#guideline_select_input");
    if (listGuidelines.length == 0) {
      $selectFolder.css("justify-content", "center");
      return;
    } else {
      $("#containerGuideline").show();
    }
    Object.entries(listGuidelines).forEach(([index, info]) => {
      $selectFolder.append($('<option>', {
        value: info.id,
        text: info.title
      }));
    });
    $("#guideline_select_input").niceSelect();
    $("#guideline_select_input").niceSelect("update");
  }
  output_data = await bgPage.get(bgPage.base_url_root + "/api/guidelines/get-all-guidelines", "empty", "jwt", null);
  let data = await output_data.json();
  if (data == 'User has no access to this feature.') {
    $("#containerGuideline, #containerEmailSS").hide().css("opacity", 0);
    GD = false;
    chrome.runtime.sendMessage({ type: "do_nl", id: false });
  } else {
    GD = true;
    chrome.runtime.sendMessage({ type: "do_nl", id: true });
    handleGuidelines(data);
    $("#guideline_select_input").on("change", function () {
      if (this.value == "default") {
        chrome.runtime.sendMessage({ type: "update-guideline", id: "default" });
      } else {
        chrome.runtime.sendMessage({ type: "update-guideline", id: this.value });
      }
    });
    // topic trackers
    output_data = await bgPage.get(bgPage.base_url_root + "/api/topictracker/get-all-topics", "empty", "jwt", null);
    let data2 = await output_data.json();
    chrome.runtime.sendMessage({ type: "update_topics", id: data2 });
  }
}

function init_inputes() {
  // send messages , get data and set the stuff accordingly
  getMicSelect();
  getFlip();
  getMultimediaSelect();
  getLanguageInput();

}


function DisplayMainMenu() {
  if (recording && $("#main_panel:visible").length == 1) {
    return;
  }
  console.log("Called Display Main Menu ! ");
  $("#connect_id").prop("disabled", true);
  init_inputes();
  chrome.tabs.getSelected(WindowCanvasFreeDraw, function (tab) {
    if (tab.title != null) {
      $("#recordAudio")[0].value = tab.title;
      chrome.runtime.sendMessage({ type: "update-title", id: tab.title });
    }
  });
  // Set up custom dropdowns
  // FIXME GetCamera and GetAudio
  $("#div_connection").hide();
  $("#camera-select").niceSelect().hide();
  $("#multimedia-select").niceSelect();
  $("#mic-select").niceSelect();
  $("#upload_params").hide();
  var classNamessss = document.getElementsByClassName("dropdown-select");
  for (var i = 0; i < classNamessss.length; i++) {
    classNamessss[i].addEventListener("change", function (e) {
      if (e.currentTarget.value != "default") {
        e.currentTarget.style.color = "black";
      } else {
        e.currentTarget.style.color = "";
      }
    });
  }
  $("#connect_id").prop("disabled", false);
  $("#main_panel").hide();
  $("#main_panel_before, #body_jason").show();
  $("#tabs").show();
  $("#navhead").show();
  $("#body").css("width", "85%");
  $("#body").css("background-color", "unset");
  $("#camera-select").niceSelect().hide();
  $("#multimedia-select").niceSelect();
  $("#mic-select").niceSelect();
  $("#language_select").niceSelect();
  let ul = document.querySelectorAll(".list");
  ul.forEach((el) => {
    el.setAttribute("style", "max-height:220px!important");
  });

  $("#div_connection").hide();
  $("#upload_params").hide();
  $("#popup_original").show();
  $("#loadingPorFavor").show();
  $("#recording_ap").show();
  // $("#record").click();
}

function paddy(num, padlen, padchar) {
  var pad_char = typeof padchar !== "undefined" ? padchar : "0";
  var pad = new Array(1 + padlen).join(pad_char);
  return (pad + num).slice(-pad.length);
}

let endlooperdisplaycredit = false;
let alrealydisplayed = false;
var duration_displayed = 0;


function getLocaleUser() {
  var language;
  if (window.navigator.languages) {
    language = window.navigator.languages[0];
  } else {
    language = window.navigator.userLanguage || window.navigator.language;
  }
  return language;
}
function insertAfter(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function setFirstLanguage(id) {
  let usr_locale = getLocaleUser();
  const objSelect = document.getElementById(id);
  if (objSelect != null) {
    let optSelected = objSelect.querySelector(`option`);
    let optFirst = objSelect.querySelector(`option[value="${usr_locale}"]`);
    if (optFirst != null) {
      if (optFirst != optSelected) {
        insertAfter(optFirst, optSelected);
        updateLanguage(usr_locale, false);
      }
    }
  }
}



async function DisplayWarning(argument, total_credit, Rest) {
  console.log("display warning funciton for arg.", argument);

  // "1min" or "final"
  let x = document.getElementById("snackbar");
  let icon = document.querySelector(".clockSVG");
  let div_snackbar = document.querySelector(".label_snackbar");


  if (!alrealydisplayed) {
    alrealydisplayed = true;
    icon = document.createElement("img");
    icon.setAttribute("src", "../assets/images/popup/clock.svg"); //fontawesome
    x.append(icon);

    let div_tmp = document.createElement("div");
    div_tmp.classList.add("label_snackbar");
    div.innerHTML = "Il vous reste " + total_credit + " minutes de crédit";
    x.append(div);
    x.className = "show";
  }
  function registerToast(duration_register) {
    alrealydisplayed = true;
    x.className = "show";
    (async function decompt() {
      div_snackbar = document.querySelector(".label_snackbar");
      let nice_tot = paddy(total_credit - 1, 2);
      let msg_rest =
        "Il vous reste " + nice_tot + " minutes de crédit";
      div_snackbar.innerHTML = msg_rest;
      if (duration_displayed >= duration_register) {
        $("#snackbar").empty();
        $(x).removeClass("show");
        duration_displayed = 0;
        return;
      }
      duration_displayed += 1000;
      setTimeout(decompt, 1000);
    })();
    // setTimeout(function () {
    //   $(x).removeClass("show");
    //   endlooperdisplaycredit = true;
    // }, duration_register);
  }

  if (argument == "1min") {
    if (!alrealydisplayed) {
      registerToast(20000);
    }
  } else if (argument == "final") {
    if (!alrealydisplayed) {

      registerToast(parseInt(total_credit) * 60 * 1000); // 5 minutes
    }
  }
}
