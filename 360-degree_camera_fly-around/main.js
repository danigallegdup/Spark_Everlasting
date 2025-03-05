// main.js - Well Documented Version with Starfield, Jellyfish, and Astronaut Animation

// ========================
// Global Variables & Setup
// ========================

var canvas;         // The HTML canvas element where rendering occurs.
var gl;             // The WebGL rendering context.
var program;        // The shader program used for rendering.

// --- Projection Parameters (Orthographic Projection) ---
// Define the viewing volume for our scene.
var near   = 1;     // Near clipping plane distance.
var far    = 100;   // Far clipping plane distance.
var left   = -6.0;  // Left boundary of the viewing volume.
var right  = 6.0;   // Right boundary.
var ytop   = 6.0;   // Top boundary.
var bottom = -6.0;  // Bottom boundary.

// --- Lighting Parameters ---
var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition  = vec4(0.0, 0.0, 100.0, 1.0);  // Main light position.
var lightAmbient   = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse   = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular  = vec4(1.0, 1.0, 1.0, 1.0);

// --- Material Properties ---
var materialAmbient   = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse   = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular  = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;

// Placeholders for computed lighting colors.
var ambientColor, diffuseColor, specularColor;
var ambientProduct, diffuseProduct, specularProduct;

// --- Transformation Matrices and Uniform Locations ---
var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;

// --- Camera Parameters ---
var eye; // Will be set during rendering.
var at = vec3(0.0, 1.0, 0.0);  // Focus point remains centered
var up = vec3(0.0, 1.0, 0.0);

// --- Object Transformation States ---
var sphereRotation   = [0, 0, 0];
var spherePosition   = [-4, 0, 0];
var cubeRotation     = [0, 0, 0];
var cubePosition     = [-1, 0, 0];
var cylinderRotation = [0, 0, 0];
var cylinderPosition = [1.1, 0, 0];
var coneRotation     = [0, 0, 0];
var conePosition     = [3, 0, 0];

// --- Animation Timing & Matrix Stack ---
var MS = [];         // Matrix stack for hierarchical modeling.
var TIME = 0.0;      // Real-time accumulator.
var dt = 0.0;        // Delta time between frames.
var prevTime = 0.0;  // Timestamp of the previous frame.
var resetTimerFlag = true;
var animFlag = false;  // Animation toggle flag.
var controller;        // (Optional)

// ======================================================
// Starfield Code: Star Class and Starfield Functions
// ======================================================

class Star {
    constructor() {
        this.reset();
    }
    
    // Reset the star's position to a random position across the canvas.
    reset() {
        // Random x between left (-6) and right (6)
        this.x = -6 + Math.random() * 12;
        // Random y between bottom (-6) and top (6)
        this.y = -6 + Math.random() * 12;
        // Set a uniform velocity (world units per second) with slight variation.
        this.velocity = 0.5 + Math.random() * 0.2;
        // Set a random scale for the star between 0.05 and 0.15.
        this.scale = 0.02 + Math.random() * (0.05 - 0.02);
    }
    
    update(dt) {
        // Move diagonally upward and right.
        this.x += this.velocity * dt;
        this.y += this.velocity * dt;
        // If the star moves off the top or right edge (world coordinate 10), reset it.
        if (this.x > 10 || this.y > 10) {
            if (Math.random() < 0.5) {
                this.x = -6;
                this.y = -6 + Math.random() * 12;
            } else {
                this.x = -6 + Math.random() * 12;
                this.y = -6;
            }
        }
    }
    
    draw() {
        gPush();
            // Set z to -7 so that stars remain in the background.
            gTranslate(this.x, this.y, -10);
            setColor(vec4(0.9, 0.85, 0.75, 1.0));
            gScale(this.scale, this.scale, this.scale);
            // Draw as a sphere for a circular appearance.
            drawSphere();
        gPop();
    }
}

const numStars = 50;
const stars = [];
for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
}

function updateStars(dt) {
    stars.forEach(star => star.update(dt));
}

function drawStars() {
    gPush();
    gTranslate(eye[0], eye[1], eye[2]);  // Move stars with the camera
    stars.forEach(star => star.draw());
    gPop();
}






// ======================================================
// Function: setColor(c)
// (Re-declared here for consistency.)
// ======================================================
function setColor(c) {
    ambientProduct  = mult(lightAmbient, c);
    diffuseProduct  = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
}

