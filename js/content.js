$(document).ready(function () {
  const uniqueid = "Noota-screen-recorder-extension";
  var recording = true;
  var drag, dragx, dragy, timer, pickr;
  var dragging = false;
  var dragged = false;
  var drawing = false;
  var pendown = false;
  var cameraon = true;
  var micon = true;
  var arrowon = false;
  var texton = false;
  var clickon = false;

  var hideon = false;
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
  var canvas;

  // Get defaults
  function getDefaults() {
    chrome.storage.sync.get(["pushtotalk"], function (result) {
      if (result.pushtotalk) {
        holdtalk = true;
        micEnabled(false);
      }
    });
    chrome.storage.sync.get(["toolbar"], function (result) {
      persistent = result.toolbar;
      if (!countdownactive && persistent) {
        chrome.runtime.sendMessage({ type: "countdown" });
        if (persistent) {
          $("#" + uniqueid + " #toolbar-record").removeClass(
            "toolbar-inactive"
          );
        }
      }
    });
    chrome.storage.sync.get(["mic"], function (result) {
      if (result.mic == "disabled" || result.mic == 0) {
        micEnabled(false);
      }
    });
    chrome.storage.sync.get(["camera"], function (result) {
      console.log("camera : " + result.camera);
      if (result.camera == "disabled" || result.camera == 0) {
        cameraEnabled(false);
        $("#" + uniqueid + " #hide-camera").addClass("camera-hidden");
        $("#" + uniqueid + " #detect-iframe").addClass("no-camera");
        $("#" + uniqueid + " #wrap-iframe").addClass("no-camera");
      } else if (result.camera == "disabled-access") {
        $("#" + uniqueid + " #wrap-iframe").addClass("no-camera");
        $("#" + uniqueid + " #hide-camera").addClass("camera-hidden");
        $("#" + uniqueid + " #detect-iframe").addClass("no-camera");
      }
    });
  }

  chrome.storage.sync.get("countdown", function (result) {
    injectCode(true, result);
  });

  // Inject or remove all the content
  function injectCode(inject, active) {
    if (inject) {
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
      tabaudioon = true;
      arrowon = false;
      window.arrowon = arrowon;
      texton = false;
      clickon = false;
      focuson = false;
      hideon = false;
      sliderhover = false;
      sliderhovereraser = false;
      penhover = false;
      eraserhover = false;

      // Get list of audio devices
      chrome.runtime.sendMessage(
        { type: "audio-request" },
        function (response) {
          audiodevices = response.devices;
        }
      );

      // Extension wrapper
      var wrapper =
        "<div id='" +
        uniqueid +
        "' style='width: 100%;height:100%;position:absolute;'></div>";
      $("body").append(wrapper);

      // Inject the iframe
      var iframeinject =
        "<span style='display:none' id='RuntimeID'>" +
        chrome.runtime.id +
        "</span><div id='canvas-cont'><canvas id='canvas-draw'></canvas></div><div id='click-highlight'></div><div id='detect-iframe'><div id='hide-camera' class='camera-hidden'><img src='" +
        chrome.extension.getURL("./assets/images/close.svg") +
        "' class='noselect'></div></div><div id='wrap-iframe' class='notransition'><iframe src='" +
        chrome.extension.getURL("./html/camera.html") +
        "' allow='camera'></iframe></div><canvas id='canvas-freedraw' width=500 height=500></canvas><canvas id='canvas-focus' width=500 height=500></canvas>";

      $("#" + uniqueid).prepend(iframeinject);

      // Inject the toolbar
      //$("#" + uniqueid).prepend(toolbarinject);

      getDefaults();

      $("#" + uniqueid + " #camera").addClass("camera-on");
      drag = $("#" + uniqueid + " #wrap-iframe");

      // Allow CSS transitions (prevents camera from scaling on load)
      window.setTimeout(function () {
        $(".notransition").removeClass("notransition");
      }, 500);

      // Check if countdown is enabled
      if (active) {
        $("#" + uniqueid + " #toolbar-record").css("pointer-events", "none");
        // chrome.storage.sync.get(["countdown_time"], function (result) {
        //   injectCountdown(result.countdown_time);
        // });
      } else {
        chrome.runtime.sendMessage({ type: "countdown" });
        if (persistent) {
          $("#" + uniqueid + " #toolbar-record").removeClass(
            "toolbar-inactive"
          );
        }
        if (camerasize && camerapos) {
          cameraSize(camerasize);
          setCameraPos(camerapos.x, camerapos.y);
        }
      }

      // Initialize canvas
      initCanvas();
    } else {
      $("#" + uniqueid).remove();
    }
  }

  // Countdown
  function injectCountdown(time) {
    var countdowninject =
      "<div id='countdown'><img src=" +
      chrome.extension.getURL("./assets/images/3-countdown.svg") +
      "></div>";
    $("#" + uniqueid).prepend(countdowninject);
    countdown(time);
  }
  function delay(num, time, last) {
    window.setTimeout(function () {
      if (!last) {
        $("#" + uniqueid + " #countdown img").attr(
          "src",
          chrome.extension.getURL("./assets/images/" + num + "-countdown.svg")
        );
      } else {
        $("#" + uniqueid + " #countdown").addClass("countdown-done");
        window.setTimeout(function () {
          chrome.runtime.sendMessage({ type: "countdown" });
        }, 10);
        if (persistent) {
          $("#" + uniqueid + " #toolbar-record").removeClass(
            "toolbar-inactive"
          );
        }
        $("#" + uniqueid + " #toolbar-record").css("pointer-events", "all");
      }
    }, time * 1000);
  }
  function countdown(time) {
    $("#" + uniqueid + " #countdown img").attr(
      "src",
      chrome.extension.getURL("./assets/images/" + time + "-countdown.svg")
    );
    for (var i = 0; i <= time; i++) {
      if (i == time) {
        delay(time - i, i, true);
      } else {
        delay(time - i, i, false);
      }
    }
  }

  // Switch camera on and off
  function cameraEnabled(enable) {
    cameraon = enable;
    if (enable) {
      $("#camera").addClass("camera-on");
    } else {
      $("#hide-camera").addClass("camera-hidden");
      $("#camera").removeClass("camera-on");
    }
  }

  // Pause/resume recording
  function pauseResume() {
    if (recording) {
      chrome.runtime.sendMessage({ type: "pause" }, function (response) {
        if (response.success) {
        }
      });
    } else {
      chrome.runtime.sendMessage({ type: "resume" }, function (response) {
        $("dialog").remove();
      });
    }
  }

  // Canvas initialization
  var canvas_focus, ctx_focus, canvas_free, ctx_free;
  var last_mousex = 0;
  var last_mousey = 0;
  var mousex = 0;
  var mousey = 0;
  var pendown = false;
  var tooltype = "draw";
  var penset = false;
  var textediting = false;
  var mouseover = false;
  var moretools = false;
  const canvas_free_id = "#" + uniqueid + " #canvas-freedraw";
  const canvas_focus_id = "#" + uniqueid + " #canvas-focus";
  var arrow;
  var colorOfpickrRGBA;
  var colorOfpickr;

  function initCanvas() {
    return;
    // Reset defaults
    canvas_focus = document.getElementById("canvas-focus");
    ctx_focus = canvas_focus.getContext("2d");
    canvas_free = document.getElementById("canvas-freedraw");
    ctx_free = canvas_free.getContext("2d");
    last_mousex = 0;
    last_mousey = 0;
    mousex = 0;
    mousey = 0;
    pendown = false;
    tooltype = "draw";
    penset = false;
    $("#" + uniqueid + " #canvas-freedraw").css("pointer-events", "none");

    // Interactive FabricJs canvas initialization
    canvas = new fabric.Canvas("canvas-draw", {
      preserveObjectStacking: true,
      height: $(document).height(),
      width: $(document).width(),
      renderOnAddRemove: false,
    });
    textediting = false;
    $("#" + uniqueid + " #canvas-cont").css("pointer-events", "none");

    // Resize canvas to be full size
    onResize();
    window.setTimeout(function () {
      onResize();
    }, 800);
    canvas.selection = false;
    mouseover = false;
    moretools = false;
    arrow = new Arrow(canvas);

    // Detect mousedown on FabricJs canvas
    canvas.on("mouse:down", function (options) {
      if (textediting) {
        textediting = false;
      } else if (
        texton &&
        options.target == null &&
        !canvas.getActiveObject()
      ) {
        newTextbox(options.pointer.x, options.pointer.y);
      }
    });

    // Automatically increase textbox width (do not break words)
    canvas.on("text:changed", function () {
      var linewidth =
        canvas.getActiveObject().__lineWidths[
        canvas.getActiveObject().__lineWidths.length - 1
        ];
      if (
        !isNaN(linewidth) &&
        linewidth + 40 > canvas.getActiveObject().width
      ) {
        canvas.getActiveObject().set("width", linewidth + 40);
        canvas.renderAll();
      }
    });
  }

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

  // Free drawing
  function draw(e) {
    mousex = parseInt(e.pageX);
    mousey = parseInt(e.pageY);
    if (pendown) {
      ctx_free.beginPath();
      if (!penset) {
        ctx_free.lineWidth = 10;
      }
      if (tooltype == "draw") {
        ctx_free.globalCompositeOperation = "source-over";
        ctx_free.strokeStyle = colorOfpickrRGBA;
      } else {
        ctx_free.globalCompositeOperation = "destination-out";
      }
      ctx_free.moveTo(last_mousex, last_mousey);
      ctx_free.lineTo(mousex, mousey);
      ctx_free.lineJoin = "round";
      ctx_free.lineCap = "round";
      ctx_free.stroke();
    }
    last_mousex = mousex;
    last_mousey = mousey;
  }

  // Create a new textbox
  function newTextbox(x, y) {
    if (typeof x !== "undefined" && typeof y !== "undefined") {
      var newtext = new fabric.Textbox("", {
        left: x,
        top: y,
        fontFamily: "sans-serif",
        fill: colorOfpickr,
        transparentCorners: false,
        lockRotation: true,
        borderColor: "#0E98FC",
        cornerColor: "#0E98FC",
        centeredScaling: false,
        borderOpacityWhenMoving: 1,
        hasControls: true,
        hasRotationPoint: false,
        lockScalingFlip: true,
        lockSkewingX: true,
        lockSkewingY: true,
        cursorWidth: 1,
        width: 100,
        cursorDuration: 1,
        cursorDelay: 250,
      });
    }
    newtext.setControlsVisibility({
      bl: true,
      br: true,
      tl: true,
      tr: true,
      mb: false,
      ml: true,
      mr: true,
      mt: false,
      mtr: false,
    });
    canvas.add(newtext).setActiveObject(newtext);
    canvas.bringToFront(newtext);
    canvas.renderAll();
    newtext.enterEditing();
    textediting = true;
  }

  // Resize canvas to fit document
  function onResize() {
    return;
    canvas.setWidth($(document).width());
    canvas.setHeight($(document).height());
    canvas.renderAll();
    canvas_free.style.width = $(document).width();
    canvas_free.style.height = $(document).height();
    canvas_free.width = $(document).width();
    canvas_free.height = $(document).height();
    canvas_focus.style.width = $(document).width();
    canvas_focus.style.height = $(document).height();
    canvas_focus.width = $(document).width();
    canvas_focus.height = $(document).height();
  }

  // Detect document dimensions changing
  const resizeObserver = new ResizeObserver((entries) => {
    onResize();
  });
  if (
    window.location.href.includes("twitter.com") ||
    window.location.href.includes("facebook.com") ||
    window.location.href.includes("pinterest.com") ||
    window.location.href.includes("reddit.com")
  ) {
    document.body.style.height = "unset";
  }
  resizeObserver.observe(document.body);

  // Show click highlight
  function mouseClick(e) {
    $("#" + uniqueid + " #click-highlight").css(
      "top",
      e.clientY + $(window).scrollTop() - 15 + "px"
    );
    $("#" + uniqueid + " #click-highlight").css(
      "left",
      e.clientX + $(window).scrollLeft() - 15 + "px"
    );
    $("#" + uniqueid + " #click-highlight").addClass("show-click");
  }

  // Change camera size
  function cameraSize(id) {
    console.log(id);
    if (id == "small-size") {
      $(".size-active").removeClass("size-active");
      $("#small-size").addClass("size-active");
      $("#hide-camera").css({ left: "7px", top: "7px" });
    } else if (id == "medium-size") {
      $(".size-active").removeClass("size-active");
      $("#medium-size").addClass("size-active");
      $("#hide-camera").css({ left: "27px", top: "27px" });
    } else {
      $(".size-active").removeClass("size-active");
      $("#large-size").addClass("size-active");
      $("#hide-camera").css({ left: "64px", top: "64px" });
    }

    camerasize = id;
  }

  // Send the camera and audio devices list to the settings panel
  function sendSettings() {
    chrome.runtime.sendMessage({
      type: "device-list",
      cameradevices: cameradevices,
      audiodevices: audiodevices,
    });
  }

  // Switch system/microphone audio on and off
  function audioEnable(type, enable) {
    chrome.runtime.sendMessage({
      type: "audio-switch",
      enable: enable,
      source: type,
    });
  }
  // Switch microphone on and off
  function micEnabled(enable) {
    micon = enable;
    if (enable) {
      $("#" + uniqueid + " #mic").addClass("tool-active");
      $("#" + uniqueid + " #mic img").attr(
        "src",
        chrome.extension.getURL("./assets/images/mic-off.svg")
      );
      audioEnable("mic", true);
    } else {
      $("#" + uniqueid + " #mic").removeClass("tool-active");
      $("#" + uniqueid + " #mic img").attr(
        "src",
        chrome.extension.getURL("./assets/images/mic.svg")
      );
      audioEnable("mic", false);
    }
  }

  function setCameraPos(x, y) {
    $("#" + uniqueid + " #wrap-iframe").css("left", x);
    $("#" + uniqueid + " #wrap-iframe").css("top", y);
    $("#" + uniqueid + " #detect-iframe").css("left", x);
    $("#" + uniqueid + " #detect-iframe").css("top", y);
  }

  // When the mouse button is clicked
  function mouseDown(e) {
    if (
      clickon &&
      !$("#" + uniqueid + " .pcr-app").is(e.target) &&
      $("#" + uniqueid + " .pcr-app").has(e.target).length === 0 &&
      !$("#" + uniqueid + " #toolbar-record").is(e.target) &&
      $("#" + uniqueid + " #toolbar-record").has(e.target).length === 0 &&
      !$("#" + uniqueid + " #toolbar-record-pen").is(e.target) &&
      $("#" + uniqueid + " #toolbar-record-pen").has(e.target).length === 0 &&
      !$("#" + uniqueid + " #toolbar-record-cursor").is(e.target) &&
      $("#" + uniqueid + " #toolbar-record-cursor").has(e.target).length ===
      0 &&
      !$("#" + uniqueid + " #pen-slider").is(e.target) &&
      $("#" + uniqueid + " #pen-slider").has(e.target).length === 0 &&
      !$("#" + uniqueid + " #eraser-slider").is(e.target) &&
      $("#" + uniqueid + " #eraser-slider").has(e.target).length === 0
    ) {
      mouseClick(e);
    }
    mousedown = true;
  }

  // When the mouse button is released
  function mouseUp(e) {
    if (dragged) {
      chrome.runtime.sendMessage({
        type: "camera-pos",
        x: $("#" + uniqueid + " #detect-iframe").css("left"),
        y: $("#" + uniqueid + " #detect-iframe").css("top"),
      });
      dragged = false;
    }
    $("#" + uniqueid + " #detect-iframe").css("pointer-events", "all");
    $("#" + uniqueid + " #toolbar-record").css("pointer-events", "all");
    pendown = false;
    mousedown = false;
    dragging = false;
    window.setTimeout(function () {
      $(".show-click").removeClass("show-click");
    }, 200);

    //Permit click release for drop the texton
    if (texton) {
      texton = false;
      $(" #canvas-cont").css("pointer-events", "none");
      $(" #text").removeClass("tool-active");
      $(" #text img").attr(
        "src",
        chrome.extension.getURL("./assets/images/text.svg")
      );
      canvas.defaultCursor = "crosshair";

      chrome.runtime.sendMessage({ type: "MouseUpTexton" });
    }
  }

  // When the mouse moves
  function mouseMove(e) {
    lastx = e.pageX;
    lasty = e.pageY;
    if (dragging && cameraon) {
      // Drag the camera container
      drag.css("left", e.clientX - dragx - $(window).scrollLeft() + "px");
      drag.css("top", e.clientY - dragy - $(window).scrollTop() + "px");
      $("#" + uniqueid + " #detect-iframe").css(
        "left",
        e.clientX - dragx - $(window).scrollLeft() + "px"
      );
      $("#" + uniqueid + " #detect-iframe").css(
        "top",
        e.clientY - dragy - $(window).scrollTop() + "px"
      );
      dragged = true;
    } else {
      // Free drawing
      if (pendown) {
        draw(e);
      }
    }
    // Hide cursor if inactive for more than 2 seconds
    if (hideon) {
      console.log("hideon");
      clearTimeout(timer);
      $(".no-cursor").removeClass("no-cursor");
      timer = window.setTimeout(function () {
        console.log("no-cursor triggered");
        $("#" + uniqueid + " body").addClass("no-cursor");
      }, 2000);
    } else {
      $(".no-cursor").removeClass("no-cursor");
    }
  }

  // Start freedrawing
  function startDrawing(e) {
    if (drawing) {
      last_mousex = parseInt(e.pageX);
      last_mousey = parseInt(e.pageY);
      mousex = parseInt(e.pageX);
      mousey = parseInt(e.pageY);
      pendown = true;
    }
  }
  function DisplayParams() {
    $("#upload_params")[0].style.display = "block";
    $("#popup_original")[0].style.display = "none";
    $("#mainCtnr")[0].style.display = "none";
  }

  // Detect push to talk keystroke
  $(document)
    .keydown(function (e) {
      if (e.ctrlKey) {
        alt = true;
      }
      if (mdown && alt) {
        micEnabled(true);
      }
    })
    .keyup(function (e) {
      if (e.ctrlKey) {
        alt = false;
      }
      if (holdtalk) {
        micEnabled(false);
      }
    });
  $(document)
    .keydown(function (e) {
      if (e.which == 77) {
        mdown = true;
      }
      if (mdown && alt) {
        micEnabled(true);
      }
    })
    .keyup(function (e) {
      if (e.which == 77) {
        mdown = false;
      }
      if (holdtalk) {
        micEnabled(false);
      }
    });

  // Turn on/off microphone
  /*
    $(document).on("click", "#" + uniqueid + " #mic", function () {
        micEnabled(!micon)
    })
    */

  // Turn on/off tab audio
  /*
    $(document).on("click", "#" + uniqueid + " #tab-audio", function () {
        if (tabaudioon) {
            audioEnable("tab", false);
            tabaudioon = false;
            $("#" + uniqueid + " #tab-audio").removeClass("tool-active");
            $("#" + uniqueid + " #tab-audio img").attr("src", chrome.extension.getURL('./assets/images/tab-audio.svg'));
            chrome.runtime.sendMessage({ type: "tab-audio-off" });
        } else {
            audioEnable("tab", true);
            tabaudioon = true;
            $("#" + uniqueid + " #tab-audio").addClass("tool-active");
            $("#" + uniqueid + " #tab-audio img").attr("src", chrome.extension.getURL('./assets/images/tab-audio-off.svg'));
            chrome.runtime.sendMessage({ type: "tab-audio-on" });
        }
    })*/

  // Show camera settings
  $(document).on("mouseover", "#" + uniqueid + " #detect-iframe", function (e) {
    if (cameraon) {
      $(".camera-hidden").removeClass("camera-hidden");
    }
  });

  // Hide camera settings
  $(document).on("mouseout", "#" + uniqueid + " #detect-iframe", function (e) {
    $("#" + uniqueid + " #hide-camera").addClass("camera-hidden");
    $("#" + uniqueid + " #change-size").addClass("camera-hidden");
  });

  // Detect a click on the camera container (possible drag)
  $(document).on("mousedown", "#" + uniqueid + " #detect-iframe", function (e) {
    if (e.which !== 1) return;
    e.stopPropagation();
    drag = $("#" + uniqueid + " #wrap-iframe");
    dragx = e.clientX - drag.offset().left;
    dragy = e.clientY - drag.offset().top;
    dragging = true;
  });

  window.addEventListener("load", function () {
    Sentry.init({
      dsn:
        "https://72b002d2d80e406ca8c8b7b356e20e04@o456514.ingest.sentry.io/6509425",
      tracesSampleRate: 0.2,
    });
  });

  // Detect scroll to update focus circle position
  $(document).on("scroll", function (e) {
    if (focuson) {
      if (lastscrollx != $(document).scrollLeft()) {
        lastx -= lastscrollx;
        lastscrollx = $(document).scrollLeft();
        lastx += lastscrollx;
      }
      if (lastscrolly != $(document).scrollTop()) {
        lasty -= lastscrolly;
        lastscrolly = $(document).scrollTop();
        lasty += lastscrolly;
      }
      focus(e);
    }
  });

  //remove camera
  $(document).on("click", "#" + uniqueid + " #hide-camera", function () {
    $("#wrap-iframe").remove();
    cameraEnabled(false);
  });

  // Prevent camera being dragged while drawing
  $(document).on("mousemove", "#" + uniqueid + " #detect-iframe", function (e) {
    if (drawing && pendown) {
      $("#" + uniqueid + " #detect-iframe").css("pointer-events", "none");
    }
  });

  // Detect click on freedrawing canvas (to start drawing)
  $(document).on("mousedown", canvas_free_id, function (e) {
    startDrawing(e);
  });
  $(document).on("touchstart", canvas_free_id, function (e) {
    startDrawing(e);
  });

  // Detect click anywhere on the page (except tools)
  $(document).on("mousedown", function (e) {
    mouseDown(e);
  });
  $(document).on("touchstart", function (e) {
    mouseDown(e);
  });

  // Detect mouse up anywhere on the page
  $(document).on("mouseup", function (e) {
    mouseUp(e);
  });
  $(document).on("touchend", function (e) {
    mouseUp(e);
  });

  // Detect cursor moving anywhere on the page
  $(document).on("mousemove", function (e) {
    mouseMove(e);
  });
  $(document).on("touchmove", function (e) {
    mouseMove(e);
  });

  // Delete selected object (only for arrows and text)
  $(document).on("keydown", function (e) {
    if (
      (e.keyCode == 46 ||
        e.key == "Delete" ||
        e.code == "Delete" ||
        e.key == "Backspace") &&
      canvas.getActiveObject() &&
      !canvas.getActiveObject().isEditing
    ) {
      canvas.remove(canvas.getActiveObject());
      canvas.renderAll();
    }
  });

  // Detect when the window changes size
  $(window).resize(function () {
    onResize();
  });



  $(document).on("click", ".choose-size", function (e) {
    cameraSize(e.target.id);
  });

  // Listen for popup/background/content messages
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {

    if (request.type == "inputchangetoolbar") {
      penset = true;
      ctx_free.lineWidth = request.value;
    } else if (request.type == "pauseResumeContent") {
      pauseResume();
    } else if (request.type == "hidecamera") {
      cameraEnabled(false);
    } else if (request.type == "pickonChange") {
      colorOfpickr = request.colorOfpickr;
      colorOfpickrRGBA = request.colorOfpickrRGBA;

      console.log("pickonChange" + colorOfpickrRGBA);

      if (
        canvas.getActiveObject() &&
        canvas.getActiveObject().type == "textbox"
      ) {
        canvas.getActiveObject().set("fill", request.colorOfpickr);
      } else if (canvas.getActiveObject()) {
        canvas.getActiveObject().set("stroke", request.colorOfpickr);
      }
      canvas.renderAll();
    } else if (request.type == "clear") {
      canvas.clear();
      ctx_free.clearRect(0, 0, canvas_free.width, canvas_free.height);
    } else if (request.type == "Draw?") {
      console.log("draw");
      if (!request.value) {
        $(" #canvas-freedraw").css("pointer-events", "none");
        drawing = false;
      }
      if (request.value == true) {
        resetDrawingTools();
        $(" #canvas-freedraw").css("pointer-events", "all");
        $(" #canvas-cont").css("pointer-events", "none");
        canvas.discardActiveObject();
        canvas.renderAll();
        tooltype = request.tooltype;
        drawing = true;
      }
    } else if (request.type == "TextTool?") {
      if (request.value) {
        resetDrawingTools();
        texton = true;
        $(" #canvas-cont").css("pointer-events", "all");
        $(" #canvas-freedraw").css("pointer-events", "none");
        $(" #text").addClass("tool-active");
        $(" #text img").attr(
          "src",
          chrome.extension.getURL("assets/images/textactive.svg")
        );
        canvas.defaultCursor = "text";
      }
    } else if (request.type == "arrow?") {
      if (!request.value) {
        arrowon = false;
        window.arrowon = arrowon;
      } else {
        resetDrawingTools();
        arrowon = true;
        window.arrowon = arrowon;
        canvas.defaultCursor = "crosshair";
      }
    } else if (request.type == "Click?") {
      if (!request.value) {
        clickon = false;
      } else {
        clickon = true;
      }
    } else if (request.type == "Cursor?") {
      if (request.subtype == "highlight") {
        if (!request.value) {
          clickon = false;
        } else {
          clickon = true;
        }
      }

      if (request.subtype == "hide") {
        if (!request.value) {
          hideon = false;
        } else {
          hideon = true;
        }
      }
    } else if (request.type == "camera-list") {
      cameradevices = request.devices;
    } else if (request.type == "displayUploadparams") {
      DisplayParams();
    } else if (request.type == "audio-list") {
      audiodevices = request.devices;
    } else if (request.type == "end") {
      $("#" + uniqueid).remove();
    } else if (request.type == "pause/resume") {
      pauseResume();
    } else if (request.type == "restartMicrophone") {
      micEnabled(true);
    } else if (request.type == "stopMicrophone") {
      micEnabled(false);
    } else if (request.type == "mute/unmute") {
      if (micon) {
        micEnabled(false);
      } else {
        micEnabled(true);
      }
    } else if (request.type == "push-to-talk") {
      holdtalk = request.enabled;
      micEnabled(false);
    } else if (request.type == "switch-toolbar") {
      persistent = request.enabled;
      if (persistent) {
        $("#toolbar-record").removeClass("toolbar-inactive");
      } else {
        $("#toolbar-record").addClass("toolbar-inactive");
      }
    } else if (request.type == "stop-save") {
      injectCode(false);
    } else if (request.type == "restart") {
      camerapos = request.camerapos;
      camerasize = request.camerasize;
      injectCode(true, request.countdown);
    } else if (request.type == "update-camera") {
      cameraEnabled(true);
    } else if (request.type == "update-cmic") {
      if (request.id == "disabled" || request.id == 0) {
        micEnabled(false);
      } else {
        micEnabled(true);
      }
    }

  });
});
