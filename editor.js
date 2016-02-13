$(document).ready(function() {

    // Global editor vars
    var showUploadAlert = false;
    var currentWickID = 0;
    var showPageLeaveWarning = false;

    var frames = [[]];
    var currentFrame = 1;
    document.getElementById("frameSelector").value = currentFrame;

    // Setup canvas
    var canvas = new fabric.Canvas('canvas');
    canvas.selectionColor = 'rgba(0,0,5,0.1)';
    canvas.selectionBorderColor = 'grey';
    canvas.selectionLineWidth = 2;

    var context = canvas.getContext('2d');

/*****************************
    Temporary GUI events
*****************************/

    $("#exportButton").on("click", function(e){
        exportProject();
    });
    $("#importButton").on("click", function(e){
        alert("Not yet implemented!");
    });

    $("#prevFrameButton").on("click", function(e){
        prevFrame();
    });
    $("#nextFrameButton").on("click", function(e){
        nextFrame();
    });

    $("#gotoFrameButton").on("click", function(e){
        var toFrame = parseInt($('textarea#frameSelector').val());
        goToFrame(toFrame);
    });
    $("#cloneFrameButton").on("click", function(e){
        cloneCurrentFrame();
    });

/*****************************
    Mouse events
*****************************/

    // Save mouse coordinates within the canvas.
    // NOTE: This only works properly when the window is in focus.
    canvas.on('mouse:move', function(event) {
        var pointer = canvas.getPointer(event.e);
        canvas.px = pointer.x;
        canvas.py = pointer.y;
    });

    document.getElementById("canvasContainer").addEventListener("mousedown", function(event) {
        closeRightClickMenu();
    }, false);

/**********************************
    Right-click menu
**********************************/

    function openRightClickMenu() {
        // Make menu visible
        $("#rightClickMenu").css('visibility', 'visible');
        // Attach it to the mouse
        $("#rightClickMenu").css('top', canvas.py+'px');
        $("#rightClickMenu").css('left', canvas.px+'px');

        // Don't show object manipulation options if nothing is selected
        if(canvas.getActiveObject() != undefined) {
            $("#objectManipButtons").css('display', 'inline');
        } else {
            $("#objectManipButtons").css('display', 'none');
        }
    }

    function closeRightClickMenu() {
        // Hide menu
        $("#rightClickMenu").css('visibility', 'hidden');
        $("#rightClickMenu").css('top', '0px');
        $("#rightClickMenu").css('left', '0px');
    }
    
    // Add right-click menu events
    if (document.addEventListener) {
        document.addEventListener('contextmenu', function(e) {
            openRightClickMenu();
            e.preventDefault();
        }, false);
    } else {
        document.attachEvent('oncontextmenu', function() {
            openRightClickMenu();
            window.event.returnValue = false;
        });
    }

    // Menu buttons
    $("#bringToFrontButton").on("click", function(e){
        canvas.bringToFront(canvas.getActiveObject());
        closeRightClickMenu();
    });
    $("#sendToBackButton").on("click", function(e){
        canvas.sendToBack(canvas.getActiveObject());
        closeRightClickMenu();
    });
    $("#addScriptButton").on("click", function(e){
        canvas.getActiveObject().wickData.clickable = true;
        canvas.getActiveObject().wickData.toFrame = prompt("Enter a frame:");
        closeRightClickMenu();
    });
    $("#testActionButton").on("click", function(e){
        goToFrame(canvas.getActiveObject().wickData.toFrame);
        closeRightClickMenu();
    });
    $("#deleteButton").on("click", function(e){
        canvas.getActiveObject().remove();
        closeRightClickMenu();
    });

    $("#clearFrameButton").on("click", function(e){
        canvas.clear();
        closeRightClickMenu();
    });

/*****************************
    Key Events
*****************************/

    var keys = [];
    var action = false;

    document.body.addEventListener("keydown", function (e) {
        keys[e.keyCode] = true;
        action = true;
        checkKeys();
    });

    document.body.addEventListener("keyup", function (e) {
        keys[e.keyCode] = false;
        action = false;
    });

    function checkKeys() {
        if (keys[16]) { // Shift
            if (keys[39]) { // Right arrow
                nextFrame();
            } else if (keys[37]) { // Left arrow
                prevFrame();
            } else if (keys[190]) { // Period or > key.
                cloneCurrentFrame();
            }
        }
    }

/*****************************
    Drag and drop events
*****************************/

    $("#canvasContainer").on('dragover', function(e) {
        showUploadAlert = true;
        return false;
    });
    $("#canvasContainer").on('dragleave', function(e) {
        showUploadAlert = false;
        return false;
    });
    $("#canvasContainer").on('drop', function(e) {
        // prevent browser from opening the file
        e.stopPropagation();
        e.preventDefault();

        // retrieve uploaded files data
        // TODO: multiple files at once
        var files = e.originalEvent.dataTransfer.files;
        var file = files[0];

        // read file as data URL
        var reader = new FileReader();
        reader.onload = (function(theFile) {
            return function(e) {
                fabric.Image.fromURL(e.target.result, function(oImg) {
                    // add new object to fabric canvas
                    oImg.left = (canvas.width/2) - (oImg.width/2);
                    oImg.top = (canvas.height/2) - (oImg.height/2);

                    oImg.wickData = {}
                    oImg.wickData.clickable = false;
                    oImg.wickData.name = e.target.filename;

                    canvas.add(oImg);
                });
            };
        })(file);
        reader.readAsDataURL(file);

        showUploadAlert = false;

        return false;
    });

/*****************************
    Leave page warning
*****************************/

    if(showPageLeaveWarning) {
        window.addEventListener("beforeunload", function (e) {
            var confirmationMessage = 'Warning: All unsaved changes will be lost!';

            (e || window.event).returnValue = confirmationMessage; //Gecko + IE
            return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
        });
    }

/*****************************
    Timeline
*****************************/

    // Store current canvas into frame f
    function storeCanvasIntoFrame(f) {
        frames[f] = [];
			canvas.forEachObject(function(obj){
				// Deepcopy and add to frame.
				// TODO : Do not copy data. Only store necessary manipulations.
				frames[f].unshift(jQuery.extend(true, {}, obj));
			});
		}

    // Save serialized frames
    function loadFrame(f) {
        canvas.clear();
        if (frames[f] != undefined) {
            for(var i = 0; i < frames[f].length; i++) {
                canvas.add(frames[f][i]);
            }
        }
    }

    // Goes to a specified frame.
    function goToFrame(toFrame) {
        storeCanvasIntoFrame(currentFrame);

        currentFrame = toFrame;
        loadFrame(currentFrame);

        document.getElementById("frameSelector").value = currentFrame;
    }

    // Go to the next frame.
    function nextFrame() {
        goToFrame(currentFrame + 1);
    }

    // Go to the previous frame.
    function prevFrame() {
        var toFrame = currentFrame - 1;
        if (toFrame > 0) {
            goToFrame(toFrame);
        }
    }

    // Go to the next frame and copy the last frame into it.
    function cloneCurrentFrame() {
        storeCanvasIntoFrame(currentFrame + 1);
        goToFrame(currentFrame + 1);
    }

/*****************************
    Draw loop
*****************************/

    // update canvas size on window resize
    window.addEventListener('resize', resizeCanvas, false);
    function resizeCanvas() {
        canvas.setWidth( window.innerWidth );
        canvas.setHeight( window.innerHeight );

        // center timeline
        var GUIWidth = parseInt($("#timelineGUI").css("width"))/2;
        $("#timelineGUI").css('left', canvas.width/2-GUIWidth+'px');

        canvas.calcOffset();
    }
    resizeCanvas();

    // start draw/update loop
    var FPS = 30;
    setInterval(function() {
        draw();
    }, 1000/FPS);

    function draw() {
        if(showUploadAlert) {
            context.fillStyle = '#000';
            context.textAlign = 'center';
            context.font = "30px Arial";
            context.fillText("Drop image to add to scene...",
                            canvas.width/2,canvas.height/2);
        }
    }

/*****************************
    Import/Export
*****************************/

    function exportProject() {
        wickObjectFrames = [];
        for(var fi = 0; fi < frames.length; fi++) {
            var frame = frames[fi];
            wickObjectFrames[fi] = [];
            for(var i = 0; i < frame.length; i++) {
                var obj = frame[i];
                var srcObj = JSON.parse(JSON.stringify(frame[i]));//hacky way to get src
                wickObj = fabricObjectToWickObject(obj);
                wickObj.src = srcObj.src;
                wickObjectFrames[fi].push(wickObj);
            }
        }
        var outString = "data:text/csv,";
        outString += JSON.stringify(wickObjectFrames);
        window.open(outString);
    }
});