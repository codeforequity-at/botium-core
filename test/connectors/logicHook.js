
module.exports = ({ requestOptions, context }) => {
  let counter = 1
  requestOptions.body = { bodyFieldRequestHook: counter++ }
  context.contextFieldRequestHook = counter
}
