# Email Templates Reference Guide

This document contains all email templates, their required fields, and usage formulas. Use it to quickly generate HTML emails using the `generateEmailHtml` method.

---

## Template 1: Login Alert Email

**Purpose:** Notify admin about a new login attempt and provide OTP for verification.

**Required Fields:**

| Field     | Description                       | Example                                               |
| --------- | --------------------------------- | ----------------------------------------------------- |
| adminName | Admin/User name                   | "Ali"                                                 |
| otp       | OTP for login verification        | "123456"                                              |
| otpExpiry | OTP expiry time in minutes        | 10                                                    |
| brandName | Brand/Company name                | "MyBrand"                                             |
| mapHtml   | HTML for location/map placeholder | "<div>Map placeholder</div>"                          |
| year      | Current year                      | 2025                                                  |
| fromEmail | Sender email                      | "[no-reply@mybrand.com](mailto:no-reply@mybrand.com)" |

**Usage Formula:**

```javascript
const { generateEmailHtml } = require("./emailTemplates");
const html = generateEmailHtml("loginAlert", {
  adminName: "Ali",
  otp: "123456",
  otpExpiry: 10,
  brandName: "MyBrand",
  mapHtml: "<div>Map placeholder</div>",
  year: 2025,
  fromEmail: "no-reply@mybrand.com"
});
```

---

## Template 2: Two-Step Verification Enabled (User OTP)

**Purpose:** Inform user that two-step verification is enabled and provide OTP.

**Required Fields:**

| Field     | Description           | Example                                               |
| --------- | --------------------- | ----------------------------------------------------- |
| userName  | User name             | "Ali"                                                 |
| otp       | OTP for verification  | "654321"                                              |
| otpExpiry | OTP expiry in minutes | 5                                                     |
| brandName | Brand/Company name    | "MyBrand"                                             |
| year      | Current year          | 2025                                                  |
| fromEmail | Sender email          | "[no-reply@mybrand.com](mailto:no-reply@mybrand.com)" |

**Usage Formula:**

```javascript
const html = generateEmailHtml("twoStepEnabled", {
  userName: "Ali",
  otp: "654321",
  otpExpiry: 5,
  brandName: "MyBrand",
  year: 2025,
  fromEmail: "no-reply@mybrand.com"
});
```

---

## Template 3: Two-Step Verification Admin OTP

**Purpose:** Notify admin that two-step verification is enabled and provide OTP to complete setup.

**Required Fields:**

| Field     | Description           | Example                                               |
| --------- | --------------------- | ----------------------------------------------------- |
| adminName | Admin name            | "Ali"                                                 |
| otp       | OTP for verification  | "987654"                                              |
| otpExpiry | OTP expiry in minutes | 5                                                     |
| brandName | Brand/Company name    | "MyBrand"                                             |
| year      | Current year          | 2025                                                  |
| fromEmail | Sender email          | "[no-reply@mybrand.com](mailto:no-reply@mybrand.com)" |

**Usage Formula:**

```javascript
const html = generateEmailHtml("twoStepAdminOtp", {
  adminName: "Ali",
  otp: "987654",
  otpExpiry: 5,
  brandName: "MyBrand",
  year: 2025,
  fromEmail: "no-reply@mybrand.com"
});
```

---

## Template 4: Forgot Password Email

**Purpose:** Send OTP for password reset along with reset link.

**Required Fields:**

| Field     | Description           | Example                                                  |
| --------- | --------------------- | -------------------------------------------------------- |
| userName  | User name             | "Ali"                                                    |
| otp       | OTP for reset         | "112233"                                                 |
| otpExpiry | OTP expiry in minutes | 10                                                       |
| resetLink | Password reset URL    | "[https://resetpassword.com](https://resetpassword.com)" |
| brandName | Brand/Company name    | "MyBrand"                                                |
| year      | Current year          | 2025                                                     |
| fromEmail | Sender email          | "[no-reply@mybrand.com](mailto:no-reply@mybrand.com)"    |

**Usage Formula:**

```javascript
const html = generateEmailHtml("forgotPassword", {
  userName: "Ali",
  otp: "112233",
  otpExpiry: 10,
  resetLink: "https://resetpassword.com",
  brandName: "MyBrand",
  year: 2025,
  fromEmail: "no-reply@mybrand.com"
});
```

---

## Template 5: Reset Confirmation Email

**Purpose:** Notify user that password has been reset successfully.

**Required Fields:**

| Field     | Description        | Example                                                  |
| --------- | ------------------ | -------------------------------------------------------- |
| userName  | User name          | "Ali"                                                    |
| loginLink | Login page URL     | "[https://mybrand.com/login](https://mybrand.com/login)" |
| brandName | Brand/Company name | "MyBrand"                                                |
| year      | Current year       | 2025                                                     |
| fromEmail | Sender email       | "[no-reply@mybrand.com](mailto:no-reply@mybrand.com)"    |

**Usage Formula:**

```javascript
const html = generateEmailHtml("resetConfirmation", {
  userName: "Ali",
  loginLink: "https://mybrand.com/login",
  brandName: "MyBrand",
  year: 2025,
  fromEmail: "no-reply@mybrand.com"
});
```
