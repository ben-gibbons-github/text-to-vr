use_obj_lights = false;
sunlight_color_int = 4.0
sunlight_color = new THREE.Color(1.0, 1.0, 1.0);
sub_light_intensity = 2
walls_cast_shadows = false;
ceiling_color = 0xFFFFFF
ceiling_glow_color = 0.6
wall_color = 0x111111
let sub_shadows = false;
let background_clear_color = new THREE.Color(0.6, 0.6, 0.6)
let max_clones = 3
wall_color_glow = 0.2
floor_color_int = 32;

shadow_map_bias = -0.0000025;
shadow_map_normal_bias = 0.0025;   // Or this, depending on geometry

let shadow_map_size = 1024 * 2;
let small_shadow_map_size = 128;
let is_closein = false;

max_num_clients = 4

const illegal_types2 = ["_Room", "_Wall", "_GlassWall", "_Window", "_Garden"];
num_model_errors = 0;

class Color {
    constructor(r = 0, g = 0, b = 0) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    // Clones the current color instance
    clone() {
        return new Color(this.r, this.g, this.b);
    }

    // Multiplies each color component by a scalar value
    multiplyScalar(scalar) {
        this.r = Math.min(255, Math.max(0, this.r * scalar));
        this.g = Math.min(255, Math.max(0, this.g * scalar));
        this.b = Math.min(255, Math.max(0, this.b * scalar));
        return this;
    }

    // Adds another color to this one
    add(color) {
        this.r = Math.min(255, Math.max(0, this.r + color.r));
        this.g = Math.min(255, Math.max(0, this.g + color.g));
        this.b = Math.min(255, Math.max(0, this.b + color.b));
        return this;
    }

    // Returns the color as a string in RGB format
    toString() {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }
}

/**
 * Checks if two axis-aligned squares/rectangles intersect
 * in at least an edge or area (but not just a corner).
 *
 * Square A is defined by (ax1, az1) as bottom-left
 * and (ax2, az2) as top-right corners.
 * Square B is similarly (bx1, bz1) and (bx2, bz2).
 *
 * Returns true if they share an edge or area; false otherwise.
 */
function squaresIntersect(ax1, az1, ax2, az2, bx1, bz1, bx2, bz2) {
    // Compute overlap in the x-dimension
    const overlapWidth = Math.min(ax2, bx2) - Math.max(ax1, bx1);
    
    // Compute overlap in the z-dimension
    const overlapHeight = Math.min(az2, bz2) - Math.max(az1, bz1);
    
    // Condition 1: The boxes at least meet (overlapWidth >= 0, overlapHeight >= 0)
    // Condition 2: They do more than just touch at a single point
    //    => (overlapWidth > 0 || overlapHeight > 0)
    // So the final condition for an edge or area intersection:
    return overlapWidth >= 0 && overlapHeight >= 0 && (overlapWidth > 0 || overlapHeight > 0);
}

function isObjectOverlappingWall(obj, wall) {

    let dist = distancePointToSegment(obj.x, obj.z, wall.x1, wall.z1, wall.x2, wall.z2);
    if (dist < obj.size_x * 0.5)
        return true;
    else
        return false;
}

function countObjectsOutsideRooms(rooms, objects) {
    let outsideCount = 0;
  
    for (const obj of objects) {

        if (illegal_types2.includes(obj.type))
            continue;
      let isInsideAnyRoom = false;
      
      for (const room of rooms) {
        // Normalize room boundaries
        const left   = Math.min(room.x1, room.x2);
        const right  = Math.max(room.x1, room.x2);
        const bottom = Math.min(room.z1, room.z2);
        const top    = Math.max(room.z1, room.z2);
  
        // Check if object lies in the rectangle
        if (obj.x >= left && obj.x <= right &&
            obj.z >= bottom && obj.z <= top) {
          isInsideAnyRoom = true;
          break; // no need to check other rooms
        }
      }
  
      if (!isInsideAnyRoom) {
        outsideCount++;
      }
    }
  
    return outsideCount;
  }
  
function countObjectWallOverlaps(object_list, wall_list) {
    let overlaps = 0;

    for (const obj of object_list) {
        if (obj.class === "hover") {
            if (obj.y + obj.size_y * 0.5 < 0)
                return;
            if (obj.y - obj.size_y * 0.5 > room_size_y)
                return;    
        }

        if (illegal_types.includes(obj.type))
            continue;

        for (const wall of wall_list) {
            if (isObjectOverlappingWall(obj, wall)) {
                overlaps++;
            }
        }
    }

    return overlaps;
}


function countNonIntersectingSquares(squares) {
let count = 0;

for (let i = 0; i < squares.length; i++) {
    const [ax1, az1, ax2, az2] = [squares[i].x1, squares[i].z1, squares[i].x2, squares[i].z2];
    
    let intersectsAny = false;
    for (let j = 0; j < squares.length; j++) {
        if (i === j) continue; // skip comparing a square with itself
        
        const [bx1, bz1, bx2, bz2] = [squares[j].x1, squares[j].z1, squares[j].x2, squares[j].z2];
        // Check for intersection (edge or area)
        if (squaresIntersect(ax1, az1, ax2, az2, bx1, bz1, bx2, bz2)) {
            intersectsAny = true;
            break; // no need to check more squares
        }
        }
        
        // If it never intersected any other square, increment count
        if (!intersectsAny) {
        count++;
        }
    }

    return count;
}

let use_floor_colors = false;
const c_topLeft = new Color(180, 175, 170)
const c_topRight = new Color(180, 175, 170)
const c_bottomLeft = new Color(100, 100, 105)
const c_bottomRight = new Color(120, 130, 140)
const c_height = [new Color(180, 175, 170), new Color(180, 175, 170), new Color(180, 175, 170), new Color(180, 175, 170), new Color(180, 175, 170)];
let camera_angle_index = 0;
let max_camera_angle = 8 * 4;

let texture_topLeft = ""
let texture_topRight = ""
let texture_botLeft = ""
let texture_botRight = ""
let texture_height = ["", "", "", "", ""];

let socket = null;
let loader = null;

let list_of_rooms = []

let num_models_load_wait = 0;

let Up = up = UP = "up"
let Down = down = DOWN = 'down'

let S = 0.5
let M = 1.0
let L = 2.0
let XL = 3.0
let XXL = 4.0
let size = 2.0
let floor = "floor", Floor = "floor", FLOOR = "floor";
let unlit = Unlit = UNLIT = "unlit"
let lit = Lit = LIT = "lit"
let scatter = Scatter = SCATTER = "scatter"
let stencil = Stencil = STENCIL = "stencil"
let neon = Neon = NEON = "neon"
let mural = Mural = MURAL = "mural"
let surface = Surface = SURFACE = "surface"
let orient = "north"
let orientation = "north"
let ceiling = Ceiling = CEILING = "ceiling"
let spot = Spot = SPOT = "spot"
let openWall = false;
let Square = square = "square"
let Point = point = POINT = "point"
let Round = round = "round"
let Cylinder = cylinder = "cylinder"
let Torus = torus = TORUS = "rorus"
let Sphere = sphere = "sphere"
let Beams = beams = "beams"
let None = NONE = none = "none"
let Type = type = "cube"
let Cube = cube = CUBE = "cube"
let Smooth = smooth = true
let Smoothe = smoothe = true
let Ocean = ocean = 'ocean'
let Closed = closed = 'closed'
let Hexagon = hexagon = hex = HEX = Hex = HEXAGON = 'hexagon'
let Stream = stream = STREAM = 'stream'
let Glass = glass = 'glass'
let Shape = shape = 'cube'
let Cone = cone = 'cone'
let Pool = pool = "pool"
let Bath = bath = BATH = "bath"
let Hover = hover = "hover"
let last_placed_obj = { }

let room_door_tracker = []
let model_name_to_path = {}
let json_file_data = null;
let json_file_data_index = 0;
let select_button = 'a';
let num_build_errors = 0;
let num_build_flubs = 0;
let room_min_x = 1000
let room_min_z = 1000
let wall_break_points = []
let has_ocean = false;
let has_water = false;
let item_focus_locked = true;

let has_item_focus = true;
let min_item_x = 0;
let max_item_x = 0;
let min_item_z = 0;
let max_item_z = 0;

let doors_to_call = []
let mirrors_to_call = []
let walls_to_call = []
let windows_to_call = []

let water_to_call = []
let gardens_to_call = []
let pillars_to_call = []
let skylights_to_call = []
let mural_to_call = []

let floor_to_call = []
let ceiling_to_call = []

function expect_number(value, iDefault = 0) {

    if (typeof value !== 'number') {
        if (value == "small" || value == "small" || value == "s" || value == "S" || value == "sml" || value == "Sml")
            return 1;
        if (value == "Medium" || value == "medium" || value == "m" || value == "M" || value == "Med" || value == "med")
            return 2;
        if (value == "large" || value == "Large" || value == "l" || value == "L" || value == "Lrg" || value == "lrg")
            return 3;
    }
    
    // Check if the value is not a number or is NaN
    if (isNaN(value)) {
        return iDefault;
    }

    // Ensure the value is finite (not Infinity or -Infinity)
    if (!isFinite(value)) {
        return iDefault;
    }

    return value;
}

let genericDummyObj = { }
genericDummyObj.counter = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.noCeiling = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.openCeiling = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Counter = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.table = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Table = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.size = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.wall = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.clone = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.ceil = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Ceil = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.roomWindow = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { roomWindow(a, b, c); num_build_flubs++; return genericDummyObj; };
genericDummyObj.hang = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Hang = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Hanging = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.hanging = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.highlight = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };

genericDummyObj.spotLight = function(r = 0, g = 0, b = 0, d1 = 0, e1 = 0, f1 = 0, g1 = 0) { last_placed_obj.r = r; last_placed_obj.g = g; last_placed_obj.b = b; last_placed_obj.light = "spot"; num_build_flubs++; return genericDummyObj; };
genericDummyObj.pointLight = function(r = 0, g = 0, b = 0, d1 = 0, e1 = 0, f1 = 0, g1 = 0) { last_placed_obj.r = r; last_placed_obj.g = g; last_placed_obj.b = b; last_placed_obj.light = "point"; num_build_flubs++; return genericDummyObj; };

genericDummyObj.door = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { door(a, b, c); num_build_flubs++; return genericDummyObj; };
genericDummyObj.cliff = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { cliff(a, b, c); num_build_flubs++; return genericDummyObj; };
genericDummyObj.ceiling = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Ceiling = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.floor = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.Floor = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.platform = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { platform(a, b, c, d, e); num_build_flubs++; return genericDummyObj; };
genericDummyObj.walls = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.floorColor = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.wallColor = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.ceilingColor = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.windowColor = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) { num_build_flubs++; return genericDummyObj; };
genericDummyObj.room_tag = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {  world(a); num_build_flubs++; return genericDummyObj; };
genericDummyObj.pedestal = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {  pedestal(a, b, c); num_build_flubs++; return genericDummyObj; };
genericDummyObj.floorRaise = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {  floorRaise(a, b, c, d); num_build_flubs++; return genericDummyObj; };
genericDummyObj.stage = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {  stage(a, b, c); num_build_flubs++; return genericDummyObj; };
genericDummyObj.floorLight = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {  floorLight(a, b, c); num_build_flubs++; return genericDummyObj; };
genericDummyObj.texture = function(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {  num_build_flubs++; return genericDummyObj; };
genericDummyObj.water = function() {
    water_color = [genericDummyObj.r, genericDummyObj.g, genericDummyObj.b];
    world_colors[world_colors.length - 1][3] = 1;
}
genericDummyObj.sunlight = function() {
    sun_color = [genericDummyObj.r, genericDummyObj.g, genericDummyObj.b];
    world_colors[world_colors.length - 1][3] = 3;
}
genericDummyObj.sunLight = genericDummyObj.sunlight;
genericDummyObj.mainColor = function() {
    main_color = [genericDummyObj.r, genericDummyObj.g, genericDummyObj.b];
    world_colors[world_colors.length - 1][3] = 2;
}

function close_in_zoom_mode() {
    is_closein = true;
}

function push_room_boundaries(x, z) {

    if (x > room_size_x)
        room_size_x = x;
    if (z > room_size_z)
        room_size_z = z;

    if (x < room_min_x)
        room_min_x = x;
    if (z < room_min_z)
        room_min_z = z;
}

class Layout {
    constructor() {
      this.wallSegments = [];
    }
  
    addWallSegments(s) {
        const room_index = room_door_tracker.length;
        for (let i = 0; i < s.length; i++)
            s[i].room_index = room_index;

        s.forEach(wallSection => {
            
            let toClose = this.wallSegments.length > 0;

            for (let i = 0; i < 1.0; i += 0.1)
            {
                const px = i * wallSection.x1 + (1 - i) * wallSection.x2;
                const pz = i * wallSection.z1 + (1 - i) * wallSection.z2;
                const newPoint = snapPointToNearestWall(px, pz);
                const dx = px - newPoint.x;
                const dz = pz - newPoint.z;
                const distToPoint = Math.sqrt(dx * dx + dz * dz);
                if (distToPoint > 0.2) {
                    toClose = false;
                    break;   
                }
            }
            if (!toClose)
                this.wallSegments.push(wallSection);

            push_room_boundaries(wallSection.x1, wallSection.z1);
            push_room_boundaries(wallSection.x2, wallSection.z2);
        });

        room_door_tracker.push(false)
    }

    replaceSegmentWithTile(x, z, size, tileType) {

        const xz = snapPointToNearestWall(x, z);
        x = xz.x;
        z = xz.z;
        if (size < 1)
            size = 1
        
        const newSegments = [];
        
        this.wallSegments.forEach(wall => {
            const segments = breakSegment(wall, size, x, z);
            
            segments.forEach(segment => {
            const midX = (segment.x1 + segment.x2) / 2;
            const midY = (segment.z1 + segment.z2) / 2;
    
            // Check if this segment should be replaced with the tile
            let the_dist = distancePointToSegment(x, z, segment.x1, segment.z1, segment.x2, segment.z2);
            
            if (the_dist <= size * 0.5) {
                newSegments.push({ ...segment, type: tileType }); // Replace with window or mirror tile
                
            } else {
                newSegments.push(segment); // Keep as regular wall segment
            }
            });
        });
        
        this.wallSegments = newSegments;
    }
}

let use_threejs = false;
if (typeof process === 'undefined') {
    use_threejs = true;
    socket = io('http://localhost:3000');
    loader = new THREE.GLTFLoader();
}

const pad_room_size = false

let mainLayout = new Layout();
let wall_segments = []

let scene, camera, renderer;

let last_model = { name: "cube", rot: 0 }

let scene_title = ""
let let_room_list = []

// rewarded for having saturated colors
let world_colors = []
let water_color = []
let sun_color = []
let main_color = []
let spawned_objects = [];

let world_tags = [] //
let world_decals = [] //

let object_list = []
let room_size_x = 1
let room_size_y = 1
let room_size_z = 1
let floor_heights = []
let ceil_heights = []
let walls = []; // Store references to walls for raycasting (just raycast)

let zoomLevel = 20;  // Initial zoom level (distance from origin)
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };  // Store previous mouse position for dragging
let rotationY = -Math.PI * 0.75;  // Rotation around the Y-axis (left/right)
let rotationX = Math.PI * 0.25;  // Rotation around the X-axis (up/down)
let output_script = "";

