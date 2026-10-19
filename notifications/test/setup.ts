import { ConsoleLogger, Logger } from '@nestjs/common';

// Disables every level for plain Logger instances...
Logger.overrideLogger([]);

// ...but @nestjs/testing swaps the static logger for a TestingLogger (a
// ConsoleLogger subclass) on every Test.createTestingModule call, which the
// localInstance getter returns directly, bypassing the log levels. Silence
// both prototypes to cover all paths.
const methods = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const;
for (const method of methods) {
  vi.spyOn(Logger.prototype, method).mockImplementation(() => {});
  vi.spyOn(ConsoleLogger.prototype, method).mockImplementation(() => {});
}
