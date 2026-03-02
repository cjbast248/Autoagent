import { chromium } from 'playwright';
import { createServer } from 'http';
import { parse } from 'url';

const PORT = 3333;

let browser = null;
let page = null;

// Helper to read JSON body
async function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Send JSON response
function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Initialize browser
async function initBrowser() {
  if (!browser) {
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({
      headless: false,  // VISIBLE browser!
      args: ['--start-maximized']
    });
    const context = await browser.newContext({
      viewport: null  // Full window size
    });
    page = await context.newPage();
    console.log('✅ Browser ready!');
  }
  return page;
}

// API handlers
const handlers = {
  // Navigate to URL
  async navigate(body) {
    const p = await initBrowser();
    const { url } = body;
    if (!url) return { error: 'URL required' };

    await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    return {
      success: true,
      url: p.url(),
      title: await p.title()
    };
  },

  // Click on element
  async click(body) {
    const p = await initBrowser();
    const { selector, text } = body;

    if (text) {
      // Click by text content
      await p.getByText(text, { exact: false }).first().click();
    } else if (selector) {
      await p.click(selector);
    } else {
      return { error: 'selector or text required' };
    }

    await p.waitForTimeout(500);
    return { success: true, url: p.url() };
  },

  // Type text
  async type(body) {
    const p = await initBrowser();
    const { selector, text, clear } = body;
    if (!selector || !text) return { error: 'selector and text required' };

    if (clear) {
      await p.fill(selector, text);
    } else {
      await p.type(selector, text);
    }
    return { success: true };
  },

  // Fill form field (clears first)
  async fill(body) {
    const p = await initBrowser();
    const { selector, value } = body;
    if (!selector || value === undefined) return { error: 'selector and value required' };

    await p.fill(selector, value);
    return { success: true };
  },

  // Get page content/info
  async content(body) {
    const p = await initBrowser();
    const { selector, type = 'text' } = body;

    if (selector) {
      const element = await p.$(selector);
      if (!element) return { error: 'Element not found' };

      const text = await element.textContent();
      return { text };
    }

    // Get full page info
    const title = await p.title();
    const url = p.url();
    const text = await p.innerText('body').catch(() => '');

    return {
      title,
      url,
      text: text.substring(0, 5000) // Limit size
    };
  },

  // Take screenshot (returns base64)
  async screenshot(body) {
    const p = await initBrowser();
    const { selector, path } = body;

    const options = { type: 'png' };
    if (path) options.path = path;

    let buffer;
    if (selector) {
      const element = await p.$(selector);
      if (!element) return { error: 'Element not found' };
      buffer = await element.screenshot(options);
    } else {
      buffer = await p.screenshot(options);
    }

    return {
      success: true,
      path: path || null,
      base64: buffer.toString('base64').substring(0, 1000) + '...(truncated)'
    };
  },

  // Get all visible elements (useful for understanding page structure)
  async elements(body) {
    const p = await initBrowser();
    const { selector = 'button, a, input, [role="button"]' } = body;

    const elements = await p.$$(selector);
    const results = [];

    for (const el of elements.slice(0, 50)) { // Limit to 50
      const text = await el.textContent().catch(() => '');
      const tag = await el.evaluate(e => e.tagName.toLowerCase());
      const href = await el.getAttribute('href').catch(() => null);
      const type = await el.getAttribute('type').catch(() => null);
      const id = await el.getAttribute('id').catch(() => null);
      const className = await el.getAttribute('class').catch(() => null);

      results.push({
        tag,
        text: text?.trim().substring(0, 100),
        href,
        type,
        id,
        class: className?.substring(0, 50)
      });
    }

    return { elements: results };
  },

  // Execute JavaScript on page
  async evaluate(body) {
    const p = await initBrowser();
    const { script } = body;
    if (!script) return { error: 'script required' };

    const result = await p.evaluate(script);
    return { result };
  },

  // Press keyboard key
  async press(body) {
    const p = await initBrowser();
    const { key } = body;
    if (!key) return { error: 'key required (e.g., Enter, Tab, Escape)' };

    await p.keyboard.press(key);
    return { success: true };
  },

  // Wait for element or timeout
  async wait(body) {
    const p = await initBrowser();
    const { selector, timeout = 5000, state = 'visible' } = body;

    if (selector) {
      await p.waitForSelector(selector, { timeout, state });
      return { success: true };
    }

    await p.waitForTimeout(timeout);
    return { success: true };
  },

  // Go back
  async back() {
    const p = await initBrowser();
    await p.goBack();
    return { success: true, url: p.url() };
  },

  // Refresh page
  async refresh() {
    const p = await initBrowser();
    await p.reload();
    return { success: true, url: p.url() };
  },

  // Get current status
  async status() {
    if (!page) return { browser: 'not started' };
    return {
      browser: 'running',
      url: page.url(),
      title: await page.title()
    };
  },

  // Close browser
  async close() {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    return { success: true, message: 'Browser closed' };
  },

  // Upload file to input
  async upload(body) {
    const p = await initBrowser();
    const { selector = 'input[type=file]', path } = body;
    if (!path) return { error: 'path required' };

    const input = await p.$(selector);
    if (!input) return { error: 'File input not found' };

    await input.setInputFiles(path);
    return { success: true, path };
  },

  // Upload file via filechooser (click trigger + file)
  async uploadClick(body) {
    const p = await initBrowser();
    const { selector, path } = body;
    if (!selector || !path) return { error: 'selector and path required' };

    const [fileChooser] = await Promise.all([
      p.waitForEvent('filechooser'),
      p.click(selector)
    ]);
    await fileChooser.setFiles(path);
    return { success: true, path };
  },

  // Drag and drop file
  async dropFile(body) {
    const p = await initBrowser();
    const { selector = 'body', path } = body;
    if (!path) return { error: 'path required' };

    const element = await p.$(selector);
    if (!element) return { error: 'Target element not found' };

    // Create a DataTransfer and dispatch drop event
    const dataTransfer = await p.evaluateHandle(async (filePath) => {
      const dt = new DataTransfer();
      const response = await fetch(filePath);
      const blob = await response.blob();
      const file = new File([blob], filePath.split('/').pop(), { type: blob.type });
      dt.items.add(file);
      return dt;
    }, path);

    await element.dispatchEvent('drop', { dataTransfer });
    return { success: true, path };
  }
};

