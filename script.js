function check_web_storage_support() {
    if(typeof(Storage) !== "undefined") {
        return(true);
    }
    else {
        alert("Web storage unsupported! This addon will not work. We're working on this");
        return(false);
    }
}

function onGot(item) {
  console.log(item);
//   console.log("hola");
}

function onError(error) {
  console.log(`Error: ${error}`);
}

function syncSet(items, callback=null) {
    syncSet(items, function() {
        if (chrome.runtime.lastError) {
            alert("Couldn't save! " + chrome.runtime.lastError.message +
                "\nNote: synced storage only allows about 8KB per note.");
        }
        else if (callback) {
            callback();
        }
    });
}

function *idGenerator(starting) {
    let i = starting;
    while(true) {
        yield i++;
    }
}

function setFocus(id=null) {
    if (id === null) {
        if (document.getElementById("notes-list").lastElementChild)
            id = document.getElementById("notes-list").lastElementChild.id.substring(5);
    }
    // console.log(id);
    // console.log(notes[id]);
    if (document.getElementsByClassName("focused")[0]) {
        document.getElementsByClassName("focused")[0].classList.remove("focused");
    }
    if (id) {
        // console.log(id);
        // console.log(document.querySelector(`#note-${id}`));
        document.getElementById(`note-${id}`).classList.add("focused");
        document.getElementById("area").value = notes[id].content;
        selectedId = id;
    }
    else
    {
        document.getElementById("area").value = "";
        selectedId = -1;
    }
}

function createListElement(data) {
    const li = document.createElement("li");
    let titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = data.note.title;
    titleInput.size = 8;
    titleInput.readOnly = true;
    titleInput.tabIndex = -1;
    titleInput.addEventListener('dblclick', () => titleInput.readOnly=false );
    titleInput.addEventListener('focusout', () => {
        titleInput.readOnly=true;
        let whitespaces = titleInput.value.replace(/^\s+/, '').replace(/\s+$/, '');
        if (whitespaces != '') {
            notes[data.id].title = titleInput.value;
            let updatedNote = {}
            updatedNote[data.id] = notes[data.id];
            syncSet(updatedNote);
        }
        else
        {
            chrome.storage.sync.get([data.id], function(ldata) {
                titleInput.value = ldata[data.id].title;
            });
        }
    });
    titleInput.addEventListener('keyup', (e) => {
        if(e.key==="Enter" || e.keyCode===13){ 
            titleInput.readOnly=true;
            let whitespaces = titleInput.value.replace(/^\s+/, '').replace(/\s+$/, '');
            if (whitespaces != '') {
                notes[data.id].title = titleInput.value;
                let updatedNote = {}
                updatedNote[data.id] = notes[data.id];
                syncSet(updatedNote);
            }
            else
            {
                chrome.storage.sync.get([data.id], function(ldata) {
                    titleInput.value = ldata[data.id].title;
                });
            }
        }
    });
    li.appendChild(titleInput);
    li.addEventListener("click", () => setFocus(li.id.substring(5)));
    const delSpan = document.createElement("span");
    delSpan.classList.add("icon-bin2");
    const saveSpan = document.createElement("span");
    saveSpan.classList.add("icon-download");
    saveSpan.addEventListener("click", (e)=>{
        saveTextAsFile(li.id.substring(5));
        e.stopPropagation();
    });
    // delSpan.appendChild(document.createTextNode("X"));
    delSpan.classList.add("delete");
    saveSpan.classList.add("save");
    delSpan.addEventListener("click", (e) => {
        deleteNote(li.id.substring(5));
        e.stopPropagation();
    });
    const buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("buttons");
    buttonsDiv.appendChild(saveSpan);
    buttonsDiv.appendChild(delSpan);
    li.appendChild(buttonsDiv);
    li.setAttribute("id", `note-${data.id}`);
    return li;
}