// ======================================================
// Initialization Function: window.onload = init()
// ======================================================
window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 0.9, 0.95, 1.0); // Soft pastel pink

    gl.enable(gl.DEPTH_TEST);
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    setColor(materialDiffuse);
    Cube.init(program);
    Cylinder.init(20, program);
    Cone.init(20, program);
    Sphere.init(36, program);
    modelViewMatrixLoc  = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc     = gl.getUniformLocation(program, "normalMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
    document.getElementById("animToggleButton").onclick = function() {
        if (animFlag) {
            animFlag = false;
        } else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
    };
    render(0);
};

// ======================================================
// Function: setMV()
// ======================================================
function setMV() {
    modelViewMatrix = mult(viewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

// ======================================================
// Function: setAllMatrices()
// ======================================================
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    setMV();
}

// ======================================================
// Shape Drawing Functions
// ======================================================
function drawCube() {
    setMV();
    Cube.draw();
}

function drawSphere() {
    setMV();
    Sphere.draw();
}

function drawCylinder() {
    setMV();
    Cylinder.draw();
}

function drawCone() {
    setMV();
    Cone.draw();
}

// ======================================================
// Transformation Helper Functions
// ======================================================
function gTranslate(x, y, z) {
    modelMatrix = mult(modelMatrix, translate([x, y, z]));
}

function gRotate(theta, x, y, z) {
    modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}

function gScale(sx, sy, sz) {
    modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

// ======================================================
// Matrix Stack Operations
// ======================================================
function gPush() {
    MS.push(modelMatrix);
}

function gPop() {
    modelMatrix = MS.pop();
}

// ============================
// Ballerina Class
// ============================
class Ballerina {
    constructor(position, scale = 1.0) {
        this.position = position; // [x, y, z]
        this.basePosition = [...position]; // Store original position for oscillation
        this.scale = scale;
        this.time = 0.0; // Time accumulator for animations
        this.rotationAngle = -35; // Rotation angle (in degrees) to face diagonally left
        this.rotationSpeed = 0;  // Prevents accidental spinning unless set explicitly

    }

    drawHead() { 
        /**Brunette with a low ballet bun and a tiara*/

        /** Brunette with a low ballet bun and a tiara (Head) */
        gPush();
        setColor(vec4(1.0, 0.8, 0.6, 1.0)); // Skin color
        gTranslate(0, 1.3 * this.scale, 0.03);
        gScale(0.35 * this.scale, 0.36 * this.scale, 0.35 * this.scale);
        drawSphere();
        gPop();

       

        /** Neck transitioning into shoulders */
        gPush();
        setColor(vec4(1.0, 0.8, 0.6, 1.0)); // Skin color
        gTranslate(0, 0.8 * this.scale, 0); // Position just below the head
        gScale(0.5 * this.scale, 0.5 * this.scale, 0.3 * this.scale); // Adjust for visibility
        gRotate(-90, 1, 0, 0); // Align vertically
        drawCone(); // Draws the neck (slightly wider at the bottom)
        gPop();

        // back of head
        gPush();
        setColor(vec4(0.4, 0.2, 0.1, 1.0)); // Dark brown for hair
        gTranslate(0, 1.3 * this.scale, 0);
        gScale(0.35 * this.scale, 0.35 * this.scale, 0.35 * this.scale);
        drawSphere();
        gPop();
        

        // Draw the hair bun
        gPush();
        setColor(vec4(0.4, 0.2, 0.1, 1.0)); // Dark brown for hair
        gTranslate(0.0, 1.6 * this.scale, -0.06 * this.scale);
        gScale(0.3 * this.scale, 0.3 * this.scale, 0.3 * this.scale);
        drawSphere();
        gPop();

        // Draw the tiara
        gPush();
        setColor(vec4(0.7, 0.5, 0.9, 1.0)); // Gold color
        gTranslate(0.0, 1.5 * this.scale, 0.2 * this.scale);
        gScale(0.25 * this.scale, 0.10 * this.scale, 0.04 * this.scale);
        drawCube();
        gPop();

    //       /** 🌟 Eyes */
    // let eyeOffsetX = 0.10 * this.scale; // Distance from center
    // let eyeOffsetY = 1.38 * this.scale; // Position height
    // let eyeOffsetZ = 0.32 * this.scale; // Forward position

    // for (let side of [-1, 1]) { // Left (-1) & Right (1) eye
    //     gPush();
    //     setColor(vec4(0.0, 0.0, 0.0, 1.0)); // Black eyes
    //     gTranslate(side * eyeOffsetX, eyeOffsetY, eyeOffsetZ);
    //     gScale(0.10 * this.scale, 0.06 * this.scale, 0.02 * this.scale); // Oval shape
    //     drawSphere();
    //     gPop();
    // }

    // /** 🌟 Nose */
    // gPush();
    // setColor(vec4(1.0, 0.75, 0.6, 1.0)); // Slightly darker skin tone
    // gTranslate(0, 1.33 * this.scale, 0.37 * this.scale); // Nose placement
    // gScale(0.03 * this.scale, 0.05 * this.scale, 0.02 * this.scale);
    // drawSphere();
    // gPop();

    // /** 🌟 Mouth (Gentle smile) */
    // gPush();
    // setColor(vec4(1.0, 0.2, 0.2, 1.0)); // Red lips
    // gTranslate(0, 1.16 * this.scale, 0.33 * this.scale); // Mouth placement
    // gScale(0.12 * this.scale, 0.02 * this.scale, 0.02 * this.scale); // Flattened smile
    // drawSphere();
    // gPop();

    }

    drawBody() {
        gPush();
        setColor(vec4(0.7, 0.5, 0.9, 1.0)); // Upper torso
        gTranslate(0, 0.1 * this.scale, 0); // Moves body up
        gRotate(90, 1, 0, 0); // Align vertically
        gScale(0.5 * this.scale, 0.4 * this.scale, 1 * this.scale);
        drawCone(); // Draw upper torso
        gPop();
    
        gPush();
        setColor(vec4(0.7, 0.5, 0.9, 1.0)); // Lower torso/tutu
        gTranslate(0.05, -0.45 * this.scale, 0); // Moves lower body up slightly
        gRotate(-90, 1, 0, 0); // Align vertically
        gScale(1.75 * this.scale, 1.75 * this.scale, 1 * this.scale);
        drawCone(); // Draw lower torso/tutu
        gPop();
    }
    

    drawArms() {
        const armLength = 0.6 * this.scale;
        const armOffset = 0.8 * this.scale;

        // Left arm
        gPush();
        setColor(vec4(1.0, 0.8, 0.6, 1.0)); // Skin color
        gTranslate(-armOffset, 0.2 * this.scale, 0);
        gRotate(-45, 0, 0, 1); // Rotate arm to 45 degrees
        gRotate(12 * Math.sin(this.time * 2), 1, 0, 0); // Animate arm swing
        gScale(0.06 * this.scale, armLength, 0.13 * this.scale);
        drawCube();
        gPop();

        // Right arm
        gPush();
        setColor(vec4(1.0, 0.8, 0.6, 1.0)); // Skin color;
        gTranslate(armOffset, 0.2 * this.scale, 0);
        gRotate(45, 0, 0, 1); // Rotate arm to -45 degrees
        gRotate(-12 * Math.sin(this.time * 2), 1, 0, 0); // Animate arm swing
        gScale(0.06 * this.scale, armLength, 0.13 * this.scale);
        drawCube();
        gPop();
    }

    drawLegs() {
        const legLength = 0.5 * this.scale; // Length of each segment (thigh, shin)
        const hipBend = -10 * Math.sin(this.time * 2); // Hip animation
        const hipBendL = -10 * Math.sin(this.time * 2); // Hip animation
        const kneeBendL = -3*Math.max(10, 25 * Math.sin(this.time * 2)); // Knee bends only inward
        const kneeBendR = -3*Math.max(10, 25 * Math.cos(this.time * 2)); // Knee bends only inward
        // ================================
        // Left Leg (hierarchical structure)
        // ================================
        setColor(vec4(1.0, 0.8, 0.6, 1.0)); // Skin color
        gPush(); // Start drawing the left leg (hip)
        gTranslate(-0.25 * this.scale, -1.4 * this.scale, -0.1); // Position of the left thigh
        gRotate(0, -10, 0, 1); // Rotate leg to 45 degrees
        gRotate( hipBendL-1, -1, 0, 0); // Animate the hip
        gScale(0.15 * this.scale, legLength, 0.12 * this.scale); // Thigh dimensions
        drawCube(); // Draw the thigh
    
        // Shin (relative to the thigh)
        gPush();
        gTranslate(0, -legLength-1, -0.1); // Move to the bottom of the thigh
        gRotate(0, -15, 0, 1); // Rotate leg to 45 degrees
        gRotate(-kneeBendL, 1, 0, 0); // Animate the knee
        gScale(1, 1.3, 0.75) // Adjust the shin proportions
        drawCube(); // Draw the shin
    
        // Boot (relative to the shin)
        gPush();
        setColor(vec4(1.0, 0.71, 0.76, 1.0)); // Soft ballet pink
        gTranslate(0, -legLength-0.5, 0.06 * this.scale+1); // Move to the bottom of the shin
        gScale(1, 0.2, 0.5); // Boot proportions 
        drawCube(); // Draw the boot
        gPop(); // End boot transformation
    
        gPop(); // End shin transformation
        gPop(); // End left leg (hip transformation)
    
        // ================================
        // Right Leg (hierarchical structure)
        // ================================
        setColor(vec4(1.0, 0.8, 0.6, 1.0)); // Skin color
        gPush(); // Start drawing the right leg (hip)
        gTranslate(0.2 * this.scale, -1.4 * this.scale, -0.2); // Position of the right thigh
        gRotate( -1, -10, 0, 0); // Animate the hip
        gRotate( -hipBend, 1, 0, 0); // Animate the hip
        gScale(0.15 * this.scale, legLength, 0.12 * this.scale); // Thigh dimensions
        drawCube(); // Draw the thigh
    
        // Shin (relative to the thigh)
        gPush();
        gTranslate(0, -legLength-1, -0.1); // Move to the bottom of the thigh
        gRotate(0, 15, 0, 1); // Rotate shin to 45 degrees
        gRotate(-kneeBendR, 1, 0, 0); // Animate the knee
        gScale(1, 1.3, 0.75); // Adjust the shin proportions
        drawCube(); // Draw the shin
    
        // Boot (relative to the shin)
        gPush();
        setColor(vec4(1.0, 0.71, 0.76, 1.0)); // Soft ballet pink
        gTranslate(0, -legLength-0.5, 0.06 * this.scale+1); // Move to the bottom of the shin
        gScale(1, 0.2, 0.5); // Boot proportions
        drawCube(); // Draw the boot
        gPop(); // End boot transformation
    
        gPop(); // End shin transformation
        gPop(); // End right leg (hip transformation)
    }
    
    

    update(dt) {
        this.time += dt;
    
        // 🌟 Pirouette: Continuous spinning rotation
        this.rotationAngle += 360 * dt * 0; // Adjust speed by changing 0.5
    
        // Oscillate in diagonal x and y directions (adds slight movement)
        // this.position[0] = this.basePosition[0] + Math.sin(this.time) * 0.5; // X-axis oscillation
        // this.position[1] = this.basePosition[1] + Math.sin(this.time * 2) * 0.3; // Y-axis oscillation
    }
    

    render() {
        gPush();
        gTranslate(this.position[0], this.position[1], this.position[2]); // Apply position
    
        gRotate(this.rotationAngle, 0, 1, 0); // 🌟 Apply spinning animation
    
        this.drawHead();
        this.drawBody();
        this.drawArms();
        this.drawLegs();
        gPop();
    }    
    
}

// ============================
// 360-degree camera fly around
// ============================
var cameraAngle = 0;  // Tracks the orbit position

function updateCamera(dt) {
    cameraAngle += dt * 0.5;  // Adjust speed of rotation
    var radius = 20.0;  // Distance from the ballerina
    eye = vec3(
        Math.sin(cameraAngle) * radius, 
        3,  
        Math.cos(cameraAngle) * radius
    );
}



// ============================
// Global Instances
// ============================
var ballerina = new Ballerina([0, 0, 0], 1.0);




// ======================================================
// Render Function
// ======================================================
function render(timestamp) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    eye = vec3(0, 0, 10);
    MS = [];
    modelMatrix = mat4();
    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    setAllMatrices();
    if (animFlag) {
        dt = (timestamp - prevTime) / 1000.0;
        prevTime = timestamp;
    }
    
    // ============================
    // Draw the Starfield (Background)
    // ============================
    updateStars(dt);
    drawStars();


    // ============================
    // 360-degree camera fly around
    // ============================
    updateCamera(dt);  // Update camera position
    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    setAllMatrices();
    
  // ============================
    // Draw ballerina
    // ============================
    ballerina.update(dt);
    ballerina.render();





    // ============================
    if (animFlag)
        window.requestAnimFrame(render);
}
