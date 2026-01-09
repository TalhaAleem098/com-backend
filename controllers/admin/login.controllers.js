const Admin = require("@models/admin.models");
const { generateHash } = require("@utils/sha");
const { generateToken, verifyToken } = require("@utils/jwt.js");
const { sendMail } = require("@services/mail");
const {
  generateOtp,
  storeOtp,
  getOtpWithTTL,
  getOtpInfo,
  deleteOtp,
} = require("@utils/otp");
const { generateEmailHtml } = require("@/utils/emailTemplates");
const Alert = require("@/models/system");

const loginAdmin = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const userIp = req.userIp;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required!",
      });
    }

    const hashedEmail = await generateHash(email);
    const admin = await Admin.findOne({ "email.hashed": hashedEmail });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const result = await admin.matchPassword(password);
    if (!result.success) {
      console.log("Login failed for admin:", { email, reason: result.message });
      return res.status(result.locked ? 423 : 401).json(result);
    }

    const payload = {
      id: admin._id,
      name: admin.name,
      role: "admin",
      rememberMe,
    };

    if (admin.twoFactorEnabled) {
      const otp = generateOtp(6);
      const otpExpiryMinutes = 5;

      const mailHtml = generateEmailHtml("loginAlert", {
        otp,
        otpExpiry: otpExpiryMinutes,
        userName: admin.name,
        brandName: process.env.BRAND_NAME,
        fromEmail: process.env.GOOGLE_APP_EMAIL,
        year: new Date().getFullYear(),
      });

      const mailOpts = {
        to: email,
        subject: `Verify your login`,
        html: mailHtml,
      };

      sendMail(mailOpts)
        .then((response) => {
          if (!response.success) {
            console.error("sendMail failed:", response.error);
          } else {
            console.log(
              "sendMail success:",
              response.info && response.info.messageId
            );
          }
        })
        .catch((error) => {
          console.error("sendMail unexpected error:", error);
        });

      const prevOtp = await getOtpWithTTL(`admin-otp-${admin._id}`);
      if (prevOtp && prevOtp.otp) {
        console.log("previous otp found in redis", {
          otp: prevOtp.otp,
          ttl: prevOtp.ttl,
        });
      }

      await storeOtp(otp, `admin-otp-${admin._id}`, otpExpiryMinutes);

      const { otp: savedOtp, ttl: savedTtl } = await getOtpWithTTL(
        `admin-otp-${admin._id}`
      );
      console.log("saved otp in redis", { otp: savedOtp, ttl: savedTtl });

      return res.status(200).json({
        success: true,
        twoFactorEnabled: true,
        message: "OTP sent to your email. Please verify to complete login.",
      });
    }

    const refreshToken = await generateToken(
      payload,
      rememberMe,
      30 * 24 * 60 * 60 * 1000
    );
    const accessToken = await generateToken(
      payload,
      rememberMe,
      60 * 60 * 1000
    );

    const commonCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    };

    res.cookie("accessToken", accessToken, {
      ...commonCookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      ...commonCookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const loginHistoryEntry = {
      time: new Date(),
      ip: userIp,
    };

    await Admin.updateOne(
      { _id: admin._id },
      { $push: { loginHistory: loginHistoryEntry } }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful!",
    });
  } catch (error) {
    next(error);
  }
};