function listNotes(newNote=null) {
    const ul = document.getElementById("notes-list");
    if (newNote === null) {
        for (let noteId in notes) {
            const note = notes[noteId];
            const li = createListElement({id: noteId, note});
            ul.appendChild(li);
        }
    }
    else {
        const li = createListElement(newNote);
        ul.appendChild(li);
    }
    setFocus();
}

function addNote() {
    const newNoteTitle = `New Note ${nextId}`;
    const newNoteContent = "New Note";
    // const newNoteContent = `Note content from id ${nextId}`;
    notes[nextId] = {
        title: newNoteTitle,
        content: newNoteContent
    };
    // console.log(notes);
    selectedId = nextId;
    nextId = gen.next().value;
    // console.log(nextId);
    syncSet({"maxId": nextId});
    let newNote = {}
    newNote[selectedId] = notes[selectedId];
    syncSet(newNote);
    // syncSet(notes);
    // syncSet("notebook", JSON.stringify(notes));

    listNotes({id: selectedId, note: notes[selectedId]});
}

function updateNote() {
    let text = document.getElementById("area").value;
    if (selectedId == -1)
        addNote();
    notes[selectedId].content = text;
    let updatedNote = {};
    updatedNote[selectedId] = notes[selectedId];
    syncSet(updatedNote);
    // syncSet("notebook", JSON.stringify(notes));
    setFocus(selectedId);
}

function deleteNote(id) {
    if (!confirm("Are you sure you want to delete: "+notes[id].title)) {
        return;
    }
    delete notes[id];
    chrome.storage.sync.remove(id);
    // syncSet("notebook", JSON.stringify(notes));
    const li = document.getElementById(`note-${id}`);
    document.getElementById("notes-list").removeChild(li);
    setFocus();
}

function showSettings () {
    let menu = document.getElementById("options");
    // console.log(menu.style.display);
    if (!menu.style.display || menu.style.display == "none") {
        menu.style.display = "block";
        document.getElementById("settings").textContent = "Close";
    }
    else {
        menu.style.display = "none";
        document.getElementById("settings").textContent = "Settings";
    }
}

function beautify() {
    let area = document.getElementById("area");
    let backBackup = beautiBackup;
    beautiBackup = area.value;
    if (backBackup == "")
        backBackup = beautiBackup;
    area.value = area.value.replace(/(\.\r\n|\.\n|\.\r)/gm,"<pr>");
    area.value = area.value.replace(/(\r\n|\n|\r)/gm," ");
    area.value = area.value.replace(/<pr>/gm,"\.\n\n");

    while (area.value.includes("  ") || area.value.includes("\n "))
    {
        area.value = area.value.replace("  ", " ");
        area.value = area.value.replace("\n ", "\n");
    }

    if (area.value == beautiBackup)
        beautiBackup = backBackup;

    updateNote();
    document.getElementById("undo").disabled = false;
    lastIdBeauti = selectedId;
}

function undoBeautify()
{
    setFocus(lastIdBeauti);
    document.getElementById("undo").disabled = true;
    area.value = beautiBackup;
    updateNote();
}

function setTheme(theme) {
    if (theme != "system") {
        document.body.setAttribute("data-theme", theme);
    }
    else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches)
            document.body.setAttribute("data-theme", "dark");
        else
            document.body.setAttribute("data-theme", "light");
    }
}

function saveTextAsFile(id) {
    chrome.storage.sync.get(id, function(data){
        var textToWrite = data[id].content;
        var textFileAsBlob = new Blob([ textToWrite ], { type: 'text/plain' });
        var fileNameToSaveAs = data[id].title;

        var downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        if (window.webkitURL != null) {
            // Chrome allows the link to be clicked without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        } else {
            // Firefox requires the link to be added to the DOM before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
        }

        downloadLink.click();
    });
}

function destroyClickedElement(event) {
    // remove the link from the DOM
    document.body.removeChild(event.target);
}

window.matchMedia('(prefers-color-scheme: dark)').addListener(()=> {
    if(document.getElementById("theme-system").checked == true) {
        setTheme("system");
    }
});

