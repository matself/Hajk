/**
 * @summary Helper for handling "normal" responses from the APIs various services
 * @description We expect our service functions, which are Promises, to either resolve
 * to some data object or to reject. In case of rejection, we expect the property "error"
 * to be present on the returned data object. In that case, we send response status 500,
 * together with the error message. Else, we simply send the data as JSON-encoded body of the response.
 * @export
 * @param {*} res The HTTP response object
 * @param {*} data The data Promise that our various services return
 */
export default function handleStandardResponse(res, data, successStatus = 200) {
  // If we encountered a error…
  if (data.error) {
    // Check if it's AccessError. If so, send a 403 Forbidden.
    // If error.code is ENOENT, send a 404 Not Found.
    // If it's MalformedConfigError, the file was found and read but isn't
    // usable, which is a 422 Unprocessable Content - a distinct case from both
    // "missing" and "the server broke", and one the Client reports differently.
    // Otherwise, send a generic status 500.
    let status = 500;
    if (data.error.code === "ENOENT") {
      status = 404;
    } else if (data.error.name === "AccessError") {
      status = 403;
    } else if (data.error.name === "MalformedConfigError") {
      status = 422;
    }
    res.status(status).send(data.error.toString());
  }
  // If there's no error, send the response
  else {
    res.status(successStatus).json(data);
  }
}
