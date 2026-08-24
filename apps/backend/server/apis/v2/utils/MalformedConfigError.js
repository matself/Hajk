/**
 * @summary Error class for App_Data files that exist and hold valid JSON, but
 * that aren't map configurations.
 *
 * @description Anything can end up in App_Data, and a file name tells us
 * nothing about what is inside. A stray JSON document - an exported response
 * from the config service, a layers store, something unrelated - used to travel
 * a long way into the config pipeline before failing with an opaque
 * "Cannot read properties of undefined (reading 'find')" and reaching the user
 * as a bare 500. The unique 'name' lets handleStandardResponse answer with a
 * 422 instead, so the Client can tell "this file is not a map" apart from
 * "the server is broken".
 *
 * @export
 * @class MalformedConfigError
 * @extends {Error}
 */
export class MalformedConfigError extends Error {
  constructor(message, options) {
    super(message, options);
  }

  get name() {
    return "MalformedConfigError";
  }
}