let num_extra_walls = 0;
let extra_wall_symetric = 0;

let done_animate = false;

let camera_target = null;
if (use_threejs)
    camera_target = new THREE.Vector3(0, 0, 0);

function rgbToHsv(r, g, b) {
    // Normalize the RGB values to the range [0, 1]
    r /= 255;
    g /= 255;
    b /= 255;

    // Find the minimum and maximum values among r, g, and b
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Initialize HSV variables
    let h, s, v;

    // Compute Hue
    if (delta === 0) {
        h = 0; // When no color difference, hue is undefined but set to 0
    } else if (max === r) {
        h = ((g - b) / delta) % 6;
    } else if (max === g) {
        h = (b - r) / delta + 2;
    } else {
        h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60); // Convert to degrees
    if (h < 0) h += 360;

    // Compute Saturation
    s = max === 0 ? 0 : (delta / max) * 100;

    // Compute Value
    v = max * 100;

    // Return HSV values
    return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

function room(name = "room") {
    let the_room = { 'name': name, 'the_shape': square, 'x1': 0, 'x2': 0, 'z1': 0, 'z2': 0, 'y2': 4, 'walls': 'closed', 'ceiling': 'closed', 'floor': 0 }
    list_of_rooms.push(the_room);
    the_room.topLeft = function(x1, z1) {
        the_room.x1 = x1;
        the_room.z1 = z1;
        return the_room;
    }
    the_room.bottomRight = function(x2, z2) {
        the_room.x2 = x2;
        the_room.z2 = z2;
        return the_room;
    }
    the_room.ceilingHeight = function(h) {
        if (h < 3)
            h = 3;
        if (h > room_size_y)
            room_size_y = h;
        the_room.y2 = h;
        return the_room;
    }
    the_room.shape = function(shape) {
        the_room.the_shape = shape;
        return the_room;
    }
    the_room.wallType = function(walls) {
        the_room.walls = walls;
        return the_room;
    }
    the_room.ceilingType = function(ceiling) {
        the_room.ceiling = ceiling;
        return the_room;
    }
    the_room.floorHeight = function(floor) {
        the_room.floor = floor;
        return the_room;
    }
    return the_room;
}

function getQuickStats() {
    let stats = { }
    stats.light_emitting_objects = 0;

    const special_objects = ["_Garden", "_Ceiling", "_DanceFloor", "_Counter", "_Block", "_FloorLight", "_Art", "_Pedistal", "_Glow", "_Pool", "_Ceiling"];
    
    object_list.forEach(object_list => {
        if (special_objects.includes(object_list.type)) {
            if (!stats[object_list.type])
                stats[object_list.type] = 1;
            else
                stats[object_list.type]++;
        }
        if (object_list.light && object_list.light != "none") 
            stats.light_emitting_objects += 1;
    });

    stats.lightObjects = 0;
    if (floor_heights.length > 0)
        stats.num_floor_heights = floor_heights.length;
    if (ceil_heights.length > 0)
        stats.num_ceil_heights = ceil_heights.length;

    if (world_tags.includes("Night"))
        stats.night = true;
    if (world_tags.includes("Outdoor"))
        stats.outdoor = true;
    if (num_build_errors > 0)
        stats.num_build_errors = num_build_errors;
    if (num_build_flubs > 0)
        stats.num_build_flubs =  num_build_flubs;
    stats.room_size_x = room_size_x;
    stats.room_size_y = room_size_y;
    stats.room_size_z = room_size_z;
    if (room_min_x != 0)
        stats.room_min_x = room_min_x;
    if (room_min_z != 0)
        stats.room_min_z = room_min_z;

    // console.log("list_of_rooms", list_of_rooms);
    stats.orphaned_rooms = countNonIntersectingSquares(list_of_rooms);
    stats.wallOverlaps = countObjectWallOverlaps(object_list, mainLayout.wallSegments);
    stats.objects_outside_of_rooms = countObjectsOutsideRooms(let_room_list, object_list)
    stats.num_bad_things = stats.orphaned_rooms + stats.wallOverlaps + stats.objects_outside_of_rooms;
    return stats;
}

function findClosestObjectToPoint(object_list, x, z) {
    if (object_list.length === 0) return null;


    let closestObject = null;
    let minDistance = Infinity;

    for (const obj of object_list) {
        if (illegal_types2.includes(obj.type))
            continue;
        const dx = obj.x - x;
        const dz = obj.z - z;
        const distance = Math.sqrt(dx * dx + dz * dz) - Math.max(obj.size_x, obj.size_z) * 0.5;

        if (distance < minDistance) {
            minDistance = distance;
            closestObject = obj;
        }
    }

    return minDistance;
}

function countObjectWallOverlaps(object_list, wall_list) {
    let overlaps = 0;

    for (const obj of object_list) {
        if (obj.class === "hover") {
            if (obj.y + obj.size_y * 0.5 < 0)
                return;
            if (obj.y - obj.size_y * 0.5 > room_size_y)
                return;    
        }

        if (illegal_types.includes(obj.type))
            continue;

        for (const wall of wall_list) {
            if (isObjectOverlappingWall(obj, wall)) {
                overlaps++;
            }
        }
    }

    return overlaps;
}

function isObjectOverlappingWall(obj, wall) {
    const objMinX = obj.x - obj.size_x / 2;
    const objMaxX = obj.x + obj.size_x / 2;
    const objMinZ = obj.z - obj.size_z / 2;
    const objMaxZ = obj.z + obj.size_z / 2;

    const wallMinX = Math.min(wall.x1, wall.x2);
    const wallMaxX = Math.max(wall.x1, wall.x2);
    const wallMinZ = Math.min(wall.y1, wall.y2);
    const wallMaxZ = Math.max(wall.y1, wall.y2);

    // Check if the wall intersects the bounding box of the object
    let dist = distancePointToSegment(obj.x, obj.z, wall.x1, wall.y1, wall.x2, wall.y2);
    if (dist < obj.size_x * 0.5)
        return true;
    else
        return false;
}

function calculateMeanAndStdSize(object_list) {
    if (object_list.length === 0) return { mean: 0, std: 0 };

    const sizes = object_list.map(obj => (obj.size_x + obj.size_y + obj.size_z) / 3);
    const mean = sizes.reduce((acc, size) => acc + size, 0) / sizes.length;
    const variance = sizes.reduce((acc, size) => acc + Math.pow(size - mean, 2), 0) / sizes.length;
    const std = Math.sqrt(variance);

    return { mean, std };
}

function calculateMeanNearestNeighborDistance(object_list) {
    if (object_list.length < 2) return 0;

    let totalDistance = 0;

    for (let i = 0; i < object_list.length; i++) {
        let minDistance = Infinity;

        for (let j = 0; j < object_list.length; j++) {
            if (i !== j) {
                const distance = calculateDistance(object_list[i], object_list[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        }

        totalDistance += minDistance;
    }

    return totalDistance / object_list.length;
}

function calculateDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const dz = obj1.z - obj2.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function newitem() {
    has_item_focus = false;
    item_focus_locked = false;

    min_item_x = 0;
    max_item_x = 0;
    min_item_z = 0;
    max_item_z = 0;
}

function post_item_focus(name, x1, z1, x2, z2) {
    if (item_focus_locked)
        return;

    if (!has_item_focus) {
        min_item_x = x1;
        max_item_x = x2;
        min_item_z = z1;
        max_item_z = z2;
        has_item_focus = true;
    } else {
        if (x2 > max_item_x)
            max_item_x = x2;
        if (x1 < min_item_x)
            min_item_x = x1;

        if (z2 > max_item_z)
            max_item_z = z2;
        if (z1 < min_item_z)
            min_item_z = z1;
    }
}

function distancePointToSegment(px, pz, x1, z1, x2, z2) {
    // Vector A->B
    const dx = x2 - x1;
    const dz = z2 - z1;
    
    // Handle the degenerate case: if the segment's endpoints are the same.
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq === 0) {
      // Distance from point to a single point (the segment is effectively a point).
      return Math.sqrt((px - x1) * (px - x1) + (pz - z1) * (pz - z1));
    }
    
    // Consider the parametric form of the segment (x1, y1) + t * (dx, dy).
    // We find t such that the point on the line closest to (px, py) is:
    // t = ((px - x1)*dx + (py - y1)*dy) / (dx*dx + dy*dy)
    let t = ((px - x1) * dx + (pz - z1) * dz) / lengthSq;
    
    // Clamp t to the range [0, 1] to handle points outside the segment
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    
    // Find the projection point
    const projX = x1 + t * dx;
    const projZ = z1 + t * dz;
    
    // Return the distance from (px, py) to the projection
    const distX = px - projX;
    const distZ = pz - projZ;
    
    return Math.sqrt(distX * distX + distZ * distZ);
  }

function countOverlaps(object_list) {
    let overlaps = 0;

    for (let i = 0; i < object_list.length; i++) {
        for (let j = i + 1; j < object_list.length; j++) {
            if (areObjectsOverlapping(object_list[i], object_list[j])) {
                overlaps++;
            }
        }
    }

    return overlaps;
}

const illegal_types = ["_Pool", "_Garden", "_Room", "_Wall", "_Window"];
function areObjectsOverlapping(obj1, obj2) {
    if (obj1.class !== obj2.class)
        return false;

    if (illegal_types.includes(obj1.type) || illegal_types.includes(obj2.type))
        return false;

    const xOverlap = Math.abs(obj1.x - obj2.x) < (obj1.size_x / 2 + obj2.size_x / 2);
    const yOverlap = Math.abs(obj1.y - obj2.y) < (obj1.size_y / 2 + obj2.size_y / 2);
    const zOverlap = Math.abs(obj1.z - obj2.z) < (obj1.size_z / 2 + obj2.size_z / 2);

    return xOverlap && yOverlap && zOverlap;
}

function countTypesFoundation(object_list) {
    const types = new Set();

    for (const obj of object_list) {
        if (obj.type) {
            types.add(obj.type);
        }
    }

    return types.size;
}
function countTypesNotFoundation(object_list) {
    const types = new Set();

    for (const obj of object_list) {
        if (obj.name) {
            types.add(obj.name);
        }
    }

    return types.size;
}

// Helper function to break a long segment into smaller ones if necessary
function breakSegment(segment, size, x, z) {
    
    const segments = [];
    const x1 = segment.x1;
    const x2 = segment.x2;
    const z1 = segment.z1;
    const z2 = segment.z2;
    const type = segment.type;
    const room_index = segment.room_index;
    const distance = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
  
    if (distancePointToSegment(x, z, x1, z1, x2, z2) > size * 0.5)
        return [segment];

    size = 1;
    if (distance <= size)
        return [segment];
  
    const numSegments = Math.ceil(distance / size);
    const dx = (x2 - x1) / numSegments;
    const dz = (z2 - z1) / numSegments;
  
    for (let i = 0; i < numSegments; i++) {
      const segmentStartX = x1 + i * dx;
      const segmentStartZ = z1 + i * dz;
      const segmentEndX = x1 + (i + 1) * dx;
      const segmentEndZ = z1 + (i + 1) * dz;
      segments.push({ x1: segmentStartX, y1: segment.y1, z1: segmentStartZ, x2: segmentEndX, y2: segment.y2, z2: segmentEndZ, type: type, room_index: room_index });
    }
    return segments;
}

function snapPointToNearestWall(px, pz, dist_offset = 0, room_index = -1) {
    let nearestPoint = {x: px, z: pz };
    let minDistance = Infinity;
  
    mainLayout.wallSegments.forEach(ws => {
        if (room_index != -1 && ws.room_index != room_index)
            return;
            
        let { x1, z1, x2, z2 } = ws;
        const center_x = (x1 + x2) * 0.5;
        const center_z = (z1 + z2) * 0.5;

        // Vector from start of segment to the target point
        let dx = x2 - x1;
        let dz = z2 - z1;
    
        let lengthSquared = dx * dx + dz * dz;
        if (lengthSquared < 1.5 && dist_offset > 0) {
            x1 = (x1 + center_x) * 0.5;
            z1 = (z1 + center_z) * 0.5;
            x2 = (x2 + center_x) * 0.5;
            z2 = (z2 + center_z) * 0.5;
            lengthSquared = dx * dx + dz * dz;
            dx = x2 - x1;
            dz = z2 - z1;
        }
    
        // Project point (px, pz) onto the segment line, clamping t to [0, 1]
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lengthSquared));
        const closestX = x1 + t * dx;
        const closestZ = z1 + t * dz;
    
        // Calculate the distance from the target point to this closest point on the segment
        const distance = Math.sqrt((px - closestX) ** 2 + (pz - closestZ) ** 2);
    
        // Update the nearest point if this one is closer
        if (distance < minDistance) {
            minDistance = distance;
            let angleRadians = -Math.atan2(ws.z2 - ws.z1, ws.x2 - ws.x1) + Math.PI * 0.5;
            nearestPoint = { x: closestX, z: closestZ, angleRadians: angleRadians };
            if (dist_offset != 0) {
                let x_offset = dist_offset * Math.cos(-angleRadians + 180);
                let z_offset = dist_offset * Math.sin(-angleRadians + 180);
                nearestPoint.x += x_offset;
                nearestPoint.z += z_offset;
            }
        }
    });
  
    return nearestPoint;
}

function isPointInPolygon(point, polygon) {
    // Ensure polygon array has at least 3 points
    const numVertices = polygon.length;
    if (numVertices < 3) return false;

    let inside = false;
    const { x: testX, y: testY } = point;

    for (let i = 0, j = numVertices - 1; i < numVertices; j = i++) {
        const vertex1 = polygon[i];
        const vertex2 = polygon[j];

        // Extract coordinates (handles both {x,y} objects and [x,y] arrays)
        const v1x = Array.isArray(vertex1) ? vertex1[0] : vertex1.x1;
        const v1y = Array.isArray(vertex1) ? vertex1[1] : vertex1.y1;
        const v2x = Array.isArray(vertex2) ? vertex2[0] : vertex2.x1;
        const v2y = Array.isArray(vertex2) ? vertex2[1] : vertex2.y1;

        // Check if the line segment from vertex2 to vertex1 intersects the ray cast from the point to the right
        const intersect = ((v1y > testY) !== (v2y > testY)) &&
                          (testX < (v2x - v1x) * (testY - v1y) / (v2y - v1y) + v1x);
        
        if (intersect) inside = !inside;
    }

    return inside;
}

function cutout(a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {

}

function cutWallPolygon(polygon) {

    const newSegments = [];
    
    mainLayout.wallSegments.forEach(wall => {

        const segments = [wall]
        polygon.forEach(poly => {
            if (segments.length <= 1) {
                segments.length = 0;
                segments.push(...breakSegment(wall, 0.2, poly.x1, poly.z1));
            }
            if (segments.length <= 1) {
                segments.length = 0;
                segments.push(...breakSegment(wall, 0.2, poly.x2, poly.z2));
            }
        });

        segments.forEach(segment => {
            inside1 = isPointInPolygon({x: segment.x1, z: segment.z1}, polygon)
            inside2 = isPointInPolygon({x: segment.x2, z: segment.z2}, polygon)

            if (!inside1 || !inside2)
                newSegments.push(segment);
        });
    });
    
    mainLayout.wallSegments = newSegments;
}

function cutWall(x = 0, z = 0, size = 2, room_index = -1) {

    x = expect_number(x, 0);
    z = expect_number(z, 0);
    size = expect_number(size, 2);

    if (size < 2.5)
        size = 2.5;

    const xz = snapPointToNearestWall(x, z, 0, room_index);
    x = xz.x;
    z = xz.z;
    wall_break_points.push([x, z]);

    const newSegments = [];
    
    mainLayout.wallSegments.forEach(wall => {

      const segments = breakSegment(wall, size, x, z);
      
      segments.forEach(segment => {
        let distToSegment = distancePointToSegment(x, z, segment.x1, segment.z1, segment.x2, segment.z2);
        if (distToSegment > size * 0.5)
            newSegments.push(segment);
        else {
            room_door_tracker[segment.room_index] = true;
        }
      });
    });
    
    mainLayout.wallSegments = newSegments;
    
    let doorSize = size * 4;
    let theObj = { x: x, y: 0.5, z: z, size_x: doorSize, size_y: doorSize, size_z: doorSize, type: "_door", name: "_door", r: 0, g: 0, b: 0, light: "none", tClass: "", rot: 0};
    spawned_objects.push(theObj);
}

// Function to add a mirror at specified coordinates
function door(name = "", x = 0, y = 0, z = 0, width = 7) {

    const the_door = { 'name': name }
    the_door.position = function(x, y, z) {
        the_door.x = x;
        the_door.y = y;
        the_door.z = z;
        return the_door;
    }
    the_door.size = function(s) {
        the_door.s = s;
        return the_door;
    }
    doors_to_call.push(the_door)

    return the_door;
}

// Function to add a mirror at specified coordinates
function roomWindow(name = "", x = 0, y = 0, z = 0, width = 7) {

    const the_door = { 'name': name }
    the_door.position = function(x, y, z) {
        the_door.x = x;
        the_door.y = y;
        the_door.z = z;
        return the_door;
    }
    the_door.size = function(s) {
        the_door.s = s;
        return the_door;
    }
    windows_to_call.push(the_door)

    return the_door;
}

const caveEntrance = cutWall;

// Room and Tile Functions
const default_room_height = 3.5

function get_wall_type(in_wall_type) {
    if (in_wall_type.toLowerCase().includes("glass"))
        return "_GlassWall"
    if (in_wall_type.toLowerCase().includes("beams"))
        return "_OpenWall"
    return "_Wall"
}


function __room(room_name, x1 = 0, z1 = 0, x2 = 6, z2 = 6, room_height = default_room_height, shape = "square", in_wall_type = "closed", ceiling_type = "closed", floor_height = 0, cut_walls = true) {

    room_height += floor_height
    if (ceiling_type.toLowerCase().includes('glass') || ceiling_type.toLowerCase().includes('beams'))
        __skylight(room_name + "_skylight", x1 + 1, z1 + 2, x2 - 1, z2 - 2);

    if (in_wall_type.toLowerCase().includes("glass")) {
        roomWindow(room_name + "_window", x1, 0, (z1 + z2) * 0.5, Math.abs(z2 - z1) * 0.75);
        roomWindow(room_name + "_window", x2, 0, (z1 + z2) * 0.5, Math.abs(z2 - z1) * 0.75);
        roomWindow(room_name + "_window", (x2 + x1) * 0.5, 0, z1, Math.abs(x2 - x1) * 0.75);
        roomWindow(room_name + "_window", (x2 + x1) * 0.5, 0, z2, Math.abs(x2 - x1) * 0.75);
        in_wall_type = closed;
    }

    if (floor_height != 0)
        __floorRaise(room_name + "_floor", x1, z1, x2, z2, floor_height, false, true);
    
    if (room_height < room_size_y || true) {
        // console.log("room_height", room_height, "room_size_y", room_size_y)
        __ceilingRaise(room_name + "_ceiling", x1, z1, x2, z2, room_size_y - room_height, false, false);
        
    }

    if (shape.toLowerCase().includes("circle") || shape.toLowerCase().includes("round"))
        return roomEllipse(room_name, x1, z1, x2, z2, room_height, -1, in_wall_type);
    if (shape.toLowerCase().includes("hex"))
        return roomEllipse(room_name, x1, z1, x2, z2, room_height, 6, in_wall_type);

    let_room_list.push({x1: x1, z1: z1, x2: x2, z2: z2});
    room_size_x = Math.max(x2, room_size_x)
    room_size_y = Math.max(room_height, room_size_y)
    room_size_z = Math.max(z2, room_size_z)
    
    const wall_type = get_wall_type(in_wall_type);

    const y1 = 0;
    const y2 = room_height;
    const walls = [
        { x1: x1, z1: z1, x2: x2, z2: z1, type: wall_type, y1: y1, y2: y2 },
        { x1: x2, z1: z1, x2: x2, z2: z2, type: wall_type, y1: y1, y2: y2 },
        { x1: x2, z1: z2, x2: x1, z2: z2, type: wall_type, y1: y1, y2: y2 },
        { x1: x1, z1: z2, x2: x1, z2: z1, type: wall_type, y1: y1, y2: y2 }
    ];

    x1 -= 0.1;
    z1 -= 0.1;
    x2 += 0.1;
    z2 += 0.1;
    const walls2 = [
        { x1: x1, z1: z1, x2: x2, z2: z1, type: wall_type, y1: y1, y2: y2 },
        { x1: x2, z1: z1, x2: x2, z2: z2, type: wall_type, y1: y1, y2: y2 },
        { x1: x2, z1: z2, x2: x1, z2: z2, type: wall_type, y1: y1, y2: y2 },
        { x1: x1, z1: z2, x2: x1, z2: z1, type: wall_type, y1: y1, y2: y2 }
    ];

    if (cut_walls)
        cutWallPolygon(walls2);
    mainLayout.addWallSegments(walls);

    const x = (x1 + x2) * 0.5
    const z = (z1 + z2) * 0.5
    // _cube(x, room_size_y * 1.0, z, Math.abs(x2 - x1), 0.01, Math.abs(z2 - z1), "_Ceiling");

    post_item_focus(room_name, x1, z1, x2, z2);

    return genericDummyObj;
}

function outdoor(x1 = 0, z1 = 0, x2 = 6, z2 = 6, room_height = default_room_height) {
    if (x1 < room_min_x)
        room_min_x = x1;
    if (z1 < room_min_z)
        room_min_z = z1;

    let_room_list.push({x1: x1, z1: z1, x2: x2, z2: z2});
    room_size_x = Math.max(x2, room_size_x)
    room_size_y = Math.max(room_height, room_size_y)
    room_size_z = Math.max(z2, room_size_z)
    world_tags.push("Outdoor")

    return genericDummyObj;
}

function ellipseCircumference(x, y) {
    const a = x / 2;
    const b = y / 2;
    const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
    const circumference = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    return circumference;
}

function roomEllipse(room_name = "", x1 = 0, z1 = 0, x2 = 5, z2 = 5, room_height = default_room_height, numSegments = -1, wall_type = closed) {
    
    let_room_list.push({x1: x1, z1: z1, x2: x2, z2: z2});
    room_size_x = Math.max(room_size_x, x2)
    room_size_y = Math.max(room_size_y, room_height)
    room_size_z = Math.max(room_size_z, z2)
    
    const size_x = x2 - x1
    const size_z = z2 - z1
    if (numSegments == -1)
        numSegments = Math.ceil(Math.max(size_x * 1.5, size_z * 1.5, 6));
    const walls = [];
    const centerX = (x1 + x2) / 2;
    const centerY = (z1 + z2) / 2;

    wall_type = get_wall_type(wall_type)

    for (let i = 0; i < numSegments; i++) {
        const theta1 = (i / numSegments) * 2 * Math.PI;
        const theta2 = ((i + 1) / numSegments) * 2 * Math.PI;
        const size_mult = 0.525;
        const x1 = centerX + (size_x * size_mult * Math.cos(theta1));
        const y1 = 0;
        const z1 = centerY + (size_z * size_mult * Math.sin(theta1));
        const x2 = centerX + (size_x * size_mult * Math.cos(theta2));
        const y2 = room_height;
        const z2 = centerY + (size_z * size_mult * Math.sin(theta2));
        walls.push({ x1, y1, z1, x2, y2, z2, type: wall_type });
    }
    cutWallPolygon(walls);
    
    mainLayout.addWallSegments(walls);
    return genericDummyObj;
}

const circularRoom = roomEllipse;

function roomPolygonal(x1 = 0, z1 = 0, x2 = 5, z2 = 5, room_height = default_room_height, sides = 6) {
    let_room_list.push({x1: x1, z1: z1, x2: x2, z2: z2});
    room_size_x = Math.max(room_size_x, x2)
    room_size_y = Math.max(room_size_y, room_height)
    room_size_z = Math.max(room_size_z, z2)

    if (sides < 4)
        sides = 4;
    const walls = [];
    const angleStep = (2 * Math.PI) / sides;

    const size_x = x2 - x1
    const size_z = z2 - z1
    const centerX = (x1 + x2) / 2;
    const centerY = (z1 + z2) / 2;

    for (let i = 0; i < sides; i++) {
        const theta1 = i * angleStep;
        const theta2 = (i + 1) * angleStep;
        const size_mult = 0.64;
        const x1 = centerX + (size_x * size_mult * Math.cos(theta1));
        const y1 = centerY + (size_z * size_mult * Math.sin(theta1));
        const x2 = centerX + (size_x * size_mult * Math.cos(theta2));
        const y2 = centerY + (size_z * size_mult * Math.sin(theta2));
        walls.push({ x1, y1, x2, y2, type: "_Wall" });
    }
    cutWallPolygon(walls);
    
    mainLayout.addWallSegments(walls);
    return genericDummyObj;
}

function roomListOfPoints(listOfXZPairs, size_y = 5) {
    room_size_y = Math.max(room_size_y, size_y)
    
    let local_min_x = 10000;
    let local_min_z = 10000;
    let local_max_x = 0;
    let local_max_z = 0;

    const walls = [];
    for (let i = 0; i < listOfXZPairs.length; i++) {
        const [x1, y1] = listOfXZPairs[i];
        const [x2, y2] = listOfXZPairs[(i + 1) % listOfXZPairs.length];

        if (x2 > local_max_x)
            local_max_x = x2;
        if (y2 > local_max_z)
            local_max_z = y2;
        if (x1 < local_min_x)
            local_min_x = x1;
        if (y1 < local_min_z)
            local_min_z = y1;

        if (x1 > room_size_x)
            room_size_x = x1;
        if (x2 > room_size_x)
            room_size_x = x2;
        if (y1 > room_size_z)
            room_size_z = y1;
        if (y2 > room_size_z)
            room_size_z = y2;

        walls.push({ x1, y1, x2, y2, type: "_Wall" });
    }
    let_room_list.push({x1: local_min_x, z1: local_min_z, x2: local_max_x, z2: local_max_z});
    cutWallPolygon(walls);
    mainLayout.addWallSegments(walls);
    return genericDummyObj;
}

const windowView = roomWindow;

function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}

// Function to add a mirror at specified coordinates
function mirror(name = "", x = 0, y = 0, z = 0, width = 7) {

    if (!isNumber(width))
        width = 7

    const the_mirror = { 'name': name }
    the_mirror.position = function(x, y, z) {
        the_mirror.x = x;
        the_mirror.y = y;
        the_mirror.z = z;
        return the_mirror;
    }
    the_mirror.size = function(s) {
        the_mirror.s = s;
        return the_mirror;
    }
    mirrors_to_call.push(the_mirror)

    return the_mirror;
}

function clearScene(scene) {
    while (scene.children.length > 0) {
        const child = scene.children[0];

        // If the child has a geometry, dispose of it
        if (child.geometry) {
            child.geometry.dispose();
        }

        // If the child has a material, dispose of it
        if (child.material) {
            // Check if the material is an array (e.g., for multi-material meshes)
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
            } else {
                child.material.dispose();
            }
        }

        // Remove the child from the scene
        scene.remove(child);
    }
    scene.children.length = 0;
}