const loginVerify = async (req, res, next) => {
  try {
    const userIp = req.userIp;
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials!" });
    }

    const hashedEmail = await generateHash(email);
    const admin = await Admin.findOne({ "email.hashed": hashedEmail });
    if (!admin) {
      const newAlert = new Alert({
        message:
          "Someone has broken into backend without entering email and reached in OTP verify. Change your passwords immediately!",
        code: "400",
      });
      await newAlert.save();
      return res
        .status(400)
        .json({ message: "Invalid Credentials!", success: false });
    }
    const {
      otp: storedOtp,
      ttl,
      hadMarker,
    } = await getOtpInfo(`admin-otp-${admin._id}`);

    if (!hadMarker && !storedOtp) {
      return res
        .status(400)
        .json({ message: "OTP does not exist", success: false });
    }

    if (hadMarker && !storedOtp) {
      return res.status(400).json({ message: "OTP expired", success: false });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP!", success: false });
    }

    await deleteOtp(`admin-otp-${admin._id}`);

    const payload = {
      id: admin._id,
      name: admin.name,
      role: "admin",
      rememberMe: true,
    };

    const refreshToken = await generateToken(
      payload,
      true,
      30 * 24 * 60 * 60 * 1000
    );
    const accessToken = await generateToken(payload, true, 60 * 60 * 1000);

    const commonCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    };

    res.cookie("accessToken", accessToken, {
      ...commonCookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      ...commonCookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const loginHistoryEntry = {
      time: new Date(),
      ip: userIp,
    };

    await Admin.updateOne(
      { _id: admin._id },
      { $push: { loginHistory: loginHistoryEntry } }
    );

    return res
      .status(200)
      .json({ message: "Verification Successful!", success: true, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    const hashedEmail = await generateHash(email);
    const admin = await Admin.findOne({ "email.hashed": hashedEmail });
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    const resendCookie = req.cookies && req.cookies.otp_resend;
    if (resendCookie) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
      });
    }

    const { otp: existingOtp, ttl } = await getOtpWithTTL(
      `admin-otp-${admin._id}`
    );
    if (existingOtp && ttl > 0 && ttl > 60) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${ttl} seconds before resending`,
      });
    }

    const otp = generateOtp(6);
    const otpExpiryMinutes = 5;
    const mailHtml = generateEmailHtml("loginAlert", {
      otp,
      otpExpiry: otpExpiryMinutes,
      userName: admin.name,
      brandName: process.env.BRAND_NAME,
      fromEmail: process.env.GOOGLE_APP_EMAIL,
      year: new Date().getFullYear(),
    });

    sendMail({ to: email, subject: "Verify your login", html: mailHtml })
      .then((r) => {
        if (!r.success) console.error("resend sendMail failed", r.error);
      })
      .catch((e) => console.error("resend sendMail unexpected", e));

    await storeOtp(otp, `admin-otp-${admin._id}`, otpExpiryMinutes);

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 1000,
    };
    res.cookie("otp_resend", "1", cookieOpts);

    return res.status(200).json({ success: true, message: "OTP resent" });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const refreshTokenFromCookie = req.cookies && req.cookies.refreshToken;

    if (!refreshTokenFromCookie) {
      console.log("No refresh token in cookies");
      return res.status(401).json({
        success: false,
        message: "Refresh token not found. Please login again.",
      });
    }

    let decoded;
    try {
      decoded = verifyToken(refreshTokenFromCookie);
    } catch (error) {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      console.log("Invalid or expired refresh token:", error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token. Please login again.",
      });
    }

    if (!decoded.id || decoded.role !== "admin") {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      console.log("Invalid token payload");
      return res.status(401).json({
        success: false,
        message: "Invalid token payload. Please login again.",
      });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      console.log("Admin not found for id:", decoded.id);
      return res.status(404).json({
        success: false,
        message: "Admin not found. Please login again.",
      });
    }

    const payload = {
      id: admin._id,
      name: admin.name,
      role: "admin",
      rememberMe: decoded.rememberMe || false,
    };

    const newAccessToken = await generateToken(
      payload,
      decoded.rememberMe || false,
      60 * 60 * 1000 // 1 hour
    );

    let newRefreshToken;
    if (decoded.rememberMe) {
      newRefreshToken = await generateToken(
        payload,
        true,
        30 * 24 * 60 * 60 * 1000 // 30 days
      );
    }

    const commonCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    };

    res.cookie("accessToken", newAccessToken, {
      ...commonCookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    if (newRefreshToken) {
      res.cookie("refreshToken", newRefreshToken, {
        ...commonCookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { loginAdmin, loginVerify, resendOtp, refreshToken };
