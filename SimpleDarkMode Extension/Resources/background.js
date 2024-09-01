browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        browser.tabs.sendMessage(tabId, { action: 'updateDarkMode' });
    }
});

browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.mode || changes.colorScheme || changes.whitelist)) {
        browser.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, { action: 'updateDarkMode' });
            });
        });
    }
});