function addZeroMarker(x = 0, y = 0, z = 0) {
    if (!use_threejs) return;

    const materialX = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red for X-axis
    const materialY = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green for Y-axis
    const materialZ = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue for Z-axis

    // Create X-axis line
    const pointsX = [
        new THREE.Vector3(x -1, y, z), // Start at -1 on X
        new THREE.Vector3(x +1, y, z)   // End at 1 on X
    ];
    const geometryX = new THREE.BufferGeometry().setFromPoints(pointsX);
    const lineX = new THREE.Line(geometryX, materialX);
    scene.add(lineX);

    // Create Y-axis line
    const pointsY = [
        new THREE.Vector3(x, y-1, z), // Start at -1 on Y
        new THREE.Vector3(x, y+1, z)   // End at 1 on Y
    ];
    const geometryY = new THREE.BufferGeometry().setFromPoints(pointsY);
    const lineY = new THREE.Line(geometryY, materialY);
    scene.add(lineY);

    // Create Z-axis line
    const pointsZ = [
        new THREE.Vector3(x, y, z-1), // Start at -1 on Z
        new THREE.Vector3(x, y, z+1)   // End at 1 on Z
    ];
    const geometryZ = new THREE.BufferGeometry().setFromPoints(pointsZ);
    const lineZ = new THREE.Line(geometryZ, materialZ);
    scene.add(lineZ);
}

// Initialize THREE.js scene
function init() {
    is_closein = false;
    num_model_errors = 0;
    floor_to_call = []
    ceiling_to_call = []
    mirrors_to_call = []
    doors_to_call = []
    windows_to_call = []

    water_to_call = []
    pillars_to_call = []
    gardens_to_call = []
    mural_to_call = []
    skylights_to_call = []

    walls_to_call = []
    models_to_place = [];
    list_of_rooms = []
    rotationX = Math.PI * 0.25;
    has_ocean = false;
    wall_break_points = [];
    num_build_flubs = 0;
    num_build_errors = 0;
    walls = []; // Store references to walls for raycasting (just raycast)
    ceilings = [];
    
    num_extra_walls = 0;
    extra_wall_symetric = 0;
    
    room_door_tracker = []
    spawned_objects = []
    room_min_x = 1000
    room_min_z = 1000
    wall_segments = []
    

    num_extra_walls = 0;
    extra_wall_symetric = 0;
    last_model = { name: "cube" }

    scene_title = ""

    world_colors = []
    water_color = []
    sun_color = []
    world_tags = []
    world_decals = []
    object_list = []
    room_size_x = 1
    room_size_y = 1
    room_size_z = 1
    floor_heights = []
    ceil_heights = []
    mainLayout = new Layout();

    // Create the scene
    if (use_threejs) {
        if (scene)
            clearScene(scene);

        if (!scene) {
            scene = new THREE.Scene();
        }
        addZeroMarker();

        // Create the camera
        if (!camera)
            camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 200) / window.innerHeight, 0.1, 1000);
        camera.position.set(5, 5, 10);
        camera.lookAt(camera_target);

        // Create the renderer
        if (!renderer) {
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFShadowMap; // Soft shadows

            renderer.setSize(window.innerWidth - 200, window.innerHeight);
            document.body.appendChild(renderer.domElement);
        }

        // Start the animation loop
        if (!done_animate) {
            done_animate = true;
            animate();
        }
    }
}

function angleDistance(a, b) {
    // Calculate the difference
    const diff = b - a;
    
    // Wrap the difference to (-π, π]
    const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff));
    
    // Return the absolute value, ensuring a result in [0, π]
    return Math.abs(wrapped);
}  

