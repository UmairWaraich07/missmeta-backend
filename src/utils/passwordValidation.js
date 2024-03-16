function validatePassword(password) {
  // Regular expression to match password criteria: at least 8 characters with one special character
  const regex = /^(?=.*[!@#$%^&*])(?=.{8,})/;

  // Test if the password matches the regular expression
  if (regex.test(password)) {
    return true; // Password meets the criteria
  } else {
    return false; // Password does not meet the criteria
  }
}

export { validatePassword };
