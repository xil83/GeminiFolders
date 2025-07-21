console.log("Rozszerzenie 'Foldery dla Gemini' v15.0 załadowane - Atak na Shadow DOM.");

const TARGET_SELECTOR = '.chat-history-list';
const CHAT_ITEM_SELECTOR = '.conversation-items-container';

function loadAndRenderFolders() { chrome.storage.local.get({ geminiFolders: [] }, (data) => { renderFolderList(data.geminiFolders); }); }
function renderFolderList(folders) { const folderListElement = document.getElementById('folder-list'); if (!folderListElement) return; folderListElement.innerHTML = ''; if (folders.length === 0) { const placeholder = document.createElement('li'); placeholder.className = 'folder-placeholder'; placeholder.textContent = 'Brak folderów. Dodaj swój pierwszy!'; folderListElement.appendChild(placeholder); } else { folders.forEach(folder => { const folderContainer = document.createElement('li'); const folderItem = document.createElement('div'); folderItem.className = 'folder-item'; folderItem.dataset.folderId = folder.id; const actionsContainer = document.createElement('div'); actionsContainer.className = 'folder-actions'; actionsContainer.innerHTML = `<button class="folder-action-btn rename-btn" title="Zmień nazwę">✏️</button><button class="folder-action-btn delete-btn" title="Usuń folder">🗑️</button>`; const folderContent = document.createElement('div'); folderContent.className = 'folder-content'; folderContent.innerHTML = `📁 <span>${folder.name}</span> <span class="chat-count">(${folder.chats.length})</span>`; folderItem.appendChild(folderContent); folderItem.appendChild(actionsContainer); actionsContainer.querySelector('.rename-btn').addEventListener('click', (e) => { e.stopPropagation(); handleRenameFolder(folder.id); }); actionsContainer.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }); const chatsContainer = document.createElement('ul'); chatsContainer.className = 'chats-in-folder hidden'; chatsContainer.id = `chats-for-${folder.id}`; if (folder.chats.length > 0) { folder.chats.forEach(chat => { const chatItem = document.createElement('li'); chatItem.className = 'chat-in-folder-container'; const chatLink = document.createElement('a'); chatLink.href = chat.url; chatLink.className = 'chat-in-folder-item'; chatLink.textContent = chat.title; const deleteChatBtn = document.createElement('button'); deleteChatBtn.className = 'delete-chat-btn'; deleteChatBtn.innerHTML = '✖'; deleteChatBtn.title = 'Usuń z tego folderu'; deleteChatBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleDeleteChatFromFolder(chat.id, folder.id); }); chatItem.appendChild(chatLink); chatItem.appendChild(deleteChatBtn); chatsContainer.appendChild(chatItem); }); folderContent.addEventListener('click', () => { chatsContainer.classList.toggle('hidden'); folderItem.classList.toggle('expanded'); }); } else { folderContent.classList.add('empty'); } folderContainer.appendChild(folderItem); folderContainer.appendChild(chatsContainer); folderListElement.appendChild(folderContainer); }); } }
function handleAddFolderClick() { const folderName = prompt("Wpisz nazwę nowego folderu:"); if (folderName && folderName.trim() !== '') { const newFolder = { id: `folder_${Date.now()}`, name: folderName.trim(), chats: [] }; chrome.storage.local.get({ geminiFolders: [] }, (data) => { chrome.storage.local.set({ geminiFolders: [...data.geminiFolders, newFolder] }, loadAndRenderFolders); }); } }
function handleDeleteFolder(folderId, folderName) { if (confirm(`Czy na pewno chcesz usunąć folder "${folderName}" i wszystkie jego powiązania? Tej operacji nie można cofnąć.`)) { chrome.storage.local.get({ geminiFolders: [] }, (data) => { const updatedFolders = data.geminiFolders.filter(f => f.id !== folderId); chrome.storage.local.set({ geminiFolders: updatedFolders }, loadAndRenderFolders); }); } }
function handleRenameFolder(folderId) { const newName = prompt("Wpisz nową nazwę dla folderu:"); if (newName && newName.trim() !== '') { chrome.storage.local.get({ geminiFolders: [] }, (data) => { const folder = data.geminiFolders.find(f => f.id === folderId); if (folder) { folder.name = newName.trim(); chrome.storage.local.set({ geminiFolders: data.geminiFolders }, loadAndRenderFolders); } }); } }
function handleDeleteChatFromFolder(chatId, folderId) { chrome.storage.local.get({ geminiFolders: [] }, (data) => { const folder = data.geminiFolders.find(f => f.id === folderId); if (folder) { folder.chats = folder.chats.filter(c => c.id !== chatId); chrome.storage.local.set({ geminiFolders: data.geminiFolders }, loadAndRenderFolders); } }); }
function showFolderSelectionMenu(event, chatItem) { event.stopPropagation(); closeExistingMenus(); const titleElement = chatItem.querySelector('.conversation-title'); const title = titleElement ? titleElement.textContent.trim() : 'Bez tytułu'; const logElement = chatItem.querySelector('[jslog]'); const jslog = logElement ? logElement.getAttribute('jslog') : null; if (!jslog) { console.error("Krytyczny błąd: Nie znaleziono atrybutu 'jslog' dla czatu:", title); alert("Błąd: Nie można zidentyfikować tego czatu."); return; } const match = jslog.match(/"c_([a-f0-9]{10,})"/); if (!match || !match[1]) { console.error("Krytyczny błąd: Nowe wyrażenie regularne nie znalazło ID w atrybucie jslog:", jslog); alert("Błąd: Nie udało się wyodrębnić ID czatu. Skontaktuj się z deweloperem."); return; } const chatId = match[1]; const chatUrl = `https://gemini.google.com/app/${chatId}`; chrome.storage.local.get({ geminiFolders: [] }, (data) => { if (data.geminiFolders.length === 0) { alert("Najpierw musisz stworzyć folder!"); return; } const menu = document.createElement('div'); menu.id = 'folder-selection-menu'; data.geminiFolders.forEach(folder => { const menuItem = document.createElement('div'); menuItem.className = 'folder-selection-item'; menuItem.textContent = folder.name; menuItem.addEventListener('click', () => addChatToFolder({ id: chatId, title, url: chatUrl }, folder.id)); menu.appendChild(menuItem); }); menu.style.left = `${event.pageX}px`; menu.style.top = `${event.pageY}px`; document.body.appendChild(menu); setTimeout(() => document.addEventListener('click', closeExistingMenus, { once: true }), 100); }); }
function addChatToFolder(chatData, folderId) { chrome.storage.local.get({ geminiFolders: [] }, (data) => { const folders = data.geminiFolders; const targetFolder = folders.find(f => f.id === folderId); if (targetFolder) { const chatExists = targetFolder.chats.some(c => c.id === chatData.id); if (!chatExists) { targetFolder.chats.push(chatData); chrome.storage.local.set({ geminiFolders: folders }, () => { alert(`Dodano czat do folderu: ${targetFolder.name}`); loadAndRenderFolders(); }); } else { alert("Ten czat już jest w tym folderze."); } } }); closeExistingMenus(); }
function closeExistingMenus() { const existingMenu = document.getElementById('folder-selection-menu'); if (existingMenu) existingMenu.remove(); }
function injectUI() { const historyContainer = document.querySelector(TARGET_SELECTOR); if (historyContainer && !document.getElementById('gemini-folder-section')) { const folderSection = document.createElement('div'); folderSection.id = 'gemini-folder-section'; const title = document.createElement('h2'); title.textContent = 'Foldery'; folderSection.appendChild(title); const addButton = document.createElement('button'); addButton.id = 'add-folder-btn'; addButton.textContent = '➕ Dodaj nowy folder'; addButton.addEventListener('click', handleAddFolderClick); folderSection.appendChild(addButton); const folderList = document.createElement('ul'); folderList.id = 'folder-list'; folderSection.appendChild(folderList); historyContainer.prepend(folderSection); loadAndRenderFolders(); return true; } return false; }
function enhanceChatsWithControls() { document.querySelectorAll(CHAT_ITEM_SELECTOR).forEach(chatItem => { if (chatItem.querySelector('.add-to-folder-btn')) return; chatItem.style.display = 'flex'; chatItem.style.alignItems = 'center'; const button = document.createElement('button'); button.innerHTML = '📁'; button.className = 'add-to-folder-btn'; button.title = 'Dodaj do folderu'; button.addEventListener('click', event => showFolderSelectionMenu(event, chatItem)); chatItem.prepend(button); }); }

