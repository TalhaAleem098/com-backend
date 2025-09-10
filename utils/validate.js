function Validate(requiredField, data) {
  for (let f of requiredField) {
    if (data[f] === undefined || data[f] === null || data[f] === "") {
      return f;
    }
  }
  return null;
}

module.exports = {
    Validate
}