// Create HTTP server
const server = createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const { pathname } = parse(req.url);
  const action = pathname.slice(1); // Remove leading /

  // Root - show available commands
  if (!action || action === '') {
    sendJson(res, {
      message: '🤖 Browser Controller Active!',
      commands: Object.keys(handlers),
      usage: 'POST /{command} with JSON body',
      examples: [
        'POST /navigate {"url": "https://google.com"}',
        'POST /click {"text": "Login"}',
        'POST /type {"selector": "input[name=email]", "text": "test@test.com"}',
        'POST /content {}',
        'POST /elements {}',
        'POST /screenshot {}'
      ]
    });
    return;
  }

  // Check if handler exists
  if (!handlers[action]) {
    sendJson(res, { error: `Unknown command: ${action}`, available: Object.keys(handlers) }, 404);
    return;
  }

  // Execute handler
  try {
    const body = await readBody(req);
    console.log(`📍 ${action}:`, body);
    const result = await handlers[action](body);
    console.log(`✅ ${action} done`);
    sendJson(res, result);
  } catch (error) {
    console.error(`❌ ${action} error:`, error.message);
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         🌐 BROWSER CONTROLLER SERVER READY! 🌐             ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║   Server running at: http://localhost:${PORT}                ║
║                                                            ║
║   Claude can now control the browser!                      ║
║                                                            ║
║   Commands available:                                      ║
║   - navigate, click, type, fill                            ║
║   - content, elements, screenshot                          ║
║   - press, wait, back, refresh                             ║
║   - status, close                                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  if (browser) await browser.close();
  process.exit(0);
});
