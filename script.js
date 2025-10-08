/* =====================================================
    Shortest Distance Finder (Connected to Google Sheet)
    Author: Sarthak Keshari
    ===================================================== */

// ✅ STEP 1: Replace this with your Apps Script Web App URL
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxj7Ia3wRz0bzB-0VTgsQ8RJXppAbqEiwIjH8gL-pc64b9LKq8pMmU2t1ejq_-Vy8g/exec"
let roads = []; // will be filled dynamically

// ================= Fetch Data from Google Sheet =================
async function fetchRoadData() {
    try {
        // Explicitly include the action parameter for clarity
        const res = await fetch(GOOGLE_SHEET_URL + '?action=getRoads'); 
        
        if (!res.ok) {
           throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const responseJson = await res.json();
        
        // --- CRITICAL FIX START ---
        if (responseJson.success && responseJson.data) {
            // Extract the array from the 'data' property
            roads = responseJson.data; 
            console.log("✅ Data loaded from Google Sheet:", roads);
            populateDropdowns();
            document.getElementById("mapContainer").textContent = "Map preview will appear here later...";
        } else {
            // Handle case where API call succeeded but returned a server-side error
            const errorMessage = responseJson.error || 'Unknown server error.';
            console.error("❌ API Error:", errorMessage);
            document.getElementById("result").textContent = `⚠️ Failed to load data from Google Sheet: ${errorMessage}`;
        }
        // --- CRITICAL FIX END ---
        
    } catch (error) {
        // Handle network errors or non-200 HTTP responses
        console.error("❌ Error fetching data:", error);
        document.getElementById("result").textContent = "⚠️ Failed to load data from Google Sheet. Check network connection or API URL.";
    }
}



// ================= Dijkstra Algorithm =================
function dijkstra(graph, source, target) {
    const dist = {};
    const prev = {};
    // Ensure we only iterate over nodes that actually exist in the graph
    const nodes = Object.keys(graph);

    nodes.forEach(n => {
        dist[n] = Infinity;
        prev[n] = null;
    });
    dist[source] = 0;

    // Use a simple array and sort it in each loop for simplicity, 
    // or a specialized Priority Queue for better performance (Set approach is fine here)
    const unvisited = new Set(nodes);

    while (unvisited.size > 0) {
        let u = null;
        // Find the node with the smallest distance in the unvisited set
        unvisited.forEach(n => {
            if (u === null || dist[n] < dist[u]) u = n;
        });

        if (u === null || dist[u] === Infinity) break; // No reachable nodes left
        unvisited.delete(u);

        if (u === target) break;

        for (const edge of graph[u]) {
            const v = edge.to;
            const alt = dist[u] + edge.w;
            if (alt < dist[v]) {
                dist[v] = alt;
                prev[v] = u;
            }
        }
    }

    const path = [];
    let cur = target;
    // Reconstruct the path backwards
    while (cur) {
        path.unshift(cur);
        cur = prev[cur];
    }
    
    // Check if the source node was successfully reached (i.e., path reconstruction worked)
    if (path[0] !== source) {
        return { path: [], distance: Infinity };
    }

    return {
        path,
        distance: dist[target]
    };
}

// ================= Populate Dropdowns =================
function populateDropdowns() {
    const startSelect = document.getElementById("start");
    const endSelect = document.getElementById("end");
    
    // Clear previous options
    startSelect.innerHTML = '<option value="">-- Select Start --</option>';
    endSelect.innerHTML = '<option value="">-- Select End --</option>';

    const points = new Set();
    // Use optional chaining for safety if 'roads' happens to be null/undefined initially
    roads?.forEach(r => {
        if (r.start) points.add(r.start);
        if (r.end) points.add(r.end);
    });
    
    const sortedPoints = Array.from(points).sort();

    sortedPoints.forEach(p => {
        const opt1 = document.createElement("option");
        opt1.value = p;
        opt1.textContent = p;
        startSelect.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = p;
        opt2.textContent = p;
        endSelect.appendChild(opt2);
    });
}

// ================= Find Path Button =================
document.getElementById("findPathBtn").addEventListener("click", () => {
    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const result = document.getElementById("result");

    // Clear previous result
    result.textContent = "";

    if (!roads.length) {
        result.textContent = "⚠️ Data not loaded yet. Please wait.";
        return;
    }

    if (!start || !end) {
        result.textContent = "⚠️ Please select both points.";
        return;
    }

    if (start === end) {
        result.textContent = "🟢 Start and end points are the same!";
        return;
    }

    const graph = buildGraph(roads);
    
    // Check if start/end points are actually in the graph (i.e., if they are in the data)
    if (!graph[start] || !graph[end]) {
        result.textContent = "🚫 One or both selected points are not connected in the road network.";
        return;
    }

    const { path, distance } = dijkstra(graph, start, end);

    if (distance === Infinity) {
        result.textContent = `🚫 No available path found between ${start} and ${end}!`;
    } else {
        result.textContent = `✅ Shortest Path: ${path.join(" → ")} (Distance: ${distance} km)`;
    }
});
// ================= Build Graph =================
function buildGraph(roads) {
    const graph = {};
    console.log('inside buildgraphs')

    roads.forEach(r => {
        console.log('inside foreach')
        // Ensure distance is a valid number before proceeding
        const distance = r.distance;
        console.log(distance)

        if (!r.start || !r.end || isNaN(distance)) return;
        if (r.status && r.status.toLowerCase() !== "o") return; // Optional check for 'status'

        if (!graph[r.start]) graph[r.start] = [];
        if (!graph[r.end]) graph[r.end] = [];

        // Store edges
        graph[r.start].push({ to: r.end, w: distance });
        graph[r.end].push({ to: r.start, w: distance });
    });
    console.log('graph:', graph)
    return graph;
}

// ================= Initialize =================
window.onload = fetchRoadData;
