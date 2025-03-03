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
var at = vec3(0.0, 0.0, 0.0);
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
            setColor(vec4(1.0, 1.0, 1.0, 1.0));
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
    stars.forEach(star => star.draw());
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
    gl.clearColor(0, 0, 0, 1.0);
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
        this.position = position;
        this.scale = scale;
        this.time = 0.0;
        this.phase = 0; // 0: Walk, 1: Pirouette, 2: Split Jump
        this.legRotation = 0;
    }

    update(dt) {
        this.time += dt;
        
        if (this.time > 2) {
            this.phase = (this.phase + 1) % 3;
            this.time = 0;
        }
    }

    drawLegs() {
        gPush();
        setColor(vec4(1.0, 0.8, 0.8, 1.0));
        gTranslate(0, -1.2, 0);
        gRotate(this.legRotation, 1, 0, 0);
        gScale(0.2, 1.0, 0.2);
        drawCube();
        gPop();
    }

    render() {
        gPush();
        gTranslate(this.position[0], this.position[1], this.position[2]);
        gScale(this.scale, this.scale, this.scale);
        this.drawLegs();
        gPop();
    }
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
    // Draw ballerina
    // ============================
    ballerina.update(dt);
    ballerina.render();

    // ============================
    if (animFlag)
        window.requestAnimFrame(render);
}
