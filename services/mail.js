const nodemailer = require("nodemailer");
const { Validate } = require("@/utils/validate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_APP_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

// sendMail supports both: sendMail(to, subject, html) and sendMail({to, subject, html})
const sendMail = async (toOrOptions, subject, html) => {
  const opts = typeof toOrOptions === 'object' && toOrOptions !== null && toOrOptions.to
    ? { ...toOrOptions }
    : { to: toOrOptions, subject, html };

  const requiredFields = ["to", "subject", "html"];
  console.log('mailOpts', { to: opts.to, subject: opts.subject });
  const missing = Validate(requiredFields, { to: opts.to, subject: opts.subject, html: opts.html });
  if (missing) {
    return { success: false, error: `Missing required fields: ${missing}` };
  }

  const mail = {
    from: process.env.GOOGLE_APP_USER,
    to: opts.to,
    subject: opts.subject || '',
  };
  if (opts.html) mail.html = opts.html;
  else mail.text = opts.text || '';

  try {
    const info = await transporter.sendMail(mail);
    return { success: true, info };
  } catch (error) {
    console.log('Mail send error:', error);
    return { success: false, error: error && error.message ? error.message : String(error) };
  }
};

module.exports = { sendMail };