// Animation loop
function animate() {

    let lastFrameTime = 0;

    if (!use_threejs)
        return;

    if (json_file_data && json_file_data_index < json_file_data['options'].length && camera_angle_index < 8 * 4) {
        rotationY = 2.0 * Math.PI * (camera_angle_index % 8) / 8;
        rotationX = Math.PI * 0.25;
        if (Math.floor(camera_angle_index / 8) == 1)
            rotationX = Math.PI * 0.45;
        if (Math.floor(camera_angle_index / 8) == 2)
           zoomLevel = Math.sqrt(Math.max(room_size_x * room_size_x, room_size_z * room_size_z)) * 0.5;
        if (Math.floor(camera_angle_index / 8) == 0)
            zoomLevel = Math.sqrt(Math.max(room_size_x * room_size_x, room_size_z * room_size_z)) * 1.2;
        if (Math.floor(camera_angle_index / 8) == 1)
            zoomLevel = Math.sqrt(Math.max(room_size_x * room_size_x, room_size_z * room_size_z)) * 1.0;

        if (Math.floor(camera_angle_index / 8) == 3)
            rotationX = Math.PI * 0.1;
        if (is_closein)
            zoomLevel /= 2;
    
        updateCameraPosition();
    }
    
    const currentTime = performance.now();
    
    // Check if enough time has passed since the last request
    if (currentTime - lastFrameTime <= 30) {
        return;
    }
    
    lastFrameTime = currentTime;

    const distToCamera = camera.position.distanceTo(camera_target);
    const cam_dx = camera.position.x - camera_target.x;
    const cam_dz = camera.position.z - camera_target.z;
    const cameraAngle = Math.atan2(cam_dz, cam_dx);

    for (const wall of walls) {
        
        const adist = angleDistance(-cameraAngle, wall.rotation.y + Math.PI / 2);
        if (adist < Math.PI * 0.4) {
        // if (wall.position.x > 0) {
            wall.visible = false;
            wall.material.opacity = 1.0; // Make the intersected wall semi-transparent
            // previousIntersectedWalls.push(wall); // Keep track of intersected walls
        } else {
            wall.material.opacity = 1.0; // Make the intersected wall semi-transparent
            wall.visible = true;
        }  
    }

    for (const wall of ceilings) {
        wall.visible = camera.position.y < room_size_y - 1;
    }

    // Render the scene
    /*
    if (world_tags.includes("Night"))
        renderer.setClearColor(new THREE.Color(0.1, 0.2, 0.4));
    else if (world_tags.includes("Sunset"))
        renderer.setClearColor(new THREE.Color(1.0, 0.5, 0.25));
    else if (world_tags.includes("Space"))
        renderer.setClearColor(new THREE.Color(0.1, 0.1, 0.1));
    else if (world_tags.includes("Underwater"))
        renderer.setClearColor(new THREE.Color(0.1, 0.2, 1));
    else if (world_tags.includes("Fire"))
        renderer.setClearColor(new THREE.Color(1.0, 0.1, 0.0));
    else
        renderer.setClearColor(new THREE.Color(0.6, 0.8, 1));
    */
    renderer.setClearColor(background_clear_color);

    renderer.clear();
    if (num_model_errors == 0)
        renderer.render(scene, camera);

    if (num_models_load_wait <= 0) {
        // 3) Capture color PNG from the main canvas
        const colorDataURL = renderer.domElement.toDataURL('image/png');
    
        // 7) Send colorDataURL and depthDataURL to the server (two separate files)
        if (num_models_load_wait <= 0) {
            if (json_file_data && json_file_data['options'] && json_file_data_index < json_file_data['options'].length)
            {
                if (camera_angle_index < max_camera_angle)
                    captureAndSendCanvas(colorDataURL);
                camera_angle_index++;
                if (camera_angle_index >= max_camera_angle) {
                    executeNextCodeBlock();
                } else 
                    requestAnimationFrame(animate);
            }
        }
    }
}

function title(newTitle) {
    scene_title = newTitle;
    done_grass = false;
    if (use_threejs)
        document.title = newTitle;
}

function getFloorHeight(x, z) {
    let h = 0;
    floor_heights.forEach(o => {
        if (x >= o.x1 && x <= o.x2 && z >= o.z1 && z <= o.z2) {
            h += o.amt;
            if (o.hard)
                return o.amt; 
        }
    });
    return h;
}

