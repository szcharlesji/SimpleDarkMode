document.addEventListener('DOMContentLoaded', function() {
    const modeSelect = document.getElementById('modeSelect');
    const websiteStatus = document.getElementById('websiteStatus');
    const colorScheme = document.getElementById('colorScheme');
    const toggleWhitelist = document.getElementById('toggleWhitelist');
    const forceDarkMode = document.getElementById('forceDarkMode');
    const debugInfo = document.getElementById('debugInfo');

    function updateDebugInfo(info) {
        debugInfo.innerHTML = `
            <h3>Debug Information:</h3>
            <p><strong>Mode:</strong> ${info.mode}</p>
            <p><strong>Color Scheme:</strong> ${info.colorScheme}</p>
            <p><strong>Domain:</strong> ${info.domain}</p>
            <p><strong>Whitelisted:</strong> ${info.isWhitelisted}</p>
            <p><strong>Detected Dark Mode:</strong> ${info.isDarkModeAlready}</p>
            <p><strong>System Dark Mode:</strong> ${info.systemDarkMode}</p>
            <p><strong>Extension Enabled:</strong> ${info.extensionEnabled}</p>
            <p><strong>Forced Dark Mode:</strong> ${info.isForcedDarkMode}</p>
        `;
        debugInfo.style.display = 'block';
    }

    function updateUI(result) {
        browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const url = new URL(tabs[0].url);
            const domain = url.hostname;
            const whitelist = result.whitelist || [];
            const forcedDarkModes = result.forcedDarkModes || [];
            const isWhitelisted = whitelist.includes(domain);
            const isForcedDarkMode = forcedDarkModes.includes(domain);
    
            websiteStatus.textContent = isWhitelisted ? '✗ Dark Mode Disabled for ' + domain : '✓ Dark Mode Enabled for ' + domain;
            toggleWhitelist.textContent = isWhitelisted ? 'Enable Dark Mode' : 'Disable Dark Mode';
            forceDarkMode.textContent = isForcedDarkMode ? 'Disable Forced Dark Mode' : 'Force Dark Mode';
    
            modeSelect.value = result.mode || 'auto';
            colorScheme.value = result.colorScheme || 'grey';
    
            function getDebugInfo(retries = 3) {
                browser.tabs.sendMessage(tabs[0].id, { action: 'getDebugInfo' }, function(response) {
                    if (response) {
                        updateDebugInfo({
                            mode: modeSelect.value,
                            colorScheme: colorScheme.value,
                            domain: domain,
                            isWhitelisted: isWhitelisted,
                            isDarkModeAlready: response.isDarkModeAlready,
                            systemDarkMode: response.systemDarkMode,
                            extensionEnabled: response.extensionEnabled,
                            isForcedDarkMode: isForcedDarkMode
                        });
                    } else if (retries > 0) {
                        setTimeout(() => getDebugInfo(retries - 1), 100);
                    } else {
                        updateDebugInfo({
                            mode: modeSelect.value,
                            colorScheme: colorScheme.value,
                            domain: domain,
                            isWhitelisted: isWhitelisted,
                            // isDarkModeAlready: 'Unknown', TODO: NOT WORKING
                            // systemDarkMode: 'Unknown',
                            // extensionEnabled: 'Unknown',
                            isForcedDarkMode: isForcedDarkMode
                        });
                    }
                });
            }
    
            getDebugInfo();
        });
    }

    function saveSettings(callback) {
        browser.storage.local.set({
            mode: modeSelect.value,
            colorScheme: colorScheme.value
        }, function() {
            browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
                browser.tabs.sendMessage(tabs[0].id, { action: 'updateDarkMode' });
                if (callback) callback();
            });
        });
    }

    // Load saved settings
    browser.storage.local.get(['mode', 'colorScheme', 'whitelist', 'forcedDarkModes'], updateUI);

    // Save settings when changed
    modeSelect.addEventListener('change', () => saveSettings(() => browser.storage.local.get(['mode', 'colorScheme', 'whitelist', 'forcedDarkModes'], updateUI)));
    colorScheme.addEventListener('change', () => saveSettings(() => browser.storage.local.get(['mode', 'colorScheme', 'whitelist', 'forcedDarkModes'], updateUI)));

    toggleWhitelist.addEventListener('click', function() {
        browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const url = new URL(tabs[0].url);
            const domain = url.hostname;
            browser.storage.local.get('whitelist', function(result) {
                let whitelist = result.whitelist || [];
                const index = whitelist.indexOf(domain);
                if (index > -1) {
                    whitelist.splice(index, 1);
                } else {
                    whitelist.push(domain);
                }
                browser.storage.local.set({whitelist: whitelist}, () => {
                    browser.tabs.sendMessage(tabs[0].id, { action: 'updateDarkMode' });
                    browser.storage.local.get(['mode', 'colorScheme', 'whitelist', 'forcedDarkModes'], updateUI);
                });
            });
        });
    });

    forceDarkMode.addEventListener('click', function() {
        browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const url = new URL(tabs[0].url);
            const domain = url.hostname;
            browser.storage.local.get('forcedDarkModes', function(result) {
                let forcedDarkModes = result.forcedDarkModes || [];
                const index = forcedDarkModes.indexOf(domain);
                if (index > -1) {
                    forcedDarkModes.splice(index, 1);
                } else {
                    forcedDarkModes.push(domain);
                }
                browser.storage.local.set({forcedDarkModes: forcedDarkModes}, () => {
                    browser.tabs.sendMessage(tabs[0].id, { action: 'updateDarkMode', force: true });
                    browser.storage.local.get(['mode', 'colorScheme', 'whitelist', 'forcedDarkModes'], updateUI);
                });
            });
        });
    });
});