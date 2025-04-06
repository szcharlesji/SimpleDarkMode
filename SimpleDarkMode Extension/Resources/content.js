let style = document.createElement('style');

function createDarkModeStyle(colorScheme) {
    let backgroundColor, textColor;
    switch (colorScheme) {
        case 'black':
            backgroundColor = '#000000';
            textColor = '#ffffff';
            break;
        case 'grey':
            backgroundColor = '#333333';
            textColor = '#e0e0e0';
            break;
        case 'sepia':
            backgroundColor = '#FFF1E0';
            textColor = '#000000';
            break;
        default:
            backgroundColor = '#333333';
            textColor = '#e0e0e0';
    }

    return `
        html, body, div, span, applet, object, iframe,
        h1, h2, h3, h4, h5, h6, p, blockquote, pre,
        a, abbr, acronym, address, big, cite, code,
        del, dfn, em, img, ins, kbd, q, s, samp,
        small, strike, strong, sub, sup, tt, var,
        b, u, i, center,
        dl, dt, dd, ol, ul, li,
        fieldset, form, label, legend,
        table, caption, tbody, tfoot, thead, tr, th, td,
        article, aside, canvas, details, embed, 
        figure, figcaption, footer, header, hgroup, 
        menu, nav, output, ruby, section, summary,
        time, mark, audio, video {
            background-color: ${backgroundColor} !important;
            color: ${textColor} !important;
        }
        a {
            color: #4da6ff !important;
        }
        input, textarea, select, button {
            background-color: ${backgroundColor === '#000000' ? '#333' : '#555'} !important;
            color: ${textColor} !important;
            border-color: ${textColor} !important;
        }
    `;
}

// More efficient dark mode detection
function isAlreadyDarkMode() {
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    
    // Use more robust color analysis
    const isLowContrast = (color1, color2) => {
        const getLuminance = (color) => {
            const rgb = color.match(/\d+/g).map(Number);
            const [r, g, b] = rgb.map(c => {
                c /= 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const contrast = Math.abs(getLuminance(color1) - getLuminance(color2));
        return contrast < 0.5; // Adjust threshold as needed
    };

    return isLowContrast(computedStyle.backgroundColor, computedStyle.color);
}


function applyDarkMode(colorScheme) {
    style.textContent = createDarkModeStyle(colorScheme);
    if (!document.head.contains(style)) {
        document.head.appendChild(style);
    }
}

function removeDarkMode() {
    if (document.head.contains(style)) {
        document.head.removeChild(style);
    }
}

function checkAndApplyDarkMode(force = false) {
    browser.storage.local.get(['mode', 'colorScheme', 'whitelist', 'forcedDarkModes'], function(result) {
        const domain = window.location.hostname;
        const isWhitelisted = (result.whitelist || []).includes(domain);
        const isForcedDarkMode = (result.forcedDarkModes || []).includes(domain);
        const isDarkModeAlready = isAlreadyDarkMode();
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        let shouldApplyDarkMode = false;

        if (result.mode === 'on' || (result.mode === 'auto' && systemDarkMode) || isForcedDarkMode) {
            if (!isWhitelisted || isForcedDarkMode) {
                shouldApplyDarkMode = true;
            }
        }

        if (shouldApplyDarkMode && (!isDarkModeAlready || force || isForcedDarkMode)) {
            applyDarkMode(result.colorScheme || 'grey');
        } else if (!shouldApplyDarkMode && !isForcedDarkMode) {
            removeDarkMode();
        }

        // Store debug info
        window.darkModeDebugInfo = {
            isDarkModeAlready: isDarkModeAlready,
            systemDarkMode: systemDarkMode,
            extensionEnabled: shouldApplyDarkMode,
            isForcedDarkMode: isForcedDarkMode
        };
    });
}

// Initial check
checkAndApplyDarkMode();

// Listen for changes in system color scheme
window.matchMedia('(prefers-color-scheme: dark)').addListener(() => checkAndApplyDarkMode());

// Listen for messages from the popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDarkMode') {
        checkAndApplyDarkMode(request.force);
    } else if (request.action === 'getDebugInfo') {
        sendResponse(window.darkModeDebugInfo);
    }
    return true;
});
