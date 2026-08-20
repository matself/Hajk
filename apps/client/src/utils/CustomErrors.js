/**
 * Base class for the errors that can abort Hajk's startup sequence.
 *
 * The `details` object is what makes the error page actionable: it carries
 * the URL that was requested, the HTTP status we got back (if any) and
 * whatever else helps a sysadmin tell "backend is down" apart from
 * "someone typed a bad `m` parameter". It is rendered, verbatim, in the
 * expandable technical section of the startup error page.
 */
class StartupError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.details = options.details || {};
  }
}

export class AccessError extends StartupError {
  constructor(message, options) {
    super(message, options);
    this.name = "AccessError";
  }
}

export class NotFoundError extends StartupError {
  constructor(message, options) {
    super(message, options);
    this.name = "NotFoundError";
  }
}

/**
 * The config service could not be reached at all (network/DNS/CORS failure),
 * or answered with a 5xx. Either way the problem is on the server side or in
 * `mapserviceBase` - retrying is meaningful, changing the `m` parameter is not.
 */
export class ServiceUnavailableError extends StartupError {
  constructor(message, options) {
    super(message, options);
    this.name = "ServiceUnavailableError";
  }
}

/**
 * We got a response, but it wasn't parseable JSON. In practice this almost
 * always means something other than Hajk's backend answered - a proxy login
 * page, an SPA index.html served as a 404 fallback, or a plain HTML error page.
 */
export class MalformedConfigError extends StartupError {
  constructor(message, options) {
    super(message, options);
    this.name = "MalformedConfigError";
  }
}
