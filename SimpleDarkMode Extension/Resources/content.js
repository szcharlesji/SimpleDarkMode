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
        case 'bookist':
            backgroundColor = '#f0e8d9';
            textColor = '#333333';
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

function isAlreadyDarkMode() {
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    const backgroundColor = computedStyle.backgroundColor;
    const textColor = computedStyle.color;
    
    // Convert RGB to brightness value
    const getBrightness = (color) => {
        const rgb = color.match(/\d+/g);
        return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    };

    const backgroundBrightness = getBrightness(backgroundColor);
    const textBrightness = getBrightness(textColor);

    // Check for common dark mode indicators
    const hasDarkClass = body.classList.contains('dark') || body.classList.contains('darkmode') || body.classList.contains('night-mode');
    const hasDarkAttribute = body.getAttribute('data-theme') === 'dark' || body.getAttribute('theme') === 'dark';
    const significantBrightnessDifference = Math.abs(backgroundBrightness - textBrightness) > 50;

    // If background is significantly darker than text, or if there are dark mode indicators, it's likely already in dark mode
    return (backgroundBrightness < textBrightness && significantBrightnessDifference) || hasDarkClass || hasDarkAttribute;
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