function post_room_setup(arg_mode) {

    if (world_colors.length == 0) {
        addColor(255, 200, 150).sunlight();
        addColor(0, 0, 255).water();
    }

    floor_to_call.forEach(the_door => {
        __floorRaise(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2, the_door.amt, the_door.s);
    })

    list_of_rooms.forEach(room => {
        __room(room.name, room.x1, room.z1, room.x2, room.z2, room.y2, room.the_shape, room.walls, room.ceiling, room.floor);
    });

    walls_to_call.forEach(w => {
        __wall(w.name, w.x1, w.z1, w.x2, w.z2, w.h, w.t);
    })

    ceiling_to_call.forEach(the_door => {
        __ceilingRaise(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2, the_door.amt, the_door.s);
    })

    mirrors_to_call.forEach(the_door => {
        mainLayout.replaceSegmentWithTile(the_door.x, the_door.z, the_door.s, '_Mirror');
    })

    windows_to_call.forEach(the_door => {
        mainLayout.replaceSegmentWithTile(the_door.x, the_door.z, the_door.s, '_Window');
    })

    doors_to_call.forEach(the_door => {
        mainLayout.replaceSegmentWithTile(the_door.x, the_door.z, the_door.s, '_Door');
    })

    water_to_call.forEach(the_door => {
        __water(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2, the_door.t);
    })

    skylights_to_call.forEach(the_door => {
        __skylight(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2);
    })

    gardens_to_call.forEach(the_door => {
        __garden(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2);
    })

    pillars_to_call.forEach(the_door => {
        __pillar(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2);
    })

    mural_to_call.forEach(the_door => {
        __mural(the_door.name, the_door.x1, the_door.z1, the_door.x2, the_door.z2, the_door.place, the_door.light, the_wall.t);
    })
    
    models_to_place.forEach(m => {
        let the_model = model(m.name).placement(m.place).size(m.sx, m.sy, m.sz).particles();
        if (m.light_type) {
            if (m.light_type.toLowerCase().includes('spot'))
                spotLight(m.r, m.g, m.b);
            else
                pointLight(m.r, m.g, m.b);
        }
        the_model.rotate(m.rot);
        m.positions.forEach(p => {
            the_model.spawn(p.x, p.y, p.z);
        });
    })

    item_focus_locked = true;
    if (let_room_list.length == 0)
        outdoor(0, 0, 20, 20);

    
    world_colors.sort((a, b) => b[3] - a[3]);

    const is_outdoor = world_tags.includes("Outdoor");   
    
    if (world_tags.includes("Outdoor") && arg_mode !== "size") {
        let ocean_size = 10;
        if (has_ocean) {
            outdoor(-ocean_size, -ocean_size, room_size_x + ocean_size, room_size_z + ocean_size, room_size_y);
            water_raw(room_size_x - ocean_size, 0, room_size_x, room_size_z);
            water_raw(0, room_size_z - ocean_size, room_size_x, room_size_z);
            water_raw(-10, -10, room_size_x, 0);
            water_raw(-10, -10, 0, room_size_z);
        } else {
            outdoor(0, 0, room_size_x, room_size_z, room_size_y);
        }
    }
    
    if (use_threejs)
        console.log("room_min", room_min_x, room_min_z)

    min_item_x -= room_min_x
    max_item_x -= room_min_x
    min_item_z -= room_min_z
    max_item_z -= room_min_z

    object_list.forEach(o => {
        o.x -= room_min_x;
        o.z -= room_min_z;
    })
    
    ceil_heights.forEach(o => {
        o.x1 -= room_min_x;
        o.z1 -= room_min_z;
        o.x2 -= room_min_x;
        o.z2-= room_min_z;
    });
    floor_heights.forEach(o => {
        o.x1 -= room_min_x;
        o.z1 -= room_min_z;
        o.x2 -= room_min_x;
        o.z2-= room_min_z;
    });
    wall_segments.forEach(o => {
        o.x1 -= room_min_x;
        o.z1 -= room_min_z;
        o.x2 -= room_min_x;
        o.z2-= room_min_z;
    });

    mainLayout.wallSegments.forEach(o => {
        o.x1 -= room_min_x;
        o.z1 -= room_min_z;
        o.x2 -= room_min_x;
        o.z2 -= room_min_z;
    });

    wall_break_points.forEach(o => {
        addZeroMarker(o[0] - room_min_x, 5, o[1] - room_min_z);
    });

    room_size_x -= room_min_x;
    room_size_z -= room_min_z;

    const newSegments = [];
    
    mainLayout.wallSegments.forEach(wall => {
        let segments = [wall];
        if (wall.type == "_OpenWall" || wall.type == "_GlassWall" || wall.type == "_Door" || wall.type == "_Window") {
            segments = breakSegment(wall, 1.0, (wall.x1 + wall.x2) * 0.5, (wall.z1 + wall.z2) * 0.5);
        }

        segments.forEach(segment => {
            newSegments.push(segment); // Keep as regular wall segment
        });
    });
    
    mainLayout.wallSegments = newSegments;

    const pos_x = (room_size_x) * 0.5;
    const pos_y = 0;
    const pos_z = (room_size_z) * 0.5;

    if (use_threejs) {
        // camera_target.set((min_item_x + max_item_x) * 0.5, pos_y, (min_item_z + max_item_z) * 0.5);
        camera_target.set(pos_x, pos_y, pos_z);
        const dx = max_item_x - min_item_x;
        const dz = max_item_z - min_item_z;
        zoomLevel = Math.sqrt(Math.max(room_size_x * room_size_x, room_size_z * room_size_z)) * 0.8;

        //if (zoomLevel < 10)
        // zoomLevel = 16;
        updateCameraPosition();
        
        const width = Math.ceil(room_size_x), depth = Math.ceil(room_size_z); // Grid size
        {
            // console.log("room_size_x", room_size_x, "room_size_z", room_size_z);
            let tallest_height = 0;
            const heightData = new Array(width * depth).fill(0);
            for (let i = 0; i < width * depth; i++) {
                let x = i % width;
                let z = i / width;
                heightData[i] = getFloorHeight(x, z);
                if (heightData[i] > tallest_height)
                    tallest_height = heightData[i];
            }
    
            // Create Plane Geometry
            const floorGeometry = new THREE.PlaneGeometry(room_size_x, room_size_z, width - 1, depth - 1);
            floorGeometry.rotateX(-Math.PI / 2); // Rotate to lay flat
    
            // Modify Vertices to Match Height Data
            const vertices = floorGeometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                const x = i / 3 % width;
                const y = Math.floor(i / 3 / width);
                vertices[i + 1] = heightData[y * width + x]; // Adjust Y coordinate
            }
            floorGeometry.computeVertexNormals(); // Recalculate normals for shading
    
            const floorCanvas = document.createElement('canvas');
            floorCanvas.width = 1024;
            floorCanvas.height = 1024;
            const ctx = floorCanvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, floorCanvas.width, floorCanvas.height);

            const imageData = ctx.getImageData(0, 0, floorCanvas.width, floorCanvas.height);
            const data = imageData.data; // This is a Uint8ClampedArray of RGBA values

            for (let y = 0; y < floorCanvas.height; y++) {
                for (let x = 0; x < floorCanvas.width; x++) {
                    const index = (y * floorCanvas.width + x) * 4; // 4 bytes per pixel (R,G,B,A)
                    const mapX = x * room_size_x / floorCanvas.width;
                    const mapY = y * room_size_z / floorCanvas.height;
                    const x0 = Math.floor(mapX);
                    const y0 = Math.floor(mapY);
                    const x1 = x0 + 1;
                    const y1 = y0 + 1;
                    const sx = mapX - x0;
                    const sy = mapY - y0;
                    const h00 = getFloorHeight(x0, y0);
                    const h10 = getFloorHeight(x1, y0);
                    const h01 = getFloorHeight(x0, y1);
                    const h11 = getFloorHeight(x1, y1);
                    const h0 = h00 * (1 - sx) + h10 * sx;
                    const h1 = h01 * (1 - sx) + h11 * sx;
                    let h = (h0 * (1 - sy) + h1 * sy) / tallest_height;

                    let interp_x = x / floorCanvas.width;
                    let interp_y = y / floorCanvas.height;

                    const height_div = 1.0 / c_height.length;
                    let height_mult = 1.0 - h / height_div;
                    if (height_mult < 0)
                        height_mult = 0;

                    let c_topLeft_1 = c_topLeft.clone().multiplyScalar((1 - interp_x) * (1 - interp_y) * height_mult);
                    let c_topRight_1 = c_topRight.clone().multiplyScalar((interp_x) * (1 - interp_y) * height_mult);
                    let c_bottomRight_1 = c_bottomRight.clone().multiplyScalar((interp_x) * (interp_y) * height_mult);
                    let c_bottomLeft_1 = c_bottomLeft.clone().multiplyScalar((interp_x) * (1 - interp_y) * height_mult);

                    let finalColor = c_topLeft_1.clone().add(c_topRight_1).add(c_bottomRight_1).add(c_bottomLeft_1)

                    for (let i = 0; i < c_height.length; i++) {
                        let upperHeight = (i + 1) * height_div;
                        let lowerHeight = i * height_div;
                        if (h >= lowerHeight && h < upperHeight) {
                            const this_mult = (h - lowerHeight) / height_div;
                            finalColor.add(c_height[i].clone().multiplyScalar(this_mult));
                            if (i > 0)
                                finalColor.add(c_height[i - 1].clone().multiplyScalar(1.0 - this_mult));
                        }
                    }

                    if (use_floor_colors) {
                        data[index] = finalColor.r;
                        data[index + 1] = finalColor.g;
                        data[index + 2] = finalColor.b;
                    } else {
                        data[index] = floor_color_int
                        data[index + 1] = floor_color_int
                        data[index + 2] = floor_color_int
                    }

                    data[index + 3] = 255;
                    // break;
                }
            }

            // 5. Put the updated ImageData back into the canvas
            ctx.putImageData(imageData, 0, 0);

            // 6. Create the texture from the canvas
            const floorTexture = new THREE.Texture(floorCanvas);
            floorTexture.needsUpdate = true;


            const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, color: 0xa0a0a0, transparent: true, opacity: 1 });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.position.set(pos_x, pos_y, pos_z);
            floor.receiveShadow = true;
            floor.castShadow = true;
    
            scene.add(floor);
        }

        if (has_water)
        {
            const heightData = new Array(width * depth).fill(0);
            for (let i = 0; i < width * depth; i++) {
                heightData[i] = Math.random() * 0.05 - 0.15;
            }
    
            // Create Plane Geometry
            const floorGeometry = new THREE.PlaneGeometry(room_size_x, room_size_z, width - 1, depth - 1);
            floorGeometry.rotateX(-Math.PI / 2); // Rotate to lay flat
    
            // Modify Vertices to Match Height Data
            const vertices = floorGeometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                const x = i / 3 % width;
                const y = Math.floor(i / 3 / width);
                vertices[i + 1] = heightData[y * width + x]; // Adjust Y coordinate
            }
            floorGeometry.computeVertexNormals(); // Recalculate normals for shading
            
            const floorMaterial = new THREE.MeshPhongMaterial({ 
                color: new THREE.Color(water_color[0] / 255, water_color[1] / 255, water_color[2] / 255), 
                emissive: new THREE.Color(water_color[0] / 750, water_color[1] / 750, water_color[2] / 750), 
                transparent: true, opacity: 0.6, specular: 0x222222, shininess: 70 });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.position.set(pos_x, pos_y, pos_z);
            floor.receiveShadow = true;
            floor.castShadow = true;
    
            scene.add(floor);
        }
    }

    for (const ws of mainLayout.wallSegments) {
        
        if (pad_room_size) {
            ws.x1 *= (room_size_x + 1) / room_size_x
            ws.x2 *= (room_size_x + 1) / room_size_x
            ws.z1 *= (room_size_z + 1) / room_size_z
            ws.z2 *= (room_size_z + 1) / room_size_z
        }

        let angleRadians = -Math.atan2(ws.z2 - ws.z1, ws.x2 - ws.x1);
        let avgX = (ws.x1 + ws.x2) * 0.5
        let avgY = (ws.y1 + ws.y2) * 0.5
        let avgZ = (ws.z1 + ws.z2) * 0.5
        const height = ws.y2 - ws.y1;
        const padding = 0.1;

        let distance = Math.sqrt(Math.pow(ws.x2 - ws.x1, 2) + Math.pow(ws.z2 - ws.z1, 2));
        _cube(avgX, avgY, avgZ, distance, height, padding, ws.type, angleRadians)
        wall_segments.push({x1: ws.x1, y1: ws.y1, z1: ws.z1, x2: ws.x2, y2: ws.y2, z2: ws.z2 });
    }
    
    if (use_threejs) {
        
        const three_color = sunlight_color
        
        {
            const pointLight = new THREE.PointLight(three_color, sunlight_color_int, 10000);
            pointLight.position.set(-5, 10, -5);
            pointLight.castShadow = true;

            pointLight.shadow.mapSize.width = shadow_map_size;
            pointLight.shadow.mapSize.height = shadow_map_size;
            pointLight.shadow.camera.near = 0.5;
            pointLight.shadow.camera.far = 150;
            scene.add(pointLight);

            pointLight.shadow.bias = shadow_map_bias;
            pointLight.shadow.normalBias = shadow_map_normal_bias;
        }
        if (sub_light_intensity > 0)
        {
          let intensity = sub_light_intensity
          {
              const pointLight = new THREE.PointLight(three_color, intensity, 100000);
              pointLight.position.set(15, 25, 0);
              pointLight.castShadow = sub_shadows;
              pointLight.shadow.mapSize.width = small_shadow_map_size;
              pointLight.shadow.mapSize.height = small_shadow_map_size;
              pointLight.shadow.camera.near = 0.5;
              pointLight.shadow.camera.far = 50;
              pointLight.shadow.bias = shadow_map_bias;
              pointLight.shadow.normalBias = shadow_map_normal_bias;
              scene.add(pointLight);
          }
          {
              const pointLight = new THREE.PointLight(three_color, intensity, 100000);
              pointLight.position.set(-15, 25, 0);
              pointLight.castShadow = sub_shadows;
              pointLight.shadow.mapSize.width = small_shadow_map_size;
              pointLight.shadow.mapSize.height = small_shadow_map_size;
              pointLight.shadow.camera.near = 0.5;
              pointLight.shadow.camera.far = 50;
              pointLight.shadow.bias = shadow_map_bias;
              pointLight.shadow.normalBias = shadow_map_normal_bias;
              scene.add(pointLight);
          }
          {
              const pointLight = new THREE.PointLight(three_color, intensity, 100000);
              pointLight.position.set(2, 20, 15);
              pointLight.castShadow = sub_shadows;
              pointLight.shadow.mapSize.width = small_shadow_map_size;
              pointLight.shadow.mapSize.height = small_shadow_map_size;
              pointLight.shadow.camera.near = 0.5;
              pointLight.shadow.camera.far = 50;
              pointLight.shadow.bias = shadow_map_bias;
              pointLight.shadow.normalBias = shadow_map_normal_bias;
              scene.add(pointLight);
          }
          {
              const pointLight = new THREE.PointLight(three_color, intensity, 100000);
              pointLight.position.set(-2, 25, 15);
              pointLight.castShadow = sub_shadows;
              pointLight.shadow.mapSize.width = small_shadow_map_size;
              pointLight.shadow.mapSize.height = small_shadow_map_size;
              pointLight.shadow.camera.near = 0.5;
              pointLight.shadow.camera.far = 50;
              pointLight.shadow.bias = shadow_map_bias;
              pointLight.shadow.normalBias = shadow_map_normal_bias;
              scene.add(pointLight);
          }
        }

        // Create an ambient light with a white color and intensity of 1
        // const ambientLight = new THREE.AmbientLight(three_color, is_outdoor ? 0.2 : 0.1);

        // Add the ambient light to the scene
        //scene.add(ambientLight);

        // console.log("ceil_heights", ceil_heights.length);

        ceil_heights.forEach(o => {
            let color = ceiling_color
            const opacity = 1.0
            let shiny = 0.25
            let abs_amt = Math.abs(o.amt);
            // the_ceil = makeColoredCube((o.x1 + o.x2) * 0.5, room_size_y - abs_amt * 0.5, (o.z1 + o.z2) * 0.5, Math.abs(o.x2 - o.x1), abs_amt * 1.0, Math.abs(o.z2 - o.z1), color, opacity, o.rot, o.type, shiny, false);
            abs_amt = 0;
            the_ceil = makeColoredCube((o.x1 + o.x2) * 0.5, room_size_y - 0.5 - abs_amt * 0.5, (o.z1 + o.z2) * 0.5, Math.abs(o.x2 - o.x1), abs_amt * 1.0, Math.abs(o.z2 - o.z1), color, opacity, o.rot, o.type, shiny, false, ceiling_glow_color);
            ceilings.push(the_ceil)
        })


        object_list.forEach(o => {
            
            let color = wall_color
            let shiny = 0.25
            if (o.type == "_Skylight") {
                const opacity = 1.0
                makeColoredCube(o.x + 1 - o.size_x * 0.5, o.y - o.size_y * 0.5, o.z + 1, o.size_x * 0.01, o.size_y, o.size_z, color, opacity, o.rot, o.type, shiny);
                makeColoredCube(o.x + 1 + o.size_x * 0.5, o.y - o.size_y * 0.5, o.z + 1, o.size_x * 0.01, o.size_y, o.size_z, color, opacity, o.rot, o.type, shiny);
                makeColoredCube(o.x + 1, o.y - o.size_y * 0.5, o.z + 1 - o.size_z * 0.5, o.size_x, o.size_y * 0.1, o.size_z * 0.01, color, opacity, o.rot, o.type, shiny);
                makeColoredCube(o.x + 1, o.y - o.size_y * 0.5, o.z + 1 + o.size_z * 0.5, o.size_x, o.size_y * 0.1, o.size_z * 0.01, color, opacity, o.rot, o.type, shiny);

            } else if (o.type == "_Pool") {

            } else if (o.type == "_OpenWall" || o.type == "_GlassWall" || o.type == "_Door" || o.type == "_Window") {

                const opacity = 1.0
                makeColoredCube(o.x + 1, o.y - o.size_y * 1, o.z + 1, o.size_x, o.size_y * 0.1, o.size_z, color, opacity, o.rot, o.type);
                makeColoredCube(o.x + 1, o.y - o.size_y * 0, o.z + 1, o.size_x, o.size_y * 0.1, o.size_z, color, opacity, o.rot, o.type);
                if (o.type != "_Door" && o.type != "_Window")
                    makeColoredCube(o.x + 1, o.y - o.size_y * 0.5, o.z + 1, o.size_x * 0.1, o.size_y * 1, o.size_z * 0.1, color, opacity, o.rot, o.type);

            } else if (o.type != "_Ceiling") {
                

                let opacity = 1.0
                
                if (o.type == "_Garden")
                    color = 0xB1FF00;
                if (o.type == "_Mural")
                    color = 0xBF00FF;
                if (o.type == "_Pool")
                    color = 0x414372;
                if (o.type == "_Mirror") {
                    color = 0x75487d;
                    shiny = 1.0
                }

                let emissive = 0
                if (o.type == "_Wall") {
                    color = wall_color;
                    emissive = wall_color_glow
                    opacity = 0.3
                }

                if (o.class === "ceiling")
                    color = 0x674EA7;
                if (o.class === "hover")
                    color = 0xA64D79

                if (o.type == "_Wall") {
                    const opacity = 1.0
                    //makeColoredCube(o.x + 1, o.y - o.size_y * 1, o.z + 1, o.size_x * 0.8, o.size_y * 0.6, o.size_z, color, opacity, o.rot, o.type, false, emissive);
                    //makeColoredCube(o.x + 1, o.y - o.size_y * 0, o.z + 1, o.size_x * 0.8, o.size_y * 0.1, o.size_z, color, opacity, o.rot, o.type, false, emissive);
                }

                let floorHeight = getFloorHeight(o.x, o.z);
                if (o.y < floorHeight + o.size_y * 0.5)
                    o.y = floorHeight + o.size_y * 0.5;

                if (o.type == "obj") {
                    if (model_has_loaded[o.name])
                        make3d = _make3dmodel(o.name, o.x, o.y - o.size_y * 0.5, o.z, o.size_x, o.size_y, o.size_z, o.rot);
                    else {
                        if (model_load_callbacks[o.name])
                            model_load_callbacks[o.name].push(() => { const o2 = o; _make3dmodel(o.name, o2.x, o2.y - o2.size_y * 0.5, o2.z, o2.size_x, o2.size_y, o2.size_z, o2.rot)});
                    }
                } else
                    floor = makeColoredCube(o.x + 1, o.y - o.size_y * 0.5, o.z + 1, o.size_x, o.size_y, o.size_z, color, opacity, o.rot, o.type, shiny, true, emissive);
                
                if (o.type == "_Wall")
                    walls.push(floor);

                if (o.r <= 1.0 && o.g <= 1.0 && o.b <= 1.0) {
                  o.r *= 255;
                  o.g *= 255;
                  o.b *= 255;
                }

                const three_color = new THREE.Color(o.r / 255.0, o.g / 255.0, o.b / 255.0);
                const intensity = 1;
                let light_size = o.size_x * 5;
                if  (light_size < 6)
                  light_size = 6;

                if (use_obj_lights) {
                    if (o.light == "spot") {
                        const pointLight = new THREE.PointLight(three_color, intensity, light_size);
                        
                        pointLight.position.set(o.x, o.y, o.z);
                        pointLight.castShadow = false;
            
                        pointLight.shadow.mapSize.width = small_shadow_map_size;
                        pointLight.shadow.mapSize.height = small_shadow_map_size;
                        pointLight.shadow.camera.near = 0.5;
                        pointLight.shadow.camera.far = 50;
                        scene.add(pointLight);
            
                    } else if (o.light == "point") {
            
                        const pointLight = new THREE.PointLight(three_color, intensity, light_size);
                        pointLight.position.set(o.x, o.y, o.z);
                        pointLight.castShadow = false;
            
                        pointLight.shadow.mapSize.width = small_shadow_map_size;
                        pointLight.shadow.mapSize.height = small_shadow_map_size;
                        pointLight.shadow.camera.near = 0.5;
                        pointLight.shadow.camera.far = 50;
                        scene.add(pointLight);
                    }
                }
                
                if (o.type == "_Wall")
                    walls.push(floor);
            } else {
              // is a room / roof

              // floor = makeColoredCube(o.x + 1, o.y - o.size_y * 0.5, o.z + 1, o.size_x, o.size_y * 0.01, o.size_z, color, 0.3, o.rot);
            }
        })        
    }
}

function containsAltWord(inputString, lightAlternates) {
    // Convert the input string to lowercase and check if any word is included
    return lightAlternates.some(word => inputString.toLowerCase().includes(word));
}

function model(model_name) {
    last_model = {name: model_name, class: "floor", size: 1 };

    let o = { }
    o.name = model_name;
    last_model.light = "none";
    const lowerName = model_name.toLowerCase();
    const light_alternates = [
        "light", "lantern", "brightness", "illumination", "radiance", "luminosity", "glow",
        "gleam", "sparkle", "shine", "shimmer", "glimmer", "luster", "brilliance", "flare",
        "beam", "ray", "twinkle", "incandescence", "fluorescence", "phosphorescence",
        "effulgence", "clarity", "transparency", "glint", "blaze", "flash", "halo", "aura",
        "glee", "sheen", "lustre", "luminance", "spark", "daylight", "sunshine", "starlight",
        "moonlight", "torch", "lamp", "lantern", "candlelight", "gleaming", "radiating",
        "twinkling", "dawning", "brightening", "sparkling", "flicker", "glowworm", "beaming",
        "shining",
        // Additional entries
        "firefly", "bioluminescence", "volcano", "neon", "LED", "chandelier", "spotlight",
        "floodlight", "lighthouse", "matchstick", "streetlight", "headlight", "taillight",
        "searchlight", "fire", "ember", "torchlight", "pyre", "blazing sun", "gas lamp",
        "oil lamp", "hurricane lamp", "meteor", "comet", "aurora borealis", "laser",
        "flame", "campfire", "bonfire", "fireworks", "cinders", "supernova", "pulsar",
        "quasar", "blackbody radiation", "infrared", "ultraviolet", "plasma", "candle",
        "carbon arc lamp", "electric arc", "phosphor", "strobe light", "glowing algae",
        "LED strip", "fiber optics", "stage light", "disco ball", "mirror ball", "bioluminescent fungi",
        "sparklers", "gaslight", "furnace glow", "glowing coal", "hot metal", "radioactive glow",
        "nightlight", "fairy lights", "Christmas lights", "traffic light", "warning light",
        "signal flare", "beacon", "torchbearer", "lanternfish", "lava lamp", "crystal glow",
        "stone phosphorescence", "ceramic glow", "neon sign", "arc welding spark",
        "flickering lamp", "sunrise", "sunset", "diamond sparkle", "pearl luster",
        "glass sparkle", "firefly swarm", "magma", "volcanic eruption", "starburst",
        "lightbulb", "halogen lamp", "fluorescent lamp", "LED bulb", "glowing filament",
        "TV screen glow", "phone screen glow", "tablet glow", "computer monitor",
        "projector beam", "movie screen reflection"
        
    ];
    if (containsAltWord(lowerName, light_alternates)) {
        last_model.light = "point";
        if (world_colors.length > 0) {
            last_model.r = world_colors[0][0];
            last_model.g = world_colors[0][1];
            last_model.b = world_colors[0][2];
        } else {
            last_model.r = 255;
            last_model.g = 255;
            last_model.b = 255;
        }
    }

    o.worldColor = function(r, g, b) {
        worldColor(r, g, b);
        return genericDummyObj;
    }

    o.size = function(size_x, size_y = 0.1, size_z = 0.1, in_size4 = 0.1) {
        last_model.size_x = size_x
        last_model.size_y = size_y
        last_model.size_z = size_z
        return o;
    }
    o.Size = o.size;
    o.adjustment = function(a = 0, b = 0, c = 0) {
        num_build_flubs++;
        return o;
    }
    o.placement = function(p) {
        last_model.class = p;
        return o;
    }
    o.ceiling = function() {
        last_model.class = "ceiling";
        return o;
    }
    o.Ceiling = o.ceiling;
    o.hanging = function() {
        last_model.class = "ceiling";
        return o;
    }
    o.Hanging = o.hanging;
    o.Hang = o.hanging;
    o.hang = o.hanging;
    o.hover = function() {
        last_model.class = "hover";
        return o;
    }
    o.Hover = o.hover;

    o.swim = o.hover;
    o.fly = o.hover;
    o.float = o.hover;
    o.floatingPlatform = o.hover;

    o.center = function() {
        return o;
    }
    o.Center = o.center;
    o.reflective = function() {
        return o;
    }
    o.animate = function() {
        return o;
    }

    o.wall = function() {
        last_model.class = "wall";
        return o;
    }
    o.Wall = o.wall;
    o.floor = function() {
        last_model.class = "floor";
        return o;
    }
    o.rotate = function(rot) {
        last_model.rot = rot * Math.PI / 180;
        return o;
    }
    o.texture = function(t) {
        return o;
    }
    o.particles = function(p) {
        last_model.particles = p;
        return o;
    }
    o.rot = function(rot) {
        last_model.rot = rot;
        return o;
    }
    o.Rotate = function(rot) {
        last_model.rot = rot;
        return o;
    }
    o.floorRaise = function(x = 0, z = 0, size = 5, amt = 1) {
        floorRaise("", x1, z1, size, amt);
        return o;
    }
    o.FloorRaise = o.floorRaise;

    o.Floor = o.floor;
    o.spawn = function(x, y, z) {
        spawn(x, y, z);
        return o;
    }

    o.clone = function(x, y, z) {
        spawn(x, y, z);
        return o;
    }
    o.Spawn = o.spawn;
    o.move = o.spawn;
    o.Move = o.spawn;

    o.scatter = function() {
        last_model.class = "scatter";
        return o;
    }
    o.Scatter = o.scatter;
    o.spotLight = function(r, g, b) {
        last_model.light = "spot";
        last_model.r = r;
        last_model.g = g;
        last_model.b = b;
        return o;
    }
    o.pointLight = function(r, g, b) {
        last_model.light = "point";
        last_model.r = r;
        last_model.g = g;
        last_model.b = b;
        return o;
    }
    o.color = o.pointLight;
    o.light = o.pointLight;
    o.face = function(toFace) {
        last_model.toFace = toFace;
        return o;
    }
    o.counter = function() {
        last_model.class = "counter";
        return o;
    }
    o.wall = function() {
        last_model.class = "wall";
        return o;
    }
    o.Counter = o.counter;
    o.table = o.counter;
    o.Table = o.counter;
    o.platform = function() {
        last_model.class = "floor";
        return o;
    }
    o.shelf = o.counter;
    o.water = function() {
        // become pool
        return o;
    }
    o.coneLight = o.spotLight;

    return o;
}

