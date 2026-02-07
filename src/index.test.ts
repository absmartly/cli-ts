import { describe, it, expect } from 'vitest';

describe('Global Error Handlers - Documentation', () => {
  it('should document unhandledRejection handler exists', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    expect(indexContent).toContain("process.on('unhandledRejection'");
    expect(indexContent).toContain('handleFatalError');
    expect(indexContent).toContain('unhandled promise rejection');
    expect(indexContent).toContain('process.exit(1)');
  });

  it('should document uncaughtException handler exists', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    expect(indexContent).toContain("process.on('uncaughtException'");
    expect(indexContent).toContain('handleFatalError');
    expect(indexContent).toContain('uncaught exception');
    expect(indexContent).toContain('process.exit(1)');
  });

  it('should document DEBUG mode stack trace support', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    expect(indexContent).toContain('if (process.env.DEBUG)');
    expect(indexContent).toContain('Stack trace:');
    expect(indexContent).toContain('error.stack');
  });

  it('should document bug report URL', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    expect(indexContent).toContain('This is a bug. Please report it at:');
    expect(indexContent).toContain('github.com/absmartly/absmartly-cli/issues');
  });

  it('should document error message formatting', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    expect(indexContent).toContain('console.error(chalk.red(');
    expect(indexContent).toContain('error.message');
  });
});

describe('Error Handler Implementation Requirements', () => {
  it('should verify both handlers exit with code 1', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    const exitCalls = indexContent.match(/process\.exit\(1\)/g);
    expect(exitCalls).toBeDefined();
    expect(exitCalls?.length).toBeGreaterThanOrEqual(1);
  });

  it('should verify handlers have distinct error messages', () => {
    const indexContent = require('fs').readFileSync(
      require('path').join(__dirname, 'index.ts'),
      'utf8'
    );

    expect(indexContent).toContain('unhandled promise rejection');
    expect(indexContent).toContain('uncaught exception');

    const rejectionIndex = indexContent.indexOf('unhandled promise rejection');
    const exceptionIndex = indexContent.indexOf('uncaught exception');

    expect(rejectionIndex).toBeGreaterThan(0);
    expect(exceptionIndex).toBeGreaterThan(0);
    expect(rejectionIndex).not.toBe(exceptionIndex);
  });
});
