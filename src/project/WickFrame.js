/* Wick - (c) 2016 Zach Rispoli, Luca Damasco, and Josh Rispoli */

var WickFrame = function () {
    // Identifier so we can do e.g. movePlayheadTo("menu") 
    this.identifier = null;

    // Store all objects in frame. 
    this.wickObjects = [];

    // All path data of the frame (Stored as SVG)
    this.pathData = null;

    // Where this frame exists on the timeline
    this.playheadPosition = null;

    // Frame length for long frames
    this.length = 1;

    // Should the frame reset on being entered?
    this.alwaysSaveState = false;

    // Generate unique id
    this.uuid = random.uuid4();

    // The layer that this frame belongs to
    this.parentLayer = null;

    // Set all scripts to defaults
    this.wickScript = "this.onLoad = function () {\n\t\n}\n\nthis.onUpdate = function () {\n\t\n}\n";
};
    
WickFrame.prototype.update = function () {
    var self = this;

    /*if(this.uuid.substring(0,2) === '50') {
        console.log(this._wasActiveLastTick)
        console.log(this._active)
    }*/

    //console.log("Frame update() " + this.uuid.substring(0,2))

    // Inactive -> Inactive
    // Do nothing, frame is still inactive
    if (!this._wasActiveLastTick && !this._active) {

    }
    // Inactive -> Active
    // Frame just became active! It's fresh!
    else if (!this._wasActiveLastTick && this._active) {
        //console.log("Frame onLoad " + this.uuid.substring(0,2))
        (wickEditor || wickPlayer).project.runScript(this, 'onLoad');
    }
    // Active -> Active
    // Frame is active!
    else if (this._wasActiveLastTick && this._active) {
        //console.log("Frame onUpdate " + this.uuid.substring(0,2))
        (wickEditor || wickPlayer).project.runScript(this, 'onUpdate');
    }    
    // Active -> Inactive
    // Frame just stopped being active. Clean up!
    else if (this._wasActiveLastTick && !this._active) {
        
    }

    this.wickObjects.forEach(function (wickObject) {
        wickObject.update();
    });
}


WickFrame.prototype.isActive = function () {
    var parent = this.parentLayer.parentWickObject;

    //if(parent.isRoot) console.log(parent.playheadPosition)

    /*console.log("---")
    console.log("ph "+(parent.playheadPosition))
    console.log("s  "+(this.playheadPosition))
    console.log("e  "+(this.playheadPosition+this.length))
    console.log("---")*/

    return parent.playheadPosition >= this.playheadPosition
        && parent.playheadPosition < this.playheadPosition+this.length
        && parent.isActive();
}

// Extend our frame to encompass more frames. 
WickFrame.prototype.extend = function(length) {
    this.length += length; 
}

// Reduce the number of frames this WickFrame Occupies. 
WickFrame.prototype.shrink = function(length) {
    // Never "shrink" by a negative amount. 
    if (length <= 0) {
        return;
    }

    originalLength = this.length; 
    this.length -= length; 

    // determine and return the actual change in frames. 
    if (this.length <= 0) {
        this.length = 1;
        return originalLength - 1;
    } else {
        return length; 
    }
}

WickFrame.prototype.copy = function () {

    var copiedFrame = new WickFrame();

    copiedFrame.identifier = this.identifier;
    copiedFrame.playheadPosition = this.playheadPosition;
    copiedFrame.length = this.length;

    this.wickObjects.forEach(function (wickObject) {
        copiedFrame.wickObjects.push(wickObject.copy());
    })

    return copiedFrame;

}

WickFrame.prototype.remove = function () {
    this.parentLayer.removeFrame(this);
}

WickFrame.prototype.touchesFrame = function (frame) {
    var A = this;
    var B = frame;

    if(A._beingMoved || B._beingMoved) return false;

    var AStart = A.playheadPosition;
    var AEnd = A.playheadPosition + A.length;

    var BStart = B.playheadPosition;
    var BEnd = B.playheadPosition + B.length;

    return !(BStart >= AEnd || BEnd <= AStart);
}

WickFrame.prototype.encodeStrings = function () {

    if(this.wickScripts) {
        for (var key in this.wickScripts) {
            this.wickScripts[key] = WickProject.Compressor.encodeString(this.wickScripts[key]);
        }
    }
    if(this.wickScript) {
        this.wickScript = WickProject.Compressor.encodeString(this.wickScript);
    }

    if(this.pathData) this.pathData = WickProject.Compressor.encodeString(this.pathData);

}

WickFrame.prototype.decodeStrings = function () {

    if(this.wickScripts) {
        for (var key in this.wickScripts) {
            this.wickScripts[key] = WickProject.Compressor.decodeString(this.wickScripts[key]);
        }
    }
    if(this.wickScript) {
        this.wickScript = WickProject.Compressor.decodeString(this.wickScript);
    }

    if(this.pathData) this.pathData = WickProject.Compressor.decodeString(this.pathData);

}

WickFrame.prototype.getFrameEnd = function () {
    return this.playheadPosition + this.length; 
}

WickFrame.prototype.getObjectByUUID = function () {

    var foundWickObject;

    this.wickObjects.forEach(function (wickObject) {
        if(wickObject.uuid === uuid) {
            foundWickObject = wickObject;
        }
    });

    return foundWickObject;

}

WickFrame.prototype.getAsJSON = function () {
    this.wickObjects.forEach(function (wickObject) {
        wickObject.encodeStrings();
    });

    var dontJSONVars = ["cachedImageData","fabricObjectReference","parentObject","causedAnException","uuid"];

    var frameJSON = JSON.stringify(this, function(key, value) {
        if (dontJSONVars.indexOf(key) !== -1) {
            return undefined;
        } else {
            return value;
        }
    });

    this.wickObjects.forEach(function (wickObject) {
        wickObject.decodeStrings();
    });

    return frameJSON;
}

WickFrame.fromJSON = function (frameJSON) {
    var frame = JSON.parse(frameJSON);
    frame.__proto__ = WickFrame.prototype;
    frame.wickObjects.forEach(function (wickObject) {
        WickObject.addPrototypes(wickObject);
        wickObject.generateParentObjectReferences();
        wickObject.decodeStrings();
        wickObject.uuid = random.uuid4();
    })
    return frame;
}


