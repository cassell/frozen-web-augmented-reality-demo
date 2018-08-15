
var THREEx = THREEx || {};
var puppets = puppets || {};
var backupVideo = backupVideo || {};

$(document).ready(function(){

    var hasGetUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) ? true : false
    var hasWebGL = ( function () { try { var canvas = document.createElement( 'canvas' ); return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) ); } catch ( e ) { return false; } } )()

    if( hasWebGL === false ){
        alert("Your browser doesn't support navigator.getUserMedia()");
        return;
    } else if( MediaDevices.enumerateDevices === false ){
        alert("Your browser doesn't support MediaDevices.enumerateDevices()");
        return;
    } else if( hasGetUserMedia === false ){
        alert("Your browser doesn't support navigator.getUserMedia()");
        return;
    }

    // init renderer
    var renderer	= new THREE.WebGLRenderer({
        antialias	: true,
        alpha		: true,
    });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    // array of functions for the rendering loop
    var onRenderFunctions = [];

    // init scene and camera
    var scene = new THREE.Scene();
    var camera	= new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 2;

    var windowRatio = window.innerWidth / window.innerHeight;
    console.log(windowRatio);

    //setup puppets
    var puppetMarkers = [];

    for(var puppetId in puppets) {
        if (puppets.hasOwnProperty(puppetId)) {

            var puppetMarker = {
                'id' : puppetId,
                'audioElement' : $('<audio id="audio-marker-' + puppetId + '"><source src="' + puppets[puppetId].audio + '" type="audio/mp4" /></audio>'),
                'markerObject3D' : new THREE.Object3D(),
                'playing': false
            };

            $(document.body).append(puppetMarker.audioElement);

            scene.add(puppetMarker.markerObject3D);

            var material = new THREE.SpriteMaterial({
                map: THREE.ImageUtils.loadTexture( puppets[puppetId].image )
            });
            var object3d = new THREE.Sprite(material);
            object3d.scale.set( 1.5, 1.5, 1 );
            object3d.geometry = new THREE.BoxGeometry(1,1,1);
            puppetMarker.markerObject3D.add(object3d)
            puppetMarkers.push(puppetMarker);
            characterNotVisible(puppetMarker);
        }
    }

    function pauseAllAudioTags()
    {
        $('audio').each(function(key,element){
            element.pause();
            element.currentTime = 0;
            for (var i = 0; i < puppetMarkers.length; i++) {
                puppetMarkers[i].playing = false;
            }
        });
    }

    function audioLoop()
    {
        var playingVisibleCharacter = false;

        // reset playing to false when it finishes playing
        for (var i = 0; i < puppetMarkers.length; i++) {
            var audioElement = $(puppetMarkers[i].audioElement).get(0);
            if(puppetMarkers[i].playing && audioElement.ended){
                puppetMarkers[i].playing = false;
                console.log("finished playing");
            }
        }

        // mark true if still playing a visible character
        for (var i = 0; i < puppetMarkers.length; i++) {
            if(puppetMarkers[i].playing == true && isCharacterVisible(puppetMarkers[i])) {
                playingVisibleCharacter = true;
                console.log("playing visible character");
            }
        }

        if(!playingVisibleCharacter) {

            var visibleMarkers = [];

            for (var i = 0; i < puppetMarkers.length; i++) {
                if(isCharacterVisible(puppetMarkers[i])) {
                    visibleMarkers.push(i);
                }
            }

            if(visibleMarkers.length > 0) {

                // pause all audio
                pauseAllAudioTags();

                var puppetToSing = puppetMarkers[visibleMarkers[Math.floor(Math.random() * visibleMarkers.length)]];

                var audioTag = $(puppetToSing.audioElement).get(0);
                audioTag.pause();
                audioTag.currentTime = 0;
                audioTag.play();
                puppetToSing.playing = true;
            }
        }

        setTimeout(function(){
            console.log("loop");
            audioLoop();
        },1000)

    }

    audioLoop();

    function isCharacterVisible(puppetMarker) {
        return puppetMarker.markerObject3D.visible;
    }

    function characterNotVisible(puppetMarker) {
        puppetMarker.markerObject3D.visible = false;
    }

    function characterVisible(puppetMarker) {
        puppetMarker.markerObject3D.visible = true;
    }

    // handle window resize
    window.addEventListener('resize', function(){
        renderer.setSize( window.innerWidth, window.innerHeight )
        camera.aspect	= window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
    }, false);

    // render the scene
    onRenderFunctions.push(function(){
            renderer.render( scene, camera );
    });

    // run the rendering loop
    var previousTime = performance.now()
    requestAnimationFrame(function animate(now){

        requestAnimationFrame( animate );

        onRenderFunctions.forEach(function(onRenderFct){
            onRenderFct(now, now - previousTime)
        });

        previousTime = now;
    });

    // init the marker recognition
    var jsArucoMarker	= new THREEx.JsArucoMarker();

    if (webcam) {
        var videoGrabbing = new THREEx.WebcamGrabbing()
        jsArucoMarker.videoScaleDown = 2
    } else {
        var videoGrabbing = new function(){

            var domElement	= document.createElement('video')
            domElement.setAttribute('autoplay', true)
            domElement.setAttribute('loop', true)
            domElement.setAttribute('muted', true)
            this.domElement = domElement

            domElement.src = backupVideo;

            domElement.style.zIndex = -1;
            domElement.style.position = 'absolute'

            domElement.style.top = '0px'
            domElement.style.left = '0px'
            domElement.style.width = '100%'
            domElement.style.height = '100%'
        };
        jsArucoMarker.videoScaleDown = 2;

    }

    // attach the videoGrabbing.domElement to the body
    document.body.appendChild(videoGrabbing.domElement)

    // process the image source with the marker recognition
    onRenderFunctions.push(function(){

        var domElement	= videoGrabbing.domElement
        var markers	= jsArucoMarker.detectMarkers(domElement);

        for (var i = 0; i < puppetMarkers.length; i++) {
            characterNotVisible(puppetMarkers[i]);
        }

        // see if this.markerId has been found
        markers.forEach(function(marker){
            for (var i = 0; i < puppetMarkers.length; i++) {
                if( marker.id == puppetMarkers[i].id ) {
                    jsArucoMarker.markerToObject3D(marker, puppetMarkers[i].markerObject3D);
                    characterVisible(puppetMarkers[i]);
                }
            }
        })
    })

});