// =========================================================
// OSTATECZNA, ZAAWANSOWANA FUNKCJA DO ZARZĄDZANIA LAYOUTEM
// =========================================================
function adjustLayoutAdvanced() {
    // Cel: Znajdź główny element 'bard-sidenav', który jest hostem dla Shadow DOM.
    const sideNavHost = document.querySelector('bard-sidenav');
    if (!sideNavHost) {
        return; // Host jeszcze nie istnieje, spróbujemy później.
    }

    // Sprawdź, czy host ma shadowRoot. To kluczowy krok.
    if (sideNavHost.shadowRoot) {
        const shadowRoot = sideNavHost.shadowRoot;
        const styleId = 'gemini-folders-width-override';

        // Jeśli już wstrzyknęliśmy nasz styl, nie rób nic więcej.
        if (shadowRoot.getElementById(styleId)) {
            return;
        }

        console.log("Wykryto Shadow DOM! Wstrzykiwanie stylu do środka...");

        // Stwórz i wstrzyknij tag <style> bezpośrednio do Shadow DOM.
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        
        // Używamy reguły, którą odkryłeś, aby nadpisać zmienną CSS.
        // :host odnosi się do samego elementu 'bard-sidenav' wewnątrz jego Shadow DOM.
        styleElement.textContent = `
            :host {
                --bard-sidenav-open-width: 450px !important;
            }
        `;
        
        shadowRoot.appendChild(styleElement);
        console.log("Styl szerokości został pomyślnie wstrzyknięty do Shadow DOM.");
    }
}


const observer = new MutationObserver(() => {
    if (!document.getElementById('gemini-folder-section')) {
        injectUI();
    }
    enhanceChatsWithControls();
    
    // Przy każdej zmianie na stronie, próbujemy dostosować layout za pomocą nowej metody.
    adjustLayoutAdvanced();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});