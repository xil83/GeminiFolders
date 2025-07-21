console.log("Rozszerzenie 'Foldery dla Gemini' v9 załadowane - Ostateczna poprawka ID.");

const TARGET_SELECTOR = '.chat-history-list';
const CHAT_ITEM_SELECTOR = '.conversation-items-container';

// ... (funkcje renderFolderList i handleAddFolderClick - bez zmian) ...
function loadAndRenderFolders() { chrome.storage.local.get({ geminiFolders: [] }, (data) => { renderFolderList(data.geminiFolders); }); }
function renderFolderList(folders) {
    const folderListElement = document.getElementById('folder-list');
    if (!folderListElement) return;
    folderListElement.innerHTML = '';
    if (folders.length === 0) {
        const placeholder = document.createElement('li');
        placeholder.className = 'folder-placeholder';
        placeholder.textContent = 'Brak folderów. Dodaj swój pierwszy!';
        folderListElement.appendChild(placeholder);
    } else {
        folders.forEach(folder => {
            const folderContainer = document.createElement('li');
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.innerHTML = `📁 <span>${folder.name}</span> <span class="chat-count">(${folder.chats.length})</span>`;
            folderItem.dataset.folderId = folder.id;
            const chatsContainer = document.createElement('ul');
            chatsContainer.className = 'chats-in-folder hidden';
            chatsContainer.id = `chats-for-${folder.id}`;
            if (folder.chats.length > 0) {
                folder.chats.forEach(chat => {
                    const chatItem = document.createElement('li');
                    chatItem.innerHTML = `<a href="${chat.url}" class="chat-in-folder-item">${chat.title}</a>`;
                    chatsContainer.appendChild(chatItem);
                });
                folderItem.addEventListener('click', () => {
                    document.getElementById(`chats-for-${folder.id}`).classList.toggle('hidden');
                    folderItem.classList.toggle('expanded');
                });
            } else {
                folderItem.classList.add('empty');
            }
            folderContainer.appendChild(folderItem);
            folderContainer.appendChild(chatsContainer);
            folderListElement.appendChild(folderContainer);
        });
    }
}
function handleAddFolderClick() {
    const folderName = prompt("Wpisz nazwę nowego folderu:");
    if (folderName && folderName.trim() !== '') {
        const newFolder = { id: `folder_${Date.now()}`, name: folderName.trim(), chats: [] };
        chrome.storage.local.get({ geminiFolders: [] }, (data) => {
            const updatedFolders = [...data.geminiFolders, newFolder];
            chrome.storage.local.set({ geminiFolders: updatedFolders }, () => {
                renderFolderList(updatedFolders);
            });
        });
    }
}

// ============== OSTATECZNA WERSJA LOGIKI ODCZYTU ID ==============

function showFolderSelectionMenu(event, chatItem) {
    event.stopPropagation();
    closeExistingMenus();

    const titleElement = chatItem.querySelector('.conversation-title');
    const title = titleElement ? titleElement.textContent.trim() : 'Bez tytułu';
    
    const logElement = chatItem.querySelector('[jslog]');
    const jslog = logElement ? logElement.getAttribute('jslog') : null;

    if (!jslog) {
        console.error("Krytyczny błąd: Nie znaleziono atrybutu 'jslog' dla czatu:", title);
        alert("Błąd: Nie można zidentyfikować tego czatu.");
        return;
    }

    // NOWE, POPRAWIONE WYRAŻENIE REGULARNE:
    // Szuka sekwencji "c_" po której następuje długa seria znaków alfanumerycznych,
    // która jest zamknięta w cudzysłowie. To jest nasz unikalny identyfikator.
    const match = jslog.match(/"c_([a-f0-9]{10,})"/);

    if (!match || !match[1]) {
        console.error("Krytyczny błąd: Nowe wyrażenie regularne nie znalazło ID w atrybucie jslog:", jslog);
        alert("Błąd: Nie udało się wyodrębnić ID czatu. Skontaktuj się z deweloperem.");
        return;
    }
    
    // Używamy grupy [1] z dopasowania - to jest CZYSTY identyfikator.
    const chatId = match[1];
    const chatUrl = `https://gemini.google.com/app/${chatId}`;

    chrome.storage.local.get({ geminiFolders: [] }, (data) => {
        if (data.geminiFolders.length === 0) {
            alert("Najpierw musisz stworzyć folder!");
            return;
        }
        const menu = document.createElement('div');
        menu.id = 'folder-selection-menu';
        data.geminiFolders.forEach(folder => {
            const menuItem = document.createElement('div');
            menuItem.className = 'folder-selection-item';
            menuItem.textContent = folder.name;
            menuItem.addEventListener('click', () => addChatToFolder({ id: chatId, title, url: chatUrl }, folder.id));
            menu.appendChild(menuItem);
        });
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', closeExistingMenus, { once: true }), 100);
    });
}

function addChatToFolder(chatData, folderId) {
    chrome.storage.local.get({ geminiFolders: [] }, (data) => {
        const folders = data.geminiFolders;
        const targetFolder = folders.find(f => f.id === folderId);
        if (targetFolder) {
            const chatExists = targetFolder.chats.some(c => c.id === chatData.id);
            if (!chatExists) {
                targetFolder.chats.push(chatData);
                chrome.storage.local.set({ geminiFolders: folders }, () => {
                    alert(`Dodano czat do folderu: ${targetFolder.name}`);
                    loadAndRenderFolders();
                });
            } else {
                alert("Ten czat już jest w tym folderze.");
            }
        }
    });
    closeExistingMenus();
}

// ... (reszta kodu bez zmian) ...
function enhanceChatsWithControls() { document.querySelectorAll(CHAT_ITEM_SELECTOR).forEach(chatItem => { if (chatItem.querySelector('.add-to-folder-btn')) return; const actionsContainer = chatItem.querySelector('.conversation-actions-container'); if (actionsContainer) { const button = document.createElement('button'); button.innerHTML = '📁'; button.className = 'add-to-folder-btn'; button.title = 'Dodaj do folderu'; button.addEventListener('click', (event) => showFolderSelectionMenu(event, chatItem)); actionsContainer.prepend(button); } }); }
function closeExistingMenus() { const existingMenu = document.getElementById('folder-selection-menu'); if (existingMenu) existingMenu.remove(); }
function injectUI() { const historyContainer = document.querySelector(TARGET_SELECTOR); if (historyContainer && !document.getElementById('gemini-folder-section')) { const folderSection = document.createElement('div'); folderSection.id = 'gemini-folder-section'; const title = document.createElement('h2'); title.textContent = 'Foldery'; folderSection.appendChild(title); const addButton = document.createElement('button'); addButton.id = 'add-folder-btn'; addButton.textContent = '➕ Dodaj nowy folder'; addButton.addEventListener('click', handleAddFolderClick); folderSection.appendChild(addButton); const folderList = document.createElement('ul'); folderList.id = 'folder-list'; folderSection.appendChild(folderList); historyContainer.prepend(folderSection); loadAndRenderFolders(); enhanceChatsWithControls(); return true; } return false; }
const observer = new MutationObserver(() => { if (!document.getElementById('gemini-folder-section')) injectUI(); enhanceChatsWithControls(); });
observer.observe(document.body, { childList: true, subtree: true });