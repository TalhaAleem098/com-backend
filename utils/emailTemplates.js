const DEFAULT_BRAND = process.env.BRAND_NAME || "";
const DEFAULT_FROM =
  process.env.GOOGLE_APP_EMAIL || process.env.FROM_EMAIL || "";

const replaceTokens = (html, data) => {
  const map = {
    "Brand Name": data.brandName || DEFAULT_BRAND,
    "User Name": data.userName || data.user || "",
    "Admin Name": data.adminName || data.userName || "",
    OTP: data.otp || "",
    "OTP Expiry": data.otpExpiry || data.otpExpiryMinutes || "",
    Year: data.year || new Date().getFullYear(),
    "Login Link": data.loginLink || "#",
    "Reset Link": data.resetLink || "#",
    MapHtml:
      data.mapHtml ||
      "<div style='width:100%;height:160px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;'>Map Placeholder</div>",
    LocationInfo: data.location || "",
    "From Email": data.fromEmail || DEFAULT_FROM,
  };

  let out = html;
  for (const key in map) {
    const escaped = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    out = out.replace(new RegExp("\\[" + escaped + "\\]", "g"), map[key]);
  }
  return out;
};

const baseHtml = (title, subTitle, brandSvg, bodyContent, year, brandName) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  @media only screen and (max-width:480px){
    body{font-size:12px;line-height:1.35;}
    .container{padding:10px 12px;}
    .header-text{font-size:13px;}
    .sub-header-text{font-size:10px;letter-spacing:normal;}
    .alert-text{font-size:10px;}
    .otp-box{font-size:16px;padding:8px 14px;letter-spacing:4px;}
    .map-text,.footer-text{font-size:10px;}
    .icon-box{width:36px;height:36px;}
    .icon-svg{width:20px;height:20px;}
  }
</style>
</head>
<body style="margin:0;padding:4px;background:#f7f9fc;font-family:Verdana,Arial,Helvetica,sans-serif;color:#0b1220;font-size:13px;line-height:1.4;">
<div class="container" style="max-width:580px;margin:15px auto;background:#fff;border-radius:10px;padding:16px 18px;border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">
    <div class="icon-box" style="width:44px;height:44px;border-radius:5px;background:#2b6cb0;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      ${brandSvg}
    </div>
    <div style="flex:1;">
      <div style="display:flex;flex-direction:column;gap:2px;">
  <span class="brand-name" style="font-size:13px;color:#334155;font-weight:600">${brandName}</span>
  <div style="display:flex;align-items:baseline;gap:5px">
    <span class="header-text" style="font-size:15px;font-weight:700;color:#0b1220">${title}</span>
    <span class="sub-header-text" style="font-size:12px;color:#64748b">· ${subTitle}</span>
  </div>
</div>

    </div>
  </div>

  ${bodyContent}

  <div class="footer-text" style="font-size:12px;color:#8b98a8;text-align:center;margin-top:14px;border-top:1px solid #e2e8f0;padding-top:8px;">
    &copy; ${year} ${brandName}. All rights reserved.
  </div>
</div>
</body>
</html>
`;

const shoppingSvg = `<svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="logo" style="display:block;width:24px;height:24px;"><path d="M6 7h12l1.2 11.4A1.6 1.6 0 0 1 17.6 20H6.4a1.6 1.6 0 0 1-1.6-1.6L6 7z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 7V6a3 3 0 0 1 6 0v1" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const templates = {
  loginAlert: (data) => {
    const body = `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin:10px 0;background:#f9fafb;">
      <p class="alert-text" style="margin:0;color:#334155;font-size:13px;text-align:left">
        Hi [Admin Name],<br><br>
        We detected a login attempt on your [Brand Name] account. Please verify if this was you. Use the OTP below to confirm this login and secure your account. If this wasn't you, please review the location and take necessary action.
      </p>
    </div>
    <div style="display:flex;justify-content:center;margin:10px 0;">
      <div class="otp-box" style="font-family:ui-monospace,Menlo,Monaco,monospace;background:#e0f2fe;border:1px solid #90cdf4;color:#0b1220;padding:10px 18px;border-radius:6px;font-size:22px;font-weight:700;letter-spacing:6px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">[OTP]</div>
    </div>
    <p style="font-size:12px;color:#64748b;text-align:center;margin:4px 0 10px">
      OTP is valid for [OTP Expiry] minutes. Enter this code to verify the login attempt.
    </p>
    <div class="map-text">[MapHtml]</div>`;
    return replaceTokens(
      baseHtml(
        "Login Alert",
        "Login Alert",
        shoppingSvg,
        body,
        data.year || new Date().getFullYear(),
        data.brandName || ""
      ),
      data
    );
  },

  forgotPassword: (data) => {
    const body = `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin:10px 0;background:#f9fafb;">
      <p style="margin:0;color:#334155;font-size:13px;text-align:left">
        Hi [User Name],<br><br>
        We received a request to reset the password for your [Brand Name] account. Use the OTP below to reset your password. If you didn’t request this, please ignore this email.
      </p>
    </div>
    <div style="display:flex;justify-content:center;margin:10px 0;">
      <div class="otp-box" style="font-family:ui-monospace,Menlo,Monaco,monospace;background:#ffe8e0;border:1px solid #fca5a5;color:#0b1220;padding:10px 18px;border-radius:6px;font-size:22px;font-weight:700;letter-spacing:6px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">[OTP]</div>
    </div>
    <div style="display:flex;justify-content:center;margin:10px 0;">
      <a href="[Reset Link]" style="background:#2b6cb0;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;display:inline-block;">Reset Password</a>
    </div>`;
    return replaceTokens(
      baseHtml(
        "Password Reset",
        "Password Reset",
        shoppingSvg,
        body,
        data.year || new Date().getFullYear(),
        data.brandName || ""
      ),
      data
    );
  },

  resetConfirmation: (data) => {
    const body = `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin:10px 0;background:#f9fafb;">
      <p style="margin:0;color:#334155;font-size:13px;text-align:left">
        Hi [User Name],<br><br>
        Your [Brand Name] account password has been successfully reset. You can now log in using your new password. If you did not perform this action, please contact our support immediately.
      </p>
    </div>
    <div style="display:flex;justify-content:center;margin:12px 0;">
      <a href="[Login Link]" style="background:#2b6cb0;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;display:inline-block;">Login to Account</a>
    </div>`;
    return replaceTokens(
      baseHtml(
        "Password Reset Successful",
        "Password Reset",
        shoppingSvg,
        body,
        data.year || new Date().getFullYear(),
        data.brandName || ""
      ),
      data
    );
  },
};

// Generic function to generate HTML
const generateEmailHtml = (templateName, data) => {
  if (!templates[templateName]) throw new Error("Template not found");
  return templates[templateName](data);
};

module.exports = { generateEmailHtml };
