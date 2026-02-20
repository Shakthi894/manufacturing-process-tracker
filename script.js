import { supabase } from "./supabase.js";


let appData = {
    projects: [],
    olderProjects: [],
    availableProcesses: ["Raw material order", "Lathe", "VMC", "Welding", "Powder Coat"]
};

let activeProjectIdForJob = null;
let editingJobId = null;
let editingProjectId = null;

/* Load & Save */
async function loadData() {

    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("id");

    if (error) {
        console.error("Load error:", error);
        appData.projects = [];
        renderAll();
        return;
    }

    if (!data || data.length === 0) {
        appData.projects = [];
        renderAll();
        return;
    }

    // Normalize data safely
    appData.projects = data.map(row => {
        const project = row.data || {};

        return {
            id: project.id || Date.now(),
            name: project.name || "Untitled",
            jobs: Array.isArray(project.jobs) ? project.jobs : []
        };
    });

    renderAll();
}
async function saveData() {
    // Delete all rows first (simple sync approach)
    const del = await supabase.from("projects").delete().neq("id", 0);
    if (del.error) console.error('Delete error:', del.error);

    for (const project of appData.projects) {
        const { error } = await supabase.from("projects").insert({ data: project });
        if (error) console.error('Insert error:', error);
    }

    updateDashboard();
}

/* Modals */
function openProjectModal(id=null) {
    editingProjectId = id;
    document.getElementById("project-name-input").value = "";
    document.getElementById("project-modal").style.display = "flex";
}

function openJobModal(pid, jid=null) {
    activeProjectIdForJob = pid;
    editingJobId = jid;
    document.getElementById("job-name-input").value = "";
    document.getElementById("job-qty-input").value = "1";
    document.getElementById("new-process-name").value = "";
    renderProcessSelector();
    document.getElementById("job-modal").style.display = "flex";
}

function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.style.display="none");
}

/* Save Project */
/* Save Project */
document.getElementById("save-project-btn").onclick = async () => {
    const name = document.getElementById("project-name-input").value.trim();
    if(!name) return;

    if(editingProjectId){
        const p = appData.projects.find(p=>p.id===editingProjectId);
        if (p) p.name = name;
    } else {
        appData.projects.push({id:Date.now(), name, jobs:[]});
    }

    await saveData();
    await loadData();
    closeModals();
};

/* Save Job */
document.getElementById("save-job-btn").onclick = async () => {
    const name = document.getElementById("job-name-input").value.trim();
    const qty = document.getElementById("job-qty-input").value;

    const selectedProcesses = Array.from(document.querySelectorAll("#process-selector-list input:checked")).map(cb => cb.value);
    const processes = selectedProcesses.length > 0 ? selectedProcesses.map(p=>({name:p,status:"Pending"})) : appData.availableProcesses.map(p=>({name:p,status:"Pending"}));

    const p = appData.projects.find(p=>p.id===activeProjectIdForJob);
    if(!p) return;

    p.jobs.push({id:Date.now(), name, qty, processes});

    await saveData();
    await loadData();
    closeModals();
};
/* Render */
function renderAll() {
    const container = document.getElementById("project-list-container");
    container.innerHTML = "";

    appData.projects.forEach(p=>{
        const div = document.createElement("div");
        div.className = "project-card";
        div.innerHTML = `
            <div class="project-header">
                <div class="project-title">${p.name}</div>
                <button class="btn btn-outline" onclick="openJobModal(${p.id})">+ Job</button>
            </div>
            <div class="job-list">
                ${(p.jobs || []).map(j => `
                    <div class="job-item">
                        <h4>${j.name} <span class="job-qty">QTY:${j.qty}</span></h4>
                        <div class="process-steps">
                            ${(j.processes || []).map(pr=>`
                                <div class="step status-${(pr.status||'Pending').toLowerCase().replace(" ","-")}">
                                    ${pr.name}
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
        container.appendChild(div);
    });

    updateDashboard();
}

/* Dashboard */
function updateDashboard(){
    document.getElementById("stat-total-projects").innerText = appData.projects.length;
    document.getElementById("stat-active-jobs").innerText = appData.projects.reduce((a,b)=>a + ((b.jobs && b.jobs.length) || 0),0);
    document.getElementById("stat-overall-progress").innerText = "0%";
}

/* Search dummy */
function handleSearch(){}
function clearSearch(){}

/* Add Custom Process */
function addCustomProcessType(){
    const processName = document.getElementById("new-process-name").value.trim();
    if(!processName) return;
    
    if(!appData.availableProcesses.includes(processName)){
        appData.availableProcesses.push(processName);
    }
    document.getElementById("new-process-name").value = "";
    renderProcessSelector();
}

/* Toggle Older Projects */
function toggleOlderProjects(){
    const container = document.getElementById("older-project-list-container");
    const btn = document.getElementById("older-toggle-text");
    
    if(container.style.display === "none"){
        container.style.display = "block";
        btn.innerText = "Hide Older Projects";
    } else {
        container.style.display = "none";
        btn.innerText = "Show Older Projects";
    }
}

/* Render Process Selector */
function renderProcessSelector(){
    const list = document.getElementById("process-selector-list");
    list.innerHTML = appData.availableProcesses.map(p => `
        <div class="process-option">
            <input type="checkbox" value="${p}" checked>
            <label>${p}</label>
        </div>
    `).join("");
}

/* Excel dummy */
function exportToExcel(){
    alert("Excel export will work in full version");
}

/* Start */
loadData();

// Real-time updates
supabase
  .channel('projects_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
      console.log("Change detected", payload);
      loadData();
  })
  .subscribe();

// Make functions global for HTML onclick
window.openProjectModal = openProjectModal;
window.closeModals = closeModals;
window.openJobModal = openJobModal;
window.addCustomProcessType = addCustomProcessType;
window.toggleOlderProjects = toggleOlderProjects;
window.handleSearch = handleSearch;
window.clearSearch = clearSearch;
window.exportToExcel = exportToExcel;


