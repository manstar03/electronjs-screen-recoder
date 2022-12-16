// Inject the iframe to retrieve camera sources
var iframe = document.createElement("iframe");
iframe.style.display = "none";
iframe.src = chrome.extension.getURL("./../html/sources.html");
iframe.allow = "camera";
document.body.appendChild(iframe);

var iframe = document.createElement("iframe");
iframe.style.display = "none";
iframe.src = chrome.extension.getURL("./../html/audiosources.html");
iframe.allow = "microphone";
document.body.appendChild(iframe);
console.log(iframe);

(async () => {
    console.log("adfasdfsdfasfdasfdsafadsf");
    const src = chrome.extension.getURL('src/js/content_main.js');
    const contentScript = await import(src);
    contentScript.main(/* chrome: no need to pass it */);
})();
