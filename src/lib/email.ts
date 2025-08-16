import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendVerificationEmail(
  to: string,
  token: string,
  name: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'ScholarHub <noreply@scholarhub.com>',
    to,
    subject: 'Verify your ScholarHub account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ScholarHub!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for joining ScholarHub, the premier platform for academic collaboration.</p>
              <p>To complete your registration and verify your institutional email, please click the button below:</p>
              <center>
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </center>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
              <p><strong>Note:</strong> Your academic credentials will be reviewed by our team within 24 hours. You'll receive a confirmation email once your account is fully verified.</p>
              <div class="footer">
                <p>If you didn't create an account on ScholarHub, please ignore this email.</p>
                <p>&copy; 2024 ScholarHub. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to ScholarHub!
      
      Hello ${name},
      
      Thank you for joining ScholarHub. To verify your email address, please visit:
      ${verificationUrl}
      
      Your academic credentials will be reviewed within 24 hours.
      
      If you didn't create an account, please ignore this email.
      
      Best regards,
      The ScholarHub Team
    `,
  }
  
  await transporter.sendMail(mailOptions)
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'ScholarHub <noreply@scholarhub.com>',
    to,
    subject: 'Your ScholarHub account is verified!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #0ea5e9; }
            .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to the ScholarHub Community!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${name}!</h2>
              <p>Your academic credentials have been verified. You now have full access to ScholarHub.</p>
              
              <h3>Here's what you can do:</h3>
              <div class="feature">
                <strong>📝 Share Research</strong> - Post articles, papers, and insights
              </div>
              <div class="feature">
                <strong>👥 Collaborate</strong> - Connect with researchers worldwide
              </div>
              <div class="feature">
                <strong>📊 Track Impact</strong> - Monitor citations and engagement
              </div>
              <div class="feature">
                <strong>🔬 Join Projects</strong> - Participate in research groups
              </div>
              
              <center>
                <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
              </center>
              
              <p>We're excited to have you as part of our academic community!</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
  
  await transporter.sendMail(mailOptions)
}