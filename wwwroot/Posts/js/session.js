function createTimeoutPopup(message = "") {
    if ($(".popup").length === 0) { // si elle n'existe pas encore
        $('body').append(`
            <div class='popup' style='display:none'> 
                <div class='popupContent'>
                    <div>
                        <div class='popupHeader'>Attention!</div> 
                        <h4 id='popUpMessage'></h4>
                    </div>
                    <div onclick='closePopup();' class='close-btn fa fa-close'></div> 
                </div>
            </div> 
        `);
    }
}

let currentTimeouID = undefined;
let initialized = false;
let timeBeforeRedirect = 5;
let timeoutCallBack = () => { };
let infinite = -1;
let timeLeft = infinite;
let maxStallingTime = infinite;

function popupMessage(message) {
    createTimeoutPopup();
    $("#popUpMessage").text(message);
    $(".popup").show();
}

function initTimeout(stallingTime = infinite, callback = timeoutCallBack) {
    maxStallingTime = stallingTime;
    timeoutCallBack = callback;
    createTimeoutPopup();
    initialized = true;
}
function noTimeout() {
    $(".popup").hide();
    clearTimeout(currentTimeouID);
}
function setiddleTime(iddleTime = 20 * 60) {
    maxStallingTime = iddleTime;
    timeout();
}
function timeout() {
    startCountdown();
}
function startCountdown() {
    if (!initialized) initTimeout();
    clearTimeout(currentTimeouID);
    $(".popup").hide();
    timeLeft = maxStallingTime;
    if (timeLeft != infinite) {
        currentTimeouID = setInterval(() => {
            timeLeft = timeLeft - 1;
            if (timeLeft > 0) {
                //console.log('session timeout counting', timeLeft)
                if (timeLeft <= 10) {
                    $(".popup").show();
                    $("#popUpMessage").text("Expiration dans " + timeLeft + " secondes");
                }
            } else {
                $("#popUpMessage").text('Redirection dans ' + (timeBeforeRedirect + timeLeft) + " secondes");
                if (timeLeft <= -timeBeforeRedirect) {
                    clearTimeout(currentTimeouID);
                    closePopup();
                    timeoutCallBack();
                }
            }
        }, 1000);
    }
}
function closePopup() {
    $(".popup").hide();
    startCountdown();
} 
