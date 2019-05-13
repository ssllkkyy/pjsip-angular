(function() {
  //$.verto.init({}, bootstrapBase);
    vertoInit();
})();

var vertoHandleBase, vertoCallbacksBase, currentCallBase;
var loginExtensionBase, fsDomainBase, pwBase;
var wssServerBase;
var bandwidthTestDataBase;
var destinationNumberBase;

var standaloneDemo = false;
//standaloneDemo = true;

function vertoInit(){
    loginExtensionBase = '1010';
    pwBase = '12345';
    fsDomainBase = 'kotterverto2.freeswitch.eu';
    wssServerBase = 'kotterverto2.freeswitch.eu';
    $.verto.init({}, bootstrapBase);
}

function makeCallBase() {

  vertoHandleBase.videoParams({
    // Dimensions of the video feed to send.
    minWidth: 320,
    minHeight: 240,
    maxWidth: 640,
    maxHeight: 480,
    // The minimum frame rate of the client camera, Verto will fail if it's
    // less than this.
    minFrameRate: 15,
    // The maximum frame rate to send from the camera.
    vertoBestFrameRate: 30
  });

  if(standaloneDemo) {
    destinationNumberBase = document.getElementById("destinationNumberBase").value;
  }

  if(destinationNumberBase == null) {
    destinationNumberBase = $("#lblExtension").html();
  }

  console.log("destinationNumberBase = " + destinationNumberBase);

  currentCallBase = vertoHandleBase.newCall({
    // Extension to dial.
    destination_number: destinationNumberBase,
    caller_id_name: 'Test Guy',
    caller_id_number: '1000',
    //outgoingBandwidth: 'default',
    //incomingBandwidth: 'default',
    outgoingBandwidth: 2000,
    incomingBandwidth: 5000,
    // Enable stereo audio.
    useStereo: true,
    useVideo: false,
    mirrorInput: false,
    // You can pass any application/call specific variables here, and they will
    // be available as a dialplan variable, prefixed with 'verto_dvar_'.
    userVariables: {
      // Shows up as a 'verto_dvar_email' dialplan variable.
      email: 'test@test.com'
    },
    // Use a dedicated outbound encoder for this user's video.
    // NOTE: This is generally only needed if the user has some kind of
    // non-standard video setup, and is not recommended to use, as it
    // dramatically increases the CPU usage for the conference.
    dedEnc: false,
    // Example of setting the devices per-call.
    //useMic: 'any',
    //useSpeak: 'any',
  });

}; // makeCallBase

function bootstrapBase(status) {

  if(standaloneDemo)
  {
    loginExtensionBase = document.getElementById("myExtensionBase").value;
  }
  else {
    loginExtensionBase = $("#txtMyExtension").html();
  }

  loginExtensionBase = '1010';
  
  console.log("loginExtensionBase = " + loginExtensionBase);
  console.log("fsDomainBase = " + fsDomainBase);
  console.log("wssServerBase = " + wssServerBase);

  vertoHandleBase = new jQuery.verto({
      login: loginExtensionBase + '@' + fsDomainBase,
      passwd: pwBase,
      //socketUrl: 'wss://' + fsDomainBase + ':8082',
      socketUrl: 'wss://' + wssServerBase + ':8082',
      // TODO: Where is this file, on the server? What is the base path?
      ringFile: 'sounds/bell_ring2.mp3',
      iceServers: true,
      tag: "video-container",
      deviceParams: {
        useMic: 'any',
        useSpeak: 'any',
        useVideo: false
      }
  }, vertoCallbacksBase);


  if(standaloneDemo) {
    document.getElementById("logIn").addEventListener("click", loginBase);
    document.getElementById("make-call").addEventListener("click", makeCallBase);
    document.getElementById("hang-up-call").addEventListener("click", hangupCallBase);
    document.getElementById("answer-call").addEventListener("click", answerCallBase);
    //document.getElementById("enableVideo").addEventListener("click", enableVideoBase);
    document.getElementById("hold-call").addEventListener("click", holdCallBase);
    document.getElementById("mute-call").addEventListener("click", muteCallBase);
    document.getElementById("transfer-call").addEventListener("click", transferCallBase);
  }
}; // function bootstrapBase

var testBandwidthBase = function() {
  // Translates to 256KB.
  var bytesToSendAndReceive = 1024 * 256;
  vertoHandleBase.rpcClient.speedTest(bytesToSendAndReceive, function(event, data) {
    // These values are in kilobits/sec.
    var upBand = Math.ceil(data.upKPS);
    var downBand = Math.ceil(data.downKPS);
    console.log('[BANDWIDTH TEST] Up: ' + upBand + ', Down: ' + downBand);
    // Store the results for later.
    bandwidthTestDataBase = data;
  });
} // testBandwidthBase

vertoCallbacksBase = {
  onDialogState: onDialogStateBase,
  onWSLogin: onWSLoginBase,
  onWSClose: onWSCloseBase,
  onMessage: onMessageBase
}; // vertoCallbacksBase

function onWSLoginBase(verto, success) {
  console.log('onWSLoginBase', success);
  if(success) {
      testBandwidthBase();
  }
}; // onWSLoginBase

