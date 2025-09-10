const otpGenerator = require("otp-generator");
const redis = require("./redis");
const generateOtp = (length = 6) => {
  return otpGenerator.generate(length, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
};

const storeOtp = async (otp, key, expiryMinutes = 5) => {
  const expirySeconds = expiryMinutes * 60;
  await redis.setex(key, expirySeconds, otp);
  // set a permanent marker so we can later distinguish 'expired' vs 'never existed'
  try {
    await redis.set(`${key}:created`, String(Date.now()));
  } catch (e) {
    // ignore marker write failures
  }
};

const getOtp = async (key) => {
  return await redis.get(key);
};

const getOtpWithTTL = async (key) => {
  const [otp, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
  return { otp, ttl };
};

const deleteOtp = async (key) => {
  // delete otp and marker
  await Promise.all([redis.del(key), redis.del(`${key}:created`)]);
  return true;
};

// returns { otp, ttl, hadMarker }
const getOtpInfo = async (key) => {
  const [otp, ttl, marker] = await Promise.all([redis.get(key), redis.ttl(key), redis.get(`${key}:created`)]);
  return { otp, ttl, hadMarker: Boolean(marker) };
};

module.exports = { generateOtp, storeOtp, getOtp, getOtpWithTTL, getOtpInfo, deleteOtp };
