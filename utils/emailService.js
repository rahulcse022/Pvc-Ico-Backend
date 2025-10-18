const nodemailer = require("nodemailer");

const createProductionTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Get the appropriate transporter based on environment
const getTransporter = async () => {
  return createProductionTransporter();
};

// Send password reset email
const sendWelcomeEmail = async (email, userName, password) => {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"PVCTrading" <noreply@pvctrading.io>',
      to: email,
      subject: "Welcome to PVC Trade",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PVC Trade</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Welcome to PVC Trade</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #333; margin-bottom: 20px;">Username: <strong>${email}</strong></h3>
              <h3 style="color: #333; margin-bottom: 20px;">Password: <strong>${password}</strong></h3>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for signing up to PVC Trade. We are excited to have you on board.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        font-size: 16px;">
                Login to your account
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Please login to your account to start trading.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2025 PVC Trade. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Welcome to PVC Trade
        
        Hello ${userName},
        
        Thank you for signing up to PVC Trade. We are excited to have you on board.
        
        Please login to your account to start trading.
        
        © 2025 PVC Trade. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Welcome email sent:", info.messageId);

    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = await getTransporter();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"PVCTrading" <noreply@pvctrading.io>',
      to: email,
      subject: "Password Reset Request - PVCTrading",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PVC Trade</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your PVC Trade account. 
              If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        font-size: 16px;">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This link will expire in 1 hour for security reasons. If you need to reset your password again, 
              please visit our website and request a new password reset.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>Security Tip:</strong> Never share this email or the reset link with anyone. 
                Our team will never ask for your password or this reset link.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 PVC Trade. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `,
      text: `
        Password Reset Request - PVC Trade
        
        Hello ${userName},
        
        We received a request to reset your password for your PVC Trade account. 
        If you didn't make this request, you can safely ignore this email.
        
        To reset your password, click the following link:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you need to reset your password again, please visit our website and request a new password reset.
        
        Security Tip: Never share this email or the reset link with anyone. 
        Our team will never ask for your password or this reset link.
        
        © 2024 PVC Trade. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmationEmail = async (email, userName) => {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Password Reset Successful - PVC Trade",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your password has been successfully reset. You can now log in to your PVC Trade account using your new password.
            </p>
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #155724; margin: 0; font-weight: bold;">
                ✅ Your password has been updated successfully!
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If you did not request this password reset, please contact our support team immediately 
              as your account may have been compromised.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>Security Reminder:</strong> Keep your password secure and never share it with anyone. 
                Consider using a strong, unique password for your account.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 PVC Trade. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `,
      text: `
        Password Reset Successful - PVC Trade
        
        Hello ${userName},
        
        Your password has been successfully reset. You can now log in to your PVC Trade account using your new password.
        
        If you did not request this password reset, please contact our support team immediately 
        as your account may have been compromised.
        
        Security Reminder: Keep your password secure and never share it with anyone. 
        Consider using a strong, unique password for your account.
        
        © 2024 PVC Trade. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("Error sending password reset confirmation email:", error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
};
