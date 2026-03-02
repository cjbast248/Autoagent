import { chromium } from 'playwright';
import { createServer } from 'http';
import { parse } from 'url';

const PORT = 3334;

let browser = null;
let page = null;

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

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

async function initBrowser() {
  if (!browser) {
    console.log('🚀 Launching browser 2...');
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });
    const context = await browser.newContext({
      viewport: null
    });
    page = await context.newPage();
    console.log('✅ Browser 2 ready!');
  }
  return page;
}

const handlers = {
  async navigate(body) {
    const p = await initBrowser();
    const { url } = body;
    if (!url) return { error: 'URL required' };
    await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    return { success: true, url: p.url(), title: await p.title() };
  },

  async click(body) {
    const p = await initBrowser();
    const { selector, text } = body;
    if (text) {
      await p.getByText(text, { exact: false }).first().click();
    } else if (selector) {
      await p.click(selector);
    } else {
      return { error: 'selector or text required' };
    }
    await p.waitForTimeout(500);
    return { success: true, url: p.url() };
  },

  async fill(body) {
    const p = await initBrowser();
    const { selector, value } = body;
    if (!selector || value === undefined) return { error: 'selector and value required' };
    await p.fill(selector, value);
    return { success: true };
  },

  async screenshot(body) {
    const p = await initBrowser();
    const { path } = body;
    const options = { type: 'png' };
    if (path) options.path = path;
    const buffer = await p.screenshot(options);
    return {
      success: true,
      path: path || null,
      base64: buffer.toString('base64').substring(0, 1000) + '...(truncated)'
    };
  },

  async wait(body) {
    const p = await initBrowser();
    const { timeout = 1000 } = body;
    await p.waitForTimeout(timeout);
    return { success: true };
  },

  async press(body) {
    const p = await initBrowser();
    const { key } = body;
    if (!key) return { error: 'key required' };
    await p.keyboard.press(key);
    return { success: true };
  },

  async elements(body) {
    const p = await initBrowser();
    const { selector = 'button, a, input' } = body;
    const elements = await p.$$(selector);
    const results = [];
    for (const el of elements.slice(0, 30)) {
      const text = await el.textContent().catch(() => '');
      const tag = await el.evaluate(e => e.tagName.toLowerCase());
      const href = await el.getAttribute('href').catch(() => null);
      results.push({ tag, text: text?.trim().substring(0, 50), href });
    }
    return { elements: results };
  },

  async close() {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    return { success: true, message: 'Browser 2 closed' };
  }
};

const server = createServer(async (req, res) => {
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
  const action = pathname.slice(1);

  if (!action || action === '') {
    sendJson(res, {
      message: '🤖 Browser Controller 2 Active on port ' + PORT,
      commands: Object.keys(handlers)
    });
    return;
  }

  if (!handlers[action]) {
    sendJson(res, { error: `Unknown command: ${action}` }, 404);
    return;
  }

  try {
    const body = await readBody(req);
    console.log(`📍 ${action}:`, body);
    const result = await handlers[action](body);
    sendJson(res, result);
  } catch (error) {
    console.error(`❌ ${action} error:`, error.message);
    sendJson(res, { error: error.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Browser Controller 2 ready on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