// Example of a helper function to dispose of a material safely.
function disposeMaterial(material) {
    // If the material has textures, dispose them as well:
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    if (material.alphaMap) material.alphaMap.dispose();
    if (material.displacementMap) material.displacementMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();

    material.dispose();
}

function unloadModel(model_name, scene) {
    // If the model hasn't been marked as loaded, skip
    if (!model_has_loaded[model_name]) {
        console.warn(`Model "${model_name}" is not loaded or already unloaded.`);
        return;
    }

    const model = loaded_models[model_name];
    if (!model) {
        console.warn(`No loaded model found for "${model_name}".`);
        return;
    }

    // If the model was added to the scene, remove it
    scene.remove(model);

    // Recursively traverse the model and dispose of geometry/materials
    model.traverse((child) => {
        if (child.isMesh) {
            // Dispose of the mesh's geometry
            if (child.geometry) {
                child.geometry.dispose();
            }

            // Dispose of the mesh's material(s)
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => disposeMaterial(mat));
                } else {
                    disposeMaterial(child.material);
                }
            }
        }
    });

    // Clear references
    loaded_models[model_name] = null;
    model_has_loaded[model_name] = false;
    model_load_callbacks[model_name] = [];
    model_name_to_id[model_name] = null;
}

function unloadAllModels(scene) {
    // Iterate through all models in loaded_models and unload them
    Object.keys(loaded_models).forEach(model_name => {
        unloadModel(model_name, scene);
    });
}


let loaded_models = { }
let model_has_loaded = { }
let model_load_callbacks = { }
let model_name_to_id = { }

function load3dModel(model_name, model_id) {
    if (!use_threejs) {
        model_name_to_id[model_name] = model_id;
        return;
    }

    if (model_name_to_id[model_name]) {
        if (model_name_to_id[model_name] == model_id)
            return;
        unloadModel(model_name, scene);
    }
    model_name_to_id[model_name] = model_id;

    model_has_loaded[model_name] = false;
    model_load_callbacks[model_name] = [];

    path_to_model = 'downloaded_models/' + model_id + '/scene.gltf' 

    num_models_load_wait++;
    loader.load(path_to_model, (gltf) => {
        const model = gltf.scene;
        
        // Make sure the model’s transforms are up to date.
        model.updateMatrixWorld(true);
    
        // Compute the bounding box of the entire model.
        const box = new THREE.Box3().setFromObject(model);
    
        // Get the center of the bounding box.
        const center = box.getCenter(new THREE.Vector3());
    
        // Reposition the model so that its bounding box center is at the origin.
        // Subtracting the center moves the model so (0,0,0) is now its center.
        // model.position.sub(center);
    
        // Now add the model to the scene (or store it, etc.).
        model.visible = false;
        scene.add(model);
    
        num_models_load_wait--;
        loaded_models[model_name] = model;
        model_has_loaded[model_name] = true;
        model_load_callbacks[model_name].forEach((callback) => callback());
        model_load_callbacks[model_name] = [];
        requestAnimationFrame(animate);
    
    }, undefined, (error) => {
        // Handle loading errors
        num_models_load_wait--;
        console.error("Error loading the model:", path_to_model);
        console.error("Error loading the model:", error);
        num_model_errors++;
    
        model_has_loaded[model_name] = true;
        model_load_callbacks[model_name].forEach((callback) => callback());
        model_load_callbacks[model_name] = [];
        requestAnimationFrame(animate);
    });
}

function _getModelDimensions(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    return {
        x: size.x,
        y: size.y,
        z: size.z,
        minY: box.min.y  // Save the lowest y value
    };
}

