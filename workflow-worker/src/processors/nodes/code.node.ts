/**
 * Code Node - Execute custom JavaScript code
 */

interface CodeConfig {
  code?: string;
  language?: 'javascript' | 'python';
  mode?: 'runOnceForAllItems' | 'runOnceForEachItem';
}

/**
 * Execute Code Node
 * Runs custom JavaScript code with access to input data
 */
export async function executeCodeNode(
  config: CodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[Code] Executing custom code...');

  const code = config.code || '';
  const language = config.language || 'javascript';

  if (!code.trim()) {
    console.log('[Code] No code provided, passing through');
    return inputData;
  }

  if (language !== 'javascript') {
    console.warn(`[Code] Language ${language} not supported, only JavaScript is available`);
    return {
      ...inputData,
      _codeError: `Language ${language} not supported`,
    };
  }

  try {
    // Create a sandboxed execution context
    // Note: This is a simplified sandbox. In production, use vm2 or similar
    const context = {
      $input: inputData,
      $json: inputData,
      items: inputData.items || [inputData],
      console: {
        log: (...args: unknown[]) => console.log('[Code:log]', ...args),
        warn: (...args: unknown[]) => console.warn('[Code:warn]', ...args),
        error: (...args: unknown[]) => console.error('[Code:error]', ...args),
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
    };

    // Wrap user code in an async function to allow await
    const wrappedCode = `
      (async function() {
        const $input = this.$input;
        const $json = this.$json;
        const items = this.items;
        const console = this.console;

        // User code
        ${code}

        // Return result
        if (typeof result !== 'undefined') {
          return result;
        }
        if (typeof output !== 'undefined') {
          return output;
        }
        return $input;
      }).call(this)
    `;

    // Execute the code
    const asyncFunction = new Function('return ' + wrappedCode);
    const result = await asyncFunction.call(context);

    console.log('[Code] Execution completed successfully');

    // Handle different return types
    if (result === null || result === undefined) {
      return inputData;
    }

    if (typeof result === 'object') {
      return {
        ...inputData,
        ...result,
        _codeExecuted: true,
      };
    }

    return {
      ...inputData,
      result,
      _codeExecuted: true,
    };
  } catch (error) {
    console.error('[Code] Execution error:', (error as Error).message);
    return {
      ...inputData,
      _codeError: (error as Error).message,
      _codeExecuted: false,
    };
  }
}