// Receives conference-related messages from FreeSWITCH.
// Note that it's possible to write server-side modules to send customized
// messages via this callback.
function onMessageBase(verto, dialog, message, data) {
  switch (message) {
    case $.verto.enum.message.pvtEvent:
      if (data.pvtData) {
        switch (data.pvtData.action) {
          // This client has joined the live array for the conference.
          case "conference-liveArray-join":
            // With the initial live array data from the server, you can
            // configure/subscribe to the live array.
            initLiveArray(verto, dialog, data);
            break;
          // This client has left the live array for the conference.
          case "conference-liveArray-part":
            // Some kind of client-side wrapup...
            break;
        }
      }
      break;
  }
} // onMessageBase

function enableVideo(){
  if(currentCallBase) {
    console.log('enableVideo');
    currentCallBase.useVideo = true;
  }
} // enableVideo

function loginBase(){
  bootstrapBase();
} // loginBase

function holdCallBase(){
  if(currentCallBase.state.name != 'held') {
    currentCallBase.hold();
  }
  else {
    currentCallBase.unhold();
  }
} // holdCallBase

function muteCallBase(){
  console.log("muting");
  currentCallBase.setMute("toggle");
} // muteCallBase

function transferCallBase(){
  console.log('transferCallBase');
  currentCallBase.transfer("*9198");
} // transferCallBase

function hangupCallBase() {
  currentCallBase.hangup();
}; // hangupCallBase

function declineCall(data) {
    console.log("verto declineCall");
    console.log(currentCallBase);
    currentCallBase.hangup();
}

function answerDialog(incomingData) {
    console.log("Entering answerDialog");
    var id = 9943;
    var data = {
        "phone_number": "9024124977", 
        "name": "Keith Gallant",
        "id" : id
    };

    var element = angular.element($('#ChatPlus'));
    var controller = element.controller();
    var scopeVar = element.scope();

    //as this happends outside of angular you probably have to notify angular 
    //of the change by wrapping your function call in $apply
    scopeVar.$apply(function(){
        scopeVar.showcall(data);
    });

    //angular.element(document.getElementById('ChatPlus')).scope().openModal('','','views/chat/addchannel.html', {callId: id});
}
    
function onCallDialog(incomingData) {
    console.log("Entering onCallDialog");
    
    var id = 9943;
    var data = {
        "phone_number": "9024124977", 
        "name": "Keith Gallant",
        "id" : id
    };

    var element = angular.element($('#ChatPlus'));
    var controller = element.controller();
    var scopeVar = element.scope();

    //as this happends outside of angular you probably have to notify angular 
    //of the change by wrapping your function call in $apply
    scopeVar.$apply(function(){
        scopeVar.oncalldlg(data);
    });

    //angular.element(document.getElementById('ChatPlus')).scope().openModal('','','views/chat/addchannel.html', {callId: id});
}
    
function answerCallBase() {
    //alert("answerCallBase");
    currentCallBase.answer({
    //useVideo: true,
    useStereo: true
  });
}; // answerCallBase

function onWSCloseBase(verto, success) {
  console.log('onWSCloseBase', success);
}; // onWSCloseBase

// Receives call state messages from FreeSWITCH.
function onDialogStateBase(d) {
  console.log("onDialogStateBase, d = ");
  console.log(d);
  
  if(!currentCallBase) {
    currentCallBase = d;
  }

  switch (d.state.name) {
    case "trying":
      break;
    case "answering":
      console.log("answering");
      break;
    case "active":
      console.log("active");
      currentCallBase = d;
      onCallDialog();
      break;
    case "hangup":
      console.log("Call ended with cause: " + d.cause);
      $('#oncall-popup').hide();
      break;
    case "ringing":
        console.log('Someone is calling you, answering');
        answerDialog();
        //answerCallBase();
        break;
    case "offering":
        console.log('offering');
        break;
    case "destroy":
      // Some kind of client side cleanup...
      currentCallBase = null;
      break;
  }
}; // onDialogStateBase

/*
 * Setting up and subscribing to the live array.
 */
var vertoConfBase, liveArrayBase;
var initLiveArray = function(verto, dialog, data) {
    // Set up addtional configuration specific to the call.
    vertoConfBase = new $.verto.conf(verto, {
      dialog: dialog,
      hasVid: true,
      laData: data.pvtData,
      // For subscribing to published chat messages.
      chatCallback: function(verto, eventObj) {
        var from = eventObj.data.fromDisplay || eventObj.data.from || 'Unknown';
        var message = eventObj.data.message || '';
      },
    }); // initLiveArray

    var configBase = {
      subParams: {
        callID: dialog ? dialog.callID : null
      },
    }; // configBase

    // Set up the live array, using the live array data received from FreeSWITCH.
    liveArrayBase = new $.verto.liveArrayBase(vertoObj, data.pvtData.laChannel, data.pvtData.laName, configBase);
    // Subscribe to live array changes.
    liveArrayBase.onChange = function(liveArrayObj, args) {
      console.log("Call UUID is: " + args.key);
      console.log("Call data is: ", args.data);
      try {
        switch (args.action) {

          // Initial list of existing conference users.
          case "bootObj":
            break;

          // New user joined conference.
          case "add":
            break;

          // User left conference.
          case "del":
            break;

          // Existing user's state changed (mute/unmute, talking, floor, etc)
          case "modify":
            break;

        }
      } catch (err) {
        console.error("ERROR: " + err);
      }
    }; // liveArrayBase.onChange

    // Called if the live array throws an error.
    liveArrayBase.onErr = function (obj, args) {
      console.error("Error: ", obj, args);
    }; // liveArrayBase.onErr
} // initLiveArray  