document.getElementById("create-note").addEventListener("click", () => addNote());
document.getElementById("beautify").addEventListener("click", () => beautify());
document.getElementById("undo").addEventListener("click", () => undoBeautify());
document.getElementById("settings").addEventListener("click", () => showSettings());
document.getElementById("area").addEventListener("keyup", () => updateNote());
document.getElementById("fonts").addEventListener("change", (e) => {
    syncSet({"font": e.target.value});
    document.getElementById("area").style.fontFamily = e.target.value;
    document.getElementById("notes-list").style.fontFamily = e.target.value;
});
document.getElementById("fSize").addEventListener("change", (e) => {
    // if (e.target.value > 70){
    //     e.target.value = 70;
    // }
    document.getElementById("area").style.fontSize = e.target.value+"px";
    if (document.getElementById("fForTitle").checked)
        document.getElementById("notes-list").style.fontSize = e.target.value+"px";
    syncSet({"fSize": e.target.value});
});
document.getElementById("fForTitle").addEventListener("change", (e)=> {
    // console.log(e.target.checked);
    if (e.target.checked) {
        syncSet({"fForTitle": 1});
        document.getElementById("notes-list").style.fontSize = document.getElementById("fSize").value + "px";
    } else {
        syncSet({"fForTitle": 0});
        document.getElementById("notes-list").style.fontSize = "1.5em";
    }
});
document.getElementsByName("theme").forEach(function(el)
{
    el.addEventListener("change", (e) => {
        if (e.target.checked)
        {
            syncSet({"theme": e.target.value});
            setTheme(e.target.value);
        }
    });
});

let nextId = 0;
var gen;
let selectedId = 0;
let notes = {};
let beautiBackup = "";
let lastIdBeauti = 0;

//Migrating notes from previous versions
const prevVersionNotes = parseInt(localStorage.getItem("num"));
if (prevVersionNotes && localStorage.getItem("migrated") != "true") {
    let migrated = {};
    while(nextId<prevVersionNotes) {
        let oldId = nextId+1;
        migrated[nextId] = {
            title: localStorage.getItem("noteTitle"+oldId) || ("Note " + oldId),
            content: localStorage.getItem("note"+oldId) || ""
        }
        nextId+=1;
    }
    migrated["maxId"] = nextId;
    syncSet(migrated, function() {
        localStorage.setItem("migrated", "true");
        init();
    });
    // localStorage.clear();
}
else {
    init();
}


function init() {
chrome.storage.sync.get(null, function(data){
    console.log(data);
    if (!isNaN(data.maxId)) {
        nextId = data.maxId;
    }
    gen = idGenerator(nextId);
    nextId = gen.next().value;
    // console.log("nID: " + nextId);

    if (!isNaN(data.font) && data.font != null) {
        document.getElementById("area").style.fontFamily = data.font;
    } 
    else {
        syncSet({"font": document.getElementById("fonts").value});
    }

    if (isNaN(data.fSize) || data.fSize == null) {
        syncSet({"fSize": document.getElementById("fSize").value});
    }

    document.getElementById("area").style.fontFamily = data.font;
    document.getElementById("fonts").value = data.font;
    document.getElementById("notes-list").style.fontFamily = data.font;
    document.getElementById("area").style.fontSize = data.fSize + "px";
    if (data.fForTitle == 1) {
        document.getElementById("notes-list").style.fontSize = data.fSize + "px";
        document.getElementById("fForTitle").checked = true;
    } else if (document.getElementById("fForTitle").checked) {
        syncSet({"fForTitle": 1});
    } else {
        syncSet({"fForTitle": 0});
        document.getElementById("notes-list").style.fontSize = "1.5em";
    }

    document.getElementById("fSize").value = data.fSize;

    if (data.theme == null) {
        document.getElementById("theme-system").checked = true;
        syncSet({"theme": "system"})
        setTheme("system");
    }
    else
    {
        document.getElementById("theme-"+data.theme).checked = true;
        setTheme(data.theme);
    }

    for (const id in data) {
        let note = data[id];
        if (note.title) {
            notes[id] = data[id];
        }
    }
    listNotes();
});
}