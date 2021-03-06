/* Wick - (c) 2016 Zach Rispoli, Luca Damasco, and Josh Rispoli */

var FabricProjectRenderer = function (wickEditor, fabricInterface) {

	var self = this;
	var canvas = fabricInterface.canvas;

    var gifRenderer;

    self.update = function () {};

    self.getCanvasAsImage = function (callback, args) {

        var selectedObjs = [];
        canvas.forEachObject(function(fabricObj) {
            if(args && args.objs && args.objs.indexOf(fabricObj.wickObjectRef) === -1) return;

            if(fabricObj.wickObjectRef && !fabricObj.isWickGUIElement && fabricObj.wickObjectRef.isOnActiveLayer(wickEditor.project.getCurrentLayer())) {
                //fabricObj.set('active', true);
                selectedObjs.push(fabricObj);
            }
        });

        if(selectedObjs.length < 1) {
            //canvas._activeObject = selectedObjs[0];
            //console.log("no selectedObjs")
            callback(null);
        } else {
            var group = new fabric.Group([], {
                originX: 'left',
                originY: 'top'
            });
            //for(var i = selectedObjs.length-1; i >= 0; i--) {
            for(var i = 0; i < selectedObjs.length; i++) {
                console.log(selectedObjs[i])
                //group.canvas = canvas // WHAT ??????????????? WHY
                var clone = fabric.util.object.clone(selectedObjs[i]);
                group.addWithUpdate(clone);
            }

            //group.left = Math.round(group.left)
            //group.top = Math.round(group.top)
            group.setCoords();

            var cloneLeft = (group.left)
            var cloneTop = (group.top)

            //var object = fabric.util.object.clone(group);
            var oldZoom = canvas.getZoom();
            //canvas.setZoom(1)
            //canvas.renderAll();
            group.setCoords();

            group.cloneAsImage(function (img) {
                //canvas.setZoom(oldZoom)
                canvas.renderAll();
                group.setCoords();

                group.forEachObject(function(o){ group.removeWithUpdate(o) });
                canvas.remove(group);
                canvas.renderAll();

                callback({
                    x:cloneLeft,
                    y:cloneTop,
                    src:img.getElement().src,
                });
            })

        }
        
    }

    self.getCanvasThumbnail = function (callback) {
        var objs = [];
        canvas.forEachObject(function(fabricObj) {
            if(fabricObj.wickObjectRef && !fabricObj.isWickGUIElement && fabricObj.wickObjectRef.isOnActiveLayer(wickEditor.project.getCurrentLayer())) {
                //fabricObj.set('active', true);
                objs.push(fabricObj);
            }
        });

        var thumbnailResizeFactor = 5.0;

        var thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = wickEditor.project.width/thumbnailResizeFactor;
        thumbCanvas.height = wickEditor.project.height/thumbnailResizeFactor;

        var thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.clearRect(0,0,thumbCanvas.width,thumbCanvas.height);
        if(!wickEditor.project.transparent) {
            thumbCtx.rect(0, 0, thumbCanvas.width,thumbCanvas.height);
            thumbCtx.fillStyle = wickEditor.project.backgroundColor;
            thumbCtx.fill();
        }
        thumbCtx.scale(1/thumbnailResizeFactor, 1/thumbnailResizeFactor);

        objs.forEach(function (fabricObj) {
            if(fabricObj._element) {
                fabricObj.thumbnailGenImg = fabricObj._element
            } else if(fabricObj._cacheCanvas && !fabricObj.thumbnailGenImg) {
                fabricObj.thumbnailGenImg = new Image();
                fabricObj.thumbnailGenImg.src = fabricObj._cacheCanvas.toDataURL()
            }

            if(!fabricObj.thumbnailGenImg) return;

            thumbCtx.drawImage(
                fabricObj.thumbnailGenImg, 
                fabricObj.left - fabricObj.width/2, 
                fabricObj.top - fabricObj.height/2, 
                fabricObj.width, 
                fabricObj.height
            );
        });

        callback(thumbCanvas.toDataURL('image/jpeg', 1.0));
    }

    self.renderProjectAsGIF = function (callback) {
        gifCanvas = document.createElement('div')
        wickEditor.project.fitScreen = false;

        if(!gifRenderer) {
            gifRenderer = new WickPixiRenderer(wickEditor.project, gifCanvas, 1.0);
            gifRenderer.setup();
        }

        var gifFrameDataURLs = [];

        wickEditor.project.currentObject = wickEditor.project.rootObject;
        var len = wickEditor.project.rootObject.getTotalTimelineLength();
        gifRenderer.refresh(wickEditor.project.rootObject);
        for (var i = 0; i < len; i++) {
            wickEditor.project.rootObject.playheadPosition = i;
            gifRenderer.render(wickEditor.project.getCurrentObject().getAllActiveChildObjects());
            gifFrameDataURLs.push(gifRenderer.rendererCanvas.toDataURL());
        }
        //gifRenderer.cleanup();

        var gif;
        if(wickEditor.project.transparent) {
            gif = new GIF({
                workers: 2,
                quality: 10,
                workerScript: 'lib/gif.worker.js',
                transparent: true,
                width: wickEditor.project.width,
                height: wickEditor.project.height,
            });
        } else {
            gif = new GIF({
                workers: 2,
                quality: 10,
                workerScript: 'lib/gif.worker.js',
                background: '#fff',
                width: wickEditor.project.width,
                height: wickEditor.project.height,
            });
        }

        var gifFrameImages = [];

        var proceed;

        gifFrameDataURLs.forEach(function (gifFrameDataURL) {
            var gifFrameImage = new Image();
            gifFrameImage.onload = function () {
                gifFrameImages.push(gifFrameImage);
                if(gifFrameImages.length === gifFrameDataURLs.length) {
                    proceed();
                }
            }
            gifFrameImage.src = gifFrameDataURL;
        });

        proceed = function () {
            gifFrameImages.forEach(function (gifFrameImage) {
                gif.addFrame(gifFrameImage, {delay: 1000/wickEditor.project.framerate});
            });

            gif.render();

            gif.on('finished', function(blob) {
                callback(blob);
            });     
        }
    }

    self.renderProjectAsWebM = function (callback) {
        var video = new Whammy.Video(15);

        self.getProjectAsCanvasSequence(function (contexts) {

            contexts.forEach(function (context) {
                video.add(context);
            });

            video.compile(false, function(output) {

                var url = webkitURL.createObjectURL(output);

                //document.getElementById('download').href = url;

                window.open(url);

            });

        }, {asContexts:true});
    }

    self.getProjectAsCanvasSequence = function (callback, args) {
        var canvases = [];
        var contexts = [];

        self.getProjectAsImageSequence(function (imgDatas) {

            var proceed = function () {
                images.forEach(function (image) {
                    var gifFrameCanvas = document.createElement('canvas');
                    //gifFrameCanvas.style.position = 'absolute'
                    //gifFrameCanvas.style.left = '0px'
                    //gifFrameCanvas.style.top = '0px'
                    //document.getElementById('editor').appendChild(gifFrameCanvas)
                    gifFrameCanvas.width = wickEditor.project.width;
                    gifFrameCanvas.height = wickEditor.project.height;

                    var gifFrameCtx = gifFrameCanvas.getContext('2d');
                    gifFrameCtx.clearRect(0,0,gifFrameCanvas.width,gifFrameCanvas.height);
                    if(!wickEditor.project.transparent) {
                        gifFrameCtx.rect(0, 0, gifFrameCanvas.width,gifFrameCanvas.height);
                        gifFrameCtx.fillStyle = wickEditor.project.backgroundColor;
                        gifFrameCtx.fill();
                    }
                    gifFrameCtx.drawImage(image.img, image.x, image.y);

                    canvases.push(gifFrameCanvas);
                    contexts.push(gifFrameCtx);
                });

                if(args && args.asContexts) 
                    callback(canvases);
                else
                    callback(contexts);
            }

            var images = [];
            imgDatas.forEach(function (imgData) {
                var image = new Image();
                image.onload = function () { 
                    images.push({img:image, x:imgData.x, y:imgData.y});
                    if(images.length === imgDatas.length) proceed();
                }
                image.src = imgData.src;
            });
        });
    }

    self.getProjectAsImageSequence = function (callback) {

        var imageSequence = [];
        var root = wickEditor.project.rootObject;

        var proceed = function () {
            wickEditor.syncInterfaces();

            setTimeout(function () {
                self.getCanvasAsImage(function (image) {
                    imageSequence.push(image);
                    root.playheadPosition++; 

                    if(wickEditor.project.getCurrentFrame()) {
                        proceed();
                    } else {
                        callback(imageSequence);
                        wickEditor.syncInterfaces();
                    }
                });
            }, 300); console.error("this is very bad here");
        }

        root.playheadPosition = 0;
        proceed();

    }

}