function setShadowRecursive(object) {
    object.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

function _make3dmodel(model_name, x, y, z, size_x, size_y, size_z, rot) {
    if (!use_threejs)
        return;
    
    if (!loaded_models[model_name])
        return;
    
    const floor = loaded_models[model_name].clone(); // Clone the preloaded model

    if (!floor)
        return;
    
    setShadowRecursive(floor);
    floor.visible = true;
    scene.add(floor);

    const model_dims = _getModelDimensions(floor);

    size_x = Math.max(size_x, size_y, size_z);
    //if (size > 1)
    size_y = Math.max(size_x, size_y, size_z);
    size_z = Math.max(size_x, size_y, size_z);
    const scale_g = Math.max(model_dims.x, model_dims.y, model_dims.z);
    
    const scaleX = size_x / model_dims.x;
    const scaleY = size_y / model_dims.y;
    const scaleZ = size_z / model_dims.z;

    floor.position.set(x, y - (model_dims.minY * size_y / scale_g), z);
    // floor.position.set(x, y, z);
    floor.scale.set(size_x / scale_g, size_y / scale_g, size_z / scale_g);
    floor.rotation.y = rot;
    floor.receiveShadow = true;
    floor.castShadow = true;
    
    return floor;
}

let models_to_place = []

function place3dmodel(model_name = "cube") {
    
    let the_model = { 'name': model_name, 'positions': [{'x': 0, 'y': 0, 'z': 0}], 'place': 'floor', 'rot': 0, 'num_clones': max_clones }
    models_to_place.push(the_model);

    the_model.position = function(x, y, z) {
        the_model.positions[the_model.positions.length - 1].x = x;
        the_model.positions[the_model.positions.length - 1].y = y;
        the_model.positions[the_model.positions.length - 1].z = z;
        return the_model;
    }
    the_model.clone = function(x, y, z) {
        if (the_model.num_clones > 0) {
            the_model.positions.push({'x': 0, 'y': 0, 'z': 0})
            the_model.positions[the_model.positions.length - 1].x = x;
            the_model.positions[the_model.positions.length - 1].y = y;
            the_model.positions[the_model.positions.length - 1].z = z;
            the_model.num_clones--;
        }
        return the_model;
    }
    the_model.height = function(y) {
        the_model.y = y;
        return the_model;
    }
    the_model.size = function(sx, sy, sz) {
        the_model.sx = sx;
        the_model.sy = sy;
        the_model.sz = sz;
        return the_model;
    }
    the_model.placement = function(place) {
        the_model.place = place;
        return the_model;
    }
    the_model.rotate = function(rot) {
        the_model.rot = rot;
        return the_model;
    }
    the_model.rotation = function(rot) {
        the_model.rot = rot;
        return the_model;
    }
    the_model.light = function(r, g, b, type) {
        the_model.r = r;
        the_model.g = g;
        the_model.b = b;
        the_model.light_type = type;
        return the_model;
    }
    the_model.texture = function(tex, type) {
        the_model.tex = tex;
        the_model.tex_type = type;
        return the_model;
    }
    the_model.particles = function(particle_type) {
        the_model.particle_type = particle_type;
        return the_model;
    }
    the_model.place3dmodel = function(model_name) {
        return place3dmodel(model_name);
    }
    return the_model;
}

function worldColor(r = 255, g = 255, b = 255) {
        // Find the largest of R, G, and B
    const maxChannel = Math.max(r, g, b);

    // Scale so the largest channel becomes 1.0
    if (maxChannel > 0) {
        r *= 255 / maxChannel;
        g *= 255 / maxChannel;
        b *= 255 / maxChannel;
    } else
        return;

    world_colors.push([r, g, b, 0]);
    let o = { }
    genericDummyObj.r = r;
    genericDummyObj.g = g;
    genericDummyObj.b = b;
    return genericDummyObj;
}

const color = worldColor;

function addColor(r = 255, g = 255, b = 255) {
    return worldColor(r, g, b);
}

function face(toFace) {
    last_model.toFace = toFace
    return genericDummyObj;
}

function spotLight(r, g, b) {
    last_model.light = "spot";
    last_model.r = r;
    last_model.g = g;
    last_model.b = b;
    return genericDummyObj;
}

function pointLight(r, g, b) {
    last_model.light = "point";
    last_model.r = r;
    last_model.g = g;
    last_model.b = b;
    return genericDummyObj;
}

function coneLight(r, g, b) {
    last_model.light = "spot";
    last_model.r = r;
    last_model.g = g;
    last_model.b = b;
    return genericDummyObj;
}

function world(tag_name) {
    rotationX = Math.PI * 0.25;
    world_tags.push(tag_name)
    return genericDummyObj;
}
const time = world;
const setting = world;
const room_tag = world;

function decal(decal_name) {
    world_decals.push(decal_name)

    return genericDummyObj;
}

function spawn(x = 0, y = 0, z = 0, first = false) {
    
    const lowerName = last_model.name.toLowerCase();
    const lowerWords = lowerName.split(' ');

    let size_x = last_model.size_x;
    let size_y = last_model.size_y;
    let size_z = last_model.size_z;
    if (x < size_x * 0.5)
        x = size_x * 0.5
    if (x > room_size_x - size_x * 0.5)
        x = room_size_x - size_x * 0.5
    if (z < size_z * 0.5)
        z = size_z * 0.5
    if (z > room_size_z - size_z * 0.5)
        z = room_size_z - size_z * 0.5

    //if (y < 0)
    //    y = 0
    //if (y > room_size_y - size_y)
    //    y = room_size_y - size_y

    const isRug = lowerWords.includes("rug") || lowerWords.includes("carpet") || lowerWords.includes("furr") || lowerWords.includes("mat");

    let rot = last_model.rot;

    if (last_model.class === "wall") {
        const xy = snapPointToNearestWall(x, z, size_x * 0.5);
        x = xy.x;
        z = xy.y;
        rot = xy.angleRadians;
        if (size_x > 1)
            last_model.class = "floor";
    }
    
    if (!isRug) {
        for (let i = 0; i < spawned_objects.length; i++) {
            let o = spawned_objects[i];
            let dist = Math.sqrt(Math.pow(x - o.x, 2) + Math.pow(y - o.y, 2) + Math.pow(z - o.z, 2));
            if (dist < (size_x + o.size_x) * 0.25) {
                // return;
            }
        }
    }
    
    if (last_model.class === "counter") {
        counter_size = size_x * 1.1;
        counter(x, z, counter_size, 0.4 + counter_size * 0.5);
        y += counter_size * 0.5;
        last_model.class = "floor";
    }

    if (last_model.include_counter) {
        counter_size = Math.max(1, last_model.size)
        _cube(x, 0.25, z, counter_size, 0.5, counter_size);
    }

    let closestFace = null;
    let bestDist = 1000000;
    if (last_model && last_model.toFace && last_model.toFace != '') {
        for (o in object_list) {
            if (o.name && o.name.toLowerCase() == last_model.toFace.toLowerCase()) {
                
                let distance = Math.sqrt(Math.pow(x - o.x, 2) + Math.pow(z - o.z, 2));
                if (distance < bestDist) {
                    bestDist = distance;
                    rot = Math.atan2(z - o.z, x - o.x);
                }
            }
        }
    }

    let theObj = { x: x, y: y, z: z, size_x: size_x, size_y: size_y, size_z: size_z, type: "obj", name: last_model.name, r: last_model.r, g: last_model.g, b: last_model.b, light: last_model.light, tClass: last_model.class, rot: rot, particles: last_model.particles};

    if (first)
        object_list.unshift(theObj);
    else
        object_list.push(theObj);

    spawned_objects.push(theObj);
    
    objWrapped = { obj: theObj };
    objWrapped.face = function(toFace = "") {
        let bestDist = 1000000;
        for (o in object_list) {
            if (o.name.toLowerCase() == toFace.toLowerCase()) {
                
                let distance = Math.sqrt(Math.pow(x - o.x, 2) + Math.pow(z - o.z, 2));
                if (distance < bestDist) {
                    bestDist = distance;
                    theObj.rot = Math.atan2(z - o.z, x - o.x);
                }
            }
        }
        return objWrapped;
    }
    objWrapped.pointLight = function(a=0,b=0,c=0) {

    }
    objWrapped.spotLight = function(a=0,b=0,c=0) {

    }
    objWrapped.floor = function(a=0,b=0,c=0) {

    }
    objWrapped.ceiling = function(a=0,b=0,c=0) {

    }
    objWrapped.wall = function(a=0,b=0,c=0) {

    }

    return objWrapped;
}

function addBasicToWorld(x, y, z, size_x, size_y, size_z, inType = "_Counter", rot = 0) {
    
    if (x === null || Number.isNaN(x))
        console.trace("x is NULL or NaN", inType);
    if (y === null || Number.isNaN(y))
        console.trace("y is NULL or NaN", inType);
    if (z === null || Number.isNaN(z))
        console.trace("z is NULL or NaN", inType);
    if (size_x === null || Number.isNaN(size_x))
        console.trace("size_x is NULL or NaN", inType);
    if (size_y === null || Number.isNaN(size_y))
        console.trace("size_y is NULL or NaN", inType);
    if (size_z === null || Number.isNaN(size_z))
        console.trace("size_z is NULL or NaN", inType);

    if (x + size_x * 0.5 > room_size_x)
        room_size_x = x + size_x * 0.5;
    if (z + size_z * 0.5 > room_size_z)
        room_size_z = z + size_z * 0.5;

    const new_obj = { x: x, y: y, z: z, size_x: size_x, size_y: size_y, size_z: size_z, type: inType, name: inType, r: 0, g: 0, b: 0, light: "none", rot: rot};
    object_list.unshift(new_obj);
    return new_obj;
}

function detailedLightingEffect(x, y, z) {
    model("lighting effect").size(1).ceiling();
    spawn(x, y, z);
}

function makeColoredCube(x = 0, y = 0, z = 0, size_x = 1, size_y = 1, size_z = 1, color = 0x808080, opacity = 1.0, rot = 0, type = "_Cube", shiny = 0.0, shadowCast = true, glow_amt = 0) {
    if (!use_threejs)
        return;
    
    color = wall_color
    let floorGeometry = null;
    if (type == "_Sphere")
        floorGeometry = new THREE.SphereGeometry(Math.max(size_x, size_y, size_z) / 2, 32, 32);
    else if (type == "_Cone")
        floorGeometry = new THREE.ConeGeometry(Math.max(size_x, size_z) / 2, size_y, 32);
    else if (type == "_Cylinder")
        floorGeometry = new THREE.CylinderGeometry(Math.max(size_x, size_z) / 2, Math.max(size_x, size_z) / 2, size_y, 32);
    else if (type == "_Torus") {
        const radius = Math.max(size_x, size_z, size_y) / 2; // Outer radius
        const tube = Math.max(size_x, size_z, size_y) / 8; // Outer radius
        const radialSegments = 32; // Number of segments around the ring
        const tubularSegments = 100; // Number of segments along the tube

        floorGeometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    } else 
        floorGeometry = new THREE.BoxGeometry(size_x, size_y, size_z);

    let floorMaterial = null;
    floorMaterial = new THREE.MeshPhongMaterial({ 
        color: wall_color, 
        transparent: opacity < 0.97,
        shininess: shiny,
        emissive: 0xffffff,
        emissiveIntensity: glow_amt,
        specular: 0x000000 });

    floorMaterial.opacity = opacity;
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(x, y, z);
    floor.rotation.y = rot;
    floor.receiveShadow = true;
    floor.castShadow = shadowCast && walls_cast_shadows;

    scene.add(floor);
    floor.material.opacity = 0.0;
    return floor;
}

function _cube(x = 0, y = 0, z = 0, size_x = 1, size_y = 1, size_z = 1, iType = "_Counter", rot = 0) {
    return addBasicToWorld(x - 1, y + size_y * 0.5, z - 1, size_x, size_y, size_z, iType, rot);
}

function counter(name, x1, y1, z1, x2, y2, z2) {

    const x = (x1 + x2) * 0.5
    const y = (y1 + y2) * 0.5
    const z = (z1 + z2) * 0.5
    const size_x = Math.abs(x2 - x1);
    const size_y = Math.abs(y2 - y1);
    const size_z = Math.abs(z2 - z1);
    _cube(x, y, z, size_x, size_y, size_z, "_Counter");
    return genericDummyObj;
}

function place_shape(name, in_type, x1, y1, z1, x2, y2, z2, rot = 0) {

    const x = (x1 + x2) * 0.5
    const y = (y1 + y2) * 0.5
    const z = (z1 + z2) * 0.5
    const size_x = Math.abs(x2 - x1);
    const size_y = Math.abs(y2 - y1);
    const size_z = Math.abs(z2 - z1);

    let type = "_" + in_type.charAt(0).toUpperCase() + in_type.slice(1).toLowerCase();

    last_placed_obj = _cube(x, y, z, size_x, size_y, size_z, type, rot);

    post_item_focus(name, x1, z1, x2, z2);

    const o = { }
    o.name = name;
    o.type = type;
    o.size_x = size_x;
    o.size_y = size_y;
    o.size_z = size_z;
    o.clone = function(x = 0, y = 0, z = 0, rot = 0) {
        _cube(x, y + this.size_y * 0.5, z, this.size_x, this.size_y, this.size_z, this.type, rot);
        return this;
    }
    o.texture = function(tname) {
        return this;
    }
    o.light = function(r, g, b, type) {
        o.r = r;
        o.g = g;
        o.b = b;
        o.light_type = type;
        return o;
    }

    o.pointLight = genericDummyObj.pointLight;
    o.spotLight = genericDummyObj.spotLight;

    return o;
}

function art(x = 0, z = 0, y = 0) {
    _cube(x, y, z, 1, 1, 1, "_Art");
}

function floorLight(x = 0, z = 0) {
    const y = 0.5
    _cube(x, y, z, 1, 1, 1, "_FloorLight");
    return genericDummyObj;
}

function pedestal(x = 0, z = 0, s=  5) {

    if (true) {
        floorRaise(x, z, 3, 1);
        return;
    }

    const y = 0.5
    _cube(x, y, z, 1, 1, 1, "_Pedestal");
}

function platform(x = 0, z = 0, size = 5, y = 0.5, aaa = 0) {
    
    let size_y = 0.5;
    if (y - size_y <= 1) {
        __floorRaise(x, z, 1.0, Math.max(y - size_y, size_y));
        return;
    }

    const size_x = size
    const size_z = size
    _cube(x, y, z, size_x, size_y, size_z, "_Block");
    _cube(x, y, z, size_x + 0.5, size_y * 0.5, size_z + 0.5, "_Block");
    _cube(x, y, z, size_x + 0.75, size_y * 0.25, size_z + 0.75, "_Block");
    _cube(x, (size_y + y) * 0.0, z, size_x * 0.25, size_y  + y, size_z * 0.25, "_Block");
    return genericDummyObj;
}

tile = platform;
floorTile = platform;
floatingPlatform = platform;
floatingIsland = platform;

function floorRaise_raw(x1 = 0, z1 = 0, x2 = 0, z2 = 0, amt = 0.5) {
    if (amt == 0)
        amt = 1;

    if (Math.abs(amt) < 1) {
        if (amt > 0)
            amt = 1;
        else
            amt = -1;
    }

    floorRaise_sub_raw(x1, z1, x2, z2, amt);
    if (world_tags.includes("Outdoor") || true) {
        let sub_mult = amt / 8.0;
        floorRaise_sub_raw(x1 + 1, z1 + 1, x2 - 1, z2 - 1, (amt > 0 ? 1 : -1) * sub_mult);
        floorRaise_sub_raw(x1 + 2, z1 + 2, x2 - 2, z2 - 2, (amt > 0 ? 1 : -1) * sub_mult);
        floorRaise_sub_raw(x1 - 1, z1 - 1, x2 + 1, z2 + 1, (amt > 0 ? 1 : -1) * sub_mult);
        sub_mult *= 0.5;
        floorRaise_sub_raw(x1 - 2, z1 - 2, x2 + 2, z2 + 2, (amt > 0 ? 1 : -1) * sub_mult);
        sub_mult *= 0.5;
        floorRaise_sub_raw(x1 - 3, z1 - 3, x2 + 3, z2 + 3, (amt > 0 ? 1 : -1) * sub_mult);
    }
    return genericDummyObj;
}

function __floorRaise(floor_name, x1 = 0, z1 = 0, x2 = 0, z2 = 0, amt = 0.5, smooth = true, hard = false) {
    
    post_item_focus('floorRaise', x1, z1, x2, x2)

    if (amt == 0)
        amt = 1;

    if (amt > 8)
        amt = 8;
    if (amt < -8)
        amt = -8;

    if (Math.abs(amt) < 1) {
        if (amt > 0)
            amt = 1;
        else
            amt = -1;
    }

    if (smooth)
        amt *= 0.5

    floorRaise_sub(x1, z1, x2, z2, amt * 1, hard);
    
    if (smooth) {
        let sub_mult = amt / 4.0;

        let jump = 0.5;

        let base_x1 = x1;
        let base_z1 = z1;
        let base_x2 = x2;
        let base_z2 = z2;

        x1 += jump;
        z1 += jump;
        x2 -= jump;
        z2 -= jump;
        floorRaise_sub(x1, z1, x2, z2, sub_mult);

        x1 += jump;
        z1 += jump;
        x2 -= jump;
        z2 -= jump;
        floorRaise_sub(x1, z1, x2, z2, sub_mult);

        x1 = base_x1;
        z1 = base_z1;
        x2 = base_x2;
        z2 = base_z2;

        jump = -jump;
        x1 += jump;
        z1 += jump;
        x2 -= jump;
        z2 -= jump;
        floorRaise_sub(x1, z1, x2, z2, sub_mult);

        x1 += jump;
        z1 += jump;
        x2 -= jump;
        z2 -= jump;
        sub_mult *= 0.5;
        floorRaise_sub(x1, z1, x2, z2, sub_mult);

        x1 += jump;
        z1 += jump;
        x2 -= jump;
        z2 -= jump;
        sub_mult *= 0.5;
        floorRaise_sub(x1, z1, x2, z2, sub_mult);
    }

    return genericDummyObj;
}


function __ceilingRaise(floor_name, x1 = 0, z1 = 0, x2 = 0, z2 = 0, amt = 0.5, smooth = true, hard = false) {
    // console.log("__ceilingRaise", ceilingRaise)
    ceilingRaise_sub(x1, z1, x2, z2, amt, hard);
}


function ceilingRaise(floor_name, x1 = 0, z1 = 0, x2 = 0, z2 = 0, amt = 0.5, smooth = true, hard = false) {

    ceilingRaise_sub(x1, z1, x2, z2, amt, hard);
    
    if (smooth) {
      let sub_mult = amt / 4.0;

      let jump = 0.5;

      let base_x1 = x1;
      let base_z1 = z1;
      let base_x2 = x2;
      let base_z2 = z2;

      x1 += jump;
      z1 += jump;
      x2 -= jump;
      z2 -= jump;
      ceilingRaise_sub(x1, z1, x2, z2, sub_mult, hard);

      x1 += jump;
      z1 += jump;
      x2 -= jump;
      z2 -= jump;
      ceilingRaise_sub(x1, z1, x2, z2, sub_mult, hard);

      x1 = base_x1;
      z1 = base_z1;
      x2 = base_x2;
      z2 = base_z2;

      jump = -jump;
      x1 += jump;
      z1 += jump;
      x2 -= jump;
      z2 -= jump;
      ceilingRaise_sub(x1, z1, x2, z2, sub_mult, hard);

      x1 += jump;
      z1 += jump;
      x2 -= jump;
      z2 -= jump;
      sub_mult *= 0.5;
      ceilingRaise_sub(x1, z1, x2, z2, sub_mult, hard);

      x1 += jump;
      z1 += jump;
      x2 -= jump;
      z2 -= jump;
      sub_mult *= 0.5;
      ceilingRaise_sub(x1, z1, x2, z2, sub_mult, hard);
  }
}

function floorRaise_sub_raw(x1 = 0, z1 = 0, x2 = 0, z2 = 0, amt = 0.5) {
    
    if (x1 >= x2 || z1 >= z2)
        return;

    floor_heights.push({x1: x1, z1: z1, x2: x2, z2: z2, amt: amt});
    return genericDummyObj;
}

// Update the camera position and rotation based on the calculated angles and zoom
function updateCameraPosition() {
    const x = camera_target.x + zoomLevel * Math.sin(rotationY) * Math.cos(rotationX);
    const y = camera_target.y + zoomLevel * Math.sin(rotationX);
    const z = camera_target.z + zoomLevel * Math.cos(rotationY) * Math.cos(rotationX);

    // Set the camera position and have it look at the origin (0, 0, 0)
    camera.position.set(x, y, z);
    camera.lookAt(camera_target);
}

function floorRaise_sub(x1, z1, x2, z2, amt = 0.5, hard = false) {

    floor_heights.push({x1: x1, z1: z1, x2: x2, z2: z2, amt: amt, hard: hard});
    return genericDummyObj;
}

const floorLower = floorRaise;
const raiseFloor = floorRaise;
const RaiseFloor = floorRaise;

const platformRaise = floorRaise;
const PlatformRaise = floorRaise;
const raisePlatform = floorRaise;
const RaisePlatform = floorRaise;

function ceilingRaise_sub(x1 = 0, z1 = 0, x2 = 1, z2 = 1, amt = 0.5, hard = false) {

    // console.log("ceilingRaise_sub", ceilingRaise_sub);
    ceil_heights.push({x1: x1, z1: z1, x2: x2, z2: z2, amt: amt, hard: hard});
    return genericDummyObj;
}

ceilingLower = ceilingRaise;

function cutCeiling(x, z, size = 5) {
    const y = room_size_y;
    const size_x = size
    const size_z = size
    const size_y = 1

    let color = 0x000000;
    floor = makeColoredCube(x, y, z, size_x, size_y, size_z, color);
    
    _cube(x, y, z, size_x, size_y, size_z, "_NoCeil");
}

const cutCeil = cutCeiling;
const noCeil = cutCeiling;
const noCeiling = cutCeiling;

function __wall(wall_name, x1 = 0, z1 = 0, x2 = 1, z2 = 1, y2 = 3, type = "_Wall") {

    y1 = 0;
    const walls = [
        { x1: x1, z1: z1, x2: x2, z2: z2, type: get_wall_type(type), y1: y1, y2: y2 }
    ];

    mainLayout.addWallSegments(walls);
    
    return genericDummyObj
}

function wall(wall_name) {
    the_wall = { 'name': wall_name, 'h': 4, 't': 'closed', 'h': 3 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.height = function(h) {
        the_wall.h = h;
        return the_wall;
    }
    the_wall.type = function(t) {
        the_wall.t = t;
        return the_wall;
    }
    walls_to_call.push(the_wall);
    return the_wall;
}

function water(water_name) {
    the_wall = { 'name': water_name, 't': 'pool', 'h': 3 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.height = function(h) {
        the_wall.h = h;
        return the_wall;
    }
    the_wall.type = function(t) {
        the_wall.t = t;
        return the_wall;
    }
    the_wall.waterType = the_wall.type;
    water_to_call.push(the_wall);
    return the_wall;
}

function garden(water_name) {
    the_wall = { 'name': water_name, 't': 'pool', 'h': 3 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.height = function(h) {
        the_wall.h = h;
        return the_wall;
    }
    the_wall.type = function(t) {
        the_wall.t = t;
        return the_wall;
    }
    gardens_to_call.push(the_wall);
    return the_wall;
}

function place_pillar(water_name) {
    the_wall = { 'name': water_name, 't': 'pool', 'h': 3 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    
    pillars_to_call.push(the_wall);
    return the_wall;
}

function skylight(water_name) {
    the_wall = { 'name': water_name, 't': 'pool', 'h': 3 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.type = function(t) {
        the_wall.t = t;
        return the_wall;
    }
    skylights_to_call.push(the_wall);
    return the_wall;
}

function floorRaise(water_name) {
    the_wall = { 'name': water_name, 's': false, 'amt': 1 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.smooth = function(t) {
        the_wall.s = t;
        return the_wall;
    }
    the_wall.height = function(h) {
        the_wall.amt = h;
        return the_wall;
    }
    floor_to_call.push(the_wall);
    return the_wall;
}

function ceilingRaise(water_name) {
    the_wall = { 'name': water_name, 's': false, 'amt': 1 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.smooth = function(t) {
        the_wall.s = t;
        return the_wall;
    }
    the_wall.height = function(h) {
        the_wall.amt = h;
        return the_wall;
    }
    ceiling_to_call.push(the_wall);
    return the_wall;
}

function __mural(mural_name, x1, z1, x2, z2, placement, lighting, type) {

    
    const floor = placement.toLowerCase().includes("floor");
    const ceil = placement.toLowerCase().includes("ceil");
    if (placement.toLowerCase().includes("wall")) {
        y1 = 0;
        const walls = [
            { x1: x1, z1: z1, x2: x2, z2: z2, type: "_Mural", y1: y1, y2: y2, art: art, lighting: lighting, muralType: type}
        ];
    
        mainLayout.addWallSegments(walls);

    } else if (floor || ceil) {

        const size_x = Math.abs(x2 - x1);
        const size_y = 0.5;
        const size_z = Math.abs(z2 - z1);
        const x = (x2 + x1) * 0.5
        let y = 0;
        const z = (z2 + z1) * 0.5

        if (!floor)
            y = room_size_y;

        let the_mural = _cube(x, y, z, size_x, size_y, size_z, "_Mural", 0);
        the_mural.type = "_Mural"
        the_mural.name = mural_name;
        the_mural.lighting = lighting;
        the_mural.muralType = type;
    } 
    
    return genericDummyObj
}

function mural_art(water_name) {
    the_wall = { 'name': water_name, 't': 'mural', 'place': 'wall', 'light': 'unlit', 'h': 3 }
    the_wall.topLeft = function(x1, z1) {
        the_wall.x1 = x1;
        the_wall.z1 = z1;
        return the_wall;
    }
    the_wall.bottomRight = function(x2, z2) {
        the_wall.x2 = x2;
        the_wall.z2 = z2;
        return the_wall;
    }
    the_wall.type = function(t) {
        the_wall.t = t;
        return the_wall;
    }
    the_wall.lighting = function(t) {
        the_wall.light = t;
        return the_wall;
    }
    the_wall.placement = function(t) {
        the_wall.place = t;
        return the_wall;
    }
    mural_to_call.push(the_wall);
    return the_wall;
}

function glow(x = 0, y = 0, z = 0, size_x = 1, size_y = 1, size_z = 1) {
    _cube(x, y, z, size_x, size_y, size_z, "_Glow");
}
const glowFloor = glow;

function __water(waterName = "", x1 = 0, z1 = 0, x2 = 5, z2 = 5, type = "normal") {

    if (type.toLowerCase().includes('ocean')) {
        has_ocean = true
        return;
    }

    has_water = true;
    const size_x = Math.abs(x2 - x1);
    const size_z = Math.abs(z2 - z1);
    const x = (x2 + x1) * 0.5
    const z = (z2 + z1) * 0.5
    const y = 0;
    const size_y = 1;
    __floorRaise("water_floor", x1, z1, x2, z2, -3, false, false);
    post_item_focus(waterName, x1, z1, x2, z2);

    
    _cube(x, y, z, size_x, size_y, size_z, "_Pool");

    return genericDummyObj;
}

function water_raw(x1 = 0, z1 = 0, x2 = 0, z2 = 0) {
    const x = (x2 + x1) * 0.5
    const z = (z2 + z1) * 0.5
    const size_x = x2 - x1
    const size_z = z2 - z1
    const y = 0;
    const size_y = 1;
    has_water = true;
    __floorRaise("water_floor", x1, z1, x2, z2, -0.5, true, true)
    _cube(x, y, z, size_x, size_y, size_z, "_Pool");
    return genericDummyObj;
}

function mountain() {
    x1 = 0;
    x2 = room_size_x;
    z1 = 0;
    z2 = room_size_z;

    while (x1 + 5 < x2 && z1 + 5 < z2) {
        floorRaise_sub_raw(x1, z1, x2, z2, 0.5);
        x1++;
        z1++;
        x2--;
        z2--;
    }
}

function hill() {
    x1 = 0;
    x2 = room_size_x;
    z1 = 0;
    z2 = room_size_z;

    while (x1 + 5 < x2 && z1 + 5 < z2) {
        floorRaise_sub_raw(x1, z1, x2, z2, 0.25);
        x1++;
        z1++;
        x2--;
        z2--;
    }
}
const rising = hill;

function valley() {
    x1 = 0;
    x2 = room_size_x;
    z1 = 0;
    z2 = room_size_z;

    while (x1 + 5 < x2 && z1 + 5 < z2) {
        floorRaise_sub_raw(x1, z1, x2, z2, -0.5);
        x1++;
        z1++;
        x2--;
        z2--;
    }
}

function cliff(orient = "east", depth = 20, height = 5) {
    x1 = 0;
    x2 = room_size_x;
    z1 = 0;
    z2 = room_size_z;

    if (orient == "north") {
        z2 = depth;
    } else if (orient == "south") {
        z1 = room_size_z - depth;
    } else if (orient == "west") {
        x2 = depth;
    } else if (orient == "east") {
        x1 = room_size_x - depth;
    } 
    floorRaise_raw(x1, z1, x2, z2, height);

    return genericDummyObj;
}

const placeWaterfall = water;
const waterfall = water;
const lava = water;
const acid = water;
const tar = water;
const liquid = water;

function danceFloor(x = 0, z = 0, size = 5) {

    const size_x = size
    const size_z = size

    const y = 0;
    const size_y = 1;
    _cube(x, y, z, size_x, size_y, size_z, "_DanceFloor");
    __floorRaise("danceFloor", x, z, size, 0.5, false);
}

const dance = danceFloor;
const stage = danceFloor;

function ceilingDecor(x = 0, z = 0, size = 5) {
    const y = room_size_y - 1;
    const size_y = 1;
    _cube(x, y, z, size, size_y, size, "_Ceiling");
}
function particleEffect(name, x, y, z) {
}

const lake = water;

const pond = water;
function archway(x, y, orient) {

}
const arch = archway;
const Archway = archway;
const Arch = archway;

let done_grass = false
function __garden(garden_name, x1 = 0, z1 = 0, x2 = 0, z2 = 0) {
    
    const size_x = Math.abs(x2 - x1)
    const size_z = Math.abs(z2 - z1)

    if (!done_grass) {
        done_grass = true;
        model("Grass or Small Plants").size(0.5).scatter();
        spawn(room_size_x * 0.5, 0.5, room_size_z * 0.5, true);
    }

    let y = 0.5
    let size_y = 0.5

    let x = (x1 + x2) * 0.5
    let z = (z1 + z2) * 0.5

    _cube(x, y, z, size_x, size_y, size_z, "_Garden");
    __floorRaise("garden_floor", x, z, size, 0.5, false);
    return genericDummyObj;
}

function __skylight(skylight_name, x1 = 0, z1 = 0, x2 = 0, z2 = 0) {
        
    const size_x = Math.abs(x2 - x1)
    const size_z = Math.abs(z2 - z1)

    let x = (x1 + x2) * 0.5
    let z = (z1 + z2) * 0.5


    let y = room_size_y - 0.5
    let size_y = 0.5
    _cube(x, y, z, size_x, size_y, size_z, "_Skylight");
}

function __pillar(pillar_name, x1 = 0, z1 = 0, x2 = 0, z2 = 0, size_y = 3) {
    
    const size_x = Math.abs(x2 - x1)
    const size_z = Math.abs(z2 - z1)

    let x = (x1 + x2) * 0.5
    let z = (z1 + z2) * 0.5

    const y = 0;

    addBasicToWorld(x, y + size_y * 0.5, z, size_x, size_y, size_z, "_Pillar");
}

function printQuickStats() {
    const jsonString = JSON.stringify(getQuickStats(), null, 2);
    console.log(jsonString);
    return jsonString;
}

function printObjectList() {

    const final_obj = { }

    final_obj.world_colors = world_colors;
    final_obj.model_name_to_id = model_name_to_id;
    final_obj.water_color = water_color;
    final_obj.world_tags = world_tags
    final_obj.world_decals = world_decals
 
    final_obj.object_list = object_list;
    final_obj.room_size_x = room_size_x;
    final_obj.room_size_y = room_size_y;
    final_obj.room_size_z = room_size_z;
    final_obj.title = scene_title;
    final_obj.ceil_heights = ceil_heights;
    final_obj.floor_heights = floor_heights;
    final_obj.wall_segments = wall_segments;
    final_obj.floor_textures = { 'texture_topLeft': texture_topLeft, 'texture_topRight': texture_topRight, 'texture_botLeft': texture_botLeft, 'texture_botRight': texture_botRight, 'texture_height': texture_height }
    final_obj.floor_colors = { 'texture_topLeft': c_topLeft, 'texture_topRight': c_topRight, 'texture_botLeft': c_bottomLeft, 'texture_botRight': c_bottomRight, 'texture_height': c_height }
    final_obj.num_bad_things =  getQuickStats().num_bad_things;

    const jsonString = JSON.stringify(final_obj);
    console.log(jsonString);
    return jsonString;
}

function executeNextCodeBlock() {
    if (!json_file_data || !json_file_data['options'])
        return;

    if (json_file_data_index < json_file_data['options'].length - 1) {
        json_file_data_index++;
        if (clientIndex > -1)
            while (Math.floor(json_file_data_index / 4) % max_num_clients != clientIndex && json_file_data_index < json_file_data['options'].length - 1)
                json_file_data_index++;

        if (Math.floor(json_file_data_index / 4) % max_num_clients != clientIndex)
            return;

        camera_angle_index = 0;
        document.getElementById('codeInput').value = json_file_data['options'][json_file_data_index]
        executeCodeInUserBlock();
    }
}

function executeCodeInUserBlock() {
    const userCode = document.getElementById('codeInput').value;
        
    has_item_focus = false;
    init();
    executeUserCode(userCode);
    post_room_setup();
    requestAnimationFrame(animate);
    printObjectList();
    printQuickStats();
}

if (use_threejs) {
    // Event listener for the Run button
    document.getElementById('runCode').addEventListener('click', () => {
        executeCodeInUserBlock();
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

init();

// Add mouse event listeners for camera control
function addMouseControl() {
    const canvas = renderer.domElement;

    // When the user clicks down
    canvas.addEventListener('mousedown', (event) => {
        isDragging = true;
        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    });

    // When the user moves the mouse
    canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y,
            };

            // Update rotation based on mouse movement
            rotationY += deltaMove.x * 0.01;  // Horizontal rotation (Y-axis)
            rotationX += deltaMove.y * 0.01;  // Vertical rotation (X-axis)

            // Clamp vertical rotation to prevent flipping
            rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

            previousMousePosition.x = event.clientX;
            previousMousePosition.y = event.clientY;

            // Update camera position based on rotation and zoom
            updateCameraPosition();
            requestAnimationFrame(animate);        
        }
    });

    // When the user releases the mouse button
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // When the user leaves the canvas area (also stop dragging)
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Add zoom functionality using the mouse wheel
    canvas.addEventListener('wheel', (event) => {
        // Zoom in/out by adjusting the zoom level
        zoomLevel += event.deltaY * 0.05;  // Adjust zoom sensitivity here

        // Clamp the zoom level to avoid getting too close or too far
        zoomLevel = Math.max(2, Math.min(zoomLevel, 50000));  // Limits: 2 (close) to 50 (far)

        // Update camera position based on new zoom level
        updateCameraPosition();
        requestAnimationFrame(animate);    
    });
}

// Execute user-provided code
function executeUserCode(code) {
    code = code.replace("javascript", "").trim()
    code = code.replaceAll("window(", "roomWindow(");

    const match = code.match(/```([\s\S]*?)```/);

    if (match) {
        code = match[1];
    } else {
    }
    code = code.replace("javascript", "").replaceAll("```","").trim()

    // Split the user code into individual lines
    const lines = code.split('\n\n');

    if (use_threejs && false) {
        eval(code);
    } else {

        let safeCode = "";
        lines.forEach((line, index) => {
            let codeString = JSON.stringify(line);
            safeCode += "try {\n" + line + "\n} catch (err) { console.error(err); console.error(" + codeString + "); num_build_errors++; }\n\n";
        });

        try {
            // Use `eval` to execute the line within the current context
            eval(safeCode);
        } catch (error) {
            // Log the error for this specific line
            console.error(`Error executing `, error);
            console.log(`Error executing `, safeCode);
            // alert(`Error on line ${index + 1}:\n${line}\n${error.message}`);
        }
    }
}

if (use_threejs) {
    addMouseControl();

    // Initialize the scene and camera
    updateCameraPosition();
} else {

    const args = process.argv.slice(2);
    executeUserCode(args[0].replaceAll("_____", '\"').replaceAll("!!!!!", ' ').replaceAll(">>>>>", '\n'));
    post_room_setup(args[1]);
    if (args.length > 1 && args[1] === "eval")
        ;//console.log(getWorldStats());
    else
        printObjectList();
}


function addModelConversation(model_name, model_path) {
    model_name_to_path[model_name] = model_path;
}

clientIndex = -1;
last_prompt = '';
if (use_threejs) {
    console.log("v1.0.0");
    socket.on('clientIndex', index => {
        max_num_clients = index.max_users;
        clientIndex = index.clientIndex;
        console.log("clientIndex", clientIndex);
    });

    socket.on('fileContents', (data) => {
        console.log("fileContents", data['options'].length, json_file_data_index, data['prompt']);
        if (data['prompt'] != last_prompt) {
            unloadAllModels(scene);
            camera_angle_index = 0;
            document.getElementById('codeInput').value = data['options'][0]
            json_file_data_index = 0;
            json_file_data = data;
            executeCodeInUserBlock();
            last_prompt = data['prompt'];
        } else {
            let wants = !(json_file_data_index < json_file_data['options'].length - 1) && camera_angle_index >= max_camera_angle;
            json_file_data = data;
            if (wants)
                executeNextCodeBlock();
        }
      });      
}

async function captureAndSendCanvas(colorDataURL) {
    if (!use_threejs)
        return;

    const colorFileName = (json_file_data_index + 1) + "_color_" + (camera_angle_index);
  
    const payload = {
      colorImage: {
        data: colorDataURL,
        fileName: colorFileName
      }
    };
  
    try {
      const response = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const result = await response.text();
      // console.log('Server response:', result);
    } catch (error) {
      console.error('Error sending image data to the server:', error);
    }
}

function color_topLeft(name, r, g, b) {
    the_color = c_topLeft;
    the_color.r = r;
    the_color.g = g;
    the_color.b = b;
    texture_topLeft =  name;
}

function color_topRight(name, r, g, b) {
    the_color = c_topRight;
    the_color.r = r;
    the_color.g = g;
    the_color.b = b;
    texture_topRight =  name;
}

function color_bottomLeft(name, r, g, b) {
    the_color = c_bottomLeft;
    the_color.r = r;
    the_color.g = g;
    the_color.b = b;
    texture_botLeft = name;
}

function color_bottomRight(name, r, g, b) {
    the_color = c_bottomRight;
    the_color.r = r;
    the_color.g = g;
    the_color.b = b;
    texture_botRight = name;
}

function color_height(name, r, g, b, index) {
    the_color = c_height[index - 1];
    the_color.r = r;
    the_color.g = g;
    the_color.b = b;
    texture_height[index - 1] = name;
    use_floor_colors = true;
}