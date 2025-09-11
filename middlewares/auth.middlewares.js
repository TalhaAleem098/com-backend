// const { generateToken, verifyToken } = require("@/utils/jwt");

// const authMiddleware = async (req, res, next) => {
//   try {
//     const accessToken = req.cookies?.accessToken;
//     const refreshToken = req.cookies?.refreshToken;
//     const commonCookieOptions = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//     };

//     if (!accessToken && !refreshToken) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required. No tokens provided."
//       });
//     }

//     // Try access token first
//     if (accessToken) {
//       try {
//         const decodedAccess = verifyToken(accessToken);

//         // Validate token payload
//         if (!decodedAccess.id || !decodedAccess.role) {
//           res.clearCookie("accessToken");
//           throw new Error("Invalid token payload");
//         }

//         req.user = decodedAccess;
//         return next();
//       } catch (err) {
//         // If access token is invalid (expired, malformed, etc.), clear it
//         res.clearCookie("accessToken");

//         // If it's not just expired, and we don't have refresh token, return error
//         if (err.name !== "TokenExpiredError" && !refreshToken) {
//           return res.status(401).json({
//             success: false,
//             message: "Invalid access token. Please login again."
//           });
//         }
//       }
//     }

//     // Try refresh token if access token failed or doesn't exist
//     if (refreshToken) {
//       try {
//         const decodedRefresh = verifyToken(refreshToken);

//         // Validate refresh token payload
//         if (!decodedRefresh.id || !decodedRefresh.role) {
//           res.clearCookie("refreshToken");
//           res.clearCookie("accessToken");
//           throw new Error("Invalid refresh token payload");
//         }

//         // Generate new access token
//         const newAccessToken = generateToken(
//           decodedRefresh,
//           decodedRefresh.rememberMe || false,
//           60 * 60 * 1000 // 1 hour
//         );

//         res.cookie("accessToken", newAccessToken, {
//           ...commonCookieOptions,
//           maxAge: 60 * 60 * 1000,
//         });

//         req.user = decodedRefresh;
//         return next();
//       } catch (err) {
//         // Refresh token is invalid, clear both cookies
//         res.clearCookie("refreshToken");
//         res.clearCookie("accessToken");
//         return res.status(401).json({
//           success: false,
//           message: "Invalid or expired refresh token. Please login again."
//         });
//       }
//     }

//     return res.status(401).json({
//       success: false,
//       message: "Authentication failed. Please login again."
//     });
//   } catch (err) {
//     console.error("Auth Middleware Error:", err);
//     res.clearCookie("accessToken");
//     res.clearCookie("refreshToken");
//     return res.status(401).json({
//       success: false,
//       message: "Authentication error. Please login again."
//     });
//   }
// };

// module.exports = { authMiddleware };

const { generateToken, verifyToken } = require("@/utils/jwt");

const authMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;
    let decodedRefresh, decodedAccess;
    const commonCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + 60 * 60 * 1000),
    };

    if (!accessToken && !refreshToken) {
      console.log("No tokens provided");
      return res.status(401).json({
        message: "Unauthorized Access!",
        success: false,
      });
    }

    if (accessToken) {
      try {
        decodedAccess = verifyToken(accessToken);

        if (!decodedAccess.id || !decodedAccess.role) {
          return res.status(401).json({
            message: "Unauthorized Access!",
            succes: false,
          });
        }
        req.user = decodedAccess;

        // console.log("Request user: ", req.user);
        if (req.user.role !== "admin" && req.user.role !== "coadmin") {
          console.log("Roles mismatching");
          return res.status(401).json({
            success: false,
            message: "Forbidden!",
          });
        }
        return next();
      } catch (err) {
        res.clearCookie("accessToken");
        console.log("Error in access verify: ", err);
        if (err.name !== "TokenExpiryError" && !refreshToken) {
          return res.status(401).json({
            message: "Invalid Tokens!",
            success: false,
          });
        }
      }
    }

    console.log("Access Token Expired, Checking Refresh Token");

    try {
      if (!refreshToken) {
        console.log("No refresh token provided");
        return res.status(401).json({
          message: "Unauthorized Access!",
          success: false,
        });
      }
      decodedRefresh = verifyToken(refreshToken);

      if (!decodedRefresh.id || !decodedRefresh.role) {
        res.clearCookie("refreshToken");
        res.clearCookie("accessToken");
        throw new Error("Invalid refresh token payload");
      }
      const newAccessToken = generateToken(
        decodedRefresh,
        decodedRefresh.rememberMe || false,
        60 * 60 * 1000 // 1 hour
      );

      res.cookie("accessToken", newAccessToken, {
        ...commonCookieOptions,
        maxAge: 60 * 60 * 1000,
      });
      req.user = decodedRefresh;
      console.log("Request user: ", req.user);
      if (req.user.role !== "admin" && req.user.role !== "coadmin") {
        console.log("Roles mismatching");
        return res.status(401).json({
          success: false,
          message: "Forbidden!",
        });
      }
      return next();
    } catch (err) {
      console.log("Error in refresh verifying: ", err);
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      return res.status(401).json({
        message: "Invalid Tokens!",
        success: false,
      });
    }
  } catch (err) {
    console.log("Error in auth middleware:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { authMiddleware };
